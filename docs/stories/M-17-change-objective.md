---
id: M-17
title: Bouton "Changer l'objectif" pendant le jeu
phase: 2-MVP
priority: Should
agents: [Frontend Dev, UX/UI]
status: pending
created: 2026-03-01
completed:
---

# M-17 — Bouton "Changer l'objectif" pendant le jeu

## User Story
En tant que joueur, je veux pouvoir changer la paire d'articles cible pendant une partie en cours, afin de ne pas être bloqué sur une paire trop difficile sans devoir quitter complètement l'application.

## Critères d'acceptance
- [ ] Un bouton "Changer l'objectif" est accessible depuis l'interface de jeu (GameScreen), sans masquer le contenu de l'article
- [ ] L'appui sur ce bouton déclenche une confirmation (alerte ou modal) : "Changer l'objectif abandonnera la partie en cours. Continuer ?"
- [ ] Si le joueur confirme, une nouvelle paire aléatoire est tirée depuis le service `popular-pages` (M-16) et la partie repart depuis le début (compteur et timer remis à zéro)
- [ ] La partie précédente est enregistrée dans l'historique avec le statut "Abandonné"
- [ ] Si le joueur annule la confirmation, il reste dans la partie en cours sans changement
- [ ] Le chargement de la nouvelle paire affiche un indicateur visuel (spinner ou skeleton)
- [ ] En cas d'erreur lors du chargement de la nouvelle paire, un message d'erreur est affiché et la partie en cours reste active

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
