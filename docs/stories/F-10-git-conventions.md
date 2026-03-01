---
id: F-10
title: Stratégie de branches et conventions de commits
phase: 1-Fondations
priority: Must
agents: [Tech Lead, Orchestrateur]
status: in-progress
created: 2026-02-28
completed:
---

# F-10 — Stratégie de branches et conventions de commits

## User Story
En tant qu'équipe, nous voulons des conventions de travail Git établies, afin de coordonner le travail entre agents sans conflits.

## Critères d'acceptance
- [ ] Branches `main` et `develop` créées et protégées (pas de push direct sur `main`)
- [x] Convention de nommage documentée : `feat/[agent]-[feature]`, `fix/[description]`
- [x] Conventional Commits configuré (optionnel : commitlint + husky)
- [x] Template de Pull Request créé dans `.github/`
- [x] Document de conventions accessible dans le README ou `docs/`

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
**Date** : 2026-03-01
**Statut** : ⚠️ Validé avec réserves — protection de branches non vérifiable localement

- Branches `main` et `develop` créées : CONFORME (branche `develop` active). La protection de branches (rule GitHub) ne peut pas être vérifiée localement.
- Convention de nommage documentée dans `docs/git-conventions.md` : `feat/[agent]-[feature]`, `fix/[description]`, `test/`, `docs/`, `refactor/`, `chore/` : CONFORME
- Conventional Commits documentés (sans commitlint/husky — optionnel comme indiqué dans la story) : CONFORME
- Template PR dans `.github/PULL_REQUEST_TEMPLATE.md` : CONFORME
- Document de conventions dans `docs/git-conventions.md` : CONFORME

**Note** : Le critère "protection de branches" est une configuration GitHub (branch protection rules) qui ne peut être validée que depuis l'interface GitHub ou l'API. À vérifier par le Tech Lead directement sur le repo.

## Statut
pending → in-progress → done
