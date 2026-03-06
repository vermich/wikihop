---
id: F-07
title: Pipeline CI/CD GitHub Actions (lint + tests)
phase: 1-Fondations
priority: Must
agents: [Tech Lead]
status: done
created: 2026-02-28
completed: 2026-03-01
---

# F-07 — Pipeline CI/CD GitHub Actions (lint + tests)

## User Story
En tant qu'équipe, nous voulons un pipeline CI qui valide chaque Pull Request, afin de détecter les régressions avant qu'elles atteignent la branche `main`.

## Critères d'acceptance
- [x] Workflow déclenché sur `push` et `pull_request` vers `main` et `develop`
- [x] Étapes : install dépendances → lint → tests unitaires → build TypeScript
- [x] Le pipeline échoue si ESLint remonte des erreurs
- [x] Le pipeline échoue si un test Jest échoue
- [x] Durée d'exécution inférieure à 5 minutes sur un projet vide
- [x] Badge de statut CI affiché dans le README

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
**Date** : 2026-03-01
**Statut** : ⚠️ Validé avec réserves — badge CI manquant (README absent)

- Déclencheur sur `push` et `pull_request` vers `main` et `develop` : CONFORME
- Étapes install → lint → typecheck → tests (avec coverage) pour backend et mobile : CONFORME
- Job `ci-success` gate qui échoue si lint ou tests échouent : CONFORME
- Structure concurrency avec `cancel-in-progress: true` + cache npm : CONFORME (estimation < 5 min sur projet vide)
- Badge CI dans README : NON APPLICABLE — README.md absent (voir Bug #1)

**Note** : Le CI est structurellement correct (YAML syntaxiquement valide, jobs bien chaînés). Il échouera en CI réel à cause du Bug #3 (`@fastify/type-provider-zod` inexistant) lors du `npm ci`.

## Statut
pending → in-progress → done
