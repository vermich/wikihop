---
id: M-09
title: Tests unitaires — logique de jeu (Phase 2)
phase: 2-MVP
priority: Must
agents: [QA, Frontend Dev, Backend Dev]
status: done
created: 2026-02-28
completed: 2026-03-06
---

# M-09 — Tests unitaires — logique de jeu (Phase 2)

## User Story
En tant qu'équipe, nous voulons les règles métier couvertes par des tests unitaires, afin de prévenir les régressions sur la logique de jeu.

## Critères d'acceptance
- [x] Tests unitaires du compteur de sauts (incrémentation, non-décrémentation au retour)
- [x] Tests du filtre de liens (isPlayableWikipediaUrl, extractTitleFromUrl, titlesMatch — WikipediaWebView.test.tsx)
- [x] Tests de la détection de victoire (article cible atteint — ArticleScreen.test.tsx)
- [x] Tests du service WikipediaService (mocks des appels API)
- [x] Tests de l'endpoint `GET /api/game/random-pair` (réponse valide, gestion d'erreur)
- [x] Couverture de code supérieure à 70% sur les modules testés (285 tests, 13 suites)

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
