---
id: F3-29
title: Multijoueur — bouton Rejouer sur l'écran résultats
phase: 3-Features
priority: Should
agents: [Frontend Dev]
status: done
created: 2026-03-14
completed: 2026-03-15
depends_on: [F3-12, F3-28]
---

# F3-29 — Multijoueur — bouton Rejouer sur l'écran résultats

## User Story
En tant que groupe de joueurs ayant terminé une session multijoueur, je veux pouvoir relancer immédiatement une nouvelle session avec les mêmes joueurs et le même nombre de manches, sans repasser par l'écran de configuration.

## Critères d'acceptance
- [x] `MultiplayerResultScreen` affiche un bouton "Rejouer" en plus du bouton "Retour à l'accueil"
- [x] Le bouton "Rejouer" réinitialise les scores et repart de la manche 1 avec les mêmes joueurs
- [x] Le nombre de manches de la session précédente est conservé
- [x] `tsc --noEmit` passe sans erreur
- [x] `npm run lint` passe sans erreur

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
**Date** : 2026-03-15
**Statut** : Validé

Tous les critères d'acceptance cochés. Bouton "Rejouer" présent sur `MultiplayerResultScreen`, relance avec les mêmes joueurs et le même nombre de manches.

## Statut
done
