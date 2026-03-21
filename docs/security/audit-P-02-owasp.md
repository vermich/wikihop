# Audit OWASP Mobile Top 10 — WikiHop Phase 4
**Date** : 2026-03-21
**Auditeur** : Frédéric (Security Engineer)
**Périmètre** : P-02 (OWASP Mobile Top 10) + P-04 (Secrets management)
**Codebase** : branche `develop` — commit de tête au moment de l'audit

---

## Résumé exécutif

| Sévérité | Nombre |
|----------|--------|
| BLOQUANT (Critique) | 2 |
| RISQUE (Haute) | 3 |
| INFO (Bonne pratique) | 4 |

**Verdict global : 🚫 BLOQUÉ — 2 findings bloquants à corriger avant soumission stores**

---

## M1 — Credential Usage : CONFORME (avec réserves)

Aucune clé API, token ou mot de passe hardcodé détecté dans le code source applicatif.

- Les appels Wikipedia n'utilisent aucune authentification (API publique) — CONFORME
- Le `User-Agent` `WikiHop/1.0 (contact@wikihop.app)` dans `wikipedia.utils.ts` et `wikipedia.service.ts` est présent et correctement configuré — CONFORME
- Le fichier `.env.example` à la racine contient uniquement des valeurs de développement explicitement documentées comme non-sensibles — CONFORME
- Le fichier `apps/mobile/.env.example` documente le token `EXPO_TOKEN` avec la valeur `your_expo_token_here` — CONFORME (pas de valeur réelle)
- La CI GitHub Actions utilise une `DATABASE_URL` de test hardcodée dans `ci.yml` pour le service PostgreSQL (`postgresql://wikihop_test:wikihop_test@localhost:5432/wikihop_test`). Ce credentials est limité à l'environnement de test éphémère CI et ne présente pas de risque — ACCEPTABLE

**Réserve** : voir finding M10-1 (IP locale hardcodée) — classé BLOQUANT car le problème est sur M5/M10.

---

## M2 — Supply Chain / Dépendances : RISQUE

### npm audit — résultats

`npm audit --workspaces` retourne **11 vulnérabilités** : 5 low, 1 moderate, 5 high.

**Vulnérabilités HIGH :**
- `undici <=6.23.0` — 4 vulnérabilités : WebSocket overflow, HTTP smuggling, mémoire illimitée, CRLF injection
- `tar <=7.5.10` — Path traversal via hardlink/symlink
- `glob 11.0.0-11.0.3` — (dépendance transitive de `node-pg-migrate`)
- `flatted <=3.4.1` — (dépendance transitive)

**Vulnérabilité MODERATE :**
- `fastify 5.7.2-5.8.0` — Content-Type validation bypass (`GHSA-573f-x89g-hqp9`)

**Note de contexte** : `undici` et `tar` sont des dépendances transitives de l'outillage de développement/CI, pas du code applicatif Fastify. Le vecteur d'exploitation en production est limité. `fastify` lui-même est une dépendance directe de production.

**Note CI** : Le workflow `security.yml` utilise `--audit-level=critical` — il ne bloque pas sur les HIGH, ce qui explique que ces vulnérabilités aient pu rester non détectées.

---

## Vulnérabilité : npm audit — 5 vulnérabilités HIGH non adressées
**Sévérité** : Haute
**OWASP** : M2 — Supply Chain
**Composant** : racine monorepo (dépendances transitives), `apps/backend/package.json` (fastify direct)

### Description
`npm audit --workspaces` signale 5 vulnérabilités HIGH et 1 MODERATE. Parmi elles :
- `undici` (dépendance transitive Node.js) : HTTP smuggling et CRLF injection (GHSA-2mjp-6q6p-2qxm, GHSA-4992-7rv2-5vpq)
- `fastify 5.7.2-5.8.0` : bypass de validation du Content-Type (MODERATE, mais en production directe)

