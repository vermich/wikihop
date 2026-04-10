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

### 1. Sentry DSN ✅ (fait en P-14)

- [x] Projet "wikihop" créé dans Sentry (région EU — validé DPO)
- [x] DSN configuré dans EAS : `EXPO_PUBLIC_SENTRY_DSN` présent sur le projet
- [x] Organisation slug configuré : `the-regular-guy` dans `apps/mobile/app.json`

### 2. Sentry Auth Token ✅ (confirmé Client 2026-04-10)

- [x] Internal Integration créé dans Sentry avec les scopes `project:releases` et `org:read`
- [x] Token ajouté comme secret GitHub : `SENTRY_AUTH_TOKEN`

### 3. Sentry Alerting ✅ (confirmé Client 2026-04-10)

- [x] Règle d'alerte configurée pour les nouveaux types de crash
- [x] Notification email configurée pour les crashes critiques

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
