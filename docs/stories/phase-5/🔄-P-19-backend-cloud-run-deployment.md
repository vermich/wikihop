---
id: P-19
title: Déploiement backend sur Google Cloud Run + Cloud SQL
phase: 5-Services managés
priority: Must
agents: [Tech Lead, Backend Dev]
status: in-progress
created: 2026-04-01
completed:
---

# P-19 — Déploiement backend sur Google Cloud Run + Cloud SQL

## User Story

En tant qu'opérateur du projet WikiHop, je veux que le backend Fastify soit déployé de manière automatisée sur Google Cloud Run avec Cloud SQL, afin que l'API soit accessible en production de façon fiable et sans gestion manuelle de serveurs.

## Critères d'acceptance

- [ ] Image Docker du backend buildée et pushée sur Artifact Registry (`europe-west1-docker.pkg.dev/wikihop-prod/wikihop/backend`)
- [ ] Service Cloud Run `wikihop-backend` déployé en `europe-west1`, connecté à Cloud SQL via Auth Proxy sidecar
- [ ] Variables d'environnement injectées depuis Secret Manager GCP (`DATABASE_URL`, `NODE_ENV=production`)
- [ ] Job `deploy-backend` ajouté au workflow GitHub Actions, déclenché sur merge `main`, authentifié via Workload Identity Federation (OIDC)
- [ ] `GET /health` répond `200` sur l'URL publique Cloud Run
- [ ] Aucune clé de service account JSON stockée dans les secrets GitHub

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → **in-progress** → done

## Dépendances

- P-18 — Prérequis Client (GCP project provisionné, wikihop-prod, europe-west1)
- ADR-011 — Décision infrastructure Phase 5 (Cloud Run + Cloud SQL)
- P-09 — Monitoring et alerting (dépend de cette story pour être complétable)
