---
id: F3-20
title: Fix doublon de clés dans HistoryScreen
phase: 3-Features
priority: Must
agents: [Frontend Dev]
status: done
created: 2026-03-14
completed: 2026-03-14
depends_on: [F3-10]
---

# F3-20 — Fix doublon de clés dans HistoryScreen

## User Story
En tant que joueur, je veux consulter l'historique de mes parties sans erreur React, afin de ne pas voir un affichage dégradé ou des comportements inattendus dus à des clés dupliquées dans la liste.

## Critères d'acceptance
- [x] L'erreur React "encountered two children with the same key" n'apparaît plus dans la console après ajout du SortBar dans HistoryScreen
- [x] Chaque élément de la liste HistoryScreen possède une clé unique, indépendante du tri appliqué
- [x] Le tri via le SortBar ne provoque aucune erreur React sur les clés
- [x] `tsc --noEmit` passe sans erreur
- [x] `npm run lint` passe sans erreur

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
Validé le 2026-03-14. Fix confirmé : `keyExtractor` basé sur `item.id` (UUID stable) dans la FlatList, `ListFooterComponent` passé à `null` quand la liste est vide — supprime le conflit de clé avec le composant footer fantôme. tsc sans erreur, lint 0 erreur, 499 tests passants.

## Statut
pending → in-progress → done