### Impact
Une mise à jour Node.js pourrait embarquer une version vulnérable d'`undici`. La vulnérabilité `fastify` pourrait permettre à un attaquant de contourner la validation du Content-Type sur les routes exposées.

### Recommandation
1. Exécuter `npm audit fix` depuis la racine pour adresser les vulnérabilités sans breaking changes
2. Pour `fastify` : mettre à jour vers `>=5.9.0` dans `apps/backend/package.json` (`npm install fastify@latest --workspace=apps/backend`)
3. Modifier le seuil CI dans `security.yml` : passer `--audit-level=critical` à `--audit-level=high` pour bloquer les HIGH en CI

---

## M3 — Authentification / Autorisation : RISQUE

### Vulnérabilité : Route admin non authentifiée exposée publiquement
**Sévérité** : Haute
**OWASP** : M3 — API9 (Improper Inventory Management) + API1 (BOLA)
**Composant** : `apps/backend/src/routes/admin.route.ts` — ligne 68-139

### Description
La route `POST /api/admin/daily-challenges/precompute` est enregistrée sans aucun mécanisme d'authentification ou d'autorisation. Le commentaire dans le code documente explicitement cette absence : `"Pas d'authentification en Phase 3 — accès réseau interne uniquement"`. Cependant, en production, rien dans la configuration actuelle ne garantit que cette route soit inaccessible publiquement (pas de middleware IP whitelist, pas de CORS restrictif, pas de Bearer token).

### Impact
Tout acteur externe ayant accès à l'URL du backend peut déclencher le pré-calcul des défis quotidiens de manière arbitraire. L'opération est idempotente (`ON CONFLICT DO UPDATE`) donc elle ne corrompt pas la base, mais elle :
- Consomme des ressources serveur et base de données
- Peut être utilisée pour forcer un re-calcul à un moment précis (manipulation du défi quotidien)
- Génère du trafic Wikipedia non souhaité

### Recommandation
Implémenter l'une des deux options documentées dans le code :

**Option A — Bearer token (recommandé)** :
```typescript
// Dans plugins/index.ts, ajouter un hook sur le préfixe /api/admin
app.addHook('onRequest', async (request, reply) => {
  if (request.url.startsWith('/api/admin')) {
    const auth = request.headers.authorization;
    const expectedToken = env.ADMIN_SECRET_TOKEN;
    if (!auth || auth !== `Bearer ${expectedToken}`) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  }
});
```
Ajouter `ADMIN_SECRET_TOKEN` dans `env.ts` (requis, pas de valeur par défaut).

**Option B — IP whitelist** : Configurer au niveau infrastructure (reverse proxy / load balancer) pour n'autoriser que les IPs internes sur `/api/admin/*`.

---

## M4 — Validation des entrées : CONFORME

Toutes les routes backend disposent d'un schéma Zod déclaré :
- `GET /api/game/random-pair` : `randomPairQuerySchema` (lang + difficulty) — CONFORME
- `GET /api/game/daily` : `dailyQuerySchema` (lang) — CONFORME
- `POST /api/admin/daily-challenges/precompute` : pas d'input querystring ni body (idempotent, sans paramètre) — CONFORME
- `GET /health` : pas d'input — CONFORME
- Validation Zod activée via `setValidatorCompiler` / `setSerializerCompiler` dans `app.ts` — CONFORME
- Les données JSONB lues depuis la base de données sont re-validées via `articleSummarySchema.safeParse()` avant d'être retournées — BONNE PRATIQUE

---

## M5 — Communication non sécurisée : BLOQUANT

### Vulnérabilité : URLs HTTP en clair hardcodées dans le code mobile
**Sévérité** : Critique — BLOQUANT (interdit soumission stores)
**OWASP** : M5 — Communication non sécurisée
**Composant** :
- `apps/mobile/src/services/daily-challenge.service.ts` — ligne 27
- `apps/mobile/src/hooks/useRandomPair.ts` — ligne 85
- `apps/mobile/src/hooks/useRefreshablePair.ts` — ligne 81

