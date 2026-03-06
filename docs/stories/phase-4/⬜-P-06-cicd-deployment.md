---
id: P-06
title: Pipeline CI/CD — Build et déploiement automatisé
phase: 4-Production
priority: Must
agents: [Tech Lead]
status: pending
created: 2026-02-28
completed:
---

# P-06 — Pipeline CI/CD — Build et déploiement automatisé

## User Story
En tant qu'équipe, nous voulons que les builds de production soient générés et déployés automatiquement, afin d'éviter les erreurs manuelles lors des releases.

## Critères d'acceptance
- [ ] Pipeline `release` déclenché sur les tags Git `v*.*.*`
- [ ] Build Expo EAS `production` déclenché automatiquement sur tag
- [ ] Déploiement backend en production automatisé (via GitHub Actions)
- [ ] Les migrations de base de données s'exécutent automatiquement lors du déploiement
- [ ] Rollback documenté et testable en cas d'échec du déploiement
- [ ] Notifications (Slack, email ou autre) en cas d'échec du pipeline

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
