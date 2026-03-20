---
id: F3-39
title: UX — Retirer la pillule "DIFF" du GameHUD dans ArticleScreen
phase: 3-Features
priority: Should
agents: [Frontend Dev]
status: done
created: 2026-03-18
completed: 2026-03-20
---

# F3-39 — UX — Retirer la pillule "DIFF" du GameHUD dans ArticleScreen

## User Story
En tant que joueur en mode difficile, je veux que le titre de l'article cible soit affiché sans troncature dans le GameHUD, afin de toujours voir le nom complet de ma destination.

## Critères d'acceptance
- [x] La pillule "DIFF" (badge mode difficile) n'apparaît plus dans le GameHUD de l'ArticleScreen
- [x] Le titre de l'article cible s'affiche sans troncature dans le GameHUD, quelle que soit la longueur du titre
- [x] En mode standard (non difficile), le rendu du GameHUD est identique à l'état actuel (aucune régression)
- [x] L'information "mode difficile" reste visible ailleurs dans l'interface (ex. badge sur VictoryScreen, toggle HomeScreen) — ne pas la supprimer globalement
- [x] `tsc --noEmit` passe sans erreur
- [x] `npm run lint` passe sans erreur

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

Le badge DIFF dans le HUD consomme de l'espace horizontal et tronque le titre de la cible. La solution attendue est de retirer uniquement ce badge du HUD. L'indication mode difficile peut rester sur l'HomeScreen (toggle) et le VictoryScreen (badge résultat).

## Validation QA — Halim
Validé le 2026-03-20. Aucun bloc `hardModePill` ni style `hardModePillText` dans GameHUD.tsx. Props `isHardMode`, `difficultyPrefix` et `containerAccessibilityLabel` présents et utilisés pour l'accessibilité vocale. Badge mode difficile conservé sur VictoryScreen. tsc sans erreur, lint sans erreur.

## Statut
done
