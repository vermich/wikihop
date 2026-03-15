---
id: F3-31
title: Historique des parties multijoueur
phase: 3-Features
priority: Could
agents: [Tech Lead, UX/UI, Frontend Dev]
status: in-progress
created: 2026-03-14
completed:
depends_on: [F3-12, F3-30]
---

# F3-31 — Historique des parties multijoueur

## User Story
En tant que groupe de joueurs, je veux consulter l'historique de nos sessions multijoueur passées, afin de suivre nos performances au fil du temps.

## Critères d'acceptance
- [ ] Un écran dédié `MultiplayerHistoryScreen` affiche les sessions multijoueur passées
- [ ] Chaque session affiche : date, joueurs, nombre de manches, gagnant
- [ ] Les données sont persistées localement (AsyncStorage)
- [ ] Accessible depuis `HomeScreen` ou `MultiplayerSetupScreen`
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress
