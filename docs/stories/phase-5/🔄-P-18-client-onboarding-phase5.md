---
id: P-18
title: Prérequis Client — Configuration des services externes Phase 5
phase: 5-Services managés
priority: Must
agents: [Client]
status: in-progress
created: 2026-03-23
completed:
---

# P-18 — Prérequis Client — Configuration des services externes Phase 5

## User Story

En tant que Client, je veux configurer les services externes requis, afin que l'équipe puisse démarrer le déploiement et les stores en Phase 5.

## Critères d'acceptance

### 1. Sentry DSN

- [ ] Créer un projet "wikihop" dans l'interface Sentry (sentry.io)
- [ ] Récupérer le DSN du projet (Settings > Client Keys)
- [ ] Configurer le DSN dans les secrets EAS : `eas secret:set EXPO_PUBLIC_SENTRY_DSN --scope project`
- [ ] Choisir la région EU pour le stockage des données (requis DPO — voir `docs/dpo/P-14-sentry-validation.md`)

### 2. Sentry Auth Token (pour l'upload des source maps CI)

- [ ] Créer un Internal Integration dans Sentry (Settings > Developer Settings) avec les scopes `project:releases` et `org:read`
- [ ] Ajouter le token comme secret GitHub : `SENTRY_AUTH_TOKEN` dans Settings > Secrets > Actions
- [ ] Vérifier que `[NOM_ORGANISATION_SENTRY]` dans `apps/mobile/app.json` correspond bien au slug de l'organisation Sentry (déjà configuré comme `the-regular-guy`)

### 3. Sentry Alerting

- [ ] Configurer une règle d'alerte pour les nouveaux types de crash (Settings > Alerts > Create Alert Rule)
- [ ] Configurer une notification email pour les crashes critiques

### 4. Google Play Console (requis pour P-08 — Play Store Android)

- [ ] Créer ou confirmer l'accès à un compte Google Play Console (25 USD one-time)
- [ ] Créer une application "WikiHop" dans la console
- [ ] Confirmer le Package Name (`com.wikihop.app` ou équivalent)

### 5. Backend déployé ✅

- [x] Backend Fastify déployé sur Cloud Run — P-19 done (2026-04-10)

## Hors scope Phase 5 — Différé Phase 6

**Apple Developer Account / App Store iOS (P-07)** — décision Client 2026-04-10 : financement non disponible actuellement. P-07 est déplacée en Phase 6.

## Notes de réalisation

Cette story ne génère pas de code. Elle liste exclusivement les actions manuelles que le Client (product owner) doit réaliser.

Les stories débloquées par ces prérequis :
- P-08 (Play Store Android) — dépend du critère 4 (Google Play Console)
- P-09 (Monitoring) — dépend des critères 1, 2, 3 (Sentry)

## Validation QA — Halim

Non applicable — story de configuration Client, pas de code à tester.

Cette story est validée par l'orchestrateur dès que le Client confirme la complétion de chaque section.

## Statut

pending → **in-progress**
