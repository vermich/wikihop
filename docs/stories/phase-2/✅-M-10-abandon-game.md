---
id: M-10
title: Abandon de partie
phase: 2-MVP
priority: Should
agents: [Frontend Dev, UX/UI]
status: done
created: 2026-02-28
completed: 2026-03-06
---

# M-10 — Abandon de partie

## User Story
En tant que joueur, je veux pouvoir abandonner une partie en cours, afin de recommencer ou quitter le jeu sans être bloqué.

## Critères d'acceptance
- [x] Un bouton ou geste permet d'abandonner la partie (avec confirmation) — bouton "Abandonner" dans le header d'ArticleScreen + BackHandler Android
- [x] La session est marquée `abandoned` dans le store — abandonSession() appelé sur confirmation
- [x] Le joueur est redirigé vers l'écran d'accueil après confirmation
- [x] Aucune donnée corrompue n'est laissée dans AsyncStorage après abandon

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
