---
id: P-05
title: Tests de performance et de charge (backend)
phase: 4-Production
priority: Must
agents: [QA, Backend Dev]
status: pending
created: 2026-02-28
completed:
---

# P-05 — Tests de performance et de charge (backend)

## User Story
En tant qu'éditeur, je veux que le backend supporte la charge attendue au lancement, afin d'éviter toute interruption de service.

## Critères d'acceptance
- [ ] Test de charge simulant 100 utilisateurs simultanés sur `GET /api/game/random-pair`
- [ ] Test de charge simulant 1 000 utilisateurs simultanés sur `GET /api/game/daily` (le défi quotidien est plus sollicité)
- [ ] Le temps de réponse p95 reste inférieur à 2 secondes sous charge
- [ ] Le taux d'erreur reste inférieur à 1% sous charge nominale
- [ ] Rapport de test de charge produit par QA
- [ ] Plan de mise à l'échelle documenté (verticale ou horizontale) si les seuils ne sont pas atteints

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
