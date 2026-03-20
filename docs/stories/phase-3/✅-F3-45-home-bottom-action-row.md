---
id: F3-45
title: UX — Ligne de 3 boutons en bas de HomeScreen (Wikipedia / Recharger / À propos)
phase: 3-Features
priority: Should
agents: [Frontend Dev, UX/UI]
status: done
created: 2026-03-18
completed: 2026-03-20
---

# F3-45 — UX — Ligne de 3 boutons en bas de HomeScreen (Wikipedia / Recharger / À propos)

## User Story
En tant que joueur sur l'écran d'accueil, je veux trouver les actions secondaires (soutenir Wikipedia, recharger les articles, accéder à "À propos") regroupées dans une ligne de 3 boutons en bas de l'écran, afin que l'interface soit organisée et que ces actions restent accessibles sans polluer la zone principale.

## Critères d'acceptance
- [x] Une ligne de 3 boutons est affichée en bas du HomeScreen, contenant dans cet ordre : "Soutenir Wikipedia", "Recharger les articles", "À propos"
- [x] Un tap sur "Soutenir Wikipedia" ouvre la page donation (comportement identique à l'existant — F3-04)
- [x] Un tap sur "Recharger les articles" déclenche le rechargement des paires d'articles disponibles (comportement identique à l'existant)
- [x] Un tap sur "À propos" navigue vers AboutScreen (comportement identique à l'existant — F3-06)
- [x] Les liens/boutons séparés existants correspondant à ces 3 actions sont supprimés
- [x] Les libellés des 3 boutons sont traduits dans toutes les locales supportées via le système i18n de F3-26
- [x] La ligne de boutons s'affiche correctement sur les tailles d'écran iPhone SE (375 pt) et iPhone Pro Max (430 pt) — pas de débordement ni de chevauchement
- [x] `tsc --noEmit` passe sans erreur
- [x] `npm run lint` passe sans erreur

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

Les 3 boutons peuvent être de style icône + libellé court, ou libellé seul selon les préconisations UX/UI. Le style doit être cohérent avec les conventions visuelles du HomeScreen.

## Validation QA — Halim
Validé le 2026-03-20. `bottomActionRow` : `flexDirection: 'row'`, `alignItems: 'center'`. 3 `TouchableOpacity bottomActionButton` dans l'ordre Donation, refresh, About. `bottomActionButton` : `flex: 1`, `height: 48`, `backgroundColor: 'transparent'`. 2 `bottomActionRowSeparator` présents entre les boutons. Animation `rotateInterpolated` conservée sur l'icône ↺ du bouton Recharger. Anciens styles absents (`refreshButton`, `refreshButtonInner`, `refreshButtonDisabled`, `refreshButtonText`, `refreshIcon`, `secondaryTextButton`, `secondaryTextButtonText`). `rotateAnim` et `rotateInterpolated` utilisés — aucun code mort. Les 2 branches de `renderContent()` contiennent la row. tsc sans erreur, lint sans erreur.

## Statut
done
