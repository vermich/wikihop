# Specs techniques — P-14 : Crash reporting mobile

**Story :** `docs/stories/phase-4/P-14-crash-reporting.md`
**Destinataire :** Laurent (Frontend Dev)
**Date :** 2026-03-22

---

## 1. Contexte

La story P-14 intègre un outil de crash reporting dans l'application WikiHop afin de détecter et diagnostiquer les plantages en production. L'application ne dispose d'aucun compte utilisateur ni authentification — il n'y a pas de PII structurelle, mais le `beforeSend` hook reste obligatoire comme filet de sécurité.

La politique de confidentialité existe déjà :
- `apps/mobile/src/screens/AboutScreen.tsx` — section confidentialité affichée à l'utilisateur
- `docs/dpo/privacy-policy.md` — document de référence DPO

La mise à jour de ces deux fichiers est hors du scope de Laurent — elle est déléguée au DPO (Maïté) dans cette même story (voir section 7).

---

## 2. Périmètre

**Dans le scope (Laurent) :**
- Installation et configuration de `@sentry/react-native` via Expo
- Plugin Sentry dans `app.json`
- Initialisation dans `App.tsx` avec `beforeSend` hook
- Variable d'environnement `EXPO_PUBLIC_SENTRY_DSN`
- Upload des source maps dans `.github/workflows/release.yml`

**Hors scope (Laurent) :**
- Mise à jour de `docs/dpo/privacy-policy.md` → DPO (Maïté)
- Mise à jour de la section confidentialité dans `AboutScreen.tsx` → DPO dicte le texte, Laurent l'intègre si besoin dans une story dédiée
- Configuration du projet Sentry (création du projet, récupération du DSN) → tâche manuelle Client
- Configuration des alertes dans l'interface Sentry → tâche manuelle Client

---

## 3. Choix de l'outil — Sentry

**Sentry (`@sentry/react-native`)** est retenu. Justification :

- **Compatible Expo SDK 54** : `expo install @sentry/react-native` gère automatiquement la résolution de version compatible
- **Plan gratuit** : 5 000 erreurs/mois, 10 000 sessions, suffisant pour une app en early production
- **Upload source maps EAS natif** : le plugin Sentry pour Expo (`@sentry/react-native/expo`) gère l'upload des source maps lors des builds EAS — pas de configuration manuelle
- **`beforeSend` hook** : permet de filtrer les événements avant envoi — réquisit DPO
- **Pas de compte utilisateur** : la configuration `attachStacktrace: true` sans `initialScope` n'attache aucune donnée utilisateur

**Expo Insights écarté** : solution propriétaire Expo, moins mature, pas de `beforeSend` hook documenté, pas d'alerting email configurable sur le plan gratuit.

**Firebase Crashlytics écarté** : déjà documenté comme WNT-03 (won't do) pour les raisons RGPD. Sentry avec `beforeSend` est le compromis retenu.

---

## 4. Architecture et fichiers à modifier

```
apps/mobile/
├── app.json                          ← Ajout du plugin Sentry
├── App.tsx                           ← Initialisation Sentry.init()
├── .env.example                      ← Ajout de EXPO_PUBLIC_SENTRY_DSN (sans valeur réelle)
└── src/
    └── (aucun nouveau fichier)

.github/workflows/
└── release.yml                       ← Ajout de l'étape upload source maps

docs/dpo/
└── privacy-policy.md                 ← Mis à jour par le DPO (hors scope Laurent)
```

---

## 5. Spécification détaillée

### 5.1 Installation

```bash
cd apps/mobile
npx expo install @sentry/react-native
```

La commande `expo install` résout la version compatible avec Expo SDK 54 automatiquement. Ne pas utiliser `npm install` directement.

### 5.2 Configuration `app.json`

Ajouter le plugin Sentry dans le tableau `plugins` de `app.json`. Si `plugins` n'existe pas encore, le créer.

```json
{
  "expo": {
    "plugins": [
      [
        "@sentry/react-native/expo",
        {
          "url": "https://sentry.io/",
          "project": "wikihop",
          "organization": "[NOM_ORGANISATION_SENTRY]"
        }
      ]
    ]
  }
}
```

**Note :** `organization` et `project` sont nécessaires pour l'upload automatique des source maps lors des builds EAS. Ces valeurs correspondent au projet créé dans l'interface Sentry. Laurent mettra des placeholders (`[NOM_ORGANISATION_SENTRY]`) — le Client les complète avec ses credentials Sentry.

### 5.3 Initialisation dans `App.tsx`

L'initialisation Sentry doit être le **premier appel** dans `App.tsx`, avant tout autre import applicatif.

**Interface TypeScript à respecter :**

```typescript
import * as Sentry from '@sentry/react-native';

// Appelé une seule fois au démarrage — avant NavigationContainer et les stores Zustand
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  // Désactiver en développement pour ne pas polluer le projet Sentry
  enabled: process.env.NODE_ENV === 'production',
  // Pas de sampling de sessions — on capture tous les crashs
  tracesSampleRate: 0,
  // Attacher la stack trace à tous les événements (pas uniquement les exceptions non catchées)
  attachStacktrace: true,
  // Hook obligatoire : filtrer toute donnée potentiellement personnelle avant envoi
  beforeSend(event) {
    return filterSentryEvent(event);
  },
});
```

**Fonction pure `filterSentryEvent`** — voir section 6 (TDD).

**Wrapping du composant racine :**

```typescript
export default Sentry.wrap(App);
```

`Sentry.wrap()` intercepte les erreurs non catchées React Native (JS thread crash). C'est le mécanisme principal de détection des crashs.

**Important** : `App.tsx` utilise un `default export` — c'est une exception documentée aux conventions du projet (Expo Entry Point). Le wrap Sentry est compatible avec ce pattern.

### 5.4 Fonction pure `filterSentryEvent`

Cette fonction est exportée depuis un fichier dédié `apps/mobile/src/utils/sentry.utils.ts` pour faciliter les tests.

**Signature attendue :**

```typescript
import type { ErrorEvent } from '@sentry/react-native';

/**
 * Filtre les événements Sentry avant envoi.
 * Supprime tout champ pouvant contenir une donnée personnelle.
 * WikiHop n'a pas de compte utilisateur — aucune PII structurelle attendue.
 * Cette fonction est un filet de sécurité contre les fuites accidentelles.
 */
export function filterSentryEvent(event: ErrorEvent): ErrorEvent | null;
```

**Comportement attendu :**

- Supprimer `event.user` s'il est défini (ne doit jamais l'être, mais par précaution)
- Supprimer `event.request?.cookies` si présent
- Supprimer `event.request?.headers` si présent (les headers HTTP peuvent contenir des tokens)
- Retourner `null` pour tout événement dont `event.environment` n'est pas `'production'` (double garde avec `enabled: false` en dev)
- Retourner l'événement nettoyé sinon

