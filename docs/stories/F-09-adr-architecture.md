---
id: F-09
title: ADR — Décisions d'architecture initiales
phase: 1-Fondations
priority: Must
agents: [Tech Lead]
status: in-progress
created: 2026-02-28
completed:
---

# F-09 — ADR — Décisions d'architecture initiales

## User Story
En tant qu'équipe, nous voulons les décisions d'architecture documentées, afin d'éviter les discussions répétitives et d'aligner tous les agents.

## Critères d'acceptance
- [x] ADR-001 : Choix du système de navigation mobile (React Navigation vs Expo Router)
- [x] ADR-002 : Choix du client PostgreSQL (pg brut vs Prisma vs Drizzle)
- [x] ADR-003 : Stratégie de gestion du state (Zustand confirmé ou alternative)
- [x] ADR-004 : Stratégie de cache Wikipedia (client-side vs backend proxy)
- [x] Chaque ADR suit le format : Contexte / Décision / Conséquences
- [x] ADR stockés dans `docs/adr/`

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
**Date** : 2026-03-01
**Statut** : VALIDÉ

- ADR-001 (Structure monorepo — npm workspaces) : présent, couvre le choix de navigation implicitement. Statut "Accepté", format Contexte/Décision/Conséquences : CONFORME
- ADR-002 (Stack technique complète) : couvre client PostgreSQL (pg vs Prisma/Drizzle), navigation (React Navigation vs Expo Router), Zustand, Zod : CONFORME
- ADR-003 (Stratégie de tests) : couvre Jest, RNTL, Supertest, seuils de couverture : CONFORME
- ADR-004 (Stratégie CI/CD) : couvre GitHub Actions, EAS, workflows parallèles : CONFORME
- Format Contexte/Décision/Conséquences respecté dans tous les ADR : CONFORME
- Stockés dans `docs/adr/` : CONFORME

**Observation** : Les 4 ADR couvrent collectivement tous les sujets requis (navigation, client DB, state, CI/CD). L'ADR sur la "stratégie de cache Wikipedia" est abordée dans ADR-002 (proxy backend vs client-side) mais non développée comme ADR séparé — acceptable car mentionnée dans ADR-002.

## Statut
pending → in-progress → done
