/**
 * Tests TDD — stats.utils.ts (F3-08)
 *
 * Couvre :
 *   - computeStats     : calcul des statistiques personnelles
 *   - computeChartData : extraction des 7 dernières parties pour le graphique
 *
 * IMPORTANT : Ce fichier doit être commité AVANT l'implémentation (règle TDD).
 * Les tests sont écrits selon les specs du Tech Lead pour F3-08.
 */

import type { Article, GameRecord } from '@wikihop/shared';

import {
  computeChartData,
  computeStats,
} from '../../src/utils/stats.utils';

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

function makeRecord(
  id: string,
  status: 'won' | 'abandoned',
  jumps: number,
  durationMs: number,
  completedAt: string,
): GameRecord {
  return {
    id,
    startArticle: ARTICLE_A,
    targetArticle: ARTICLE_B,
    jumps,
    durationMs,
    startedAt: '2026-03-01T10:00:00.000Z',
    completedAt,
    status,
  };
}

// 5 victoires, 2 abandons
const WON_1 = makeRecord('w1', 'won', 4, 120000, '2026-03-10T14:00:00.000Z');
const WON_2 = makeRecord('w2', 'won', 2, 30000, '2026-03-09T12:00:00.000Z');
const WON_3 = makeRecord('w3', 'won', 6, 90000, '2026-03-08T10:00:00.000Z');
const WON_4 = makeRecord('w4', 'won', 2, 45000, '2026-03-07T09:00:00.000Z');
const WON_5 = makeRecord('w5', 'won', 8, 200000, '2026-03-06T08:00:00.000Z');
const ABANDONED_1 = makeRecord('a1', 'abandoned', 1, 15000, '2026-03-05T07:00:00.000Z');
const ABANDONED_2 = makeRecord('a2', 'abandoned', 3, 60000, '2026-03-04T06:00:00.000Z');

// Triés récent → ancien (comme ScoreStorage.getAll() les retourne)
const MIXED_RECORDS: ReadonlyArray<GameRecord> = [
  WON_1, WON_2, WON_3, WON_4, WON_5, ABANDONED_1, ABANDONED_2,
];

// ─────────────────────────────────────────────────────────────────────────────
// computeStats
// ─────────────────────────────────────────────────────────────────────────────

