/**
 * daily-challenge.utils.test.ts — Tests TDD des fonctions pures du défi quotidien
 *
 * Fonctions testées :
 * - djb2Hash(input: string): number
 * - getTodayUTC(): string
 * - computeDailyIndices(hash: number, poolSize: number): [number, number]
 *
 * TDD strict : ces tests ont été écrits AVANT l'implémentation.
 * Référence : docs/stories/phase-3/F3-01-daily-challenge.md
 */

import {
  computeDailyIndices,
  djb2Hash,
  getTodayUTC,
} from '../src/utils/daily-challenge.utils';

// ---------------------------------------------------------------------------
// djb2Hash
// ---------------------------------------------------------------------------

describe('djb2Hash', () => {
  it('retourne un nombre entier pour une chaîne quelconque', () => {
    const result = djb2Hash('2026-03-09');
    expect(typeof result).toBe('number');
    expect(Number.isInteger(result)).toBe(true);
  });

  it("est déterministe — même entrée → même sortie", () => {
    const a = djb2Hash('2026-03-09');
    const b = djb2Hash('2026-03-09');
    expect(a).toBe(b);
  });

  it("produit des valeurs différentes pour des entrées différentes", () => {
    const a = djb2Hash('2026-03-09');
    const b = djb2Hash('2026-03-10');
    expect(a).not.toBe(b);
  });

  it("fonctionne avec une chaîne vide — retourne la valeur initiale 5381", () => {
    expect(djb2Hash('')).toBe(5381);
  });

  it("retourne toujours un entier non négatif (via masque 32 bits >>> 0)", () => {
    const dates = ['2026-01-01', '2026-06-15', '2026-12-31', '2000-01-01'];
    for (const d of dates) {
      const result = djb2Hash(d);
      expect(result).toBeGreaterThanOrEqual(0);
    }
  });

  it("produit la valeur djb2 correcte pour 'abc'", () => {
    // djb2 de 'abc' :
    // h = 5381
    // h = ((5381 << 5) + 5381) + 97  = 177670
    // h = ((177670 << 5) + 177670) + 98 = 5863276
    // h = ((5863276 << 5) + 5863276) + 99 = 193491849
    // >>> 0 → 193491849
    expect(djb2Hash('abc')).toBe(193491849);
  });
});

// ---------------------------------------------------------------------------
// getTodayUTC
// ---------------------------------------------------------------------------

describe('getTodayUTC', () => {
  it("retourne une chaîne au format YYYY-MM-DD", () => {
    const result = getTodayUTC();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("retourne la date UTC courante (pas la date locale)", () => {
    const result = getTodayUTC();
    const now = new Date();
    const expected = now.toISOString().slice(0, 10);
    expect(result).toBe(expected);
  });

  it("est cohérent avec new Date().toISOString()", () => {
    // Deux appels dans la même seconde → même résultat
    const a = getTodayUTC();
    const b = getTodayUTC();
    expect(a).toBe(b);
  });
});

// ---------------------------------------------------------------------------
// computeDailyIndices
// ---------------------------------------------------------------------------

describe('computeDailyIndices', () => {
  it("retourne un tuple de deux entiers", () => {
    const [i, j] = computeDailyIndices(djb2Hash('2026-03-09'), 200);
    expect(typeof i).toBe('number');
    expect(typeof j).toBe('number');
    expect(Number.isInteger(i)).toBe(true);
    expect(Number.isInteger(j)).toBe(true);
  });

  it("les deux indices sont strictement distincts", () => {
    const [i, j] = computeDailyIndices(djb2Hash('2026-03-09'), 200);
    expect(i).not.toBe(j);
  });

  it("les deux indices sont dans les bornes [0, poolSize - 1]", () => {
    const poolSize = 200;
    const [i, j] = computeDailyIndices(djb2Hash('2026-03-09'), poolSize);
    expect(i).toBeGreaterThanOrEqual(0);
    expect(i).toBeLessThan(poolSize);
    expect(j).toBeGreaterThanOrEqual(0);
    expect(j).toBeLessThan(poolSize);
  });

  it("est déterministe — même hash + même poolSize → même paire", () => {
    const hash = djb2Hash('2026-03-09');
    const [i1, j1] = computeDailyIndices(hash, 200);
    const [i2, j2] = computeDailyIndices(hash, 200);
    expect(i1).toBe(i2);
    expect(j1).toBe(j2);
  });

  it("produit des paires différentes pour des dates différentes", () => {
    const hash1 = djb2Hash('2026-03-09');
    const hash2 = djb2Hash('2026-03-10');
    const [i1, j1] = computeDailyIndices(hash1, 200);
    const [i2, j2] = computeDailyIndices(hash2, 200);
    // Il est très improbable que deux dates consécutives produisent exactement la même paire
    expect([i1, j1]).not.toEqual([i2, j2]);
  });

  it("fonctionne avec poolSize = 2 (taille minimale)", () => {
    const [i, j] = computeDailyIndices(djb2Hash('2026-03-09'), 2);
    expect([0, 1]).toContain(i);
    expect([0, 1]).toContain(j);
    expect(i).not.toBe(j);
  });

  it("fonctionne avec un grand pool (259 articles)", () => {
    const poolSize = 259;
    const [i, j] = computeDailyIndices(djb2Hash('2026-03-09'), poolSize);
    expect(i).toBeGreaterThanOrEqual(0);
    expect(i).toBeLessThan(poolSize);
    expect(j).toBeGreaterThanOrEqual(0);
    expect(j).toBeLessThan(poolSize);
    expect(i).not.toBe(j);
  });

  it("produit toujours des indices distincts sur 31 jours consécutifs", () => {
    for (let day = 1; day <= 31; day++) {
      const date = `2026-03-${String(day).padStart(2, '0')}`;
      const hash = djb2Hash(date);
      const [i, j] = computeDailyIndices(hash, 200);
      expect(i).not.toBe(j);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(200);
      expect(j).toBeGreaterThanOrEqual(0);
      expect(j).toBeLessThan(200);
    }
  });
});
