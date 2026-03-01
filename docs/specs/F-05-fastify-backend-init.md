# Spec technique — F-05 : Initialisation du backend Fastify

**Destinataire :** Backend Dev — Julien
**Story :** [F-05](../stories/F-05-fastify-backend-init.md)
**Références ADR :** ADR-001 (monorepo), ADR-002 (stack Fastify v5 + Zod), ADR-003 (tests)
**Branche à créer :** `feat/backend-fastify-init`
**PR cible :** `develop`

---

## Contexte

Le monorepo est initialisé (package.json racine, workspaces npm). Tu dois initialiser le serveur API Fastify v5 dans `apps/backend/` avec TypeScript strict, Zod pour la validation, Pino pour les logs, et Jest + Supertest pour les tests. F-06 (PostgreSQL) et F-11 (Docker) sont des stories séparées que tu traiteras ensuite.

---

## Périmètre

### Dans le scope de F-05
- Serveur Fastify v5 avec TypeScript strict
- Route de santé `GET /health`
- Validation Zod via `@fastify/type-provider-zod`
- Configuration ESLint et TypeScript étendant la base commune
- Jest + Supertest avec un smoke test sur `/health`
- Gestion des variables d'environnement via `.env`
- Structure de dossiers : `routes/`, `services/`, `plugins/`, `db/`
- Script `npm run dev` avec rechargement à chaud (tsx --watch)

### Hors scope de F-05
- Connexion PostgreSQL (F-06)
- Docker Compose (F-11)
- Routes métier Wikipedia (Phase 2)
- Authentification (Phase 4)

---

## Structure de fichiers attendue

```
apps/backend/
├── package.json
├── tsconfig.json              ← étend ../../tsconfig.base.json
├── .eslintrc.js               ← étend le .eslintrc.js racine
├── .env.example               ← variables documentées (commité)
├── jest.config.js             ← étend jest.config.base.js racine
├── jest.setup.ts              ← teardown serveur
├── src/
│   ├── app.ts                 ← création et configuration de l'instance Fastify
│   ├── server.ts              ← entrypoint (listen sur PORT)
│   ├── env.ts                 ← validation des variables d'environnement via Zod
│   ├── routes/
│   │   ├── index.ts           ← enregistrement des routes dans le plugin
│   │   └── health.route.ts    ← GET /health
│   ├── plugins/
│   │   └── index.ts           ← enregistrement des plugins Fastify
│   ├── services/              ← dossier vide (prêt Phase 2)
│   └── db/
│       └── index.ts           ← placeholder connexion BDD (F-06)
└── __tests__/
    └── health.test.ts         ← test Supertest sur GET /health
```

---

## `package.json`

```json
{
  "name": "@wikihop/backend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc --noEmit false --outDir dist",
    "start": "node dist/server.js",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "dependencies": {
    "@fastify/type-provider-zod": "^4.0.0",
    "fastify": "^5.0.0",
    "pino-pretty": "^13.0.0",
    "zod": "^3.23.0",
    "@wikihop/shared": "*"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/node": "^20.0.0",
    "@types/supertest": "^6.0.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint": "^9.0.0",
    "jest": "^29.0.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.5.0"
  }
}
```

---

