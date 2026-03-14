---
id: F3-20
title: Fix doublon de clés dans HistoryScreen
phase: 3-Features
priority: Must
agents: [Frontend Dev]
status: in-progress
created: 2026-03-14
completed:
depends_on: [F3-10]
---

# F3-20 — Fix doublon de clés dans HistoryScreen

## User Story
En tant que joueur, je veux consulter l'historique de mes parties sans erreur React, afin de ne pas voir un affichage dégradé ou des comportements inattendus dus à des clés dupliquées dans la liste.

## Critères d'acceptance
- [ ] L'erreur React "encountered two children with the same key" n'apparaît plus dans la console après ajout du SortBar dans HistoryScreen
- [ ] Chaque élément de la liste HistoryScreen possède une clé unique, indépendante du tri appliqué
- [ ] Le tri via le SortBar ne provoque aucune erreur React sur les clés
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress
