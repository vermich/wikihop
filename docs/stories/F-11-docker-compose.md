---
id: F-11
title: Docker Compose pour l'environnement de développement local
phase: 1-Fondations
priority: Should
agents: [Tech Lead, Backend Dev]
status: pending
created: 2026-02-28
completed:
---

# F-11 — Docker Compose pour l'environnement de développement local

## User Story
En tant que développeur, je veux démarrer l'environnement complet en une seule commande, afin de ne pas perdre de temps en configuration.

## Critères d'acceptance
- [ ] `docker-compose.yml` à la racine démarre PostgreSQL
- [ ] `npm run dev` (ou équivalent) démarre le backend et la base de données
- [ ] Un fichier `docker-compose.override.yml` permet les personnalisations locales sans modifier le fichier principal
- [ ] Le README explique comment utiliser Docker Compose

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