### Description
Trois fichiers du code mobile construisent des URLs de backend en dur avec le schéma HTTP et une IP locale de développement :
```
const BACKEND_BASE_URL = 'http://192.168.1.30:3000';
const url = `http://192.168.1.30:3000/api/game/random-pair?...`;
```

Ces URLs sont packagées dans le bundle JavaScript livré aux stores. En production, le trafic entre l'app et le backend transiterait en clair (HTTP), exposant les réponses API à toute interception réseau (attaque man-in-the-middle sur WiFi public).

De plus, l'IP `192.168.1.30` est une adresse de réseau local privé inaccessible depuis l'extérieur — l'app ne peut pas appeler le backend de production avec cette configuration.

**Ce finding constitue à lui seul un critère de refus lors de la soumission aux stores Apple et Google**, qui exigent HTTPS pour les communications réseau dans les apps de production.

### Impact
- En production : l'app est non fonctionnelle (IP locale injoignable)
- Si l'IP était corrigée mais HTTP conservé : données en clair, interceptables sur tout réseau non chiffré
- Refus de soumission iOS App Store (ATS — App Transport Security) et Play Store

### Recommandation
1. Créer un fichier de configuration centralisé `apps/mobile/src/config/api.config.ts` :
```typescript
// Lire depuis les variables d'environnement Expo (app.config.ts + EAS)
const BACKEND_BASE_URL = process.env['EXPO_PUBLIC_BACKEND_URL'] ?? 'http://localhost:3000';
export { BACKEND_BASE_URL };
```
2. Configurer `EXPO_PUBLIC_BACKEND_URL` dans :
   - `apps/mobile/.env.development` : `http://192.168.1.30:3000` (local dev)
   - `apps/mobile/.env.production` : `https://api.wikihop.app` (prod, HTTPS obligatoire)
3. Remplacer les 3 occurrences hardcodées par un import depuis `api.config.ts`
4. Mettre à jour `eas.json` pour injecter la variable selon le profil de build

---

## M6 — Contrôles de vie privée : CONFORME (avec transmission DPO)

Aucune PII collectée : pas d'authentification, pas de profil, pas de nom/email/IP utilisateur.

**Logs backend (Pino)** :
Les logs Fastify capturent des informations techniques (lang, date, poolSize, titleStart, titleTarget) mais aucune donnée personnelle identifiable. Les adresses IP ne sont pas loguées explicitement dans le code applicatif. CONFORME.

**Console.log mobile** :
De nombreux `console.error`/`console.warn` sont présents dans le code mobile (voir M10). Leur contenu se limite aux messages d'erreur techniques (clés AsyncStorage, codes d'erreur) — aucune PII détectée dans les messages loggés. CONFORME sur le fond, mais la volumétrie est à surveiller (voir M10).

**Transmission DPO** : Le module `daily-completion.service.ts` persiste une date de complétion du défi quotidien en AsyncStorage. Cette information constitue un comportement utilisateur (habitude de jeu). À évaluer par le DPO dans le cadre de la documentation RGPD de Phase 4.

---

## M7 — Protections binaires : CONFORME

- `app.json` : `"userInterfaceStyle": "automatic"`, pas de `"developmentClient"` ni de flag debug en dehors du profil `development` de `eas.json` — CONFORME
- `eas.json` : le profil `production` utilise `"developmentClient": false` et `"distribution": "store"` — CONFORME
- Pas de mode debug forcé détecté

---

## M8 — Falsification / Intégrité : CONFORME

Le hash déterministe `djb2Hash(date:lang)` pour le défi quotidien est calculé côté serveur. Aucune logique d'intégrité ne repose sur des données fournies par le client. CONFORME.

---

## M9 — Reverse Engineering : INFO

