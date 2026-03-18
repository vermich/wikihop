---
id: F3-43
title: UX — Ajouter le libellé "Difficile" à côté du toggle mode difficile sur HomeScreen
phase: 3-Features
priority: Should
agents: [Frontend Dev]
status: pending
created: 2026-03-18
completed:
---

# F3-43 — UX — Ajouter le libellé "Difficile" à côté du toggle mode difficile sur HomeScreen

## User Story
En tant que joueur sur l'écran d'accueil, je veux voir le libellé "Difficile" à côté du toggle de mode difficile, afin de comprendre immédiatement ce que ce toggle contrôle sans avoir à le deviner.

## Critères d'acceptance
- [ ] Le libellé "Difficile" (traduit dans chaque locale : EN "Hard", ES "Difícil", DE "Schwer", PT "Difícil", IT "Difficile", NL "Moeilijk", PL "Trudny") est affiché à côté du toggle mode difficile sur HomeScreen
- [ ] Le libellé est visible et lisible dans les deux états du toggle (activé / désactivé)
- [ ] La mise en page du HomeScreen n'est pas dégradée par l'ajout du libellé (pas de débordement, pas de chevauchement)
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

Les libellés doivent être externalisés dans le système i18n mis en place dans F3-26 — ne pas coder les chaînes en dur.

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending
