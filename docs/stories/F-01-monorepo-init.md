---
id: F-01
title: Initialisation du monorepo
phase: 1-Fondations
priority: Must
agents: [Tech Lead]
status: in-progress
created: 2026-02-28
completed:
---

# F-01 — Initialisation du monorepo

## User Story
En tant que développeur de l'équipe, je veux un monorepo structuré avec les workspaces configurés, afin de pouvoir travailler sur le mobile, le backend et les packages partagés sans conflits.

## Critères d'acceptance
- [x] Structure de dossiers conforme au plan (`apps/mobile`, `apps/backend`, `packages/shared`)
- [x] Workspace npm/yarn configuré à la racine
- [x] Fichier `package.json` racine avec scripts globaux (`lint`, `test`, `build`)
- [x] `.gitignore` couvre `node_modules`, `.env`, builds Expo et artefacts CI
- [x] `CLAUDE.md` présent avec les instructions globales de l'orchestrateur
- [x] README.md racine décrit comment démarrer le projet localement

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
**Date** : 2026-03-01 (mise à jour 2026-03-01)
**Statut** : ✅ Validé — tous critères satisfaits après correction Bug #1

- Structure `apps/mobile`, `apps/backend`, `packages/shared` : CONFORME
- Workspaces npm configurés (`"workspaces": ["apps/*", "packages/*"]`) : CONFORME
- Scripts globaux `lint`, `test`, `build` présents dans package.json racine : CONFORME
- `.gitignore` couvre `node_modules`, `.env`, builds Expo, artefacts CI : CONFORME
- `CLAUDE.md` présent : CONFORME
- `README.md` racine : PRESENT — prérequis, démarrage rapide, scripts, structure, variables d'env, badge CI : CONFORME

**Bug #1 corrigé.** F-01 entièrement validée.

## Statut
pending → in-progress → done
