---
id: F-11
title: Docker Compose pour l'environnement de développement local
phase: 1-Fondations
priority: Should
agents: [Tech Lead, Backend Dev]
status: in-progress
created: 2026-02-28
completed:
---

# F-11 — Docker Compose pour l'environnement de développement local

## User Story
En tant que développeur, je veux démarrer l'environnement complet en une seule commande, afin de ne pas perdre de temps en configuration.

## Critères d'acceptance
- [x] `docker-compose.yml` à la racine démarre PostgreSQL
- [ ] `npm run dev` (ou équivalent) démarre le backend et la base de données
- [x] Un fichier `docker-compose.override.yml` permet les personnalisations locales sans modifier le fichier principal
- [ ] Le README explique comment utiliser Docker Compose

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
**Date** : 2026-03-01
**Statut** : ⚠️ Validé avec réserves — 2 critères partiellement manquants

- `docker-compose.yml` démarre PostgreSQL 15-alpine avec healthcheck, volumes nommés : CONFORME
- `npm run dev` : seul `dev:backend` est disponible à la racine, qui lance uniquement le backend (`tsx watch src/server.ts`). Il n'y a pas de commande unique qui démarre backend + BDD en parallèle. Les commandes `db:up` + `dev:backend` doivent être lancées séparément : PARTIEL
- `docker-compose.override.yml` présent et commité avec personnalisations locales (credentials dev) : CONFORME
- README : ABSENT (voir Bug #1) — critère NON satisfait

**Observation** : La story demande une seule commande `npm run dev` pour tout démarrer. La racine a `db:up` et `dev:backend` séparés. Un script combiné (ex: avec `concurrently`) est absent.

## Statut
pending → in-progress → done
