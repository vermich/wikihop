---
id: P-04
title: Secrets et variables d'environnement (production)
phase: 4-Production
priority: Must
agents: [Security, Tech Lead]
status: pending
created: 2026-02-28
completed:
---

# P-04 — Secrets et variables d'environnement (production)

## User Story
En tant qu'équipe, nous voulons que les secrets de production soient gérés de manière sécurisée, afin d'éviter toute fuite de credentials.

## Critères d'acceptance
- [ ] Aucun secret n'est commité dans le dépôt Git (vérification via `git-secrets` ou équivalent)
- [ ] Les secrets CI/CD sont stockés dans GitHub Actions Secrets
- [ ] Les secrets de production backend sont gérés via variables d'environnement (pas de fichier `.env` en production)
- [ ] Les credentials Expo EAS (App Store Connect, Google Play) sont documentés et stockés en dehors du dépôt
- [ ] Un audit de l'historique Git est effectué pour s'assurer qu'aucun secret n'a été commité par erreur

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