describe('computeStats', () => {
  // ── Tableau vide ────────────────────────────────────────────────────────────

  describe('tableau vide', () => {
    it('totalGames = 0', () => {
      expect(computeStats([]).totalGames).toBe(0);
    });

    it('winRatePercent = 0', () => {
      expect(computeStats([]).winRatePercent).toBe(0);
    });

    it('avgJumpsWon = null (aucune victoire)', () => {
      expect(computeStats([]).avgJumpsWon).toBeNull();
    });

    it('bestTimeMs = null (aucune victoire)', () => {
      expect(computeStats([]).bestTimeMs).toBeNull();
    });
  });

  // ── Tableau avec records ─────────────────────────────────────────────────────

  describe('avec records mixtes (5 victoires + 2 abandons)', () => {
    it('totalGames = 7', () => {
      expect(computeStats(MIXED_RECORDS).totalGames).toBe(7);
    });

    it('winRatePercent = 71 (5/7 = 71.42... arrondi)', () => {
      expect(computeStats(MIXED_RECORDS).winRatePercent).toBe(71);
    });

    it('avgJumpsWon = moyenne des jumps des victoires (4+2+6+2+8)/5 = 4.4', () => {
      // (4+2+6+2+8)/5 = 22/5 = 4.4
      expect(computeStats(MIXED_RECORDS).avgJumpsWon).toBe(4.4);
    });

    it('bestTimeMs = durationMs minimal parmi les victoires (30000)', () => {
      // Min de 120000, 30000, 90000, 45000, 200000 → 30000
      expect(computeStats(MIXED_RECORDS).bestTimeMs).toBe(30000);
    });
  });

  // ── Seulement des abandons ───────────────────────────────────────────────────

  describe('seulement des abandons', () => {
    const onlyAbandoned: ReadonlyArray<GameRecord> = [ABANDONED_1, ABANDONED_2];

    it('winRatePercent = 0', () => {
      expect(computeStats(onlyAbandoned).winRatePercent).toBe(0);
    });

    it('avgJumpsWon = null', () => {
      expect(computeStats(onlyAbandoned).avgJumpsWon).toBeNull();
    });

    it('bestTimeMs = null', () => {
      expect(computeStats(onlyAbandoned).bestTimeMs).toBeNull();
    });

    it('totalGames = 2', () => {
      expect(computeStats(onlyAbandoned).totalGames).toBe(2);
    });
  });

  // ── Seulement des victoires ──────────────────────────────────────────────────

  describe('seulement des victoires', () => {
    const onlyWon: ReadonlyArray<GameRecord> = [WON_1, WON_2];

    it('winRatePercent = 100', () => {
      expect(computeStats(onlyWon).winRatePercent).toBe(100);
    });

    it('avgJumpsWon calculé correctement', () => {
      // (4+2)/2 = 3.0
      expect(computeStats(onlyWon).avgJumpsWon).toBe(3);
    });

    it('bestTimeMs = min des durées', () => {
      // min(120000, 30000) = 30000
      expect(computeStats(onlyWon).bestTimeMs).toBe(30000);
    });
  });

  // ── Arrondi avgJumpsWon à 1 décimale ────────────────────────────────────────

  describe('arrondi avgJumpsWon', () => {
    it('arrondi à 1 décimale via Math.round(sum*10)/10', () => {
      // 3 victoires avec jumps 1, 2, 3 → moyenne = 2.0
      const records: ReadonlyArray<GameRecord> = [
        makeRecord('x1', 'won', 1, 10000, '2026-03-01T10:00:00.000Z'),
        makeRecord('x2', 'won', 2, 20000, '2026-03-02T10:00:00.000Z'),
        makeRecord('x3', 'won', 3, 30000, '2026-03-03T10:00:00.000Z'),
      ];
      expect(computeStats(records).avgJumpsWon).toBe(2);
    });

    it('1 victoire avec 5 jumps → avgJumpsWon = 5', () => {
      const records: ReadonlyArray<GameRecord> = [
        makeRecord('x1', 'won', 5, 60000, '2026-03-01T10:00:00.000Z'),
      ];
      expect(computeStats(records).avgJumpsWon).toBe(5);
    });
  });

  // ── Guard Math.min sur tableau vide ─────────────────────────────────────────

  it('Math.min ne retourne PAS -Infinity : bestTimeMs est null si aucune victoire', () => {
    const stats = computeStats([ABANDONED_1]);
    // Math.min(...[]) = -Infinity — la fonction doit retourner null
    expect(stats.bestTimeMs).not.toBe(-Infinity);
    expect(stats.bestTimeMs).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeChartData
// ─────────────────────────────────────────────────────────────────────────────

describe('computeChartData', () => {
  // ── Tableau vide ────────────────────────────────────────────────────────────

  it('retourne [] pour un tableau vide', () => {
    expect(computeChartData([])).toEqual([]);
  });

  // ── Extraction des 7 derniers ────────────────────────────────────────────────

  it('avec 7 records → retourne 7 points', () => {
    const result = computeChartData(MIXED_RECORDS);
    expect(result.length).toBe(7);
  });

  it('avec moins de 7 records → retourne tous les points', () => {
    const fewRecords: ReadonlyArray<GameRecord> = [WON_1, WON_2, WON_3];
    const result = computeChartData(fewRecords);
    expect(result.length).toBe(3);
  });

  it('avec plus de 7 records → retourne exactement 7 points', () => {
    const manyRecords: ReadonlyArray<GameRecord> = [
      WON_1, WON_2, WON_3, WON_4, WON_5, ABANDONED_1, ABANDONED_2,
      makeRecord('extra1', 'won', 2, 50000, '2026-03-03T05:00:00.000Z'),
      makeRecord('extra2', 'won', 3, 70000, '2026-03-02T05:00:00.000Z'),
    ];
    const result = computeChartData(manyRecords);
    expect(result.length).toBe(7);
  });

  // ── Ordre chronologique ─────────────────────────────────────────────────────

  it('les 7 derniers sont affichés du plus ancien au plus récent (reverse)', () => {
    // Records triés récent→ancien : WON_1(03-10), WON_2(03-09), WON_3(03-08),
    //   WON_4(03-07), WON_5(03-06), ABANDONED_1(03-05), ABANDONED_2(03-04)
    // slice(0,7) = tous les 7, reverse → du plus ancien (03-04) au plus récent (03-10)
    const result = computeChartData(MIXED_RECORDS);
    // Le premier point doit correspondre au record le plus ancien (ABANDONED_2 = 03-04)
    expect(result[0]?.jumps).toBe(ABANDONED_2.jumps);
    // Le dernier point doit correspondre au plus récent (WON_1 = 03-10)
    expect(result[6]?.jumps).toBe(WON_1.jumps);
  });

  // ── Structure ChartDataPoint ─────────────────────────────────────────────────

  it('chaque point a les champs jumps, status, label', () => {
    const result = computeChartData([WON_1]);
    const point = result[0];
    expect(point).toBeDefined();
    if (point !== undefined) {
      expect(typeof point.jumps).toBe('number');
      expect(['won', 'abandoned']).toContain(point.status);
      expect(typeof point.label).toBe('string');
    }
  });

  it('label est au format "JJ/MM" avec padding', () => {
    // WON_1 completedAt = 2026-03-10T14:00:00.000Z → "10/03"
    const result = computeChartData([WON_1]);
    const point = result[0];
    expect(point?.label).toBe('10/03');
  });

  it('label avec jour et mois en dessous de 10 a le padding "0"', () => {
    // completedAt = 2026-01-05T... → "05/01"
    const record = makeRecord('pad', 'won', 2, 30000, '2026-01-05T10:00:00.000Z');
    const result = computeChartData([record]);
    expect(result[0]?.label).toBe('05/01');
  });

  it('status est correctement transmis', () => {
    const result = computeChartData([WON_1, ABANDONED_1]);
    // WON_1 est plus récent (slice(0,7).reverse() → ABANDONED_1 d'abord, WON_1 ensuite)
    expect(result[0]?.status).toBe('abandoned');
    expect(result[1]?.status).toBe('won');
  });

  it('jumps correspond aux sauts du record', () => {
    const result = computeChartData([WON_1]); // jumps=4
    expect(result[0]?.jumps).toBe(4);
  });

  // ── Cas limite : records > 7 (prend les 7 premiers = les plus récents) ───────

  it('avec 9 records, prend les 7 premiers (plus récents)', () => {
    const manyRecords: ReadonlyArray<GameRecord> = [
      WON_1, WON_2, WON_3, WON_4, WON_5, ABANDONED_1, ABANDONED_2,
      // Ces deux-là ne doivent PAS apparaître dans le graphique
      makeRecord('old1', 'won', 9, 300000, '2026-03-03T05:00:00.000Z'),
      makeRecord('old2', 'won', 10, 400000, '2026-03-02T05:00:00.000Z'),
    ];
    const result = computeChartData(manyRecords);
    const ids = result.map((p) => p.jumps);
    // Les jumps de old1 (9) et old2 (10) ne doivent pas apparaître
    expect(ids).not.toContain(9);
    expect(ids).not.toContain(10);
  });
});
