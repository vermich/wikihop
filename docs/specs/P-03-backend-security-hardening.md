# Spec technique — P-03 : Sécurisation du backend

**Destinataire :** Julien (Backend Dev)
**Story :** `docs/stories/P-03-backend-security-hardening.md`
**Branche :** `feat/julien-P03-backend-security`
**PR cible :** `develop`

---

## 1. Contexte

Le backend WikiHop (Fastify 5.7.4) est actuellement dépourvu de headers de sécurité HTTP, de
rate limiting et d'une gestion d'erreur robuste en production. Cette spec couvre les quatre axes
à sécuriser avant la mise en production (Phase 4).

**Point CORS important :** Une app React Native native n'envoie pas d'en-tête `Origin` HTTP — le
CORS ne la concerne pas. Le CORS s'applique uniquement à un éventuel accès depuis un navigateur
web (WebView ou futur frontend). La configuration `origin: true` peut donc être conservée, mais
elle doit être conditionnelle à l'environnement et explicitement documentée.

---

## 2. Périmètre

**Dans scope :**
- Installation et configuration de `@fastify/helmet` (headers sécurité)
- Configuration CORS conditionnelle (dev vs production)
- Installation et configuration de `@fastify/rate-limit` (60 req/min par IP)
- Hook `setErrorHandler` pour masquer les stack traces en production
- Variables d'environnement supplémentaires dans `env.ts`
- Tests Supertest (alongside) couvrant les nouveaux comportements

**Hors scope :**
- Authentification / JWT (story séparée)
- WAF / protection DDoS niveau infrastructure
- Audit des routes existantes (pas de refactor)

---

## 3. Packages à installer

Versions vérifiées compatibles Fastify 5 (`fastify-plugin: ^5.0.0`) :

```bash
# Dans apps/backend/
npm install @fastify/helmet@^13.0.2 @fastify/rate-limit@^10.3.0
```

Ajouter dans `apps/backend/package.json` → section `dependencies` :

```json
"@fastify/helmet": "^13.0.2",
"@fastify/rate-limit": "^10.3.0"
```

---

## 4. Variables d'environnement — `env.ts`

Ajouter les deux variables suivantes dans le schéma Zod existant de `apps/backend/src/env.ts` :

```typescript
/**
 * Origines CORS autorisées en production.
 * Valeur : chaîne URL unique ou liste séparée par des virgules.
 * Ex : "https://api.wikihop.app" ou "https://api.wikihop.app,https://admin.wikihop.app"
 * Non requis en développement (origin: true est utilisé par défaut).
 * Note : une app React Native native n'envoie pas d'en-tête Origin —
 * cette variable ne concerne qu'un éventuel frontend web.
 */
CORS_ORIGIN: z
  .string()
  .optional(),

/**
 * Nombre maximum de requêtes par IP par fenêtre de 60 secondes.
 * Défaut : 60
 */
RATE_LIMIT_MAX: z
  .string()
  .regex(/^\d+$/, 'RATE_LIMIT_MAX doit être un entier positif')
  .transform(Number)
  .default('60'),
```

**Mise à jour du type `Env` :** le type est inféré via `z.infer<typeof envSchema>` — pas de
modification manuelle nécessaire.

---

## 5. Configuration des plugins — `plugins/index.ts`

Réécrire entièrement `apps/backend/src/plugins/index.ts` comme suit :

### 5.1 Imports

```typescript
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';

import { env } from '../env';
```

### 5.2 Helmet — headers de sécurité HTTP

L'API ne sert que du JSON, pas de HTML. La CSP est minimaliste.

```typescript
await app.register(helmet, {
  // CSP minimaliste pour une API REST pure JSON (pas de rendu HTML)
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
    },
  },
  // HSTS : 1 an, inclure les sous-domaines
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
  // Désactiver crossOriginEmbedderPolicy — non pertinent pour une API JSON
  crossOriginEmbedderPolicy: false,
});
```

Justification des directives helmet :
- `X-Frame-Options: DENY` — activé par défaut par helmet
- `X-Content-Type-Options: nosniff` — activé par défaut
- `Referrer-Policy: no-referrer` — activé par défaut
- `X-DNS-Prefetch-Control: off` — activé par défaut
- `crossOriginEmbedderPolicy: false` — désactivé car il bloque les appels cross-origin légitimes
  d'une API publique

### 5.3 CORS

```typescript
const corsOrigin: boolean | string | string[] =
  env.NODE_ENV === 'production' && env.CORS_ORIGIN !== undefined
    ? env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : true;

await app.register(cors, {
  // En production : liste d'origines depuis CORS_ORIGIN (pour un éventuel frontend web).
  // En développement ou si CORS_ORIGIN absent : reflect origin (comportement actuel).
  // Note : les apps React Native natives n'envoient pas d'en-tête Origin —
  // cette config ne les affecte pas.
  origin: corsOrigin,
  credentials: false,
});
```

