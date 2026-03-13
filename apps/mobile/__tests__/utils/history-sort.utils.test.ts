/**
 * Tests TDD — history-sort.utils.ts (F3-10)
 *
 * Couvre :
 *   - isSortCriterion : type guard
 *   - sortRecords     : tri d'un tableau de GameRecord selon différents critères
 *
 * IMPORTANT : Ce fichier doit être commité AVANT l'implémentation (règle TDD).
 * Les tests sont écrits selon les specs du Tech Lead pour F3-10.
 */

import type { Article, GameRecord } from '@wikihop/shared';

import {
  DEFAULT_SORT_CRITERION,
  isSortCriterion,
  SORT_CRITERION_LABELS,
  sortRecords,
} from '../../src/utils/history-sort.utils';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const ARTICLE_A: Article = {
  id: '1',
  title: 'Paris',
  url: 'https://fr.wikipedia.org/wiki/Paris',
  language: 'fr',
};

const ARTICLE_B: Article = {
  id: '2',
  title: 'Rome',
  url: 'https://fr.wikipedia.org/wiki/Rome',
  language: 'fr',
};

const ARTICLE_C: Article = {
  id: '3',
  title: 'Berlin',
  url: 'https://fr.wikipedia.org/wiki/Berlin',
  language: 'fr',
};

function makeRecord(overrides: Partial<GameRecord> & Pick<GameRecord, 'id' | 'completedAt'>): GameRecord {
  return {
    startArticle: ARTICLE_A,
    targetArticle: ARTICLE_B,
    jumps: 3,
    durationMs: 60000,
    startedAt: '2026-03-01T10:00:00.000Z',
    status: 'won',
    ...overrides,
  };
}

// Record le plus récent (2026-03-10)
const RECORD_RECENT = makeRecord({
  id: 'r1',
  completedAt: '2026-03-10T14:00:00.000Z',
  startedAt: '2026-03-10T13:58:00.000Z',
  durationMs: 120000,
  jumps: 5,
  status: 'won',
});

// Record du milieu (2026-03-08)
const RECORD_MID = makeRecord({
  id: 'r2',
  completedAt: '2026-03-08T10:00:00.000Z',
  startedAt: '2026-03-08T09:59:00.000Z',
  durationMs: 60000,
  jumps: 3,
  status: 'abandoned',
  startArticle: ARTICLE_A,
  targetArticle: ARTICLE_C,
});

// Record le plus ancien (2026-03-01)
const RECORD_OLD = makeRecord({
  id: 'r3',
  completedAt: '2026-03-01T08:00:00.000Z',
  startedAt: '2026-03-01T07:58:30.000Z',
  durationMs: 90000,
  jumps: 7,
  status: 'won',
});

// Record avec durée la plus courte (10s)
const RECORD_FAST = makeRecord({
  id: 'r4',
  completedAt: '2026-03-05T12:00:00.000Z',
  startedAt: '2026-03-05T11:59:50.000Z',
  durationMs: 10000,
  jumps: 1,
  status: 'won',
});

const ALL_RECORDS: ReadonlyArray<GameRecord> = [
  RECORD_RECENT,
  RECORD_MID,
  RECORD_OLD,
  RECORD_FAST,
];

// ─────────────────────────────────────────────────────────────────────────────
// isSortCriterion
// ─────────────────────────────────────────────────────────────────────────────

