---
id: F3-21
title: Fix état visuel bouton défi du jour complété
phase: 3-Features
priority: Must
agents: [Frontend Dev]
status: in-progress
created: 2026-03-14
completed:
depends_on: [F3-17]
---

# F3-21 — Fix état visuel bouton défi du jour complété

## User Story
En tant que joueur ayant déjà complété le défi du jour, je veux que le bouton "Défi du jour" affiche visuellement un état désactivé, afin de comprendre immédiatement que je ne peux plus y accéder aujourd'hui.

## Critères d'acceptance
- [ ] Lorsque le défi quotidien a été complété, le bouton "Défi du jour" affiche un style visuellement distinct de l'état actif (ex : opacité réduite, couleur grisée, ou indicateur explicite)
- [ ] L'état visuel désactivé est cohérent avec la logique `disabled` déjà implémentée dans F3-17 (le bouton est bien `disabled` ET visuellement désactivé)
- [ ] Sur iOS et Android, l'état visuel est identique et conforme aux specs UX/UI
- [ ] Aucune régression sur le comportement du bouton lorsque le défi n'a pas encore été réalisé (apparence normale, cliquable)
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress
