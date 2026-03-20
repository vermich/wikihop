---
id: F3-44
title: UX — Transformer le lien "Historique des parties" en bouton sur HomeScreen
phase: 3-Features
priority: Should
agents: [Frontend Dev, UX/UI]
status: pending
created: 2026-03-18
completed:
---

# F3-44 — UX — Transformer le lien "Historique des parties" en bouton sur HomeScreen

## User Story
En tant que joueur sur l'écran d'accueil, je veux accéder à l'historique de mes parties via un bouton distinct, afin que cette action soit clairement identifiable comme une navigation principale et non comme un lien secondaire.

## Critères d'acceptance
- [ ] Le lien texte "Historique des parties" est remplacé par un composant bouton (style cohérent avec les autres boutons de l'HomeScreen)
- [ ] Un tap sur ce bouton navigue vers HistoryScreen — comportement identique à l'état actuel
- [ ] Le libellé du bouton est traduit dans toutes les locales supportées via le système i18n de F3-26
- [ ] L'ancien lien texte est supprimé
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending
