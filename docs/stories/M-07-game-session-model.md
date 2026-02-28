---
id: M-07
title: Modèle de données GameSession (local)
phase: 2-MVP
priority: Must
agents: [Frontend Dev, Tech Lead]
status: pending
created: 2026-02-28
completed:
---

# M-07 — Modèle de données GameSession (local)

## User Story
En tant qu'application, je veux stocker la session de jeu en cours localement, afin de ne pas perdre la progression si l'app est mise en arrière-plan.

## Critères d'acceptance
- [ ] Le type `GameSession` est implémenté tel que défini dans `context.md` (dans `packages/shared`)
- [ ] La session en cours est persistée dans AsyncStorage
- [ ] Si l'app est fermée puis rouverte, la session en cours est restaurée avec le bon article affiché
- [ ] Une session terminée (`won` ou `abandoned`) est marquée comme telle avant d'être écrasée
- [ ] La session est initialisée proprement au démarrage d'une nouvelle partie (pas de données de la partie précédente)

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
