---
id: F3-42
title: UX — Retirer "Félicitations !" de VictoryScreen (doublon avec "Victoire !")
phase: 3-Features
priority: Should
agents: [Frontend Dev]
status: pending
created: 2026-03-18
completed:
---

# F3-42 — UX — Retirer "Félicitations !" de VictoryScreen (doublon avec "Victoire !")

## User Story
En tant que joueur sur l'écran de victoire, je veux voir un seul message de célébration, afin que l'interface soit claire et non répétitive.

## Critères d'acceptance
- [ ] La ligne "Félicitations !" (ou son équivalent traduit dans toutes les locales) est supprimée de l'écran VictoryScreen
- [ ] Le titre "Victoire !" (ou équivalent) reste présent et visible
- [ ] La suppression est appliquée dans toutes les locales supportées (FR, EN, ES, DE, PT, IT, NL, PL)
- [ ] La mise en page restante de VictoryScreen n'est pas dégradée par cette suppression (pas d'espace vide anormal)
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending
