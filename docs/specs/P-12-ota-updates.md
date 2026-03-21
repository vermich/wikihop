# Spec technique — P-12 : Stratégie OTA (Over The Air)

## Contexte

Story : `docs/stories/P-12-ota-updates.md`
Phase 4 — Infrastructure de production.

Le `app.json` actuel ne contient pas de configuration `expo-updates`. En production, les mises à jour OTA permettent de déployer des corrections JS/TS sans passer par une review App Store / Play Store. Cette spec définit la configuration `expo-updates`, la politique de déploiement OTA, et un mécanisme de forçage pour les patches critiques.

Fichiers concernés :
- `apps/mobile/app.json`
- `docs/ops/ota-policy.md` (à créer)

---

## Périmètre

### Dans scope

- Ajout du bloc `updates` dans `apps/mobile/app.json`
- Ajout du hook `useCriticalUpdateCheck` dans `apps/mobile/src/hooks/`
- Intégration du hook dans `apps/mobile/App.tsx` (appel au démarrage)
- Création de `docs/ops/ota-policy.md`

### Hors scope

- Configuration du channel EAS Update sur expo.dev (action manuelle du responsable infra)
- Modification du workflow GitHub Actions (couvert par P-06)
- Gestion des mises à jour OTA dans le workflow de release (hors périmètre de cette story)

---

## Architecture proposée

### Configuration `app.json`

Le `PROJECT_ID` Expo est visible dans le dashboard EAS (expo.dev → projet → Settings). Il doit être récupéré avant le déploiement et renseigné dans `app.json`.

```json
{
  "expo": {
    "updates": {
      "enabled": true,
      "fallbackToCacheTimeout": 0,
      "checkAutomatically": "ON_LOAD",
      "url": "https://u.expo.dev/[PROJECT_ID]"
    },
    "runtimeVersion": {
      "policy": "appVersion"
    }
  }
}
```

**Paramètres expliqués :**

- `checkAutomatically: "ON_LOAD"` : vérifie une mise à jour OTA à chaque lancement. Si une update est disponible, elle est téléchargée et appliquée au **prochain lancement** (pas immédiatement, sauf forçage — voir hook ci-dessous).
- `fallbackToCacheTimeout: 0` : si l'app est lancée hors connexion, utilise immédiatement le bundle en cache sans attendre. Essentiel pour une UX fluide.
- `runtimeVersion.policy: "appVersion"` : une mise à jour OTA n'est compatible qu'avec la version native exacte. Évite d'appliquer une OTA à une version native incompatible.

**Note :** `runtimeVersion` remplace l'ancien `sdkVersion`. Avec `policy: "appVersion"`, le runtime version est automatiquement la valeur de `version` dans `app.json` (actuellement `"1.0.0"`).

### Hook `useCriticalUpdateCheck`

Pour les patches de sécurité ou bugs bloquants, l'app doit forcer l'update au démarrage sans attendre le prochain lancement.

**Fichier :** `apps/mobile/src/hooks/useCriticalUpdateCheck.ts`

Ce hook est appelé **une seule fois** au montage de `App.tsx`. Il ne bloque pas le rendu — l'app démarre normalement, l'update est appliquée en arrière-plan si disponible.

**Comportement :**
1. Vérifie si une update est disponible via `Updates.checkForUpdateAsync()`
2. Si oui, télécharge via `Updates.fetchUpdateAsync()`
3. Recharge l'app via `Updates.reloadAsync()` uniquement si l'update est marquée comme critique (voir ci-dessous)
4. En dehors de la production (`__DEV__ === true` ou `Updates.channel !== 'production'`), le hook est un no-op

**Marquage "critique" :** EAS Update permet d'ajouter des métadonnées à une update. La convention retenue : une update est critique si son message commence par `[CRITICAL]`. Le hook lit `update.manifest?.metadata?.message` pour détecter ce marqueur.

**Interfaces TypeScript :**

```typescript
// useCriticalUpdateCheck.ts
export function useCriticalUpdateCheck(): void
// Pas de valeur de retour — effet de bord uniquement
```

**Intégration dans App.tsx :**

```typescript
// apps/mobile/App.tsx
import { useCriticalUpdateCheck } from './src/hooks/useCriticalUpdateCheck';

export default function App() {
  useCriticalUpdateCheck();
  // ... reste du composant
}
```

