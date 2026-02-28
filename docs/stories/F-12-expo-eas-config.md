---
id: F-12
title: Configuration Expo EAS (build cloud)
phase: 1-Fondations
priority: Should
agents: [Tech Lead, Frontend Dev]
status: pending
created: 2026-02-28
completed:
---

# F-12 — Configuration Expo EAS (build cloud)

## User Story
En tant que développeur, je veux Expo EAS configuré, afin de pouvoir générer des builds de preview sans environnement natif local.

## Critères d'acceptance
- [ ] `eas.json` configuré avec les profils `development`, `preview` et `production`
- [ ] Le profil `preview` génère un build installable sur device physique
- [ ] Les secrets EAS (tokens, credentials) sont documentés (pas commités)
- [ ] La commande `eas build --profile preview` s'exécute sans erreur sur la CI

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
