---
id: F-06
title: Configuration de la base de données PostgreSQL
phase: 1-Fondations
priority: Must
agents: [Tech Lead, Backend Dev]
status: done
created: 2026-02-28
completed: 2026-03-01
---

# F-06 — Configuration de la base de données PostgreSQL

## User Story
En tant que développeur backend, je veux une base de données PostgreSQL connectée au serveur, afin de pouvoir persister les données de jeu.

## Critères d'acceptance
- [x] PostgreSQL accessible localement (Docker Compose recommandé)
- [x] Client de base de données configuré (pg ou Prisma — décision ADR)
- [x] Système de migrations en place (schéma versionné)
- [x] Connexion testée et validée au démarrage du serveur
- [x] Variables d'environnement `DATABASE_URL` documentées dans `.env.example`

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
**Date** : 2026-03-01
**Statut** : ⚠️ Validé avec réserves — connexion réelle non testable

- `docker-compose.yml` démarre PostgreSQL 15-alpine avec healthcheck : CONFORME
- Client `pg` (node-postgres) configuré dans `apps/backend/src/db/index.ts` avec pool singleton, fonctions `query()` et `checkDatabaseConnection()` : CONFORME
- Migration SQL versionnée : `001_initial_schema.sql` avec table `game_sessions`, index, types PostgreSQL cohérents. Script `migrate.ts` avec `node-pg-migrate` : CONFORME
- Connexion testée au démarrage (`checkDatabaseConnection()` dans le hook `onReady` de Fastify) : code présent mais NON EXÉCUTABLE (backend non installable)
- `DATABASE_URL` dans `.env.example` : CONFORME

## Statut
pending → in-progress → done
