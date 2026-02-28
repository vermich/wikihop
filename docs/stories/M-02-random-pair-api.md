---
id: M-02
title: Génération d'une paire d'articles aléatoires (backend)
phase: 2-MVP
priority: Must
agents: [Backend Dev]
status: pending
created: 2026-02-28
completed:
---

# M-02 — Génération d'une paire d'articles aléatoires (backend)

## User Story
En tant que joueur, je veux recevoir deux articles Wikipedia aléatoires et différents pour chaque nouvelle partie, afin de toujours avoir un défi unique.

## Critères d'acceptance
- [ ] Endpoint `GET /api/game/random-pair` retourne `{ start: Article, target: Article }`
- [ ] Les deux articles sont distincts
- [ ] Les articles sont des articles encyclopédiques (pas des pages de catégorie, portail, aide)
- [ ] Les articles ont un contenu suffisant (non-ébauche) — critère à définir avec Tech Lead
- [ ] Le temps de réponse est inférieur à 2 secondes (p95)
- [ ] L'endpoint gère les erreurs Wikipedia API (timeout, 404) et retourne un code d'erreur approprié

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
