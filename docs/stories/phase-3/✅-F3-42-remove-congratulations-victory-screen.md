---
id: F3-42
title: UX — Retirer "Félicitations !" de VictoryScreen (doublon avec "Victoire !")
phase: 3-Features
priority: Should
agents: [Frontend Dev]
status: done
created: 2026-03-18
completed: 2026-03-20
---

# F3-42 — UX — Retirer "Félicitations !" de VictoryScreen (doublon avec "Victoire !")

## User Story
En tant que joueur sur l'écran de victoire, je veux voir un seul message de célébration, afin que l'interface soit claire et non répétitive.

## Critères d'acceptance
- [x] La ligne "Félicitations !" (ou son équivalent traduit dans toutes les locales) est supprimée de l'écran VictoryScreen
- [x] Le titre "Victoire !" (ou équivalent) reste présent et visible
- [x] La suppression est appliquée dans toutes les locales supportées (FR, EN, ES, DE, PT, IT, NL, PL)
- [x] La mise en page restante de VictoryScreen n'est pas dégradée par cette suppression (pas d'espace vide anormal)
- [x] `tsc --noEmit` passe sans erreur
- [x] `npm run lint` passe sans erreur

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
Validé le 2026-03-20. Aucun `congratsRow`, `checkIcon`, `congratsText` dans le JSX de VictoryScreen.tsx (seule occurrence : commentaire doc-header ligne 11, non rendu). Clé `congrats_text` absente des 8 fichiers locales vérifiés. Aucune référence à `congrats_text` dans `apps/mobile/src/`. tsc sans erreur, lint sans erreur.

Note : test `affiche le message Félicitations !` dans `__tests__/VictoryScreen.test.tsx` est obsolète — à corriger par Laurent (voir Bug dans F3-41).

## Statut
done
