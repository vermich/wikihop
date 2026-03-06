---
id: F3-02
title: Historique des parties (stockage local)
phase: 3-Features
priority: Must
agents: [Frontend Dev, UX/UI]
status: pending
created: 2026-02-28
completed:
---

# F3-02 — Historique des parties (stockage local)

## User Story
En tant que joueur, je veux revoir mes parties passées, afin de suivre ma progression et me souvenir de mes meilleurs trajets.

## Critères d'acceptance
- [ ] L'historique affiche les 50 dernières parties (terminées ou abandonnées)
- [ ] Pour chaque entrée de la liste : date, articles de départ et destination, nombre de sauts, temps, statut (Victoire / Abandonné)
- [ ] L'historique est stocké dans AsyncStorage via un service `ScoreStorage` (`save`, `getAll`, `delete`, `deleteAll`)
- [ ] Le joueur peut effacer tout l'historique depuis l'écran (bouton "Effacer l'historique" avec confirmation)
- [ ] L'historique est accessible depuis la HomeScreen (bouton "Historique")
- [ ] L'écran de victoire (M-06) propose d'aller voir l'historique

## Stories associées (extensions de ce scope)
- **F3-10** : Tri multi-critères dans la liste (date, durée, clics)
- **F3-11** : Vue détail d'une partie individuelle avec suppression et rejouer

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
