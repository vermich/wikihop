---
id: P-16
title: Fix — Bouton défi du jour grisé en FR et IT
phase: 4-Production
priority: Must
agents: [Frontend Dev, Backend Dev]
status: done
created: 2026-03-21
completed: 2026-03-21
---

# P-16 — Fix — Bouton défi du jour grisé en FR et IT

## User Story
En tant que joueur utilisant l'application en français ou en italien, je veux que le bouton "Défi du jour" soit actif et cliquable lorsqu'un défi est disponible, afin de pouvoir jouer le défi quotidien dans ma langue sans être bloqué par un bouton inactif.

## Critères d'acceptance
- [x] Le bouton défi du jour est dans l'état `enabled` (non grisé) sur HomeScreen en FR lorsqu'un défi est disponible pour la journée
- [x] Le bouton défi du jour est dans l'état `enabled` (non grisé) sur HomeScreen en IT lorsqu'un défi est disponible pour la journée
- [x] Le comportement du bouton en FR et IT est identique à celui observé dans les autres langues (EN, ES, DE, PT, NL, PL) dans les mêmes conditions
- [x] Le bouton reste dans l'état `disabled` uniquement si le défi a déjà été joué ce jour (comportement F3-17 conservé)
- [x] Aucune régression sur F3-01 (défi quotidien), F3-16 (indicateur complétion), F3-17 (une tentative par jour), F3-46 (fix précédent affichage bouton)
- [x] `tsc --noEmit` passe sans erreur
- [x] `npm run lint` passe sans erreur

## Notes de réalisation

Cause racine : boucle de retry dans `GET /api/game/daily` (fallback hash+pageviews) recalculait les mêmes indices déterministes à chaque tentative. Fix : indices calculés à l'intérieur de la boucle — tentative 0 = `computeDailyIndices` (déterministe), tentatives 1–4 = `pickTwoDistinctIndices` (aléatoire). Code 503 final : `DAILY_POOL_EXHAUSTED`.

## Validation QA — Halim

Validé le 2026-03-21. 4 tests `daily-retry.route.test.ts` passants. tsc + lint sans erreur. 169 tests backend passants.

## Statut
done
