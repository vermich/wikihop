/**
 * Tests TDD — nextSortState (F3-25 critère 6)
 *
 * Cycle à 3 états : null → 'asc' → 'desc' → null
 *
 * IMPORTANT : Ce fichier doit être commité AVANT l'implémentation (règle TDD).
 */

import { nextSortState } from '../../src/utils/history-sort.utils';

describe('nextSortState', () => {
  it('null → asc', () => {
    expect(nextSortState(null)).toBe('asc');
  });

  it('asc → desc', () => {
    expect(nextSortState('asc')).toBe('desc');
  });

  it('desc → null', () => {
    expect(nextSortState('desc')).toBe(null);
  });
});
