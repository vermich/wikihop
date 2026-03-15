---
id: F3-30
title: Fix — parties multijoueur exclues de l'historique solo
phase: 3-Features
priority: Must
agents: [Tech Lead, Frontend Dev]
status: done
created: 2026-03-14
completed: 2026-03-15
depends_on: [F3-12]
---

# F3-30 — Fix — parties multijoueur exclues de l'historique solo

## User Story
En tant que joueur solo, je veux que mon historique de parties n'affiche que mes parties solo, afin de ne pas voir les parties multijoueur mélangées dans ma liste.

## Contexte
Dans la session multijoueur, `clearSession()` du game store est appelé après chaque tour, ce qui peut déclencher une écriture dans `ScoreStorage`. Les parties multijoueur apparaissent ainsi dans l'historique solo — comportement non souhaité.

## Critères d'acceptance
- [x] Les parties jouées en mode multijoueur n'apparaissent plus dans `HistoryScreen`
- [x] Les parties solo existantes ne sont pas affectées
- [x] `ScoreStorage` ou `game.store.ts` est modifié pour exclure les sessions multijoueur de la sauvegarde
- [x] `tsc --noEmit` passe sans erreur
- [x] `npm run lint` passe sans erreur

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
**Date** : 2026-03-15
**Statut** : Validé

Tous les critères d'acceptance cochés. Les parties multijoueur n'apparaissent plus dans `HistoryScreen`. Parties solo existantes non affectées.

## Statut
done
