---
id: F3-27
title: Fix retour arrière — régression F3-22
phase: 3-Features
priority: Must
agents: [Tech Lead, Frontend Dev]
status: in-progress
created: 2026-03-14
completed:
depends_on: [F3-22]
---

# F3-27 — Fix retour arrière — régression F3-22

## User Story
En tant que joueur, je veux qu'un seul appui sur le bouton retour pendant la partie me ramène à l'article précédent du parcours, afin de corriger ma navigation sans quitter la partie.

## Contexte
F3-22 a remplacé `webViewRef.current.goBack()` par `navigation.goBack()`. Cette approche dépile l'écran Game entier au lieu de naviguer dans l'historique de la WebView. Résultat : le retour renvoie à l'écran précédent dans le stack React Navigation (accueil ou article précédent selon le stack), pas à l'article Wikipedia précédent dans la WebView.

## Critères d'acceptance
- [ ] Un seul appui sur le bouton retour navigue vers l'article Wikipedia précédent dans la WebView (pas vers l'accueil)
- [ ] Le comportement est correct sur iOS (bouton retour natif ou geste de swipe) et Android (bouton hardware)
- [ ] Si le joueur est au premier article de la partie, le bouton retour propose l'abandon (comportement existant)
- [ ] Le retour ne compte pas comme un saut supplémentaire
- [ ] Aucune régression sur la navigation forward (tap sur un lien)
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
in-progress