### 5.5 Variable d'environnement

Ajouter dans `apps/mobile/.env.example` (fichier non commité avec valeur réelle) :

```
# Sentry DSN — récupérer depuis https://sentry.io > Projet > Settings > Client Keys
EXPO_PUBLIC_SENTRY_DSN=
```

**`EXPO_PUBLIC_` prefix** : obligatoire pour que la variable soit accessible dans le bundle React Native via `process.env` (convention Expo SDK 50+). Sans ce prefix, la variable n'est pas injectée dans le bundle.

Le DSN réel est fourni par le Client (créateur du projet Sentry). Ne jamais commiter le DSN dans le dépôt.

### 5.6 Upload des source maps dans `release.yml`

Les source maps permettent de dé-obfusquer les stack traces dans Sentry. Sans upload, les stack traces affichent des numéros de ligne dans le bundle minifié — inexploitables.

Le plugin `@sentry/react-native/expo` gère l'upload **automatiquement** lors des builds EAS (`eas build`) si les variables d'environnement Sentry sont configurées dans les secrets EAS.

**Modification de `.github/workflows/release.yml` :**

Dans le job `build-mobile`, ajouter les secrets EAS nécessaires au plugin Sentry **avant** l'étape `eas build` :

```yaml
- name: Configure Sentry environment for EAS
  run: |
    eas secret:push --scope project --non-interactive \
      SENTRY_AUTH_TOKEN=${{ secrets.SENTRY_AUTH_TOKEN }}
  working-directory: apps/mobile
```

**Secrets GitHub à créer (tâche Client) :**
- `SENTRY_AUTH_TOKEN` : token d'authentification Sentry (Internal Integration token avec scope `project:releases` et `org:read`)

**Alternative si les secrets EAS ne sont pas utilisés :**

Ajouter une étape post-build explicite avec `@sentry/cli` :

```yaml
- name: Upload source maps to Sentry
  working-directory: apps/mobile
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
    SENTRY_PROJECT: wikihop
  run: |
    npx @sentry/cli releases \
      --org "$SENTRY_ORG" \
      --project "$SENTRY_PROJECT" \
      files "${{ github.ref_name }}" \
      upload-sourcemaps ./dist
```

Laurent choisit l'approche selon la disponibilité des artifacts de build EAS dans le workflow.

---

## 6. TDD — fonctions pures à tester avant le code

### `filterSentryEvent` dans `apps/mobile/src/utils/sentry.utils.ts`

