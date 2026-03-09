/**
 * Utilitaires purs pour le mode difficile — F3-05
 *
 * Fonctions exportées :
 *   - isHardMode        : GameDifficulty | undefined → boolean
 *   - getDifficultyLabel : GameDifficulty | undefined → string
 *
 * TDD strict : les tests dans __tests__/difficulty.utils.test.ts ont été
 * écrits et committés AVANT cette implémentation.
 *
 * Conventions :
 *   - Exports nommés uniquement
 *   - Fonctions pures — zéro effet de bord
 *   - Rétrocompatibilité : undefined traité comme 'normal'
 */

import type { GameDifficulty } from '@wikihop/shared';

// ─────────────────────────────────────────────────────────────────────────────
// isHardMode
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retourne true si la difficulté est 'hard', false sinon.
 * undefined est traité comme 'normal' (rétrocompatibilité sessions persistées).
 *
 * @param difficulty - Difficulté de la session, peut être undefined
 */
export function isHardMode(difficulty: GameDifficulty | undefined): boolean {
  return difficulty === 'hard';
}

// ─────────────────────────────────────────────────────────────────────────────
// getDifficultyLabel
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retourne le libellé lisible du mode difficile.
 * Retourne une chaîne vide si la difficulté est 'normal' ou undefined.
 *
 * Utilisé pour afficher le badge "Mode difficile" dans VictoryScreen.
 *
 * @param difficulty - Difficulté de la session, peut être undefined
 */
export function getDifficultyLabel(difficulty: GameDifficulty | undefined): string {
  return difficulty === 'hard' ? 'Mode difficile' : '';
}
