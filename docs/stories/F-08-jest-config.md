---
id: F-08
title: Configuration Jest (mobile + backend)
phase: 1-Fondations
priority: Must
agents: [Tech Lead, QA]
status: in-progress
created: 2026-02-28
completed:
---

# F-08 — Configuration Jest (mobile + backend)

## User Story
En tant que développeur, je veux Jest configuré avec React Native Testing Library, afin d'écrire et exécuter des tests dès la phase MVP.

## Critères d'acceptance
- [x] Jest configuré dans `apps/mobile` avec `@testing-library/react-native`
- [x] Jest configuré dans `apps/backend` pour tester les routes Fastify
- [x] Script `test` disponible dans chaque workspace et à la racine
- [ ] Un test factice ("smoke test") passe dans chaque workspace pour valider la configuration
- [x] Coverage activé avec seuil minimum défini (ex : 70% lignes)

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
**Date** : 2026-03-01
**Statut** : ⚠️ Validé avec réserves — tests non exécutables

- `apps/mobile/jest.config.js` avec preset `jest-expo`, `@testing-library/react-native`, `setupFilesAfterEnv`, `transformIgnorePatterns` Expo : CONFORME
- `apps/backend/jest.config.js` avec preset `ts-jest`, environment `node`, Supertest : CONFORME
- `jest.config.base.js` racine avec coverage 70% (lignes, branches, fonctions, statements) : CONFORME
- Script `test` dans chaque workspace et à la racine : CONFORME
- Smoke tests présents : `apps/mobile/__tests__/smoke.test.ts` et `apps/mobile/__tests__/HomeScreen.test.tsx` (mobile) ; `apps/backend/__tests__/health.test.ts` (backend) : CONFORME (code valide, revue statique)
- Exécution des tests : NON RÉALISABLE — npm install bloqué (Bug #2 + Bug #3)

**Note** : Le critère "passe" ne peut être coché que sur exécution réelle. Les smoke tests sont bien écrits et structurellement corrects.

## Statut
pending → in-progress → done
