---
id: F-05
title: Initialisation du backend Fastify (Node.js + TypeScript)
phase: 1-Fondations
priority: Must
agents: [Tech Lead, Backend Dev]
status: pending
created: 2026-02-28
completed:
---

# F-05 — Initialisation du backend Fastify (Node.js + TypeScript)

## User Story
En tant que développeur backend, je veux un serveur Fastify fonctionnel et typé, afin de pouvoir implémenter les routes API.

## Critères d'acceptance
- [ ] Serveur Fastify initialisé dans `apps/backend` avec TypeScript
- [ ] Route de santé `GET /health` retourne `{ status: "ok" }` avec code 200
- [ ] Variables d'environnement gérées via un fichier `.env` (exemple `.env.example` commité)
- [ ] Structure `routes/`, `services/`, `plugins/`, `db/` créée
- [ ] Le serveur démarre localement sans erreur avec `npm run dev`

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
