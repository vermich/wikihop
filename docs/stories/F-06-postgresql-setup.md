---
id: F-06
title: Configuration de la base de données PostgreSQL
phase: 1-Fondations
priority: Must
agents: [Tech Lead, Backend Dev]
status: pending
created: 2026-02-28
completed:
---

# F-06 — Configuration de la base de données PostgreSQL

## User Story
En tant que développeur backend, je veux une base de données PostgreSQL connectée au serveur, afin de pouvoir persister les données de jeu.

## Critères d'acceptance
- [ ] PostgreSQL accessible localement (Docker Compose recommandé)
- [ ] Client de base de données configuré (pg ou Prisma — décision ADR)
- [ ] Système de migrations en place (schéma versionné)
- [ ] Connexion testée et validée au démarrage du serveur
- [ ] Variables d'environnement `DATABASE_URL` documentées dans `.env.example`

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
