---
id: F3-33
title: "Multijoueur : résultats détaillés par manche et égalité médaille d'or"
phase: 3-Features
priority: Should
agents: [Tech Lead, UX/UI, Frontend Dev]
status: done
created: 2026-03-15
completed: 2026-03-15
depends_on: F3-28
---

# F3-33 — Multijoueur : résultats détaillés par manche et égalité médaille d'or

## User Story
En tant que groupe de joueurs ayant terminé une session multijoueur, je veux voir les résultats de chaque manche sur l'écran de résultats, et qu'en cas d'égalité de victoires plusieurs joueurs reçoivent la médaille d'or, afin d'avoir un classement juste et lisible.

## Critères d'acceptance
- [x] `MultiplayerResultScreen` affiche les résultats manche par manche (qui a gagné chaque manche)
- [x] Le classement final est calculé sur le nombre de manches gagnées (desc)
- [x] En cas d'égalité de victoires entre plusieurs joueurs, tous reçoivent la médaille d'or 🥇
- [x] L'affichage du classement final reste lisible avec jusqu'à 6 joueurs et 5 manches
- [x] `tsc --noEmit` passe sans erreur
- [x] `npm run lint` passe sans erreur

## Notes de réalisation
- `rankPlayersGlobalWithRank` implémentée et exportée dans `multiplayer.utils.ts` avec type `GlobalRankEntryWithRank` (champ `rank`).
- Section "PAR MANCHE" conditionnelle `roundHistory.length > 1` dans `MultiplayerResultScreen`.
- Médaille basée sur `entry.rank` — plusieurs `rank === 1` possibles (ex-aequo total).
- Rangs non consécutifs en cas d'ex-aequo : 2 joueurs à rang 1 → suivant est rang 3.
- Composant interne `MancheSummaryRow` : chips victoire/abandon par joueur pour chaque manche.
- TDD strict confirmé : tests committés dans `85b5109` avant implémentation dans `406e063`.

## Validation QA — Halim
**Date** : 2026-03-15
**Statut** : Validé

- `rankPlayersGlobalWithRank` : implémentée, exportée (ligne 184 de `multiplayer.utils.ts`).
- `GlobalRankEntryWithRank` : type exporté avec champ `rank: number`.
- `MultiplayerResultScreen` : utilise `rankPlayersGlobalWithRank(roundHistory, playerNames)`.
- Section "PAR MANCHE" : conditionnelle `{roundHistory.length > 1 && ...}` (ligne 309).
- Médaille : `const medal = rank <= 3 ? RANK_MEDALS[rank - 1] : undefined` — basé sur `entry.rank`, pas l'index.
- Plusieurs `rank === 1` possibles : logique d'ex-aequo dans la boucle d'attribution des rangs.
- TDD `rankPlayersGlobalWithRank` : tests dans commit `85b5109` (avant impl `406e063`). Ordre confirmé.
- `npm test` : 582 tests passants, 0 échec.
- `tsc --noEmit` : 0 erreur.
- `npm run lint` : 0 erreur (18 warnings, aucun bloquant).

## Statut
done
