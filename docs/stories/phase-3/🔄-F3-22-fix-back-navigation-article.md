---
id: F3-22
title: Fix retour arrière dans la partie
phase: 3-Features
priority: Must
agents: [Frontend Dev]
status: in-progress
created: 2026-03-14
completed:
depends_on: [M-03]
---

# F3-22 — Fix retour arrière dans la partie

## User Story
En tant que joueur, je veux qu'un seul appui sur le bouton retour pendant la partie me ramène à l'article précédent du parcours, afin de corriger ma navigation sans avoir à appuyer deux fois.

## Critères d'acceptance
- [ ] Un seul appui sur le bouton retour navigue vers l'article précédent du parcours de jeu (sans double appui nécessaire)
- [ ] Le scroll ne remonte pas en haut de la page courante lors du premier appui retour — le comportement est directement une navigation arrière
- [ ] Le comportement est identique sur iOS (bouton retour natif ou geste de swipe) et sur Android (bouton retour hardware)
- [ ] Si le joueur est sur le premier article de la partie (article de départ), le bouton retour n'est pas fonctionnel ou affiche une confirmation de sortie de partie (comportement existant conservé)
- [ ] Le compteur de sauts n'est pas décrémenté lors d'un retour arrière (ou alors selon la règle métier définie — à documenter dans les notes de réalisation)
- [ ] Aucune régression sur la navigation forward (tap sur un lien dans la WebView)
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress
