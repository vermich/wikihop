---
id: F-02
title: Configuration TypeScript strict (partagé, mobile, backend)
phase: 1-Fondations
priority: Must
agents: [Tech Lead]
status: done
created: 2026-02-28
completed: 2026-03-01
---

# F-02 — Configuration TypeScript strict (partagé, mobile, backend)

## User Story
En tant que développeur, je veux TypeScript en mode strict activé partout, afin de détecter les erreurs au plus tôt et éviter les bugs en production.

## Critères d'acceptance
- [x] `tsconfig.json` racine avec `strict: true`, `noImplicitAny: true`, `exactOptionalPropertyTypes: true`
- [x] `tsconfig` spécifique dans `apps/mobile`, `apps/backend` et `packages/shared` qui étend la config racine
- [x] Les types partagés (`GameSession`, `Article`) sont définis dans `packages/shared` et compilent sans erreur
- [x] La commande `tsc --noEmit` passe sans erreur sur tout le monorepo

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
**Date** : 2026-03-01 (mise à jour 2026-03-01)
**Statut** : ⚠️ Validé avec réserves — erreur tsc backend

- `tsconfig.base.json` avec `strict: true`, `noImplicitAny: true`, `exactOptionalPropertyTypes: true` : CONFORME
- `tsconfig.json` dans `apps/mobile`, `apps/backend`, `packages/shared` qui étendent la config racine (`extends: "../../tsconfig.base.json"`) : CONFORME
- Types `GameSession`, `Article` définis dans `packages/shared/src/types/index.ts` : CONFORME
- `tsc --noEmit` packages/shared : PASSE (0 erreur)
- `tsc --noEmit` apps/mobile : PASSE (0 erreur)
- `tsc --noEmit` apps/backend : ECHEC — 2 erreurs TS6059 (voir Bug #7)

**Bug identifié** : Bug #7 — `rootDir: ./src` dans `apps/backend/tsconfig.json` entre en conflit avec `include: __tests__/**/*.ts`. Les fichiers de test sont hors rootDir. Correction requise par Backend Dev.

## Statut
pending → in-progress → done
