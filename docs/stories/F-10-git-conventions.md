---
id: F-10
title: Stratégie de branches et conventions de commits
phase: 1-Fondations
priority: Must
agents: [Tech Lead, Orchestrateur]
status: pending
created: 2026-02-28
completed:
---

# F-10 — Stratégie de branches et conventions de commits

## User Story
En tant qu'équipe, nous voulons des conventions de travail Git établies, afin de coordonner le travail entre agents sans conflits.

## Critères d'acceptance
- [ ] Branches `main` et `develop` créées et protégées (pas de push direct sur `main`)
- [ ] Convention de nommage documentée : `feat/[agent]-[feature]`, `fix/[description]`
- [ ] Conventional Commits configuré (optionnel : commitlint + husky)
- [ ] Template de Pull Request créé dans `.github/`
- [ ] Document de conventions accessible dans le README ou `docs/`

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
