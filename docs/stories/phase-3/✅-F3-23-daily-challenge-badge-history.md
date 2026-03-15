---
id: F3-23
title: Badge "défi du jour" dans l'historique des parties
phase: 3-Features
priority: Should
agents: [Frontend Dev, UX/UI]
status: done
created: 2026-03-14
completed: 2026-03-14
depends_on: [F3-02, F3-01]
---

# F3-23 — Badge "défi du jour" dans l'historique des parties

## User Story
En tant que joueur, je veux voir dans l'historique de mes parties lesquelles étaient des défis quotidiens, afin de distinguer mes performances en mode défi de mes parties libres.

## Critères d'acceptance
- [x] Chaque HistoryItem correspondant à une partie avec `isDailyChallenge === true` affiche un indicateur visuel distinctif (badge, icône ou label — selon specs UX/UI)
- [x] Les HistoryItem de parties libres (`isDailyChallenge === false` ou champ absent) n'affichent pas l'indicateur
- [x] L'indicateur est visible sans interaction supplémentaire (pas de tap nécessaire pour le révéler)
- [x] L'indicateur est accessible : présence d'un `accessibilityLabel` décrivant "Défi du jour" pour les lecteurs d'écran
- [x] L'affichage est cohérent après un changement de tri via le SortBar (F3-10) — l'indicateur reste présent sur les bonnes parties
- [x] `tsc --noEmit` passe sans erreur
- [x] `npm run lint` passe sans erreur

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
Validé le 2026-03-14. Badge "DÉFI" conditionnel sur `isDailyChallenge === true` (=== true strict, champ optionnel). `accessible={false}` sur la View badge. `accessibilityLabel` du TouchableOpacity contient "Défi du jour." préfixe conditionnel. 5 tests alongside dans `HistoryItem.test.tsx` couvrant tous les cas. tsc sans erreur, lint 0 erreur, 499 tests passants.

## Statut
pending → in-progress → done
