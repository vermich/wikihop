---
id: F3-13
title: Mode développeur — toggle affichage de l'article cible
phase: 3-Features
priority: Could
agents: [Frontend Dev]
status: pending
created: 2026-03-01
completed:
---

# F3-13 — Mode développeur — toggle affichage de l'article cible

## User Story
En tant que développeur ou testeur de l'application, je veux pouvoir activer un mode développeur depuis l'écran d'accueil, afin de voir l'article cible en permanence pendant le jeu et tester des parcours spécifiques plus facilement.

## Critères d'acceptance
- [ ] Un toggle "Mode développeur" est accessible depuis la HomeScreen (discret, non proéminent pour les utilisateurs normaux)
- [ ] Quand le mode développeur est activé, un indicateur visuel persistant apparaît pendant le jeu (ex : bandeau ou badge) affichant le titre de l'article cible
- [ ] L'état du mode développeur (activé/désactivé) est mémorisé en AsyncStorage et restauré au prochain lancement
- [ ] Le mode développeur n'affecte pas les règles du jeu ni le calcul du score
- [ ] En mode développeur, un indicateur visible dans la HomeScreen signale que le mode est actif (ex : libellé coloré sous le toggle)
- [ ] Le toggle est désactivé par défaut à l'installation

## Notes de réalisation
Feature de qualité de vie pour les développeurs et testeurs, pas destinée à être promue auprès des joueurs. L'emplacement du toggle doit rester discret (ex : section bas de l'écran, tap long, ou section "Avancé" cachée). A valider avec UX/UI sur le niveau de discrétion approprié.

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
