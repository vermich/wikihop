---
id: F3-49
title: Fix — Multijoueur : abandon d'un joueur passe incorrectement au joueur suivant
phase: 3-Features
priority: Must
agents: [Frontend Dev, Backend Dev]
status: done
created: 2026-03-21
completed: 2026-03-21
---

# F3-49 — Fix — Multijoueur : abandon d'un joueur passe incorrectement au joueur suivant

## User Story
En tant que joueur participant à une partie multijoueur locale, je veux que l'abandon d'un joueur soit géré correctement et de manière explicite, afin que la partie ne continue pas comme si le joueur avait simplement terminé sa manche normalement.

## Critères d'acceptance
- [x] Quand un joueur abandonne sa manche en mode multijoueur, le jeu ne passe pas automatiquement au joueur suivant comme après une fin de manche normale
- [x] L'abandon d'un joueur est signalé explicitement à l'écran (message ou indicateur distinct d'une fin de manche réussie)
- [x] Le joueur qui abandonne se voit attribuer un résultat distinct d'une victoire ou d'un score normal pour cette manche (ex : manche abandonnée, score nul ou résultat spécifique)
- [x] Le classement final et l'écran de résultats MultiplayerResultScreen reflètent correctement les manches abandonnées — aucune manche abandonnée ne compte comme une victoire
- [x] Le flux de jeu après l'abandon (passage à la manche suivante, fin de partie si toutes les manches jouées) est cohérent avec les règles multijoueur existantes (F3-12, F3-28, F3-33)
- [x] Aucune régression sur F3-12, F3-28, F3-29, F3-30, F3-32, F3-33, F3-36 (multijoueur existant)
- [x] `tsc --noEmit` passe sans erreur
- [x] `npm run lint` passe sans erreur

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

Symptôme observé : en mode multijoueur, quand un joueur abandonne, le jeu passe incorrectement au joueur suivant — le comportement est identique à une fin de manche normale. L'abandon doit être distingué d'une fin de manche pour éviter de fausser le classement.

## Validation QA — Halim
Validé sur device physique par le Client — 2026-03-21.
Tous les critères d'acceptance cochés. Gate device physique confirmé.

## Statut
pending → in-progress → done
