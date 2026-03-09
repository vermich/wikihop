/**
 * Tests TDD — difficulty.utils.ts (F3-05)
 *
 * Écrits AVANT l'implémentation — ordre TDD strict.
 *
 * Fonctions testées :
 *   - isHardMode        : GameDifficulty | undefined → boolean
 *   - getDifficultyLabel : GameDifficulty | undefined → string
 */

import { getDifficultyLabel, isHardMode } from '../src/utils/difficulty.utils';

// ─────────────────────────────────────────────────────────────────────────────
// isHardMode
// ─────────────────────────────────────────────────────────────────────────────

describe('isHardMode', () => {
  it('retourne true si difficulty === "hard"', () => {
    expect(isHardMode('hard')).toBe(true);
  });

  it('retourne false si difficulty === "normal"', () => {
    expect(isHardMode('normal')).toBe(false);
  });

  it('retourne false si difficulty est undefined (rétrocompatibilité)', () => {
    expect(isHardMode(undefined)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getDifficultyLabel
// ─────────────────────────────────────────────────────────────────────────────

describe('getDifficultyLabel', () => {
  it('retourne "Mode difficile" si difficulty === "hard"', () => {
    expect(getDifficultyLabel('hard')).toBe('Mode difficile');
  });

  it('retourne "" si difficulty === "normal"', () => {
    expect(getDifficultyLabel('normal')).toBe('');
  });

  it('retourne "" si difficulty est undefined', () => {
    expect(getDifficultyLabel(undefined)).toBe('');
  });
});