### 5.4 Rate limiting

```typescript
await app.register(rateLimit, {
  max: env.RATE_LIMIT_MAX,
  timeWindow: '1 minute',
  // Réponse 429 normalisée en JSON — cohérente avec le format ApiError de @wikihop/shared
  errorResponseBuilder: (_request, context) => ({
    statusCode: 429,
    error: 'Too Many Requests',
    message: `Limite de requêtes atteinte. Réessayez dans ${Math.ceil(context.ttl / 1000)} secondes.`,
  }),
  // Exclure la route /health des compteurs — elle est appelée fréquemment par les health checks
  keyGenerator: (request) => request.ip,
  // Ne pas appliquer le rate limit aux health checks
  allowList: (request) => request.routeOptions.url === '/health',
});
```

**Attention :** `@fastify/rate-limit` doit être enregistré **avant** les routes. L'ordre dans
`registerPlugins` doit être : helmet → cors → rateLimit.

### 5.5 Signature de `registerPlugins`

`registerPlugins` doit devenir `async` car les enregistrements de plugins utilisent `await` :

```typescript
export async function registerPlugins(app: FastifyInstance): Promise<void> {
  // ... (voir sections 5.2, 5.3, 5.4)
}
```

**Mise à jour `app.ts` :** l'appel `registerPlugins(app)` dans `buildApp()` utilise actuellement
`void` (fire-and-forget). Avec le passage à async, il faut adapter `buildApp()` pour attendre la
promesse. La solution recommandée : utiliser le hook `onReady` ou enregistrer les plugins dans un
plugin Fastify encapsulé. La voie la plus simple est de passer `registerPlugins` dans un bloc
`app.register` :

```typescript
// Dans buildApp(), remplacer :
registerPlugins(app);

// Par :
await app.register(async (instance) => {
  await registerPlugins(instance);
});
```

Alternativement, si `buildApp()` reste synchrone, conserver l'approche `void` mais avec les
`register()` chaînés sans `await` (Fastify gère la file d'initialisation en interne via
`fastify-plugin`). Dans ce cas, les `await` dans `registerPlugins` doivent devenir des
`void app.register(...)`. Choisir l'approche cohérente avec le style du fichier `app.ts` existant.

**Recommandation :** conserver le style actuel `void app.register(...)` sans async/await dans
`registerPlugins` — Fastify garantit l'ordre d'initialisation des plugins. Cela évite de modifier
`app.ts`.

---

## 6. Gestion des erreurs — `app.ts`

Ajouter un `setErrorHandler` dans `buildApp()`, après `registerRoutes(app)` :

```typescript
// Masquer les stack traces en production — ne jamais exposer les internals
app.setErrorHandler((error, _request, reply) => {
  const isProduction = env.NODE_ENV === 'production';

  app.log.error(
    {
      err: error,
      statusCode: error.statusCode ?? 500,
    },
    'Request error',
  );

  const statusCode = error.statusCode ?? 500;

  void reply.status(statusCode).send({
    statusCode,
    error: error.name ?? 'Internal Server Error',
    // En production : message générique. En dev/test : message réel pour le débogage.
    message: isProduction && statusCode >= 500
      ? 'Une erreur interne est survenue.'
      : (error.message ?? 'Internal Server Error'),
    // Stack trace uniquement en développement
    ...(isProduction ? {} : { stack: error.stack }),
  });
});
```

**Points de vigilance :**
- Les erreurs de validation Zod (400) passent par ce handler — ne pas les masquer.
- Les erreurs 429 du rate limiter ont leur propre `errorResponseBuilder` — elles ne passent pas
  par `setErrorHandler`.
- Ne jamais logger `error.stack` séparément — Pino sérialise l'objet `err` complet, ce qui inclut
  la stack dans les logs internes sans l'exposer au client.

---

## 7. Vérification des logs Pino

Pino ne logue pas de données sensibles par défaut. Confirmer en lisant `buildApp()` :

- Les logs Pino dans `app.ts` utilisent `env.LOG_LEVEL` — pas d'accès direct à `process.env`
  ailleurs. ✓
- Le logger Fastify intégré (Pino) logue automatiquement les requêtes entrantes avec `method`,
  `url`, `statusCode`, `responseTime` — pas de body, pas de headers sensibles. ✓
- Aucun `console.log` dans le code source. ✓

**Action requise :** ajouter un commentaire dans `app.ts` confirmant que Pino ne logue pas les
corps de requête (`serializers` non configurés = comportement par défaut safe). Pas de code à
modifier.

---

## 8. Tests à écrire — Supertest (alongside)

Créer `apps/backend/__tests__/security.test.ts`.

### 8.1 Structure du fichier de test

