/**
 * Utilitaires purs — Multijoueur local (F3-12, F3-28, F3-33)
 *
 * TDD strict : les tests dans __tests__/utils/multiplayer.utils.test.ts
 * ont été écrits et committés AVANT cette implémentation.
 *
 * Fonctions exportées :
 *   - validatePlayerNames          : valide les noms de joueurs saisis
 *   - rankPlayers                  : trie les joueurs selon le classement final (par manche)
 *   - rankPlayersGlobal            : classement global sur l'ensemble des manches (F3-28)
 *   - rankPlayersGlobalWithRank    : classement global avec rangs partagés (F3-33)
 *
 * Conventions :
 *   - Exports nommés uniquement
 *   - Zéro any — typage explicite
 *   - Fonctions pures (pas d'effets de bord)
 */

import type { MultiplayerPlayer, MultiplayerRoundResult } from '../store/multiplayer.store';

// ─────────────────────────────────────────────────────────────────────────────
// validatePlayerNames
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Valide les noms de joueurs saisis.
 * Retourne une liste d'erreurs (vide = valide).
 *
 * Règles :
 *   - Minimum 2 joueurs
 *   - Maximum 6 joueurs
 *   - Chaque nom ne peut pas être vide (espaces comptent comme vide)
 */
export function validatePlayerNames(names: string[]): string[] {
  const errors: string[] = [];

  if (names.length < 2) {
    errors.push('Minimum 2 joueurs requis.');
  }
  if (names.length > 6) {
    errors.push('Maximum 6 joueurs autorisés.');
  }

  names.forEach((name, i) => {
    if (name.trim().length === 0) {
      errors.push(`Le nom du joueur ${String(i + 1)} est requis.`);
    }
  });

  return errors;
}

// ─────────────────────────────────────────────────────────────────────────────
// rankPlayers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Trie les joueurs multijoueur selon le classement final.
 *
 * Règles de tri (par priorité) :
 *   1. Victoires avant les abandons
 *   2. Entre gagnants : moins de sauts d'abord
 *   3. À sauts égaux : durée la plus courte d'abord
 *   4. Entre abandons : ordre d'arrivée conservé (tri stable)
 *
 * Ne modifie pas le tableau d'entrée (shallow copy).
 */