Cette fonction est **pure** (entrée → sortie sans effet de bord) — elle doit être testée en TDD strict (tests écrits avant l'implémentation).

**Fichier de test :** `apps/mobile/src/utils/__tests__/sentry.utils.test.ts`

**Cas de test obligatoires :**

```typescript
describe('filterSentryEvent', () => {
  // Cas 1 : événement en production sans données sensibles → retourné tel quel
  it('retourne l'événement inchangé si aucune donnée sensible n'est présente', () => { ... });

  // Cas 2 : événement avec `user` → user supprimé
  it('supprime event.user si présent', () => {
    const event = { environment: 'production', user: { id: 'test' }, ... };
    const result = filterSentryEvent(event);
    expect(result?.user).toBeUndefined();
  });

  // Cas 3 : événement avec request.cookies → cookies supprimés
  it('supprime event.request.cookies si présent', () => { ... });

  // Cas 4 : événement avec request.headers → headers supprimés
  it('supprime event.request.headers si présent', () => { ... });

  // Cas 5 : environnement non-production → retourne null
  it('retourne null si l'environnement n'est pas production', () => {
    const event = { environment: 'development', ... };
    expect(filterSentryEvent(event)).toBeNull();
  });

  // Cas 6 : event null / undefined → ne plante pas, retourne null
  it('ne plante pas si l'événement est invalide', () => { ... });
});
```

---

## 7. Ce que le DPO (Maïté) doit valider

Liste explicite des points soumis à validation DPO **avant que la PR puisse être approuvée** :

1. **Données collectées par Sentry** : confirmer que les données suivantes sont acceptables :
   - Version de l'application (`1.0.0`)
   - OS (iOS / Android)
   - Version OS (ex. `iOS 17.4`)
   - Stack trace JavaScript (aucune donnée utilisateur dans les traces WikiHop)
   - Type de crash / message d'erreur
   - Timestamp de l'événement

2. **Données non collectées** : confirmer que le `beforeSend` hook garantit l'absence de :
   - Identifiant utilisateur (il n'y en a pas structurellement)
   - Adresse IP (Sentry collecte l'IP par défaut — **à désactiver explicitement** dans les options `Sentry.init` : `sendDefaultPii: false`)
   - Localisation géographique précise

3. **Localisation des données** : Sentry héberge les données dans des datacenters US et EU. Le DPO doit valider le choix de la région (préférer EU) — configurable dans les paramètres du projet Sentry.

4. **Durée de rétention** : confirmer la durée de rétention acceptable (par défaut 90 jours sur le plan gratuit Sentry).

5. **Mention dans la politique de confidentialité** : le DPO rédige la mention à ajouter dans `docs/dpo/privacy-policy.md`. Exemple de formulation :

   > "En cas de plantage de l'application, des données techniques anonymes (version de l'application, système d'exploitation, trace d'erreur) peuvent être transmises à Sentry (sentry.io) pour analyse. Ces données ne contiennent aucune information personnelle."

6. **Mention dans `AboutScreen.tsx`** : si une section confidentialité existe, confirmer si elle doit être mise à jour ou si la politique de confidentialité complète suffit.

**Note importante pour Laurent :** ajouter `sendDefaultPii: false` dans `Sentry.init()` avant toute validation DPO. C'est le paramètre qui désactive la collecte automatique de l'IP — ne pas attendre la validation DPO pour l'ajouter, c'est une mesure conservatoire.

---

## 8. Critères de qualité pour la PR

- [ ] `@sentry/react-native` installé via `expo install` (pas `npm install`)
- [ ] Plugin Sentry présent dans `app.json`
- [ ] `Sentry.init()` appelé en premier dans `App.tsx`, avec `enabled: process.env.NODE_ENV === 'production'`
- [ ] `sendDefaultPii: false` présent dans `Sentry.init()`
- [ ] `tracesSampleRate: 0` présent (pas de tracing de performance — hors scope)
- [ ] `filterSentryEvent` exportée depuis `sentry.utils.ts`, testée, **tests commitées avant l'implémentation**
- [ ] `EXPO_PUBLIC_SENTRY_DSN` dans `.env.example` (sans valeur réelle)
- [ ] DSN non commité dans le dépôt (vérifier `.gitignore`)
- [ ] Modification de `release.yml` pour l'upload des source maps
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur
- [ ] Validation DPO obtenue (mention dans le fichier story P-14 — Maïté coche le critère)

---

## 9. Points de vigilance

1. **`EXPO_PUBLIC_` prefix obligatoire** : sans ce prefix, Expo n'injecte pas la variable dans le bundle. `process.env.SENTRY_DSN` retournerait `undefined` au runtime — Sentry s'initialiserait silencieusement sans DSN.

2. **`sendDefaultPii: false`** : Sentry collecte l'IP par défaut. Ce paramètre doit être présent même si le projet n'a pas de compte utilisateur — c'est un requis DPO documenté.

3. **`enabled: process.env.NODE_ENV === 'production'`** : évite de polluer le projet Sentry avec des crashs de développement. En test Expo Go (`NODE_ENV=development`), Sentry sera silencieux.

4. **`Sentry.wrap()` vs ErrorBoundary** : `Sentry.wrap()` gère les crashs JS natifs non catchés. Pour les erreurs dans l'arbre React (composants), une `ErrorBoundary` Sentry peut être ajoutée ultérieurement — hors scope P-14.

5. **Source maps et builds EAS** : les source maps ne sont disponibles que dans les builds EAS (`eas build`), pas dans les builds Expo Go locaux. Ne pas s'attendre à des stack traces lisibles lors des tests locaux.

6. **`app.json` et `plugins`** : l'ajout du plugin Sentry dans `app.json` nécessite un rebuild EAS pour prendre effet. Un simple `expo start` ne l'activera pas sur device.
