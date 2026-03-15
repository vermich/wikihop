---
id: F3-22
title: Fix retour arrière dans la partie
phase: 3-Features
priority: Must
agents: [Frontend Dev]
status: done
created: 2026-03-14
completed: 2026-03-15
depends_on: [M-03]
---

# F3-22 — Fix retour arrière dans la partie

## User Story
En tant que joueur, je veux qu'un seul appui sur le bouton retour pendant la partie me ramène à l'article précédent du parcours, afin de corriger ma navigation sans avoir à appuyer deux fois.

## Critères d'acceptance
- [x] Un seul appui sur le bouton retour navigue vers l'article précédent du parcours de jeu (sans double appui nécessaire) — GATE DEVICE PHYSIQUE REQUIS — Validé sur device physique le 2026-03-15 via F3-34
- [x] Le scroll ne remonte pas en haut de la page courante lors du premier appui retour — le comportement est directement une navigation arrière — GATE DEVICE PHYSIQUE REQUIS — Validé sur device physique le 2026-03-15 via F3-34
- [x] Le comportement est identique sur iOS (bouton retour natif ou geste de swipe) et sur Android (bouton retour hardware) — GATE DEVICE PHYSIQUE REQUIS — Validé sur device physique le 2026-03-15 via F3-34
- [x] Si le joueur est sur le premier article de la partie (article de départ), le bouton retour n'est pas fonctionnel ou affiche une confirmation de sortie de partie (comportement existant conservé)
- [x] Le compteur de sauts n'est pas décrémenté lors d'un retour arrière — navigation.goBack() dépile sans appeler handlePageChange (documenté dans le commentaire ArticleScreen)
- [x] Aucune régression sur la navigation forward (tap sur un lien dans la WebView)
- [x] `tsc --noEmit` passe sans erreur
- [x] `npm run lint` passe sans erreur

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
Validé le 2026-03-14 (critères automatiques). `webViewRef.current.goBack()` remplacé par `navigation.goBack()` dans le BackHandler Android et dans le bouton header. `webViewCanGoBack` et `handleNavigationStateChange` absents de ArticleScreen (pas de code mort). WikipediaWebView conserve `onNavigationStateChange` et `webViewRef` comme props optionnelles mais ArticleScreen ne les utilise plus — props backward-compatible non bloquantes. Critères comportementaux (double appui, scroll, cross-platform) non cochés — gate device physique requis.

## Statut
pending → in-progress → done

Régression confirmée le 2026-03-14 — le retour ramenait à l'accueil au lieu de l'article précédent. Correction déployée en vague D (F3-27) et vague E (F3-34). Gate device physique confirmé par le Client le 2026-03-15.
