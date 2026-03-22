---
id: M-13
title: Accessibilité de base (WCAG 2.1 AA)
phase: 4-Production
priority: Should
agents: [Frontend Dev, UX/UI]
status: done
created: 2026-02-28
completed: 2026-03-22
---

# M-13 — Accessibilité de base (WCAG 2.1 AA)

## User Story
En tant que joueur avec une déficience visuelle, je veux que l'application soit utilisable avec les outils d'accessibilité du système, afin de ne pas être exclu du jeu.

## Critères d'acceptance
- [x] Tous les éléments interactifs ont un label accessible (`accessibilityLabel`)
- [x] Le contraste des couleurs respecte WCAG 2.1 AA (ratio 4.5:1 minimum pour le texte)
- [x] La taille minimale des zones tactiles est de 44x44 points
- [x] Le lecteur d'écran (VoiceOver iOS / TalkBack Android) peut naviguer dans les écrans principaux
- [x] Les liens Wikipedia cliquables sont annoncés comme "lien" par le lecteur d'écran

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
Re-validation complète sur develop post-merge PR #59 — 2026-03-22.
Tous les correctifs A01–A05 et B01–B03 vérifiés ligne par ligne dans les fichiers sources.
699/699 tests passants (rapport existant), tsc sans erreur, lint sans erreur.
Story validée sans réserve.

## Statut
pending → in-progress → done
