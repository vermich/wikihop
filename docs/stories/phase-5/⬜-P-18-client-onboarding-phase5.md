---
id: P-18
title: Prérequis Client — Configuration des services externes Phase 5
phase: 5-Services managés
priority: Must
agents: [Client]
status: pending
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
- [ ] Renseigner `[NOM_ORGANISATION_SENTRY]` dans `apps/mobile/app.json` avec le slug réel de l'organisation Sentry

### 3. Sentry Alerting

- [ ] Configurer une règle d'alerte pour les nouveaux types de crash (Settings > Alerts > Create Alert Rule)
- [ ] Configurer une notification email pour les crashes critiques

### 4. Apple Developer Account (requis pour P-07 — App Store iOS)

- [ ] Créer ou confirmer l'accès à un compte Apple Developer (developer.apple.com, 99 USD/an)
- [ ] Créer un App ID "wikihop" dans App Store Connect
- [ ] Fournir l'Apple Team ID à l'équipe (pour la configuration EAS)

### 5. Google Play Console (requis pour P-08 — Play Store Android)

- [ ] Créer ou confirmer l'accès à un compte Google Play Console (25 USD one-time)
- [ ] Créer une application "WikiHop" dans la console
- [ ] Fournir le Package Name confirmé (`com.wikihop.app` ou équivalent)

### 6. Backend déployé (requis pour P-09 monitoring, P-11 compatibilité)

- [ ] Choisir un hébergeur pour le backend Fastify (Railway, Render, VPS — voir `docs/ops/scaling-plan.md`)
- [ ] Déployer le backend en production et confirmer l'URL à l'équipe
- [ ] Confirmer que la base de données PostgreSQL est accessible depuis le backend en production

## Notes de réalisation

<!-- Rempli par le Client lors de la configuration -->

Cette story ne génère pas de code. Elle liste exclusivement les actions manuelles que le Client (product owner) doit réaliser avant que l'équipe puisse démarrer la Phase 5.

Les stories bloquées par ces prérequis :
- P-07 (App Store iOS) — dépend des critères 4 (Apple Developer Account)
- P-08 (Play Store Android) — dépend des critères 5 (Google Play Console)
- P-09 (Monitoring) — dépend des critères 1, 2, 3 (Sentry) et 6 (backend déployé)
- P-11 (Compatibilité appareils) — dépend des critères 6 (backend déployé)

## Validation QA — Halim

<!-- Non applicable — story de configuration Client, pas de code à tester -->

Cette story est validée par l'orchestrateur dès que le Client confirme la complétion de chaque section.

## Statut

pending
