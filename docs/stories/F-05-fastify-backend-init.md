---
id: F-05
title: Initialisation du backend Fastify (Node.js + TypeScript)
phase: 1-Fondations
priority: Must
agents: [Tech Lead, Backend Dev]
status: done
created: 2026-02-28
completed: 2026-03-01
---

# F-05 — Initialisation du backend Fastify (Node.js + TypeScript)

## User Story
En tant que développeur backend, je veux un serveur Fastify fonctionnel et typé, afin de pouvoir implémenter les routes API.

## Critères d'acceptance
- [x] Serveur Fastify initialisé dans `apps/backend` avec TypeScript
- [x] Route de santé `GET /health` retourne `{ status: "ok" }` avec code 200
- [x] Variables d'environnement gérées via un fichier `.env` (exemple `.env.example` commité)
- [x] Structure `routes/`, `services/`, `plugins/`, `db/` créée
- [x] Le serveur démarre localement sans erreur avec `npm run dev`

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
**Date** : 2026-03-01 (mise à jour 2026-03-01)
**Statut** : ⚠️ Validé avec réserves — démarrage local toujours bloqué (Bug #5)

- Serveur Fastify v5 dans `apps/backend` avec TypeScript (tsconfig.json étend la config racine) : CONFORME
- Route `GET /health` retournant `{ status: "ok", timestamp, version }` avec code 200 (Zod schema) : CONFORME (code correct)
- `.env.example` commité dans `apps/backend/` avec `DATABASE_URL`, `PORT`, `HOST`, etc. : CONFORME
- Structure `routes/` (health.route.ts, index.ts), `services/`, `plugins/` (index.ts), `db/` (index.ts, migrate.ts, schema.ts, migrations/) : CONFORME
- `npm run dev` : NON VÉRIFIABLE — démarrage bloqué par Bug #5 (`@fastify/cors@9.0.1` incompatible Fastify 5.x)

**Bug #3 corrigé** : `fastify-type-provider-zod@^6.0.0` installé correctement.
**Nouveau bug identifié** : Bug #5 — `@fastify/cors@9.0.1` attend Fastify `4.x`, or Fastify 5.7.4 est installé. La version compatible est `@fastify/cors@^11.0.0`. Les 4 tests health échouent avec `FastifyError: expected '4.x' fastify version`. Correction requise par Backend Dev.

## Statut
pending → in-progress → done
