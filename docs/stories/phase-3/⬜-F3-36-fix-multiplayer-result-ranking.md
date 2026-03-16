---
id: F3-36
title: Fix — Classement MultiplayerResultScreen incorrect (dernière manche exclue)
phase: 3-Features
priority: Must
agents: [Frontend Dev]
status: pending
created: 2026-03-16
completed:
---

# F3-36 — Fix — Classement MultiplayerResultScreen incorrect (dernière manche exclue)

## User Story

En tant que joueur multijoueur, je veux que le classement final affiché à l'issue d'une session multi-manches reflète toutes les manches jouées, afin de ne pas être désavantagé ou déclaré perdant à tort lorsque la dernière manche décide du vainqueur.

## Contexte technique

Détecté en code review de F3-31 (2026-03-16) par Maxime (Tech Lead).

Dans `MultiplayerResultScreen`, le calcul de `rankedPlayers` utilise `roundHistory` du store Zustand. Or le store vide `roundHistory` lors de `startNextRound()` AVANT de passer à la manche suivante — ce qui signifie que la **dernière manche** n'est jamais présente dans `roundHistory` au moment où `MultiplayerResultScreen` est affiché. Elle reste uniquement dans `players[]`.

Le résultat : le classement affiché exclut les résultats de la dernière manche, ce qui donne un classement erroné sur toutes les sessions multi-manches.

**Correction attendue** : `MultiplayerResultScreen` calcule déjà `completeRoundHistory` (= `[...roundHistory, lastRoundSnapshot]`) pour la sauvegarde en historique. Ce même calcul doit être réutilisé pour `rankedPlayers` au lieu de `roundHistory` seul.

## Critères d'acceptance

- [ ] Le classement final affiché dans `MultiplayerResultScreen` inclut les résultats de TOUTES les manches, y compris la dernière
- [ ] La variable `rankedPlayers` est calculée à partir de `completeRoundHistory` (et non de `roundHistory` seul)
- [ ] Sur une session à 1 manche : le résultat est identique à l'état précédent (non-régression)
- [ ] Sur une session à N manches (N >= 2) : le joueur déclaré vainqueur est bien celui ayant remporté le plus grand nombre de manches en comptant toutes les manches jouées, y compris la dernière
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut

pending