## `tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "node",
    "target": "ES2022",
    "outDir": "./dist",
    "rootDir": "./src",
    "paths": {
      "@wikihop/shared": ["../../packages/shared/src/types/index.ts"]
    }
  },
  "include": ["src/**/*.ts", "__tests__/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**Note :** Le backend utilise `module: "CommonJS"` (Node.js) contrairement au mobile (`ESNext`). Cela nécessite d'override `module` et `moduleResolution` depuis la base.

---

## `src/env.ts` — Validation des variables d'environnement

```typescript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('3000'),
  HOST: z.string().default('0.0.0.0'),
  // DATABASE_URL sera ajouté en F-06
  // DATABASE_URL: z.string().url(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env: Env = parsed.data;
```

---

## `src/app.ts` — Instance Fastify

```typescript
import { fastify } from 'fastify';
import { serializerCompiler, validatorCompiler } from '@fastify/type-provider-zod';

import { env } from './env';
import { registerPlugins } from './plugins/index';
import { registerRoutes } from './routes/index';

export function buildApp(): ReturnType<typeof fastify> {
  const app = fastify({
    logger: {
      level: env.LOG_LEVEL,
      ...(env.NODE_ENV === 'development'
        ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
        : {}),
    },
  });

  // Zod comme provider de validation/sérialisation (ADR-002)
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  registerPlugins(app);
  registerRoutes(app);

  return app;
}
```

---

## `src/server.ts` — Entrypoint

```typescript
import { env } from './env';
import { buildApp } from './app';

async function start(): Promise<void> {
  const app = buildApp();

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void start();
```

---

## `src/routes/health.route.ts`

```typescript
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const healthResponseSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string(),
  version: z.string(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/health',
    {
      schema: {
        response: {
          200: healthResponseSchema,
        },
      },
    },
    async (): Promise<HealthResponse> => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env['npm_package_version'] ?? '0.0.0',
      };
    },
  );
}
```

---

## `src/routes/index.ts`

```typescript
import type { FastifyInstance } from 'fastify';

import { healthRoutes } from './health.route';

export function registerRoutes(app: FastifyInstance): void {
  void app.register(healthRoutes);
}
```

---

## `__tests__/health.test.ts` — Test Supertest

```typescript
import supertest from 'supertest';

import { buildApp } from '../src/app';

describe('GET /health', () => {
  const app = buildApp();

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return 200 with status ok', async () => {
    const response = await supertest(app.server).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ok',
    });
    expect(typeof response.body.timestamp).toBe('string');
  });
});
```

---

## `jest.config.js`

```javascript
const baseConfig = require('../../jest.config.base.js');

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '@wikihop/shared': '<rootDir>/../../packages/shared/src/types/index.ts',
  },
  globals: {
    'ts-jest': {
      tsconfig: './tsconfig.json',
    },
  },
};
```

---

## `.env.example`

```bash
# Serveur
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info

# Base de données (F-06)
# DATABASE_URL=postgresql://wikihop:wikihop@localhost:5432/wikihop_dev
```

---

## Critères de qualité (checklist PR)

- [ ] `npm run typecheck` passe sans erreur
- [ ] `npm run lint` passe sans erreur
- [ ] `npm test` passe — le test `/health` retourne 200
- [ ] `npm run dev` démarre sans erreur : `Server listening on http://0.0.0.0:3000`
- [ ] `curl http://localhost:3000/health` retourne `{"status":"ok",...}`
- [ ] Zéro `any` dans le code source
- [ ] Tous les retours de fonctions publiques sont explicitement typés
- [ ] `src/env.ts` valide les variables d'env au démarrage avec Zod

---

## Points de vigilance

1. **Fastify v5 et async/await** : Fastify v5 impose des handlers async. Tous les handlers retournent une promesse — plus de callback-style.

2. **`@fastify/type-provider-zod` v4** : compatible avec Fastify v5. Ne pas confondre avec `fastify-zod` (incompatible). Utiliser `validatorCompiler` et `serializerCompiler` de ce package.

3. **`noUncheckedIndexedAccess: true`** dans tsconfig.base — `process.env['VAR']` retourne `string | undefined`. Toujours valider via Zod dans `env.ts`, jamais d'accès direct à `process.env` dans le reste du code.

4. **CommonJS vs ESM** : le backend utilise CommonJS pour la compatibilité Node.js native. `import/export` TypeScript sont transpilés en `require()`. Attention aux packages ESM-only (vérifier la compatibilité avant d'ajouter des dépendances).

5. **Supertest et Fastify v5** : utiliser `app.server` (instance HTTP native) comme argument de `supertest()`. Appeler `app.ready()` avant les tests et `app.close()` en teardown.
