---
id: P-15
title: Tests de sécurité automatisés (SAST)
phase: 4-Production
priority: Could
agents: [Security]
status: pending
created: 2026-02-28
completed:
---

# P-15 — Tests de sécurité automatisés (SAST)

## User Story
En tant qu'équipe, nous voulons une analyse de sécurité statique automatisée dans la CI, afin de détecter les vulnérabilités au plus tôt.

## Critères d'acceptance
- [ ] Outil SAST intégré dans la CI (ex : Snyk, CodeQL, ou `npm audit`)
- [ ] `npm audit` s'exécute à chaque build et échoue si des vulnérabilités critiques sont détectées
- [ ] Les dépendances sont mises à jour régulièrement (Dependabot ou équivalent)
- [ ] Les faux positifs sont documentés et justifiés

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
