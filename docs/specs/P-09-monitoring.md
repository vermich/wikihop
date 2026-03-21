# Spec technique — P-09 : Monitoring et alerting

## Contexte

Story : `docs/stories/P-09-monitoring.md`
Phase 4 — Infrastructure de production.

Le `/health` actuel retourne `{ status: 'ok', timestamp, version }` sans vérifier l'état de la base de données. En production, un `/health` qui répond 200 alors que la DB est inaccessible est trompeur — les health checks load balancer valident le service à tort. Cette spec enrichit l'endpoint avec un check DB et documente la configuration monitoring externe.

Fichier concerné : `apps/backend/src/routes/health.route.ts`

---

## Périmètre

### Dans scope

- Modification de `apps/backend/src/routes/health.route.ts` : ajout du check DB avec latence
- Tests unitaires et d'intégration du nouvel endpoint
- Création de `docs/ops/monitoring-setup.md`

### Hors scope

- Intégration de métriques Prometheus / OpenTelemetry (hors stack Phase 4)
- Dashboard Grafana ou similaire (hors scope budget Phase 4)
- Configuration effective des services tiers (Uptime Robot, Logtail) — documentée, pas automatisée

---

## Architecture proposée

### Schéma de réponse enrichi

Remplacer le `healthResponseSchema` actuel par :

```typescript
// apps/backend/src/routes/health.route.ts

import { pool } from '../db';

const healthDbSchema = z.object({
  status: z.enum(['ok', 'error']),
  latencyMs: z.number().optional(),
});

const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  timestamp: z.string().datetime(),
  version: z.string(),
  db: healthDbSchema,
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type HealthDbStatus = z.infer<typeof healthDbSchema>;
```

**Invariants de comportement :**

| Situation | `status` global | `db.status` | `db.latencyMs` | HTTP |
|-----------|----------------|-------------|----------------|------|
| DB répond en < 500ms | `'ok'` | `'ok'` | N (ms mesurés) | 200 |
| DB répond en >= 500ms | `'degraded'` | `'ok'` | N (ms mesurés) | 200 |
| DB inaccessible (erreur) | `'degraded'` | `'error'` | absent | 200 |

**Le code HTTP est toujours 200.** Les health checks des load balancers et d'Uptime Robot se basent sur le code HTTP. Un 500 ferait couper le trafic immédiatement alors qu'un état dégradé peut être transitoire. La logique d'alerte est dans le corps JSON.

### Logique de check DB

La vérification utilise `pool.query()` (pas `pool.connect()` / `client.release()`) pour mesurer la latence complète depuis le pool :

```typescript
async function checkDb(): Promise<HealthDbStatus> {
  const start = Date.now();
  try {
    await pool.query('SELECT 1');
    const latencyMs = Date.now() - start;
    return {
      status: 'ok',
      latencyMs,
    };
  } catch {
    return { status: 'error' };
  }
}
```

La fonction `checkDb` est une **fonction pure testable** — extraire en dehors du handler pour faciliter les tests unitaires avec mock de `pool`.

**Seuil de dégradation** : 500ms. Au-delà, `status` global passe à `'degraded'` même si la DB a répondu. Ce seuil est une constante nommée `DB_LATENCY_WARN_MS = 500` définie dans le fichier.

### Handler modifié

```typescript
async (): Promise<HealthResponse> => {
  const dbStatus = await checkDb();
  const isOk = dbStatus.status === 'ok' && (dbStatus.latencyMs ?? 0) < DB_LATENCY_WARN_MS;

  return {
    status: isOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env['npm_package_version'] ?? '0.0.0',
    db: dbStatus,
  };
}
```

### Import à ajouter

```typescript
import { pool } from '../db';
```

Le pool est déjà exporté depuis `src/db/index.ts`. Pas de nouveau module à créer.

---

## TDD — fonctions pures à tester en premier

Julien doit écrire les tests de `checkDb` **avant** l'implémentation du handler.

### Fichier de test : `apps/backend/src/routes/__tests__/health.route.test.ts`

#### Tests unitaires de `checkDb` (avec mock `pool`)

```typescript
// Setup : jest.mock('../../../db', () => ({ pool: { query: jest.fn() } }))

describe('checkDb()', () => {
  it('retourne status ok avec latencyMs quand pool.query réussit')
  it('retourne status error sans latencyMs quand pool.query throw')
  it('latencyMs est un nombre positif (>= 0)')
})
```

#### Tests d'intégration du endpoint `/health` (Supertest + vraie DB)

```typescript
describe('GET /health', () => {
  it('retourne HTTP 200 dans tous les cas (DB up)')
  it('retourne status ok quand DB répond normalement')
  it('retourne status degraded quand DB inaccessible — HTTP reste 200')
  it('db.latencyMs est présent et >= 0 quand db.status est ok')
  it('timestamp est une date ISO 8601 valide')
  it('version est une string non vide')
  it('le schéma Zod est respecté — aucun champ supplémentaire')
})
```

Pour tester le cas "DB inaccessible", remplacer temporairement `pool.query` par un mock qui throw dans le test d'intégration (pas besoin d'arrêter PostgreSQL).

---

## Critères de qualité (code review)

- [ ] `checkDb` est extraite du handler et testable indépendamment
- [ ] `DB_LATENCY_WARN_MS` est une constante nommée (pas un magic number)
- [ ] `status: 'degraded'` si DB inaccessible — jamais de throw non catchée dans le handler
- [ ] HTTP 200 dans tous les cas — pas de `reply.status(503)` sur DB error
- [ ] `db.latencyMs` est absent (non `undefined` explicite) quand `db.status === 'error'` — `exactOptionalPropertyTypes` oblige à ne pas assigner `undefined` à un champ `optional`
- [ ] Les tests couvrent le cas d'erreur DB (pas uniquement le happy path)
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur

### Point de vigilance `exactOptionalPropertyTypes`

Le tsconfig backend a `exactOptionalPropertyTypes: true`. Le champ `latencyMs?: number` ne peut pas recevoir `undefined` explicite. Le retour de `checkDb` en cas d'erreur doit être :

```typescript
// Correct
return { status: 'error' };

// Incorrect — refusé par tsc avec exactOptionalPropertyTypes
return { status: 'error', latencyMs: undefined };
```

---

## Points de vigilance

1. **`pool.query` vs `checkDatabaseConnection`** : `checkDatabaseConnection` dans `db/index.ts` utilise `pool.connect()` + `client.release()`. Pour le health check, utiliser directement `pool.query('SELECT 1')` qui mesure la latence de bout en bout (acquisition connexion + exécution).
2. **Timeout du check DB** : `pool` a un `connectionTimeoutMillis: 2000`. Si la DB est inaccessible, le check peut bloquer 2s avant de throw. C'est acceptable — le `/health` est un endpoint de monitoring, pas sur le critical path.
3. **Pas de `console.log`** : utiliser `request.log` (logger Fastify injecté dans le handler) si un log est nécessaire. Le handler n'a pas accès à `app.log` directement mais `request.log` est disponible.

---

## Fichier à créer : `docs/ops/monitoring-setup.md`

Julien crée ce fichier en même temps que la modification de la route.

---

## Branche

`feat/julien-P09-monitoring`
