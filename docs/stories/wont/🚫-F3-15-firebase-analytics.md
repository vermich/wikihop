---
id: F3-15
title: Firebase Analytics — intégration skeleton (événements de base)
phase: 3-Features
priority: Could
agents: [Frontend Dev, DPO]
status: pending
created: 2026-03-01
completed:
---

# F3-15 — Firebase Analytics — intégration skeleton (événements de base)

## User Story
En tant que membre de l'équipe WikiHop, je veux disposer d'un wrapper Analytics qui enregistre les événements clés du jeu, afin de comprendre comment les joueurs utilisent l'application et prendre des décisions produit éclairées.

## Critères d'acceptance
- [ ] Un module `analytics.ts` est créé dans `apps/mobile/src/services/`
- [ ] Le module expose une interface typée `AnalyticsService` avec des méthodes nommées par événement (ex: `trackGameStarted`, `trackGameWon`, `trackGameAbandoned`, `trackScreenView`)
- [ ] En développement et en test (mode `__DEV__`), les événements sont loggés en console uniquement (no-op Firebase) — aucun appel réseau
- [ ] En production, les événements sont envoyés à Firebase Analytics via `@react-native-firebase/analytics`
- [ ] Les événements de base trackés sont : démarrage de partie, victoire (avec nombre de sauts et durée), abandon, changement de langue
- [ ] Aucun identifiant utilisateur (`setUserId`) n'est défini — analytics anonyme uniquement
- [ ] Le DPO a validé la liste des événements collectés et leur conformité RGPD (pas de données identifiantes dans les propriétés d'événements)
- [ ] La configuration Firebase est externalisée (google-services.json / GoogleService-Info.plist) et non commitée en clair dans le dépôt

## Notes de réalisation
La V1 avait un skeleton no-op natif. Cette story formalise l'intégration propre avec Firebase Analytics en production, tout en maintenant le comportement no-op en développement. La validité RGPD de Firebase Analytics (transfert de données hors UE) doit être évaluée par le DPO — une alternative privacy-first (ex : PostHog, Plausible) peut être envisagée si nécessaire.

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