export function rankPlayers(players: MultiplayerPlayer[]): MultiplayerPlayer[] {
  return [...players].sort((a, b) => {
    // Gagnant avant abandonné
    if (a.won && !b.won) return -1;
    if (!a.won && b.won) return 1;

    // Deux gagnants : tri par sauts puis durée
    if (a.won && b.won) {
      const jumpsA = a.jumps ?? Infinity;
      const jumpsB = b.jumps ?? Infinity;
      if (jumpsA !== jumpsB) return jumpsA - jumpsB;

      const durA = a.durationMs ?? Infinity;
      const durB = b.durationMs ?? Infinity;
      return durA - durB;
    }

    // Deux abandons : ordre d'arrivée conservé (sort stable)
    return 0;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// rankPlayersGlobal — F3-28
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcule le classement global sur l'ensemble des manches.
 *
 * Critères de classement (par priorité) :
 *   1. Nombre de victoires (desc) — un joueur qui gagne plus de manches est mieux classé
 *   2. Total de sauts sur les manches gagnées (asc) — moins de sauts = meilleur
 *   3. Durée totale sur les manches gagnées (asc) — plus rapide = meilleur
 *   4. En cas d'égalité totale : ordre d'arrivée conservé (tri stable)
 *
 * @param roundHistory - Tableau des manches, chaque manche = tableau de résultats par joueur
 * @param playerNames  - Noms des joueurs dans l'ordre de leur index
 * @returns Tableau de classement trié, du premier au dernier
 */
export function rankPlayersGlobal(
  roundHistory: MultiplayerRoundResult[][],
  playerNames: string[],
): Array<{
  name: string;
  wins: number;
  totalJumps: number;
  totalDurationMs: number;
}> {
  // Calculer les stats agrégées de chaque joueur
  const stats = playerNames.map((name, playerIndex) => {
    let wins = 0;
    let totalJumps = 0;
    let totalDurationMs = 0;

    for (const round of roundHistory) {
      const result = round[playerIndex];
      if (result === undefined) continue;
      if (result.won) {
        wins += 1;
        totalJumps += result.jumps ?? 0;
        totalDurationMs += result.durationMs ?? 0;
      }
    }

    return { name, wins, totalJumps, totalDurationMs };
  });

  // Tri stable
  return [...stats].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (a.totalJumps !== b.totalJumps) return a.totalJumps - b.totalJumps;
    return a.totalDurationMs - b.totalDurationMs;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// rankPlayersGlobalWithRank — F3-33
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Type de retour enrichi avec le rang partagé.
 */
export interface GlobalRankEntryWithRank {
  name: string;
  wins: number;
  totalJumps: number;
  totalDurationMs: number;
  /**
   * Rang dans le classement (1 = premier).
   * Plusieurs joueurs peuvent avoir le même rang en cas d'égalité
   * sur wins, totalJumps ET totalDurationMs.
   * Les rangs ne sont pas consécutifs en cas d'ex-aequo :
   * ex. deux joueurs rank 1 → le suivant a rank 3, pas rank 2.
   */
  rank: number;
}

/**
 * Calcule le classement global sur l'ensemble des manches, avec rangs partagés.
 *
 * Critères de classement (identiques à rankPlayersGlobal) :
 *   1. Nombre de victoires (desc)
 *   2. Total de sauts sur les manches gagnées (asc)
 *   3. Durée totale sur les manches gagnées (asc)
 *   4. En cas d'égalité totale : ordre d'arrivée conservé (tri stable)
 *
 * Règle de rang partagé :
 *   - Deux joueurs avec wins, totalJumps et totalDurationMs identiques ont le même rang.
 *   - Le rang suivant tient compte du nombre de joueurs ex-aequo avant lui.
 *   - Ex. : 3 joueurs, les 2 premiers ex-aequo → ranks 1, 1, 3 (pas 1, 1, 2).
 *
 * TDD strict : tests committés avant implémentation (voir __tests__/utils/multiplayer.utils.test.ts).
 *
 * @param roundHistory - Tableau des manches (peut être vide : retourne tableau vide)
 * @param playerNames  - Noms des joueurs dans l'ordre de leur index
 */
export function rankPlayersGlobalWithRank(
  roundHistory: MultiplayerRoundResult[][],
  playerNames: string[],
): GlobalRankEntryWithRank[] {
  // Calculer les stats agrégées (même logique que rankPlayersGlobal)
  const stats = playerNames.map((name, playerIndex) => {
    let wins = 0;
    let totalJumps = 0;
    let totalDurationMs = 0;

    for (const round of roundHistory) {
      const result = round[playerIndex];
      if (result === undefined) continue;
      if (result.won) {
        wins += 1;
        totalJumps += result.jumps ?? 0;
        totalDurationMs += result.durationMs ?? 0;
      }
    }

    return { name, wins, totalJumps, totalDurationMs };
  });

  // Tri stable selon les mêmes critères que rankPlayersGlobal
  const sorted = [...stats].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (a.totalJumps !== b.totalJumps) return a.totalJumps - b.totalJumps;
    return a.totalDurationMs - b.totalDurationMs;
  });

  // Attribution des rangs — boucle impérative pour accéder aux rangs déjà attribués
  const result: GlobalRankEntryWithRank[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i];
    if (entry === undefined) continue;

    let rank: number;
    if (i === 0) {
      rank = 1;
    } else {
      const prev = sorted[i - 1];
      // Ex-aequo si les 3 critères de classement sont identiques
      const isEqual =
        prev !== undefined &&
        entry.wins === prev.wins &&
        entry.totalJumps === prev.totalJumps &&
        entry.totalDurationMs === prev.totalDurationMs;
      if (isEqual) {
        // Même rang que le précédent — récupère le rang déjà attribué dans result
        const prevResult = result[i - 1];
        rank = prevResult?.rank ?? i + 1;
      } else {
        // Rang = position dans le tableau trié (1-indexed)
        rank = i + 1;
      }
    }
    result.push({ ...entry, rank });
  }

  return result;
}
