---
id: P-16
title: Fix — Bouton défi du jour grisé en FR et IT
phase: 4-Production
priority: Must
agents: [Frontend Dev, Backend Dev]
status: pending
created: 2026-03-21
completed:
---

# P-16 — Fix — Bouton défi du jour grisé en FR et IT

## User Story
En tant que joueur utilisant l'application en français ou en italien, je veux que le bouton "Défi du jour" soit actif et cliquable lorsqu'un défi est disponible, afin de pouvoir jouer le défi quotidien dans ma langue sans être bloqué par un bouton inactif.

## Critères d'acceptance
- [ ] Le bouton défi du jour est dans l'état `enabled` (non grisé) sur HomeScreen en FR lorsqu'un défi est disponible pour la journée
- [ ] Le bouton défi du jour est dans l'état `enabled` (non grisé) sur HomeScreen en IT lorsqu'un défi est disponible pour la journée
- [ ] Le comportement du bouton en FR et IT est identique à celui observé dans les autres langues (EN, ES, DE, PT, NL, PL) dans les mêmes conditions
- [ ] Le bouton reste dans l'état `disabled` uniquement si le défi a déjà été joué ce jour (comportement F3-17 conservé)
- [ ] Aucune régression sur F3-01 (défi quotidien), F3-16 (indicateur complétion), F3-17 (une tentative par jour), F3-46 (fix précédent affichage bouton)
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

Ce bug est distinct de F3-46 (fix contraste et délai d'affichage) et de F3-37 (fix contraste texte blanc). Les autres langues fonctionnent correctement — la cause est probablement liée à la résolution du défi pour les locales FR et IT (endpoint backend ou condition de disponibilité côté frontend).

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending
