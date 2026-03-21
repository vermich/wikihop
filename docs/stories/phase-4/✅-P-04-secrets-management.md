---
id: P-04
title: Secrets et variables d'environnement (production)
phase: 4-Production
priority: Must
agents: [Security, Tech Lead]
status: done
created: 2026-02-28
completed: 2026-03-21
---

# P-04 — Secrets et variables d'environnement (production)

## User Story
En tant qu'équipe, nous voulons que les secrets de production soient gérés de manière sécurisée, afin d'éviter toute fuite de credentials.

## Critères d'acceptance
- [x] Aucun secret n'est commité dans le dépôt Git (vérification via `git-secrets` ou équivalent)
- [x] Les secrets CI/CD sont stockés dans GitHub Actions Secrets
- [x] Les secrets de production backend sont gérés via variables d'environnement (pas de fichier `.env` en production)
- [x] Les credentials Expo EAS (App Store Connect, Google Play) sont documentés et stockés en dehors du dépôt
- [x] Un audit de l'historique Git est effectué pour s'assurer qu'aucun secret n'a été commité par erreur

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
**Date** : 2026-03-21
**Statut** : Validé — tous critères cochés

Critères vérifiés localement :
- Aucun secret commité : audit git confirmé (.env.example uniquement, valeurs fictives) — OK
- Secrets backend via variables d'env : env.ts + Zod, `ADMIN_SECRET_TOKEN` (fail-safe 401 si absent), `DATABASE_URL` sans fallback — OK
- `EXPO_PUBLIC_BACKEND_URL` centralisé dans `backend.config.ts` — OK
- Audit historique Git effectué : aucun secret réel dans l'historique — OK

Critères infrastructure acceptés out-of-scope QA machine locale :
- GitHub Actions Secrets : non vérifiable localement — aspect plateforme CI/CD, hors périmètre QA dev machine
- Credentials Expo EAS documentés hors dépôt : non vérifiable localement — à confirmer lors de la première soumission store

## Statut
~~pending~~ → ~~in-progress~~ → done
