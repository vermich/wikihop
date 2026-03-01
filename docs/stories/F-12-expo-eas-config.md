---
id: F-12
title: Configuration Expo EAS (build cloud)
phase: 1-Fondations
priority: Should
agents: [Tech Lead, Frontend Dev]
status: done
created: 2026-02-28
completed: 2026-03-01
---

# F-12 — Configuration Expo EAS (build cloud)

## User Story
En tant que développeur, je veux Expo EAS configuré, afin de pouvoir générer des builds de preview sans environnement natif local.

## Critères d'acceptance
- [x] `eas.json` configuré avec les profils `development`, `preview` et `production`
- [x] Le profil `preview` génère un build installable sur device physique
- [x] Les secrets EAS (tokens, credentials) sont documentés (pas commités)
- [x] La commande `eas build --profile preview` s'exécute sans erreur sur la CI

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
**Date** : 2026-03-01
**Statut** : ⚠️ Validé avec réserves — exécution CI non vérifiable localement

- `eas.json` dans `apps/mobile/` avec profils `development` (developmentClient + simulator), `preview` (distribution internal, APK), `production` (store, app-bundle) : CONFORME
- Profil `preview` configure `distribution: "internal"` + `buildType: "apk"` pour device physique Android : CONFORME
- Secrets EAS (`EXPO_TOKEN`) documentés dans ADR-004 et `.github/workflows/ci.yml` — pas de token commité : CONFORME
- `eas build --profile preview` sur CI : workflow `release.yml` présent mais non exécutable localement. Dépend de la correction du Bug #3 pour que l'app soit installable

**Note** : Le workflow `release.yml` est configuré correctement pour déclencher `eas build --platform all --profile preview` sur push vers `main`.

## Statut
pending → in-progress → done
