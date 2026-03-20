---
id: F3-40
title: UX — Titre article centré dans le header ArticleScreen (sans bouton retour)
phase: 3-Features
priority: Should
agents: [Frontend Dev]
status: done
created: 2026-03-18
completed: 2026-03-20
---

# F3-40 — UX — Titre article centré dans le header ArticleScreen (sans bouton retour)

## User Story
En tant que joueur sur un article sans historique de navigation (premier article de la partie), je veux que le titre de l'article soit centré dans le header, afin que la mise en page soit cohérente visuellement quelle que soit ma position dans la partie.

## Critères d'acceptance
- [x] Quand le bouton retour est absent (premier article de la partie), le titre s'affiche centré horizontalement dans le header
- [x] Quand le bouton retour est présent (articles suivants), le titre reste aligné à gauche (ou centré selon la convention UX/UI de l'app) sans régression
- [x] Le centrage est vérifié sur un titre court (ex. "France") et un titre long (ex. "Révolution française") — pas de débordement ni de troncature inattendue
- [x] `tsc --noEmit` passe sans erreur
- [x] `npm run lint` passe sans erreur

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

Le problème de centrage se produit car l'espace à gauche n'est pas compensé quand le bouton retour est absent. Une solution courante : ajouter un espace vide (placeholder) de même dimension que le bouton retour à droite du titre pour équilibrer le layout.

## Validation QA — Halim
Validé le 2026-03-20. `headerTitle.textAlign = 'center'` confirmé (ArticleScreen.tsx ligne 375). `homeButton.minWidth = 44` (ligne 379) assure la symétrie droite. `backButtonPlaceholder.width = 44` (ligne 368) compense l'absence du bouton retour. Layout centré garanti par `flex: 1` + `textAlign: 'center'` + placeholder symétrique. tsc sans erreur, lint sans erreur.

## Statut
done
