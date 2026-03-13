---
id: F3-08
title: Statistiques personnelles
phase: 3-Features
priority: Could
agents: [Frontend Dev, UX/UI]
status: done
created: 2026-02-28
completed: 2026-03-13
---

# F3-08 — Statistiques personnelles

## User Story
En tant que joueur régulier, je veux voir mes statistiques globales, afin de mesurer ma progression sur la durée.

## Critères d'acceptance
- [x] Écran "Mes stats" affichant : nombre total de parties, meilleur score, moyenne de sauts, taux de victoire
- [x] Les statistiques sont calculées depuis l'historique local
- [x] Un graphique simple (barres ou ligne) montre l'évolution du nombre de sauts sur les 7 dernières parties
- [x] Toutes les données restent locales (aucun envoi au serveur)

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
Validé le 2026-03-13 par Halim.
- StatsScreen créé avec grille 4 métriques (parties jouées, taux victoire, moyenne sauts, meilleur temps) + MiniBarChart
- Route Stats: undefined dans RootStackParamList et RootNavigator
- Bouton ⊞ dans header HistoryScreen → navigation.navigate('Stats') confirmé
- computeStats et computeChartData fonctions pures dans stats.utils.ts (TDD strict)
- useMemo pour stats et chartData dans StatsScreen
- MiniBarChart : zéro dépendance externe ajoutée, useWindowDimensions() pour largeur dynamique des barres
- État vide : "—" pour toutes les métriques, message d'invitation pour le graphique
- Tests TDD commitées avant implémentation : commit 59e02ee (tests) antérieur à commit 795c750 (implémentation)
- 50 tests utils stats passants + 11 tests MiniBarChart / 483 suite complète — 0 régression
- tsc sans erreur / lint 0 erreur

## Statut
pending → in-progress → done
