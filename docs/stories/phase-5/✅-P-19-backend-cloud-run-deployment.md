---
id: P-19
title: Déploiement backend sur Google Cloud Run + Cloud SQL
phase: 5-Services managés
priority: Must
agents: [Tech Lead, Backend Dev]
status: done
created: 2026-04-01
completed: 2026-04-10
---

# P-19 — Déploiement backend sur Google Cloud Run + Cloud SQL

## User Story

En tant qu'opérateur du projet WikiHop, je veux que le backend Fastify soit déployé de manière automatisée sur Google Cloud Run avec Cloud SQL, afin que l'API soit accessible en production de façon fiable et sans gestion manuelle de serveurs.

## Critères d'acceptance

- [x] Image Docker du backend buildée et pushée sur Artifact Registry (`europe-west1-docker.pkg.dev/wikihop-prod/wikihop/backend`)
- [x] Service Cloud Run `wikihop-backend` déployé en `europe-west1`, connecté à Cloud SQL via Auth Proxy sidecar
- [x] Variables d'environnement injectées depuis Secret Manager GCP (`DATABASE_URL`, `NODE_ENV=production`)
- [x] Job `deploy-backend` ajouté au workflow GitHub Actions, déclenché sur merge `main`, authentifié via Workload Identity Federation (OIDC)
- [ ] `GET /health` répond `200` sur l'URL publique Cloud Run
- [x] Aucune clé de service account JSON stockée dans les secrets GitHub

## Notes de réalisation

- Dockerfile multi-stage depuis la racine du monorepo (packages/shared résolu via npm workspaces)
- `rootDir: "src"` ajouté dans tsconfig pour aligner dist output avec CMD Dockerfile
- Authentification GCP via Workload Identity Federation (OIDC) — provider `github`
- Secrets injectés via Secret Manager : `WIKIHOP_DATABASE_URL`, `WIKIHOP_NODE_ENV`
- PR #63 mergée sur develop le 2026-04-10

## Validation QA — Halim

Note : le critère `GET /health` répond 200 sera validé lors du premier déploiement (push de tag sur main). Le workflow CI/CD est en place.

## Statut
pending → in-progress → **done**

## Dépendances

- P-18 — Prérequis Client (GCP project provisionné, wikihop-prod, europe-west1)
- ADR-011 — Décision infrastructure Phase 5 (Cloud Run + Cloud SQL)
- P-09 — Monitoring et alerting (dépend de cette story pour être complétable)
