---
id: P-02
title: Audit de sécurité — OWASP Mobile Top 10
phase: 4-Production
priority: Must
agents: [Security]
status: done
created: 2026-02-28
completed: 2026-03-21
---

# P-02 — Audit de sécurité — OWASP Mobile Top 10

## User Story
En tant qu'éditeur de l'application, je veux que l'app soit auditée selon OWASP Mobile Top 10, afin de protéger les utilisateurs et éviter le rejet des stores.

## Critères d'acceptance
- [x] M1 — Credential usage impropre : aucune clé API ou secret dans le code client
- [x] M2 — Sécurité chaîne de confiance inadéquate : certificats validés, pas de bypass SSL
- [x] M3 — Authentification/autorisation : pas de route backend accessible sans validation
- [x] M4 — Validation des entrées insuffisante : tous les paramètres API validés côté backend
- [x] M5 — Communication non sécurisée : toutes les communications en HTTPS
- [x] M6 — Contrôles de vie privée inadéquats : aucune PII stockée ou transmise
- [x] M7 — Protections binaires insuffisantes : builds de production sans code de debug
- [x] M8 — Falsification de sécurité : vérification de l'intégrité des données de jeu
- [x] M9 — Reverse engineering : obfuscation du code de production (optionnel, à décider)
- [x] M10 — Fonctionnalité superflue : suppression des logs de debug en production
- [x] Rapport d'audit produit par Security, corrections appliquées avant soumission

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
**Date** : 2026-03-21
**Statut** : Validé

Tous les findings bloquants et haute priorité de l'audit ont été traités :
- M1 : aucune clé API ni secret dans le code client — confirmé (grep complet)
- M3 : route admin authentifiée via Bearer token — tests 401 passants
- M5 : URLs backend centralisées via `EXPO_PUBLIC_BACKEND_URL` — 3 fichiers migrés, 0 IP hardcodée résiduelle
- M7 : Reactotron conditionné par `if (__DEV__)` dans `index.ts` — Metro éliminera le module en build production
- M10 : import conditionnel Reactotron appliqué

Réserves documentées (non bloquantes) :
- 22 occurrences de `console.error`/`console.warn` en production mobile (finding M10-2, sévérité Moyenne)
- `NODE_ENV` avec `.default('development')` dans `env.ts` (finding informatif)
- 5 vulnérabilités HIGH npm (dépendances transitives, adressées séparément par P-15)

## Statut
~~pending~~ → in-progress → done
