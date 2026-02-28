---
id: F-07
title: Pipeline CI/CD GitHub Actions (lint + tests)
phase: 1-Fondations
priority: Must
agents: [Tech Lead]
status: pending
created: 2026-02-28
completed:
---

# F-07 — Pipeline CI/CD GitHub Actions (lint + tests)

## User Story
En tant qu'équipe, nous voulons un pipeline CI qui valide chaque Pull Request, afin de détecter les régressions avant qu'elles atteignent la branche `main`.

## Critères d'acceptance
- [ ] Workflow déclenché sur `push` et `pull_request` vers `main` et `develop`
- [ ] Étapes : install dépendances → lint → tests unitaires → build TypeScript
- [ ] Le pipeline échoue si ESLint remonte des erreurs
- [ ] Le pipeline échoue si un test Jest échoue
- [ ] Durée d'exécution inférieure à 5 minutes sur un projet vide
- [ ] Badge de statut CI affiché dans le README

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
