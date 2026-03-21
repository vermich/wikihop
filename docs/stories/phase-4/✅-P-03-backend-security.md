---
id: P-03
title: Sécurisation du backend — Headers, CORS, Rate limiting
phase: 4-Production
priority: Must
agents: [Security, Backend Dev]
status: done
created: 2026-02-28
completed: 2026-03-21
---

# P-03 — Sécurisation du backend — Headers, CORS, Rate limiting

## User Story
En tant qu'éditeur, je veux que le backend soit protégé contre les abus et les attaques courantes, afin de garantir la disponibilité et la sécurité du service.

## Critères d'acceptance
- [x] Headers de sécurité HTTP configurés (Helmet.js ou équivalent Fastify) : CSP, HSTS, X-Frame-Options, etc.
- [x] CORS configuré pour n'autoriser que les origines légitimes
- [x] Rate limiting sur toutes les routes API (ex : 60 requêtes/minute par IP)
- [x] Validation des paramètres d'entrée avec un schéma Fastify/Zod sur chaque route
- [x] Logs d'accès et d'erreurs configurés (sans données personnelles)
- [x] Pas de stack trace exposée en réponse d'erreur en production

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
**Date** : 2026-03-21
**Statut** : Validé

Tests automatisés (security.test.ts) : 13 tests, tous passants.
- Helmet : X-Content-Type-Options, X-Frame-Options, Referrer-Policy, HSTS (max-age=31536000 + includeSubDomains), CSP (default-src 'none') — confirmés
- CORS conditionnel : production avec CORS_ORIGIN → origines restreintes, sinon reflect — implémenté et documenté
- Rate limiting : 60/min par IP, 429 JSON normalisé, /health exempté via allowList — testés
- Validation Zod : activée via setValidatorCompiler/setSerializerCompiler dans app.ts
- Logs Pino sans PII : comportement par défaut, serializers non configurés
- Stack trace masquée en production : `isProduction && statusCode >= 500` → message générique

## Statut
~~pending~~ → in-progress → done
