/**
 * DifficultyStorageService — WikiHop Mobile — Phase 3 (F3-05)
 *
 * Persistance de la préférence de difficulté via AsyncStorage.
 * Appelé uniquement au démarrage (lecture) et lors du changement du toggle.
 *
 * Références :
 *   Story : docs/stories/phase-3/F3-05-hard-mode.md
 *
 * Conventions :
 *   - Exports nommés uniquement
 *   - Erreurs AsyncStorage loguées, jamais remontées (best-effort)
 *   - Retourne 'normal' si la clé est absente ou la valeur invalide
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GameDifficulty } from '@wikihop/shared';

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

/** Clé AsyncStorage pour la préférence de difficulté */
const DIFFICULTY_KEY = '@wikihop/difficulty_preference';

/** Ensemble des valeurs valides pour GameDifficulty */
const VALID_DIFFICULTIES: ReadonlySet<string> = new Set(['normal', 'hard']);

// ─────────────────────────────────────────────────────────────────────────────
// getDifficultyPreference
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lit la préférence de difficulté depuis AsyncStorage.
 * Retourne 'normal' si la clé est absente ou si la valeur est invalide.
 *
 * @returns Promise<GameDifficulty> — toujours résout, jamais rejette
 */
export async function getDifficultyPreference(): Promise<GameDifficulty> {
  try {
    const raw = await AsyncStorage.getItem(DIFFICULTY_KEY);
    if (raw === null) {
      return 'normal';
    }

    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === 'string' && VALID_DIFFICULTIES.has(parsed)) {
      return parsed as GameDifficulty;
    }

    return 'normal';
  } catch (e: unknown) {
    console.error('[DifficultyStorage] getDifficultyPreference erreur :', e);
    return 'normal';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// setDifficultyPreference
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Persiste la préférence de difficulté dans AsyncStorage.
 * Les erreurs sont loguées silencieusement — ne bloque jamais l'UI.
 *
 * @param difficulty - Difficulté à persister
 */
export async function setDifficultyPreference(difficulty: GameDifficulty): Promise<void> {
  try {
    await AsyncStorage.setItem(DIFFICULTY_KEY, JSON.stringify(difficulty));
  } catch (e: unknown) {
    console.error('[DifficultyStorage] setDifficultyPreference erreur :', e);
  }
}
