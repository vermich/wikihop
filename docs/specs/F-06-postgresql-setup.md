# Spec technique — F-06 : Configuration PostgreSQL

**Destinataire :** Backend Dev — Julien
**Story :** [F-06](../stories/F-06-postgresql-setup.md)
**Références ADR :** ADR-002 (stack — pg direct, pas d'ORM)
**Branche à créer :** `feat/backend-postgresql-setup`
**PR cible :** `develop`
**Prérequis :** F-05 doit être complété (serveur Fastify opérationnel)

---

## Contexte

PostgreSQL 15+ est la base de données de WikiHop. La décision d'utiliser `node-postgres` (pg) directement plutôt qu'un ORM est documentée dans ADR-002. Les migrations sont gérées par `node-pg-migrate` — des fichiers SQL versionnés en source control.

---

## Périmètre

### Dans le scope de F-06
- Client `pg` configuré comme plugin Fastify
- `src/db/index.ts` : pool de connexions avec typage TypeScript
- Premier fichier de migration : création de la table `game_sessions`
- Variable `DATABASE_URL` ajoutée dans `env.ts` et `.env.example`
- Test de connexion au démarrage du serveur
- Script npm `db:migrate` pour appliquer les migrations

### Hors scope de F-06
- Docker Compose (F-11)
- Requêtes métier (Phase 2)
- Indexes de performance (Phase 4)

---

## Structure de fichiers

```
apps/backend/
├── src/
│   ├── env.ts              ← ajouter DATABASE_URL
│   └── db/
│       ├── index.ts        ← pool pg exporté
│       ├── migrate.ts      ← script d'exécution des migrations
│       └── migrations/
│           └── 001_initial_schema.sql
└── __tests__/
    └── db.test.ts          ← test de connexion (avec env TEST)
```

---

## `src/env.ts` — Mise à jour

Ajouter `DATABASE_URL` au schéma Zod existant :

```typescript
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('3000'),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().url(),  // ← AJOUTER (obligatoire)
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});
```

---

## `src/db/index.ts` — Pool de connexions

```typescript
import { Pool } from 'pg';

import { env } from '../env';

/**
 * Pool de connexions PostgreSQL partagé.
 * Fastify enregistre ce pool comme plugin (décorateur).
 *
 * ADR-002 : node-postgres direct, pas de Prisma/Knex.
 * Toutes les requêtes utilisent des paramètres nommés ($1, $2...) — jamais d'interpolation string.
 */
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,               // Connexions max dans le pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * Wrapper typé pour exécuter une requête SQL.
 * Utilise systématiquement les paramètres préparés.
 */
export async function query<T extends object = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await pool.query<T>(sql, params);
  return result.rows;
}

/**
 * Vérification de la connexion au démarrage.
 * Appelé dans app.ts avant le listen.
 */
export async function checkDatabaseConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}
```

---

## `src/app.ts` — Intégration du check de connexion

Ajouter dans `buildApp()` après l'enregistrement des plugins :

```typescript
// Vérification de la connexion BDD avant d'accepter du trafic
app.addHook('onReady', async () => {
  await checkDatabaseConnection();
  app.log.info('Database connection verified');
});
```

---

## `src/db/migrations/001_initial_schema.sql`

```sql
-- Migration 001 : Schéma initial WikiHop
-- Créé le 2026-03-01

CREATE TABLE IF NOT EXISTS game_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_article_id    TEXT NOT NULL,
  start_article_title TEXT NOT NULL,
  start_article_url   TEXT NOT NULL,
  target_article_id   TEXT NOT NULL,
  target_article_title TEXT NOT NULL,
  target_article_url   TEXT NOT NULL,
  language    TEXT NOT NULL DEFAULT 'fr',
  path        JSONB NOT NULL DEFAULT '[]'::jsonb,
  jumps       INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'in_progress'
              CHECK (status IN ('in_progress', 'won', 'abandoned')),
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_game_sessions_started_at ON game_sessions(started_at DESC);

-- Table de migration pour node-pg-migrate
-- (node-pg-migrate gère sa propre table pgmigrations)
```

---

## `src/db/migrate.ts` — Script de migration

```typescript
import * as path from 'path';
import * as url from 'url';
import runner from 'node-pg-migrate';

import { env } from '../env';

async function migrate(): Promise<void> {
  await runner({
    databaseUrl: env.DATABASE_URL,
    migrationsTable: 'pgmigrations',
    dir: path.join(path.dirname(url.fileURLToPath(import.meta.url)), 'migrations'),
    direction: 'up',
    verbose: true,
  });

  console.log('Migrations completed');
  process.exit(0);
}

migrate().catch((err: unknown) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

---

## `package.json` — Scripts à ajouter

```json
{
  "scripts": {
    "db:migrate": "tsx src/db/migrate.ts",
    "db:migrate:down": "tsx src/db/migrate.ts --direction down"
  },
  "dependencies": {
    "node-pg-migrate": "^7.0.0",
    "pg": "^8.12.0"
  },
  "devDependencies": {
    "@types/pg": "^8.11.0"
  }
}
```

---

## `.env.example` — Mise à jour

```bash
# Serveur
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info

# Base de données PostgreSQL (F-06)
DATABASE_URL=postgresql://wikihop:wikihop@localhost:5432/wikihop_dev

# Test (utilisé par la CI)
# DATABASE_URL=postgresql://wikihop_test:wikihop_test@localhost:5432/wikihop_test
```

---

## Test de connexion — `__tests__/db.test.ts`

```typescript
import { pool, checkDatabaseConnection } from '../src/db/index';

// Ce test nécessite une base PostgreSQL accessible
// En CI : le service postgres est lancé par le workflow GitHub Actions
// En local : utiliser Docker Compose (F-11)

describe('Database connection', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('should connect to PostgreSQL successfully', async () => {
    await expect(checkDatabaseConnection()).resolves.not.toThrow();
  });

  it('should execute a simple query', async () => {
    const client = await pool.connect();
    try {
      const result = await client.query<{ result: number }>('SELECT 1 + 1 AS result');
      expect(result.rows[0]?.result).toBe(2);
    } finally {
      client.release();
    }
  });
});
```

---

## Critères de qualité (checklist PR)

- [ ] `npm run typecheck` passe sans erreur
- [ ] `npm run lint` passe sans erreur
- [ ] `npm run db:migrate` s'exécute sans erreur sur une base vide
- [ ] `npm test` passe — test de connexion inclus
- [ ] `checkDatabaseConnection()` est appelé dans le hook `onReady`
- [ ] Le serveur démarre et log `Database connection verified`
- [ ] Zéro interpolation de string dans les requêtes SQL (toujours `$1`, `$2`...)
- [ ] `DATABASE_URL` validé via Zod dans `env.ts`

---

## Points de vigilance

1. **Requêtes paramétrées obligatoires** : jamais `query("SELECT * FROM users WHERE id = '" + id + "'")`. Toujours `query('SELECT * FROM users WHERE id = $1', [id])`. Violation = PR refusée.

2. **`noUncheckedIndexedAccess`** : `result.rows[0]` retourne `T | undefined`. Toujours vérifier avant d'accéder aux propriétés.

3. **Pool partagé** : le pool `pg` est un singleton exporté depuis `db/index.ts`. Ne pas créer plusieurs instances de `Pool`. En tests, appeler `pool.end()` en `afterAll`.

4. **JSONB pour `path`** : le chemin de navigation est stocké en JSONB pour éviter une table de jointure en Phase 1. Si les performances deviennent un enjeu, une table `game_session_articles` sera créée en Phase 4.

5. **`gen_random_uuid()`** : disponible nativement dans PostgreSQL 13+. Pas besoin d'extension `uuid-ossp`.
