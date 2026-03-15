---
id: F3-34
title: Fix retour arrière WebView — régression persistante après F3-27
phase: 3-Features
priority: Must
agents: [Tech Lead, Frontend Dev]
status: in-progress
created: 2026-03-15
completed:
depends_on: F3-27
---

# F3-34 — Fix retour arrière WebView — régression persistante après F3-27

## User Story
En tant que joueur, je veux qu'un seul appui sur le bouton retour me ramène à l'article Wikipedia précédent, et que les sauts soient correctement comptabilisés, afin de naviguer normalement pendant la partie.

## Contexte
F3-27 a restauré `webViewRef.current.goBack()` mais le comportement sur device physique est incorrect : le retour nécessite 3 appuis et les sauts ne sont pas comptabilisés correctement. Régression confirmée lors des tests device du 2026-03-15.

## Critères d'acceptance
- [x] Un seul appui sur "← Retour" navigue vers l'article Wikipedia précédent
- [x] Le retour arrière ne nécessite pas plusieurs appuis
- [x] Les sauts forward sont correctement comptabilisés après un retour arrière
- [x] Le retour arrière lui-même ne compte pas comme un saut
- [ ] Testé et validé sur device physique (iOS ou Android)
- [x] `tsc --noEmit` passe sans erreur
- [x] `npm run lint` passe sans erreur

## Notes de réalisation
Stack applicatif de titres (`articleStack` ref) + `stackSize` (state) dans ArticleScreen.
- `webViewRef.current?.goBack()` supprimé — bypass total de l'historique interne WebView
- `handleGoBack` : pop du stack + `setCurrentTitle(prevTitle)` + flag `isBackNavigation.current = true`
- `handlePageChangeSync` : push dans le stack sur forward, intercept (no-op côté sauts) sur back
- BackHandler Android conditionné sur `stackSize > 1`
- Bouton "← Retour" conditionné sur `stackSize > 1`

## Validation QA — Halim
**Date** : 2026-03-15
**Statut** : Validé avec réserves (gate device physique en attente)

Critères automatiques : tous validés (5/7 cochés + 2 non blocants automatisables).
- `webViewRef.current?.goBack()` : absent du code (vérifié `grep` — seule occurrence est un commentaire en ligne 196).
- `articleStack` (ref) + `stackSize` (state) : présents lignes 95-99.
- Bouton "← Retour" conditionné sur `stackSize > 1` : ligne 229.
- `handleGoBack` : pop + `setCurrentTitle(prevTitle)` + `isBackNavigation.current = true` : lignes 174-192.
- `handlePageChangeSync` : push forward + intercept back : lignes 138-153.
- BackHandler Android conditionné sur `stackSize > 1` : lignes 203-214.

**GATE DEVICE PHYSIQUE NON VALIDÉ** : Laurent n'avait pas accès à un device physique lors de la livraison.
Ce critère est BLOQUANT avant mise en production. La story reste en `in-progress` jusqu'à validation sur device.

## Statut
in-progress
