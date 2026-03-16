---
id: F3-36
title: Fix — Classement MultiplayerResultScreen incorrect (dernière manche exclue)
phase: 3-Features
priority: Must
agents: [Frontend Dev]
status: done
created: 2026-03-16
completed: 2026-03-16
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

- [x] Le classement final affiché dans `MultiplayerResultScreen` inclut les résultats de TOUTES les manches, y compris la dernière
- [x] La variable `rankedPlayers` est calculée à partir de `completeRoundHistory` (et non de `roundHistory` seul)
- [x] Sur une session à 1 manche : le résultat est identique à l'état précédent (non-régression)
- [x] Sur une session à N manches (N >= 2) : le joueur déclaré vainqueur est bien celui ayant remporté le plus grand nombre de manches en comptant toutes les manches jouées, y compris la dernière
- [x] `tsc --noEmit` passe sans erreur
- [x] `npm run lint` passe sans erreur

## Notes de réalisation

Correction ciblée dans `MultiplayerResultScreen` : la variable `rankedPlayers` utilisait `roundHistory` (store Zustand), qui ne contient jamais la dernière manche car elle est flushée avant `startNextRound()`. Le correctif réutilise `completeRoundHistory` (= `[...roundHistory, lastRoundSnapshot]`), déjà calculée dans le composant pour la sauvegarde en historique.

Les deux tests obsolètes dans `MultiplayerResultScreen.test.tsx` (lignes 232–242 et 269–291) ont été mis à jour pour refléter le comportement réel post-F3-36 : suppression du `mockRoundHistory` dans les setups qui simulaient un état impossible en production (la dernière manche ne peut jamais être dans `roundHistory`).

## Validation QA — Halim

**Date** : 2026-03-16
**Testeur** : Halim
**Statut global** : Validé — 18/18 tests passants, tsc et lint propres

### Critères d'acceptance

- [x] Le classement final utilise `completeRoundHistory` — vérifié ligne 266 : `rankPlayersGlobalWithRank(completeRoundHistory, playerNames)` — OK
- [x] `lastRoundSnapshot` + `completeRoundHistory` calculés dans le corps du composant avant les hooks — lignes 258–263 — OK
- [x] Section "PAR MANCHE" utilise `completeRoundHistory` pour le test de longueur et le map — lignes 359, 369 — OK
- [x] `useEffect` de sauvegarde utilise `completeRoundHistory` — ligne 276 — OK (identique avant/après)
- [x] `rankPlayersGlobalWithRank` dans `multiplayer.utils.ts` : fonction pure, itère sur `roundHistory` passé en argument, agrège gains/sauts/durée par joueur — classement correct avec toutes les manches
- [x] `tsc --noEmit` : sans erreur (0 erreur, 0 warning TypeScript)
- [x] `npm run lint` : sans erreur (0 erreur, 19 warnings `no-console` préexistants, non bloquants)

### Tests automatisés

- `npm test -- --testPathPattern="MultiplayerResultScreen"` : 18/18 passants (2 tests obsolètes mis à jour par Laurent)
- `npm test -- --testPathPattern="multiplayer.utils"` : tous passants
- `tsc --noEmit` : sans erreur
- `npm run lint` : 0 erreur

### Analyse des critères d'acceptance

**Critère "non-régression 1 manche"**
Session réelle à 1 manche : `roundHistory` du store est vide (la dernière manche n'est jamais flushée dans `roundHistory`), `players[]` contient les résultats. Donc `completeRoundHistory = [...[], lastRoundSnapshot]` = 1 manche. Comportement identique à l'état précédent. Validé.

**Critère "N manches (N >= 2)"**
Session à 2 manches : `roundHistory` contient les manches 1..N-1, `players[]` contient la manche N. `completeRoundHistory` = N manches. `rankPlayersGlobalWithRank` agrège correctement toutes les victoires. Le vainqueur est bien celui ayant remporté le plus de manches au total. Validé.

### Conclusion

Le correctif F3-36 est implémenté correctement. Tous les critères d'acceptance sont remplis. Les 2 tests obsolètes ont été corrigés par Laurent pour refléter le comportement réel post-F3-36. 18/18 tests passants.

## Statut

pending → in-progress → done