### Installation de `expo-updates`

Vérifier si `expo-updates` est déjà dans les dépendances :

```bash
# Dans apps/mobile/
cat package.json | grep expo-updates
```

Si absent :
```bash
cd apps/mobile && npx expo install expo-updates
```

`npx expo install` (pas `npm install`) assure la version compatible avec le SDK Expo installé.

---

## TDD — fonctions pures et hooks à tester en premier

### Fichier de test : `apps/mobile/src/hooks/__tests__/useCriticalUpdateCheck.test.ts`

Laurent écrit ces tests **avant** l'implémentation du hook.

```typescript
// Setup : jest.mock('expo-updates', () => ({ ... }))

describe('useCriticalUpdateCheck()', () => {
  it('ne fait rien en mode __DEV__')
  it('ne fait rien si Updates.isEmbeddedLaunch est true (Expo Go / simulateur)')
  it('appelle checkForUpdateAsync au montage')
  it('appelle fetchUpdateAsync si une update est disponible')
  it('appelle reloadAsync uniquement si le message commence par [CRITICAL]')
  it('ne appelle pas reloadAsync si update disponible mais non critique')
  it('absorbe les erreurs de checkForUpdateAsync sans crash (réseau indisponible)')
  it('absorbe les erreurs de fetchUpdateAsync sans crash')
})
```

**Mock `expo-updates` :**

```typescript
jest.mock('expo-updates', () => ({
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
  isEmbeddedLaunch: false,
  channel: 'production',
}));
```

`Updates.isEmbeddedLaunch` est `true` dans Expo Go et les simulateurs — utiliser ce flag pour court-circuiter le hook en environnement de développement plutôt que `__DEV__` seul, car `__DEV__` peut être `false` dans un build de test.

---

## Critères de qualité (code review)

- [ ] `app.json` contient le bloc `updates` complet avec `runtimeVersion`
- [ ] `[PROJECT_ID]` est remplacé par la valeur réelle (ou un placeholder documenté si non disponible)
- [ ] `useCriticalUpdateCheck` est un no-op en dev/simulateur (`isEmbeddedLaunch`)
- [ ] Toutes les erreurs `expo-updates` sont catchées — aucun crash possible
- [ ] `reloadAsync` uniquement sur update critique (`[CRITICAL]` prefix) — pas sur toute update
- [ ] Tests présents et exécutés avant le code (commits TDD vérifiables en historique)
- [ ] Zéro `any` dans le hook
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur

---

## Points de vigilance

1. **`expo install` obligatoire** : `npm install expo-updates` directement peut installer une version incompatible avec le SDK Expo 52. Toujours passer par `npx expo install expo-updates`.
2. **`reloadAsync` en boucle** : si le manifest de la nouvelle update contient aussi `[CRITICAL]`, l'app rechargée déclenchera à nouveau le hook → boucle infinie. Mitigation : utiliser `Updates.isEmbeddedLaunch` (false uniquement sur le premier lancement d'une nouvelle update) ou un flag `AsyncStorage` pour ne recharger qu'une fois par session.
3. **SDK 52 vs SDK 54** : la mémoire MEMORY.md indique "Migration SDK 54 : 2026-03-01" (ADR-002). Vérifier que `expo-updates` est bien compatible avec le SDK effectivement installé en production (`"expo": "~52.0.0"` dans `package.json`). Ne pas anticiper SDK 54 dans cette story.
4. **`checkAutomatically: "ON_LOAD"` ne bloque pas le démarrage** : l'update est téléchargée en arrière-plan et appliquée au prochain lancement. Le hook `useCriticalUpdateCheck` ajoute le cas du rechargement immédiat pour les patches critiques uniquement.
5. **Cohérence `runtimeVersion` et `version`** : avec `policy: "appVersion"`, incrémenter `version` dans `app.json` à chaque release native (build EAS). Une OTA poussée sur le channel `production` ne sera distribuée qu'aux apps ayant exactement la même `version`.
6. **Clé AsyncStorage `@wikihop/daily_completion_date`** : aucun impact OTA — les clés AsyncStorage persistent à travers les mises à jour OTA (le bundle JS est remplacé, pas les données natives).

---

## Fichier à créer : `docs/ops/ota-policy.md`

Laurent crée ce fichier en même temps que la configuration `app.json`.

---

## Branche

`feat/laurent-P12-ota-updates`
