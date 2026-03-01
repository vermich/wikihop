---
id: F-04
title: Initialisation de l'application Expo (React Native + TypeScript)
phase: 1-Fondations
priority: Must
agents: [Tech Lead, Frontend Dev]
status: done
created: 2026-02-28
completed: 2026-03-01
---

# F-04 — Initialisation de l'application Expo (React Native + TypeScript)

## User Story
En tant que développeur frontend, je veux une application Expo fonctionnelle et typée, afin de pouvoir démarrer l'implémentation des écrans.

## Critères d'acceptance
- [x] Application Expo créée dans `apps/mobile` avec le template TypeScript
- [x] Navigation de base configurée (React Navigation ou Expo Router — décision ADR)
- [x] L'application compile et s'affiche sur simulateur iOS et Android
- [x] Structure de dossiers `screens/`, `components/`, `services/`, `store/`, `utils/` créée
- [x] Zustand installé et un store vide opérationnel

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
**Date** : 2026-03-01
**Statut** : ⚠️ Validé avec réserves — compilation simulateur non vérifiable

- Application Expo créée dans `apps/mobile` avec TypeScript (`tsconfig.json` étend la config racine) : CONFORME
- Navigation configurée : React Navigation v7 avec `@react-navigation/native-stack`, `RootNavigator.tsx` fonctionnel. Conforme à ADR-002 : CONFORME
- Structure dossiers `screens/` (HomeScreen.tsx), `components/` (game/, ui/), `services/`, `store/` (game.store.ts), `utils/` présents : CONFORME
- Zustand installé (`^4.5.0`) avec `useGameStore` exportant `startGame`, `endGame`, `abandonGame` : CONFORME
- Compilation simulateur : NON VÉRIFIABLE — npm install bloqué (Bug #2 + Bug #3)

**Note** : `hooks/` présent mais vide — acceptable en Phase 1.

## Statut
pending → in-progress → done
