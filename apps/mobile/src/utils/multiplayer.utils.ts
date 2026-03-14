/**
 * Utilitaires purs — Multijoueur local (F3-12)
 *
 * TDD strict : les tests dans __tests__/utils/multiplayer.utils.test.ts
 * ont été écrits et committés AVANT cette implémentation.
 *
 * Fonctions exportées :
 *   - validatePlayerNames : valide les noms de joueurs saisis
 *   - rankPlayers         : trie les joueurs selon le classement final
 *
 * Conventions :
 *   - Exports nommés uniquement
 *   - Zéro any — typage explicite
 *   - Fonctions pures (pas d'effets de bord)
 */

import type { MultiplayerPlayer } from '../store/multiplayer.store';

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
