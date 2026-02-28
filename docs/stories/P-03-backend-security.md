---
id: P-03
title: Sécurisation du backend — Headers, CORS, Rate limiting
phase: 4-Production
priority: Must
agents: [Security, Backend Dev]
status: pending
created: 2026-02-28
completed:
---

# P-03 — Sécurisation du backend — Headers, CORS, Rate limiting

## User Story
En tant qu'éditeur, je veux que le backend soit protégé contre les abus et les attaques courantes, afin de garantir la disponibilité et la sécurité du service.

## Critères d'acceptance
- [ ] Headers de sécurité HTTP configurés (Helmet.js ou équivalent Fastify) : CSP, HSTS, X-Frame-Options, etc.
- [ ] CORS configuré pour n'autoriser que les origines légitimes
- [ ] Rate limiting sur toutes les routes API (ex : 60 requêtes/minute par IP)
- [ ] Validation des paramètres d'entrée avec un schéma Fastify/Zod sur chaque route
- [ ] Logs d'accès et d'erreurs configurés (sans données personnelles)
- [ ] Pas de stack trace exposée en réponse d'erreur en production

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
