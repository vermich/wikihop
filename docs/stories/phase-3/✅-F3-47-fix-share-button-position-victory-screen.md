---
id: F3-47
title: Fix — Bouton partage mal positionné sur VictoryScreen (chevauchement texte)
phase: 3-Features
priority: Must
agents: [Frontend Dev]
status: done
created: 2026-03-21
completed: 2026-03-21
---

# F3-47 — Fix — Bouton partage mal positionné sur VictoryScreen (chevauchement texte)

## User Story
En tant que joueur sur l'écran de victoire, je veux que le bouton de partage soit positionné de manière à ne pas chevaucher le texte des statistiques, afin de pouvoir lire clairement mon résultat et accéder au partage sans confusion.

## Critères d'acceptance
- [ ] Le bouton de partage sur VictoryScreen ne chevauche aucun élément texte — en particulier le mot "seconde(s)" ou toute autre statistique affichée dans l'encadré
- [ ] Le bouton de partage est visuellement distinct et clairement séparé du texte qui l'entoure, sur les tailles d'écran iPhone SE (375 pt) et iPhone Pro Max (430 pt)
- [ ] La fonctionnalité de partage (tap → déclenchement du partage natif) est inchangée après le fix
- [ ] Aucune régression sur F3-03 (partage du résultat) et F3-41 (bouton partage icône standard)
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

Symptôme observé : le bouton de partage est positionné sur le "s" de "seconde" dans l'encadré des statistiques — chevauchement visible avec le texte. Probable cause : positionnement absolu ou marges insuffisantes autour du bouton dans le layout de l'encadré statistiques de VictoryScreen.

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
