/**
 * Utilitaires de statistiques personnelles — F3-08
 *
 * Fonctions exportées :
 *   - computeStats     : calcul des statistiques sur l'ensemble des parties
 *   - computeChartData : extraction des 7 dernières parties pour le graphique
 *
 * TDD strict : les tests dans __tests__/utils/stats.utils.test.ts ont été
 * écrits et committés AVANT cette implémentation.
 *
 * Conventions :
 *   - Exports nommés uniquement (pas de default export)
 *   - Zéro any — typage explicite
 *   - Fonctions pures (pas d'effets de bord)
 *   - noUncheckedIndexedAccess satisfait
 */

import type { GameRecord } from '@wikihop/shared';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PersonalStats {
  totalGames: number;
  /** 0 si totalGames === 0 */
  winRatePercent: number;
  /** null si aucune victoire */
  avgJumpsWon: number | null;
  /** null si aucune victoire */
  bestTimeMs: number | null;
}

export interface ChartDataPoint {
  jumps: number;
  status: 'won' | 'abandoned';
  /** Format "JJ/MM" — ex: "10/03" */
  label: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// computeStats
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcule les statistiques personnelles à partir de l'historique complet.
 *
 * - totalGames : records.length
 * - winRatePercent : arrondi au pourcentage entier (Math.round), 0 si aucune partie
 * - avgJumpsWon : moyenne des jumps des victoires, arrondie à 1 décimale. null si aucune victoire.
 * - bestTimeMs : durationMs minimal parmi les victoires. null si aucune victoire.
 *
 * ATTENTION : Math.min(...[]) = -Infinity — on vérifie wonRecords.length > 0 avant.
 */
export function computeStats(records: ReadonlyArray<GameRecord>): PersonalStats {
  const totalGames = records.length;

  if (totalGames === 0) {
    return {
      totalGames: 0,
      winRatePercent: 0,
      avgJumpsWon: null,
      bestTimeMs: null,
    };
  }

  const wonRecords = records.filter((r) => r.status === 'won');
  const wonCount = wonRecords.length;

  const winRatePercent = Math.round((wonCount / totalGames) * 100);

  if (wonCount === 0) {
    return {
      totalGames,
      winRatePercent,
      avgJumpsWon: null,
      bestTimeMs: null,
    };
  }

  // avgJumpsWon : arrondi à 1 décimale via Math.round(sum*10)/10
  const sumJumps = wonRecords.reduce((acc, r) => acc + r.jumps, 0);
  const avgJumpsWon = Math.round((sumJumps / wonCount) * 10) / 10;

  // bestTimeMs : min des durationMs — wonRecords.length > 0 garanti ci-dessus
  let bestTimeMs = wonRecords[0]?.durationMs ?? 0;
  for (let i = 1; i < wonRecords.length; i++) {
    const dur = wonRecords[i]?.durationMs;
    if (dur !== undefined && dur < bestTimeMs) {
      bestTimeMs = dur;
    }
  }

  return {
    totalGames,
    winRatePercent,
    avgJumpsWon,
    bestTimeMs,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// computeChartData
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extrait les données pour le graphique en barres des 7 dernières parties.
 *
 * - Prend les 7 premiers records (les plus récents, records étant trié récent→ancien)
 * - Les reverse pour afficher du plus ancien au plus récent (gauche→droite)
 * - Génère un label "JJ/MM" depuis completedAt avec padding
 *
 * @param records - Tableau de GameRecord trié récent→ancien (comme ScoreStorage.getAll())
 */
export function computeChartData(records: ReadonlyArray<GameRecord>): ReadonlyArray<ChartDataPoint> {
  if (records.length === 0) {
    return [];
  }

  // Prend les 7 premiers (les plus récents) et les inverse pour l'affichage chronologique
  const last7 = records.slice(0, 7).reverse();

  return last7.map((record): ChartDataPoint => {
    const date = new Date(record.completedAt);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');

    return {
      jumps: record.jumps,
      status: record.status,
      label: `${day}/${month}`,
    };
  });
}
