---
id: F3-32
title: "Multijoueur : affichage et renouvellement des paires par manche"
phase: 3-Features
priority: Should
agents: [Tech Lead, UX/UI, Frontend Dev]
status: done
created: 2026-03-15
completed: 2026-03-15
depends_on: F3-28
---

# F3-32 — Multijoueur : affichage et renouvellement des paires par manche

## User Story
En tant que groupe de joueurs en mode multijoueur, je veux voir les paires d'articles prévues pour chaque manche sur l'écran de configuration, et pouvoir renouveler une paire unitairement, afin de choisir des articles qui conviennent à tous.

## Critères d'acceptance
- [x] `MultiplayerSetupScreen` affiche la paire d'articles pour chaque manche (pas seulement la manche 1)
- [x] Chaque paire dispose d'un bouton "Renouveler" individuel qui charge une nouvelle paire pour cette manche uniquement
- [x] Les autres paires ne sont pas affectées par le renouvellement d'une paire
- [x] L'état de chargement de chaque paire est indiqué (skeleton pendant le rechargement)
- [x] `tsc --noEmit` passe sans erreur
- [x] `npm run lint` passe sans erreur

## Notes de réalisation
- Hook `useRefreshablePair` créé (`apps/mobile/src/hooks/useRefreshablePair.ts`) — expose `{ state, refresh }`.
- Composant interne `PairSlot` dans `MultiplayerSetupScreen` — un par manche, indépendants.
- `MultiplayerState.allPairs[]` ajouté au store — `setupSession` prend désormais `pairs[]`.
- `MultiplayerRoundTransitionScreen` lit `allPairs[currentRound]` depuis le store — plus de `useRandomPair`.
- TDD strict confirmé : tests committés dans `7217d18` avant implémentation dans `155bd67`.

## Validation QA — Halim
**Date** : 2026-03-15
**Statut** : Validé

- Hook `useRefreshablePair` : présent, expose `{ state, refresh }`.
- `MultiplayerState.allPairs[]` : présent dans le store (ligne 69).
- `setupSession` signature : `(players: string[], pairs: Array<...>, roundCount?: number)` — plus de `start`/`target` uniques.
- N slots `PairSlot` : rendus via `Array.from({ length: roundCount }, ...)` — un par manche.
- Bouton "Renouveler" dans chaque `PairSlot` sur état `success` ET bouton "Réessayer" sur état `error`.
- `MultiplayerRoundTransitionScreen` : `useRandomPair` absent (seul commentaire), lecture depuis `allPairs[currentRound]`.
- TDD `useRefreshablePair` : commit tests `7217d18` (antérieur au commit impl `155bd67`). Ordre confirmé.
- `npm test` : 582 tests passants, 0 échec.
- `tsc --noEmit` : 0 erreur.
- `npm run lint` : 0 erreur (18 warnings, aucun bloquant).

## Statut
done
