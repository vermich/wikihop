---
id: F-01
title: Initialisation du monorepo
phase: 1-Fondations
priority: Must
agents: [Tech Lead]
status: pending
created: 2026-02-28
completed:
---

# F-01 — Initialisation du monorepo

## User Story
En tant que développeur de l'équipe, je veux un monorepo structuré avec les workspaces configurés, afin de pouvoir travailler sur le mobile, le backend et les packages partagés sans conflits.

## Critères d'acceptance
- [ ] Structure de dossiers conforme au plan (`apps/mobile`, `apps/backend`, `packages/shared`)
- [ ] Workspace npm/yarn configuré à la racine
- [ ] Fichier `package.json` racine avec scripts globaux (`lint`, `test`, `build`)
- [ ] `.gitignore` couvre `node_modules`, `.env`, builds Expo et artefacts CI
- [ ] `CLAUDE.md` présent avec les instructions globales de l'orchestrateur
- [ ] README.md racine décrit comment démarrer le projet localement

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
