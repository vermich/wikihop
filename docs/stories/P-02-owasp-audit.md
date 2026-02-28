---
id: P-02
title: Audit de sécurité — OWASP Mobile Top 10
phase: 4-Production
priority: Must
agents: [Security]
status: pending
created: 2026-02-28
completed:
---

# P-02 — Audit de sécurité — OWASP Mobile Top 10

## User Story
En tant qu'éditeur de l'application, je veux que l'app soit auditée selon OWASP Mobile Top 10, afin de protéger les utilisateurs et éviter le rejet des stores.

## Critères d'acceptance
- [ ] M1 — Credential usage impropre : aucune clé API ou secret dans le code client
- [ ] M2 — Sécurité chaîne de confiance inadéquate : certificats validés, pas de bypass SSL
- [ ] M3 — Authentification/autorisation : pas de route backend accessible sans validation
- [ ] M4 — Validation des entrées insuffisante : tous les paramètres API validés côté backend
- [ ] M5 — Communication non sécurisée : toutes les communications en HTTPS
- [ ] M6 — Contrôles de vie privée inadéquats : aucune PII stockée ou transmise
- [ ] M7 — Protections binaires insuffisantes : builds de production sans code de debug
- [ ] M8 — Falsification de sécurité : vérification de l'intégrité des données de jeu
- [ ] M9 — Reverse engineering : obfuscation du code de production (optionnel, à décider)
- [ ] M10 — Fonctionnalité superflue : suppression des logs de debug en production
- [ ] Rapport d'audit produit par Security, corrections appliquées avant soumission

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
