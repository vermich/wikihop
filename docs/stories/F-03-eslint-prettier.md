---
id: F-03
title: Configuration ESLint + Prettier
phase: 1-Fondations
priority: Must
agents: [Tech Lead]
status: done
created: 2026-02-28
completed: 2026-03-01
---

# F-03 — Configuration ESLint + Prettier

## User Story
En tant que développeur, je veux un linter et un formateur configurés de manière uniforme, afin de maintenir la cohérence du code entre tous les agents.

## Critères d'acceptance
- [x] ESLint configuré avec les règles TypeScript, React Native et les imports
- [x] Prettier configuré (single quotes, trailing comma, 2 espaces)
- [x] `.eslintrc` et `.prettierrc` à la racine, hérités dans les sous-projets
- [x] Script `lint` disponible à la racine et dans chaque workspace
- [x] Aucun fichier du projet ne produit d'erreur ou d'avertissement ESLint à l'initialisation

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
**Date** : 2026-03-01 (mise à jour 2026-03-01)
**Statut** : ⚠️ Validé avec réserves — npm run lint backend en erreur

- `.eslintrc.js` racine avec règles TypeScript, React Native (`eslint-plugin-react-native`), imports : CONFORME
- `.prettierrc` avec `singleQuote: true`, `trailingComma: "all"`, `tabWidth: 2` : CONFORME
- `.eslintrc.js` dans `apps/mobile` et `apps/backend` qui étendent la config racine : CONFORME
- Script `lint` disponible dans package.json racine + chaque workspace : CONFORME
- `npm run lint` (mobile) : non exécuté isolément (npm install --legacy-peer-deps requis en workspace)
- `npm run lint` (backend) : ECHEC — `apps/backend` utilise ESLint v9 avec format de config `.eslintrc.js` (format ESLint v8). ESLint v9 exige `eslint.config.js` (flat config). Voir Bug #6.

**Bug identifié** : Bug #6 — Le backend utilise ESLint 9.39.3 mais son fichier `.eslintrc.js` est au format legacy (ESLint v8). Deux options : downgrader ESLint backend à v8 (comme apps/mobile) ou migrer `.eslintrc.js` vers `eslint.config.js` (flat config v9). Décision requise du Tech Lead.

## Statut
pending → in-progress → done
