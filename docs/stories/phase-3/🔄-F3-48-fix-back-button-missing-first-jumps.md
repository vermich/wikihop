---
id: F3-48
title: Fix — Bouton retour absent sur les premiers sauts dans ArticleScreen
phase: 3-Features
priority: Must
agents: [Frontend Dev]
status: in-progress
created: 2026-03-21
completed:
---

# F3-48 — Fix — Bouton retour absent sur les premiers sauts dans ArticleScreen

## User Story
En tant que joueur naviguant entre articles, je veux que le bouton retour soit visible dès le premier saut effectué depuis l'article de départ, afin de pouvoir revenir en arrière à tout moment sans me retrouver bloqué.

## Critères d'acceptance
- [ ] Après le premier saut depuis l'article de départ, le bouton retour est visible dans le header de ArticleScreen
- [ ] Le bouton retour reste visible sur les sauts suivants (deuxième, troisième, etc.)
- [ ] Le bouton retour est absent uniquement sur l'article de départ (premier article de la partie, aucun historique de navigation)
- [ ] Un tap sur le bouton retour revient correctement à l'article précédent dans tous les cas (premier saut, sauts suivants)
- [ ] Aucune régression sur F3-22, F3-27, F3-34 (fixes retour arrière précédents)
- [ ] Le comportement est identique sur iOS (geste swipe + bouton header) et Android (bouton hardware + bouton header)
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

Symptôme observé : sur les premiers sauts de navigation dans un article, le bouton retour n'apparaît pas dans le header. La zone des fixes précédents (F3-22, F3-27, F3-34) concerne BackHandler et la WebView history — ce bug peut indiquer que la condition d'affichage du bouton retour dans le header ne se met pas à jour correctement lors des premiers changements d'état de navigation (canGoBack).

Attention : toute modification de cette zone doit respecter la règle obligatoire des specs navigation (diagramme d'état des stacks, comportement explicite pour chaque affordance de retour).

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress
