---
id: P-12
title: Stratégie de mise à jour OTA (Over The Air)
phase: 4-Production
priority: Should
agents: [Tech Lead, Frontend Dev]
status: pending
created: 2026-02-28
completed:
---

# P-12 — Stratégie de mise à jour OTA (Over The Air)

## User Story
En tant qu'éditeur, je veux pouvoir déployer des corrections mineures sans passer par la validation des stores, afin de réagir rapidement aux bugs en production.

## Critères d'acceptance
- [ ] Expo Updates configuré en mode `manual` ou `on-launch`
- [ ] La politique de mise à jour OTA est documentée (quels types de changements sont éligibles)
- [ ] Les mises à jour critiques (correctifs de sécurité) peuvent être forcées
- [ ] La compatibilité OTA avec la version du runtime Expo est vérifiée à chaque release
- [ ] Les mises à jour OTA ne contournent pas les politiques Apple (pas de changement de fonctionnalité majeur sans review)

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
