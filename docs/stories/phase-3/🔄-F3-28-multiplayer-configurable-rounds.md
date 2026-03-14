---
id: F3-28
title: Multijoueur — nombre de manches configurable
phase: 3-Features
priority: Should
agents: [Tech Lead, Frontend Dev]
status: in-progress
created: 2026-03-14
completed:
depends_on: [F3-12]
---

# F3-28 — Multijoueur — nombre de manches configurable

## User Story
En tant que joueur en mode multijoueur, je veux pouvoir définir le nombre de manches avant de lancer la session, afin de jouer une compétition sur plusieurs articles différents.

## Critères d'acceptance
- [ ] `MultiplayerSetupScreen` permet de choisir le nombre de manches (1 à 5)
- [ ] Chaque manche utilise une paire d'articles différente (nouvelle paire chargée à chaque manche)
- [ ] Le score total (ou classement global) est calculé sur l'ensemble des manches
- [ ] `MultiplayerResultScreen` affiche les résultats par manche et le classement final
- [ ] Le bouton "Rejouer" (F3-29) relance avec le même nombre de manches et les mêmes joueurs
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
in-progress
