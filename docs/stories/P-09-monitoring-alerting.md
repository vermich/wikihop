---
id: P-09
title: Monitoring et alerting en production
phase: 4-Production
priority: Must
agents: [Tech Lead, Backend Dev]
status: pending
created: 2026-02-28
completed:
---

# P-09 — Monitoring et alerting en production

## User Story
En tant qu'éditeur, je veux être alerté en cas d'incident en production, afin de réagir rapidement et minimiser l'impact sur les joueurs.

## Critères d'acceptance
- [ ] Endpoint de santé `GET /health` retournant l'état de la base de données
- [ ] Monitoring de disponibilité configuré (Uptime Robot, Better Stack ou équivalent gratuit)
- [ ] Alerting par email ou notification en cas d'indisponibilité supérieure à 5 minutes
- [ ] Logs d'erreur backend agrégés (Logtail, Papertrail ou équivalent)
- [ ] Tableau de bord de métriques de base (requêtes/minute, taux d'erreur, latence)

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
