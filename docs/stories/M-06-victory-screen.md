---
id: M-06
title: Détection de victoire et écran de résultat
phase: 2-MVP
priority: Must
agents: [Frontend Dev, UX/UI]
status: pending
created: 2026-02-28
completed:
---

# M-06 — Détection de victoire et écran de résultat

## User Story
En tant que joueur, je veux être notifié immédiatement quand j'atteins la destination et voir mon score final, afin de ressentir la satisfaction d'avoir réussi.

## Critères d'acceptance
- [ ] Quand le joueur navigue vers l'article destination, la victoire est détectée automatiquement
- [ ] L'écran de victoire affiche : nombre de sauts, temps total, article de départ, article destination
- [ ] Le chemin complet parcouru est affiché sous forme de liste ordonnée d'articles cliquables (chaque article ouvre la page Wikipedia dans une WebView externe)
- [ ] Un bouton "Lire [titre de l'article cible]" ouvre l'article destination complet dans une WebView
- [ ] Un bouton "Rejouer" lance une nouvelle partie avec la même paire d'articles (timer et compteur remis à zéro), sans retourner à l'accueil
- [ ] Un bouton "Nouvelle partie" tire une nouvelle paire aléatoire et retourne à l'accueil
- [ ] Un bouton "Retour" retourne à l'écran d'accueil sans démarrer de partie
- [ ] L'animation de victoire est satisfaisante sans être excessive

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
