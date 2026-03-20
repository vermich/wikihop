---
id: F3-44
title: UX — Transformer le lien "Historique des parties" en bouton sur HomeScreen
phase: 3-Features
priority: Should
agents: [Frontend Dev, UX/UI]
status: done
created: 2026-03-18
completed: 2026-03-20
---

# F3-44 — UX — Transformer le lien "Historique des parties" en bouton sur HomeScreen

## User Story
En tant que joueur sur l'écran d'accueil, je veux accéder à l'historique de mes parties via un bouton distinct, afin que cette action soit clairement identifiable comme une navigation principale et non comme un lien secondaire.

## Critères d'acceptance
- [x] Le lien texte "Historique des parties" est remplacé par un composant bouton (style cohérent avec les autres boutons de l'HomeScreen)
- [x] Un tap sur ce bouton navigue vers HistoryScreen — comportement identique à l'état actuel
- [x] Le libellé du bouton est traduit dans toutes les locales supportées via le système i18n de F3-26
- [x] L'ancien lien texte est supprimé
- [x] `tsc --noEmit` passe sans erreur
- [x] `npm run lint` passe sans erreur

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
Validé le 2026-03-20. Style `historyButton` : `height: 52`, `backgroundColor: '#FFFFFF'`, `borderWidth: 1`, `borderColor: '#2563EB'`, `borderRadius: 12`. Style `historyButtonText` : `fontWeight: 'bold'`, `color: '#2563EB'`. Bouton présent dans les 2 branches de `renderContent()` (loading et success). Aucun `secondaryTextButton` naviguant vers History. Clé i18n `home.history_link` utilisée. tsc sans erreur, lint sans erreur.

## Statut
done