WikiHop est une app de jeu public sans données sensibles côté client. Le risque de reverse engineering est minimal dans ce contexte. Le code JavaScript React Native est bundlé (non minifié par défaut en développement, obfusqué par Metro/Hermes en production). Aucune action requise pour Phase 4.

---

## M10 — Fonctionnalités superflues : BLOQUANT

### Vulnérabilité : Reactotron (outil de debug) inclus dans le bundle de production
**Sévérité** : Critique — BLOQUANT (interdit soumission stores)
**OWASP** : M10 — Extraneous Functionality
**Composant** : `apps/mobile/index.ts` — ligne 10, `apps/mobile/src/config/ReactotronConfig.ts`

### Description
`ReactotronConfig.ts` est importé **inconditionnellement** dans `index.ts` (point d'entrée de l'app). L'outil Reactotron est un debugger réseau qui établit une connexion TCP sortante vers `192.168.1.30` port 8081 (par défaut). Bien que le code soit conditionné par `if (__DEV__)`, le module `reactotron-react-native` est inclus dans le bundle de production.

Problèmes identifiés :
1. Le bundle de production embarque la librairie Reactotron (~300KB supplémentaires)
2. En production, `__DEV__ === false` donc la connexion n'est pas établie, mais le module est présent
3. Les soumissions App Store peuvent être rejetées si des outils de debug réseaux sont détectés dans le binaire
4. La présence de `ReactotronConfig.ts` dans `index.ts` (sans commentaire indiquant que c'est dev-only) est une surface de risque non documentée pour les futures refactorisations

### Impact
- Rejet potentiel lors de la review App Store (Apple détecte les modules de debug)
- Surface d'attaque theorique si une vulnérabilité Reactotron était découverte
- Bundle gonflé inutilement en production

### Recommandation
Deux approches possibles :

**Option A — Import conditionnel (recommandé)** :
```typescript
// index.ts
if (__DEV__) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./src/config/ReactotronConfig');
}
```
Metro/Hermes élimine les blocs `if (__DEV__)` (dead code elimination) lors du build de production.

**Option B — Suppression complète** : Retirer Reactotron si d'autres outils de debug suffisent (React Native Debugger, Flipper).

---

### Vulnérabilité : Console.log de production dans le code mobile
**Sévérité** : Moyenne
**OWASP** : M10 — Extraneous Functionality
**Composant** : Multiples fichiers dans `apps/mobile/src/`

### Description
22 occurrences de `console.error`/`console.warn` sont présentes dans le code mobile de production (hors tests). Ces logs sont visibles dans les outils de debug de l'appareil et potentiellement capturés par des crash reporters tiers.

Fichiers principaux concernés :
- `HomeScreen.tsx` (lignes 327, 363) : `console.error` sur des erreurs de navigation
- `score-storage.service.ts` (multiple) : erreurs AsyncStorage
- `game.store.ts` (lignes 150, 289, 364) : erreurs AsyncStorage

### Impact
Dans le contexte WikiHop (pas de PII), le risque concret est faible. Les messages loggés sont des erreurs techniques sans données sensibles. Cependant, ces logs peuvent :
- Être capturés par des outils d'analyse (Crashlytics, Sentry) sans consentement explicite
- Indiquer des chemins de code ou états internes à un attaquant avec accès physique à l'appareil

### Recommandation
Pour la production, conditionner les `console.error`/`console.warn` avec `__DEV__` ou utiliser un service de logging unifié (ex: Sentry) qui respecte les préférences RGPD. Action non bloquante pour les stores, mais à traiter en Phase 4.

---

## API4 — Rate Limiting : RISQUE

### Vulnérabilité : Aucun rate limiting sur les routes exposées
**Sévérité** : Haute
**OWASP** : API4 — Unrestricted Resource Consumption
**Composant** : `apps/backend/src/plugins/index.ts`, toutes les routes

### Description
Aucun mécanisme de rate limiting n'est configuré sur le backend Fastify. Les routes `GET /api/game/random-pair`, `GET /api/game/daily`, et `POST /api/admin/daily-challenges/precompute` sont exposées sans limite de requêtes par IP.

Chaque appel à `/api/game/random-pair` ou `/api/game/daily` génère jusqu'à 5 appels vers l'API Wikipedia (retry loop). Un attaquant peut donc amplifier son trafic vers Wikipedia en ciblant le backend WikiHop.

### Impact
- Épuisement des ressources serveur (CPU, connexions DB, descripteurs réseau)
- Risque de bannissement IP par Wikimedia si le trafic Wikipedia généré par WikiHop est trop élevé
- La route `/api/admin/daily-challenges/precompute` est particulièrement exposée (non authentifiée + coûteuse)

### Recommandation
Installer `@fastify/rate-limit` et configurer dans `plugins/index.ts` :
```typescript
import rateLimit from '@fastify/rate-limit';

// Rate limit global : 60 req/min par IP (recommandation OWASP API4)
void app.register(rateLimit, {
  max: 60,
  timeWindow: '1 minute',
  errorResponseBuilder: (_req, context) => ({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Trop de requêtes. Limite : ${context.max} req/${context.after}.`,
    },
  }),
});
```
Recommandation spécifique pour `/api/admin/*` : 10 req/min max.

---

## API8 — Security Misconfiguration : RISQUE

### Vulnérabilité : Helmet absent — headers HTTP de sécurité manquants
**Sévérité** : Haute
**OWASP** : API8 — Security Misconfiguration
**Composant** : `apps/backend/src/plugins/index.ts`

### Description
Le plugin `@fastify/helmet` n'est pas installé ni configuré. Les headers HTTP de sécurité standards sont absents des réponses du backend :
- `Strict-Transport-Security` (HSTS)
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Content-Security-Policy`
- `Referrer-Policy`

Actuellement, seul `@fastify/cors` est configuré, avec `origin: true` (reflect request origin) — ce qui est permissif pour la production.

### Impact
Sans HSTS, un client HTTP qui contacte le serveur n'est pas forcé vers HTTPS. Sans X-Content-Type-Options, des navigateurs anciens peuvent interpréter les réponses JSON comme du HTML exécutable. L'absence de CSP expose les clients web éventuels à des injections.

### Recommandation
1. Installer `@fastify/helmet` :
```
npm install @fastify/helmet --workspace=apps/backend
```
2. Configurer dans `plugins/index.ts` :
```typescript
import helmet from '@fastify/helmet';

void app.register(helmet, {
  contentSecurityPolicy: false, // API REST — pas de HTML servi
});
```
3. Restreindre CORS en production : remplacer `origin: true` par la liste des origines autorisées (domaine de l'app mobile ou `false` si l'API n'est appelée que par l'app native).

---

## P-04 — Secrets Management

### Audit fichiers .env commitées

| Vérification | Résultat |
|---|---|
| `.env` réel commité dans git | Aucun `.env` réel détecté — CONFORME |
| `.env.example` commité avec valeurs de dev documentées | CONFORME (valeurs fictives ou locales de dev) |
| `.gitignore` exclut `.env`, `.env.local`, `.env.*.local` | CONFORME |
| `.gitignore` autorise explicitement `.env.example` (`!.env.example`) | CONFORME |

### Audit historique git

Deux commits ont ajouté des fichiers `.env.example` :
- `336dfc6` : `.env.example` racine (credentials Docker de dev : `wikihop/wikihop`) — ACCEPTABLE (valeurs de dev documentées, non secrètes)
- `536e60e` : `apps/backend/.env.example` (même pattern) — ACCEPTABLE
- `1e6a6c7` : `apps/mobile/.env.example` (token Expo placeholder `your_expo_token_here`) — CONFORME

Aucun secret réel détecté dans l'historique git.

### Variables d'environnement — validation

`apps/backend/src/env.ts` utilise Zod pour valider toutes les variables au démarrage :
- `DATABASE_URL` : requis, validé comme URL — CONFORME (pas de valeur par défaut)
- `NODE_ENV` : default `development` — CONFORME
- `LOG_LEVEL` : default `info` — CONFORME
- Accès à `process.env` centralisé dans ce module uniquement — BONNE PRATIQUE

**Réserve** : `NODE_ENV` a un default `development` dans `env.ts`. Si une variable d'env est mal configurée en prod et que `NODE_ENV` n'est pas défini explicitement, le serveur démarrera en mode développement (logger pino-pretty, comportements de debug potentiels). Recommandation : supprimer le `.default('development')` pour forcer une déclaration explicite de `NODE_ENV` en production.

### GitHub Actions CI

Le workflow `ci.yml` hardcode `DATABASE_URL: postgresql://wikihop_test:wikihop_test@localhost:5432/wikihop_test` directement dans le YAML — ACCEPTABLE (credentials de test éphémères, base temporaire CI, pas de données réelles).

Le workflow `security.yml` utilise `--audit-level=critical` au lieu de `--audit-level=high` — voir finding M2.

---

## Checklist pré-production

- [x] Aucune clé, secret ou credential détecté dans le code source ou l'historique Git
- [x] Variables d'environnement backend validées via Zod
- [x] `.gitignore` correctement configuré pour les `.env`
- [ ] `npm audit` sans vulnérabilités hautes — **5 HIGH en cours**
- [ ] Rate limiting configuré — **absent**
- [ ] Headers HTTP sécurisés (Helmet) — **absent**
- [ ] Route admin authentifiée — **absente**
- [ ] URLs backend HTTPS en production — **HTTP hardcodé**
- [ ] Reactotron conditionné hors bundle production — **inclus inconditionnellement**

---

## Synthèse et priorités

### Findings bloquants (à corriger avant soumission stores)

| # | Finding | Fichier | Action |
|---|---------|---------|--------|
| 1 | URLs HTTP hardcodées + IP locale | `useRandomPair.ts`, `useRefreshablePair.ts`, `daily-challenge.service.ts` | Centraliser en variable d'env Expo (`EXPO_PUBLIC_BACKEND_URL`), HTTPS en prod |
| 2 | Reactotron dans bundle production | `index.ts` | Conditionner l'import avec `if (__DEV__)` |

### Findings haute priorité (à corriger avant mise en production)

| # | Finding | Fichier | Action |
|---|---------|---------|--------|
| 3 | Route admin non authentifiée | `admin.route.ts` | Bearer token ou IP whitelist |
| 4 | Aucun rate limiting | `plugins/index.ts` | `@fastify/rate-limit` — 60 req/min |
| 5 | Helmet absent | `plugins/index.ts` | `@fastify/helmet` + restreindre CORS |
| 6 | 5 vulnérabilités HIGH npm | Racine monorepo | `npm audit fix` + fastify upgrade |

### Findings informatifs (bonnes pratiques Phase 4)

| # | Finding | Action |
|---|---------|--------|
| 7 | Console.log en production | Conditionner avec `__DEV__` ou utiliser Sentry |
| 8 | `NODE_ENV` avec valeur par défaut `development` | Supprimer `.default('development')` dans `env.ts` |
| 9 | CI security.yml audit-level=critical | Passer à `--audit-level=high` |
| 10 | Données de completion quotidienne (AsyncStorage) | Transmission DPO pour évaluation RGPD |

---

## Actions DPO — À transmettre à Maïté

Le service `daily-completion.service.ts` persiste en AsyncStorage la date de la dernière complétion du défi quotidien. Cette donnée constitue un historique de comportement utilisateur (habitude de jeu quotidienne). Bien que non nominative, elle est à évaluer dans le cadre de la documentation RGPD Phase 4 : base légale de traitement, durée de conservation, information utilisateur.
