/**
 * Utilitaires purs — Historique des parties multijoueur (F3-31)
 *
 * TDD strict : les tests dans __tests__/utils/multiplayer-history.utils.test.ts
 * ont été écrits et committés AVANT cette implémentation.
 *
 * Fonctions exportées :
 *   - formatMultiplayerDate  : formate une date ISO 8601 en DD/MM/YYYY
 *   - getMultiplayerWinner   : calcule le gagnant global d'une session
 *   - buildMultiplayerRecord : construit un MultiplayerGameRecord depuis les données du store
 *
 * Conventions :
 *   - Exports nommés uniquement
 *   - Zéro any — typage explicite
 *   - Fonctions pures (pas d'effets de bord)
 */

import type { MultiplayerGameRecord, MultiplayerRoundResult } from '@wikihop/shared';

import { rankPlayersGlobal } from './multiplayer.utils';

// ─────────────────────────────────────────────────────────────────────────────
// formatMultiplayerDate
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formate une date ISO 8601 string en "DD/MM/YYYY".
 *
 * Utilise les méthodes locales (getDate, getMonth, getFullYear) —
 * le résultat dépend du fuseau horaire de l'appareil, ce qui est
 * le comportement attendu pour un affichage local.
 *
 * @param isoDate - Date ISO 8601 (string, stockée dans MultiplayerGameRecord.date)
 */
export function formatMultiplayerDate(isoDate: string): string {
  const date = new Date(isoDate);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${day}/${month}/${year}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// getMultiplayerWinner
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcule le gagnant global d'une session multijoueur.
 * Réutilise rankPlayersGlobal (multiplayer.utils.ts) pour les stats agrégées.
 *
 * Retourne null si :
 *   - roundHistory est vide
 *   - playerNames est vide
 *   - égalité parfaite entre les joueurs de tête
 *     (wins, totalJumps, totalDurationMs identiques)
 *
 * @param roundHistory - Tableau de toutes les manches (complet)
 * @param playerNames  - Noms dans l'ordre d'index
 */
export function getMultiplayerWinner(
  roundHistory: MultiplayerRoundResult[][],
  playerNames: string[],
): string | null {
  if (roundHistory.length === 0 || playerNames.length === 0) {
    return null;
  }

  const ranked = rankPlayersGlobal(roundHistory, playerNames);

  // noUncheckedIndexedAccess : accès explicite avec guard
  const first = ranked[0];
  if (first === undefined) {
    return null;
  }

  const second = ranked[1];

  // Égalité parfaite : les deux premiers ont wins, totalJumps et totalDurationMs identiques
  if (
    second !== undefined &&
    first.wins === second.wins &&
    first.totalJumps === second.totalJumps &&
    first.totalDurationMs === second.totalDurationMs
  ) {
    return null;
  }

  return first.name;
}

// ─────────────────────────────────────────────────────────────────────────────
// buildMultiplayerRecord
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Construit un MultiplayerGameRecord depuis les données du store.
 *
 * Note importante sur le roundHistory :
 * Dans le store, startNextRound() flush la manche courante dans roundHistory
 * AVANT de passer à la suivante. La dernière manche n'est jamais flushée
 * (les joueurs restent dans players[]). L'appelant (MultiplayerResultScreen)
 * est responsable de construire le completeRoundHistory incluant la dernière manche
 * et de le passer via ce paramètre.
 *
 * @param id           - UUID v4 généré par l'appelant
 * @param date         - Date de début de session (new Date().toISOString())
 * @param playerNames  - Noms dans l'ordre d'index
 * @param roundCount   - Nombre de manches configurées
 * @param roundHistory - Toutes les manches, y compris la dernière (responsabilité de l'appelant)
 * @returns MultiplayerGameRecord prêt pour la persistance
 */
export function buildMultiplayerRecord(
  id: string,
  date: string,
  playerNames: string[],
  roundCount: number,
  roundHistory: MultiplayerRoundResult[][],
): MultiplayerGameRecord {
  return {
    id,
    date,
    playerNames,
    roundCount,
    roundHistory,
    winner: getMultiplayerWinner(roundHistory, playerNames),
  };
}