describe('isSortCriterion', () => {
  it('retourne true pour chaque critère valide', () => {
    expect(isSortCriterion('date_desc')).toBe(true);
    expect(isSortCriterion('date_asc')).toBe(true);
    expect(isSortCriterion('duration_asc')).toBe(true);
    expect(isSortCriterion('duration_desc')).toBe(true);
    expect(isSortCriterion('jumps_asc')).toBe(true);
    expect(isSortCriterion('jumps_desc')).toBe(true);
  });

  it('retourne false pour une chaîne quelconque', () => {
    expect(isSortCriterion('invalid')).toBe(false);
    expect(isSortCriterion('date')).toBe(false);
    expect(isSortCriterion('duration')).toBe(false);
    expect(isSortCriterion('')).toBe(false);
    expect(isSortCriterion('Date_desc')).toBe(false); // casse incorrecte
  });

  it('retourne false pour des valeurs non-string', () => {
    expect(isSortCriterion(null)).toBe(false);
    expect(isSortCriterion(undefined)).toBe(false);
    expect(isSortCriterion(42)).toBe(false);
    expect(isSortCriterion({})).toBe(false);
    expect(isSortCriterion([])).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT_SORT_CRITERION et SORT_CRITERION_LABELS
// ─────────────────────────────────────────────────────────────────────────────

describe('DEFAULT_SORT_CRITERION', () => {
  it('est "date_desc"', () => {
    expect(DEFAULT_SORT_CRITERION).toBe('date_desc');
  });

  it('est un SortCriterion valide', () => {
    expect(isSortCriterion(DEFAULT_SORT_CRITERION)).toBe(true);
  });
});

describe('SORT_CRITERION_LABELS', () => {
  it('contient une entrée pour chaque critère', () => {
    const criteria = ['date_desc', 'date_asc', 'duration_asc', 'duration_desc', 'jumps_asc', 'jumps_desc'];
    criteria.forEach((c) => {
      expect(SORT_CRITERION_LABELS).toHaveProperty(c);
      expect(typeof SORT_CRITERION_LABELS[c as keyof typeof SORT_CRITERION_LABELS]).toBe('string');
    });
  });

  it('toutes les valeurs sont des chaînes non vides', () => {
    Object.values(SORT_CRITERION_LABELS).forEach((label) => {
      expect(label.length).toBeGreaterThan(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// sortRecords
// ─────────────────────────────────────────────────────────────────────────────

describe('sortRecords', () => {
  // ── Immutabilité ────────────────────────────────────────────────────────────

  it('retourne un nouveau tableau (pas de mutation)', () => {
    const input: ReadonlyArray<GameRecord> = [RECORD_RECENT, RECORD_OLD];
    const result = sortRecords(input, 'date_desc');
    expect(result).not.toBe(input);
  });

  it('le tableau original n\'est pas modifié', () => {
    const original = [RECORD_OLD, RECORD_RECENT];
    const originalIds = original.map((r) => r.id);
    sortRecords(original, 'date_desc');
    expect(original.map((r) => r.id)).toEqual(originalIds);
  });

  // ── Tableau vide ────────────────────────────────────────────────────────────

  it('retourne [] pour un tableau vide', () => {
    expect(sortRecords([], 'date_desc')).toEqual([]);
    expect(sortRecords([], 'jumps_asc')).toEqual([]);
  });

  // ── date_desc ───────────────────────────────────────────────────────────────

  describe('date_desc (plus récent en premier)', () => {
    it('trie du plus récent au plus ancien', () => {
      const result = sortRecords(ALL_RECORDS, 'date_desc');
      const ids = result.map((r) => r.id);
      expect(ids[0]).toBe('r1'); // 2026-03-10
      expect(ids[1]).toBe('r2'); // 2026-03-08
      expect(ids[2]).toBe('r4'); // 2026-03-05
      expect(ids[3]).toBe('r3'); // 2026-03-01
    });

    it('contient tous les records', () => {
      const result = sortRecords(ALL_RECORDS, 'date_desc');
      expect(result.length).toBe(ALL_RECORDS.length);
    });
  });

  // ── date_asc ────────────────────────────────────────────────────────────────

  describe('date_asc (plus ancien en premier)', () => {
    it('trie du plus ancien au plus récent', () => {
      const result = sortRecords(ALL_RECORDS, 'date_asc');
      const ids = result.map((r) => r.id);
      expect(ids[0]).toBe('r3'); // 2026-03-01
      expect(ids[1]).toBe('r4'); // 2026-03-05
      expect(ids[2]).toBe('r2'); // 2026-03-08
      expect(ids[3]).toBe('r1'); // 2026-03-10
    });
  });

  // ── duration_asc ────────────────────────────────────────────────────────────

  describe('duration_asc (plus court en premier)', () => {
    it('trie du plus court au plus long', () => {
      const result = sortRecords(ALL_RECORDS, 'duration_asc');
      // FAST:10000 < MID:60000 < OLD:90000 < RECENT:120000
      const ids = result.map((r) => r.id);
      expect(ids[0]).toBe('r4'); // 10000 ms
      expect(ids[1]).toBe('r2'); // 60000 ms
      expect(ids[2]).toBe('r3'); // 90000 ms
      expect(ids[3]).toBe('r1'); // 120000 ms
    });
  });

  // ── duration_desc ───────────────────────────────────────────────────────────

  describe('duration_desc (plus long en premier)', () => {
    it('trie du plus long au plus court', () => {
      const result = sortRecords(ALL_RECORDS, 'duration_desc');
      const ids = result.map((r) => r.id);
      expect(ids[0]).toBe('r1'); // 120000 ms
      expect(ids[1]).toBe('r3'); // 90000 ms
      expect(ids[2]).toBe('r2'); // 60000 ms
      expect(ids[3]).toBe('r4'); // 10000 ms
    });
  });

  // ── jumps_asc ───────────────────────────────────────────────────────────────

  describe('jumps_asc (moins de sauts en premier)', () => {
    it('trie du moins de sauts au plus', () => {
      const result = sortRecords(ALL_RECORDS, 'jumps_asc');
      // FAST:1 < MID:3 < RECENT:5 < OLD:7
      const ids = result.map((r) => r.id);
      expect(ids[0]).toBe('r4'); // 1 saut
      expect(ids[1]).toBe('r2'); // 3 sauts
      expect(ids[2]).toBe('r1'); // 5 sauts
      expect(ids[3]).toBe('r3'); // 7 sauts
    });
  });

  // ── jumps_desc ──────────────────────────────────────────────────────────────

  describe('jumps_desc (plus de sauts en premier)', () => {
    it('trie du plus de sauts au moins', () => {
      const result = sortRecords(ALL_RECORDS, 'jumps_desc');
      const ids = result.map((r) => r.id);
      expect(ids[0]).toBe('r3'); // 7 sauts
      expect(ids[1]).toBe('r1'); // 5 sauts
      expect(ids[2]).toBe('r2'); // 3 sauts
      expect(ids[3]).toBe('r4'); // 1 saut
    });
  });

  // ── Tri secondaire en cas d'égalité ─────────────────────────────────────────

  describe('tri secondaire par completedAt décroissant en cas d\'égalité', () => {
    it('duration_asc : à durée égale, le plus récent apparaît en premier', () => {
      const r_older = makeRecord({
        id: 'eq_old',
        durationMs: 30000,
        completedAt: '2026-02-01T10:00:00.000Z',
      });
      const r_newer = makeRecord({
        id: 'eq_new',
        durationMs: 30000,
        completedAt: '2026-03-01T10:00:00.000Z',
      });
      const result = sortRecords([r_older, r_newer], 'duration_asc');
      // Même durée → tri secondaire par date décroissante : newer en premier
      expect(result[0]?.id).toBe('eq_new');
      expect(result[1]?.id).toBe('eq_old');
    });

    it('jumps_asc : à sauts égaux, le plus récent apparaît en premier', () => {
      const r_older = makeRecord({
        id: 'j_old',
        jumps: 4,
        completedAt: '2026-02-01T10:00:00.000Z',
      });
      const r_newer = makeRecord({
        id: 'j_new',
        jumps: 4,
        completedAt: '2026-03-01T10:00:00.000Z',
      });
      const result = sortRecords([r_older, r_newer], 'jumps_asc');
      expect(result[0]?.id).toBe('j_new');
      expect(result[1]?.id).toBe('j_old');
    });
  });

  // ── Tableau à 1 élément ─────────────────────────────────────────────────────

  it('retourne un tableau d\'1 élément inchangé', () => {
    const result = sortRecords([RECORD_RECENT], 'jumps_desc');
    expect(result.length).toBe(1);
    expect(result[0]?.id).toBe('r1');
  });
});