```typescript
/**
 * security.test.ts — Tests d'intégration sécurité
 *
 * Couvre :
 * - Headers Helmet présents sur toutes les réponses
 * - Rate limiting : 429 après dépassement du seuil
 * - Gestion d'erreur : pas de stack trace en production
 */

import supertest from 'supertest';
import { buildApp } from '../src/app';
```

### 8.2 Cas de test obligatoires

**Headers Helmet :**
```
describe('Security headers (Helmet)', () => {
  it('should set X-Content-Type-Options: nosniff on every response')
  it('should set X-Frame-Options: SAMEORIGIN or DENY on every response')
  it('should set Referrer-Policy header')
  it('should set Strict-Transport-Security header')
  it('should set Content-Security-Policy header')
})
```

**Rate limiting :**
```
describe('Rate limiting', () => {
  it('should return 200 for the first N requests under the limit')
  it('should return 429 with JSON body after exceeding max requests per window')
  it('should include statusCode: 429 and message in the 429 response body')
  it('should not apply rate limit to GET /health')
})
```

**Important pour le test rate limiting :** en environnement de test, le seuil par défaut est 60.
Pour tester le comportement 429 sans envoyer 60 requêtes, instancier `buildApp()` avec une
configuration `RATE_LIMIT_MAX=2` via une variable d'environnement dans le test, ou extraire la
configuration du rate limit pour permettre l'injection en test. Approche recommandée : lire
`RATE_LIMIT_MAX` depuis `env`, et dans le test overrider `process.env.RATE_LIMIT_MAX = '2'`
**avant** l'import de `env.ts`. Utiliser `jest.isolateModules()` ou un describe bloc dédié avec
un `buildApp()` séparé.

**Gestion d'erreur :**
```
describe('Error handler', () => {
  it('should return JSON with statusCode and message on unknown route (404)')
  it('should not expose stack trace in response body when NODE_ENV=production')
  it('should include stack trace in response body when NODE_ENV=development')
})
```

Pour le test production/development, utiliser `jest.isolateModules()` avec
`process.env.NODE_ENV = 'production'` ou `'development'` pour recréer une instance `buildApp()`
avec le bon environnement.

### 8.3 Pattern de test Helmet (exemple)

```typescript
it('should set X-Content-Type-Options: nosniff', async () => {
  const response = await supertest(app.server).get('/health');
  expect(response.headers['x-content-type-options']).toBe('nosniff');
});
```

---

## 9. Critères de qualité (code review)

- [ ] `@fastify/helmet` et `@fastify/rate-limit` présents dans `package.json` dependencies
- [ ] Variables `CORS_ORIGIN` et `RATE_LIMIT_MAX` validées par Zod dans `env.ts`
- [ ] Ordre d'enregistrement des plugins : helmet → cors → rateLimit
- [ ] `setErrorHandler` dans `buildApp()` — stack trace masquée en production
- [ ] Zéro `any` non justifié dans les nouveaux fichiers
- [ ] Exports nommés (pas de default export sauf navigateurs React Navigation)
- [ ] Tests Supertest présents et passants (`npm test`)
- [ ] `tsc --noEmit` sans erreur
- [ ] `npm run lint` sans erreur
- [ ] Tests existants non régressés (en particulier `health.test.ts`, `game.route.test.ts`)

---

## 10. Points de vigilance

1. **`void app.register()` vs `await app.register()`** : Fastify garantit l'ordre d'initialisation
   via sa file interne. Les `void` sont intentionnels et corrects dans `registerPlugins`. Ne pas
   mélanger `await` et `void` sur les `register()` dans la même fonction.

2. **Helmet et les routes de test** : Helmet est un plugin global — tous les tests Supertest
   existants recevront les nouveaux headers. Vérifier qu'aucun test ne fait `toBe(undefined)` sur
   un header que Helmet va désormais renseigner.

3. **`errorResponseBuilder` du rate limiter** : la propriété `context.ttl` est en millisecondes.
   `Math.ceil(context.ttl / 1000)` pour afficher des secondes.

4. **`allowList` dans rate-limit** : la fonction reçoit un `FastifyRequest`. Accéder à
   `request.routeOptions.url` pour obtenir le pattern de route (ex: `'/health'`), pas l'URL
   réelle de la requête.

5. **TypeScript et `@fastify/rate-limit`** : le type de `context` dans `errorResponseBuilder` est
   `{ max: number; ttl: number }`. Importer `RateLimitExceeded` depuis `@fastify/rate-limit` si
   nécessaire, ou typer inline — vérifier les types exportés du package.

6. **CORS en test** : `origin: true` s'applique en test (NODE_ENV=test, pas production). Les tests
   existants ne sont pas affectés.

7. **`setErrorHandler` et les erreurs de validation Zod** : Fastify envoie les erreurs de
   validation avec `statusCode: 400` et `error.validation` peuplé. Le handler doit laisser passer
   le `message` Zod (il n'est pas sensible) — la condition `statusCode >= 500` pour le masquage
   le garantit.
