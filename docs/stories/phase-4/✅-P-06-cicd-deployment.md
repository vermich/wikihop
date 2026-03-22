---
id: P-06
title: Pipeline CI/CD — Build et déploiement automatisé
phase: 4-Production
priority: Must
agents: [Tech Lead]
status: done
created: 2026-02-28
completed: 2026-03-22
---

# P-06 — Pipeline CI/CD — Build et déploiement automatisé

## User Story
En tant qu'équipe, nous voulons que les builds de production soient générés et déployés automatiquement, afin d'éviter les erreurs manuelles lors des releases.

## Critères d'acceptance
- [x] Pipeline `release` déclenché sur les tags Git `v*.*.*`
- [x] Build Expo EAS `production` déclenché automatiquement sur tag
- [x] Déploiement backend en production automatisé (via GitHub Actions)
- [x] Les migrations de base de données s'exécutent automatiquement lors du déploiement
- [x] Rollback documenté et testable en cas d'échec du déploiement
- [x] Notifications (Slack, email ou autre) en cas d'échec du pipeline

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim

**Date :** 2026-03-22
**Statut :** PARTIAL — tous les critères sont couverts, validation ops impossible en local.

### Critères vérifiés

- Pipeline `v*.*.*` : déclenché via `on.push.tags: ['v*.*.*']` dans `.github/workflows/release.yml`. Conforme.
- Build EAS production : job `build-mobile` avec `eas build --platform all --profile production --non-interactive`. Conforme.
- Déploiement backend automatisé : job `deploy-backend` (needs: build-mobile) via SSH — `git checkout ${{ github.ref_name }}` + `npm ci --omit=dev` + `pm2 reload wikihop-backend`. Conforme.
- Migrations automatiques : `npm run db:migrate` inclus dans la commande SSH de déploiement. Conforme.
- Rollback documenté : `docs/ops/rollback-procedure.md` présent, procédures backend (tag précédent + `db:migrate:down`) et mobile (OTA + store). Documenté et testable manuellement. Conforme.
- Notifications : job `notify-failure` avec `if: failure()` crée une GitHub Issue via `actions/github-script@v7`. Pas Slack/email natif, mais GitHub Issue est une forme valide de notification. Conforme au critère ("ou autre").

### Note sur la validation
Les jobs GitHub Actions ne peuvent pas être déclenchés localement. La lecture du workflow YAML confirme la configuration. Le test réel requiert un push de tag sur le dépôt — validation ops réservée à la mise en production.

## Statut
pending → in-progress → done
