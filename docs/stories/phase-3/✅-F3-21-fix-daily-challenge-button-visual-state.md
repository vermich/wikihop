---
id: F3-21
title: Fix état visuel bouton défi du jour complété
phase: 3-Features
priority: Must
agents: [Frontend Dev]
status: done
created: 2026-03-14
completed: 2026-03-14
depends_on: [F3-17]
---

# F3-21 — Fix état visuel bouton défi du jour complété

## User Story
En tant que joueur ayant déjà complété le défi du jour, je veux que le bouton "Défi du jour" affiche visuellement un état désactivé, afin de comprendre immédiatement que je ne peux plus y accéder aujourd'hui.

## Critères d'acceptance
- [x] Lorsque le défi quotidien a été complété, le bouton "Défi du jour" affiche un style visuellement distinct de l'état actif (ex : opacité réduite, couleur grisée, ou indicateur explicite)
- [x] L'état visuel désactivé est cohérent avec la logique `disabled` déjà implémentée dans F3-17 (le bouton est bien `disabled` ET visuellement désactivé)
- [ ] Sur iOS et Android, l'état visuel est identique et conforme aux specs UX/UI
- [x] Aucune régression sur le comportement du bouton lorsque le défi n'a pas encore été réalisé (apparence normale, cliquable)
- [x] `tsc --noEmit` passe sans erreur
- [x] `npm run lint` passe sans erreur

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
Validé le 2026-03-14 (critères automatiques). `opacity: dailyButtonOpacity` (valeur 0.5) appliqué directement sur le style inline du TouchableOpacity — pattern explicite car `disabled={true}` ne gère pas l'opacité automatiquement sur RN. Cohérent avec le style `dailyButtonCompleted` et `dailyButtonDisabled`. Critère "iOS et Android identique" non coché — nécessite test sur device physique (voir gate A2).

## Statut
pending → in-progress → done
