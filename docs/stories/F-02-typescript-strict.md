---
id: F-02
title: Configuration TypeScript strict (partagé, mobile, backend)
phase: 1-Fondations
priority: Must
agents: [Tech Lead]
status: pending
created: 2026-02-28
completed:
---

# F-02 — Configuration TypeScript strict (partagé, mobile, backend)

## User Story
En tant que développeur, je veux TypeScript en mode strict activé partout, afin de détecter les erreurs au plus tôt et éviter les bugs en production.

## Critères d'acceptance
- [ ] `tsconfig.json` racine avec `strict: true`, `noImplicitAny: true`, `exactOptionalPropertyTypes: true`
- [ ] `tsconfig` spécifique dans `apps/mobile`, `apps/backend` et `packages/shared` qui étend la config racine
- [ ] Les types partagés (`GameSession`, `Article`) sont définis dans `packages/shared` et compilent sans erreur
- [ ] La commande `tsc --noEmit` passe sans erreur sur tout le monorepo

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
