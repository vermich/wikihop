/**
 * Tests TDD — daily-challenge.utils.ts (F3-01)
 *
 * Écrits AVANT l'implémentation — ordre TDD strict.
 *
 * Fonctions testées :
 *   - formatDailyChallengeDate : '2026-03-08' → '08/03/2026'
 *   - isDailyChallengeToday    : compare deux dates YYYY-MM-DD
 */

import {
  formatDailyChallengeDate,
  isDailyChallengeToday,
} from '../src/utils/daily-challenge.utils';

// ─────────────────────────────────────────────────────────────────────────────
// formatDailyChallengeDate
// ─────────────────────────────────────────────────────────────────────────────

describe('formatDailyChallengeDate', () => {
  it('formate correctement une date standard', () => {
    expect(formatDailyChallengeDate('2026-03-08')).toBe('08/03/2026');
  });

  it('padde le jour sur 2 chiffres', () => {
    expect(formatDailyChallengeDate('2026-03-01')).toBe('01/03/2026');
  });

  it('padde le mois sur 2 chiffres', () => {
    expect(formatDailyChallengeDate('2026-01-15')).toBe('15/01/2026');
  });

  it('retourne année sur 4 chiffres', () => {
    const result = formatDailyChallengeDate('2026-12-31');
    expect(result).toBe('31/12/2026');
  });

  it('mois 1 → "01"', () => {
    const result = formatDailyChallengeDate('2026-01-05');
    expect(result).toMatch(/\/01\//);
  });

  it('jour 5 → "05"', () => {
    const result = formatDailyChallengeDate('2026-03-05');
    expect(result).toMatch(/^05\//);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isDailyChallengeToday
// ─────────────────────────────────────────────────────────────────────────────

describe('isDailyChallengeToday', () => {
  it('retourne true si les deux dates sont identiques', () => {
    expect(isDailyChallengeToday('2026-03-08', '2026-03-08')).toBe(true);
  });

  it('retourne false si les dates sont différentes', () => {
    expect(isDailyChallengeToday('2026-03-07', '2026-03-08')).toBe(false);
  });

  it('retourne false si la date du défi est plus récente que today', () => {
    expect(isDailyChallengeToday('2026-03-09', '2026-03-08')).toBe(false);
  });

  it('retourne false si la date du défi est vide', () => {
    // Ne doit pas throw sur entrée invalide
    expect(() => isDailyChallengeToday('', '2026-03-08')).not.toThrow();
    expect(isDailyChallengeToday('', '2026-03-08')).toBe(false);
  });

  it('retourne false si todayUTC est vide', () => {
    expect(() => isDailyChallengeToday('2026-03-08', '')).not.toThrow();
    expect(isDailyChallengeToday('2026-03-08', '')).toBe(false);
  });

  it('est sensible au format — dates différentes même si proche', () => {
    expect(isDailyChallengeToday('2026-03-8', '2026-03-08')).toBe(false);
  });
});
