/**
 * Utilitaires de tri de l'historique des parties — F3-10
 *
 * Fonctions exportées :
 *   - isSortCriterion  : type guard pour SortCriterion
 *   - sortRecords      : tri d'un tableau de GameRecord selon un critère
 *
 * Constantes exportées :
 *   - DEFAULT_SORT_CRITERION
 *   - SORT_CRITERION_LABELS
 *
 * TDD strict : les tests dans __tests__/utils/history-sort.utils.test.ts ont été
 * écrits et committés AVANT cette implémentation.
 *
 * Conventions :
 *   - Exports nommés uniquement (pas de default export)
 *   - Zéro any — typage explicite
 *   - Fonctions pures (pas d'effets de bord)
 *   - noUncheckedIndexedAccess satisfait (accès indexés gardés)
 */

import type { GameRecord } from '@wikihop/shared';

// ─────────────────────────────────────────────────────────────────────────────
// Types et constantes
// ─────────────────────────────────────────────────────────────────────────────

export type SortCriterion =
  | 'date_desc'
  | 'date_asc'
  | 'duration_asc'
  | 'duration_desc'
  | 'jumps_asc'
  | 'jumps_desc';

export const DEFAULT_SORT_CRITERION: SortCriterion = 'date_desc';

export const SORT_CRITERION_LABELS: Record<SortCriterion, string> = {
  date_desc: 'Date ↓',
  date_asc: 'Date ↑',
  duration_asc: 'Durée ↑',
  duration_desc: 'Durée ↓',
  jumps_asc: 'Sauts ↑',
  jumps_desc: 'Sauts ↓',
};

/** Clé AsyncStorage pour la persistance du critère de tri */
export const SORT_CRITERION_STORAGE_KEY = '@wikihop/history_sort_criterion';

// ─────────────────────────────────────────────────────────────────────────────
// Ensemble des valeurs valides (pour le type guard)
// ─────────────────────────────────────────────────────────────────────────────

const VALID_SORT_CRITERIA: ReadonlySet<string> = new Set<SortCriterion>([
  'date_desc',
  'date_asc',
  'duration_asc',
  'duration_desc',
  'jumps_asc',
  'jumps_desc',
]);

// ─────────────────────────────────────────────────────────────────────────────
// isSortCriterion
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Type guard — vérifie qu'une valeur inconnue est un SortCriterion valide.
 *
 * Utilisé pour désérialiser la valeur stockée dans AsyncStorage
 * et se prémunir contre des données corrompues ou périmées.
 */
export function isSortCriterion(value: unknown): value is SortCriterion {
  return typeof value === 'string' && VALID_SORT_CRITERIA.has(value);
}

// ─────────────────────────────────────────────────────────────────────────────
// sortRecords
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Trie un tableau de GameRecord selon le critère donné.
 *
 * - Retourne un NOUVEAU tableau (le tableau d'origine n'est pas muté)
 * - En cas d'égalité sur le critère principal : tri secondaire par
 *   completedAt décroissant (le plus récent en premier)
 *
 * Note sur l'instabilité de sort() :
 *   Le critère secondaire est implémenté explicitement dans chaque
 *   comparateur pour garantir un ordre déterministe indépendamment
 *   de la stabilité de l'algorithme de tri natif.
 */
export function sortRecords(
  records: ReadonlyArray<GameRecord>,
  criterion: SortCriterion,
): ReadonlyArray<GameRecord> {
  // Copie pour éviter la mutation du tableau original
  const copy = [...records];

  copy.sort((a, b) => {
    let primary = 0;

    switch (criterion) {
      case 'date_desc':
        // Tri lexicographique ISO 8601 (valide car format UTC canonique)
        primary = b.completedAt.localeCompare(a.completedAt);
        break;

      case 'date_asc':
        primary = a.completedAt.localeCompare(b.completedAt);
        break;

      case 'duration_asc':
        primary = a.durationMs - b.durationMs;
        break;

      case 'duration_desc':
        primary = b.durationMs - a.durationMs;
        break;

      case 'jumps_asc':
        primary = a.jumps - b.jumps;
        break;

      case 'jumps_desc':
        primary = b.jumps - a.jumps;
        break;
    }

    // Critère secondaire : date décroissante en cas d'égalité
    if (primary !== 0) {
      return primary;
    }
    return b.completedAt.localeCompare(a.completedAt);
  });

  return copy;
}
