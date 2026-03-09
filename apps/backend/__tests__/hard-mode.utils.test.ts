/**
 * hard-mode.utils.test.ts — Tests TDD de getHardModePool
 *
 * Fonction testée :
 * - getHardModePool(articles: string[]): string[]
 *
 * TDD strict : ces tests ont été écrits AVANT l'implémentation.
 * Référence : docs/stories/phase-3/F3-05-hard-mode.md
 */

import { getHardModePool } from '../src/utils/hard-mode.utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Génère un tableau de N chaînes distinctes : ["Article_0", "Article_1", ...] */
function makeArticles(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `Article_${String(i)}`);
}

// ---------------------------------------------------------------------------
// getHardModePool
// ---------------------------------------------------------------------------

describe('getHardModePool', () => {
  // ─────────────────────────────────────────────
  // Cas nominaux — pool standard (~200 articles)
  // ─────────────────────────────────────────────

  it("retourne le dernier tiers du tableau pour un pool de 200 articles", () => {
    const articles = makeArticles(200);
    const result = getHardModePool(articles);

    // Dernier tiers : indices 134 à 199 → 66 articles
    expect(result.length).toBeGreaterThan(0);
    // Les articles retournés sont bien dans le dernier tiers
    expect(result[0]).toBe('Article_134');
    expect(result[result.length - 1]).toBe('Article_199');
  });

  it("retourne le dernier tiers pour un pool de 259 articles (FR fallback)", () => {
    const articles = makeArticles(259);
    const result = getHardModePool(articles);

    // Dernier tiers : Math.floor(259 / 3) = 86 → début à l'indice 259 - 86 = 173
    const expectedStart = Math.floor(articles.length / 3);
    const startIndex = articles.length - expectedStart;
    expect(result[0]).toBe(`Article_${String(startIndex)}`);
    expect(result[result.length - 1]).toBe('Article_258');
  });

  it("retourne le dernier tiers pour un pool de 268 articles (EN fallback)", () => {
    const articles = makeArticles(268);
    const result = getHardModePool(articles);

    const expectedSize = Math.floor(268 / 3);
    const startIndex = 268 - expectedSize;
    expect(result[0]).toBe(`Article_${String(startIndex)}`);
    expect(result[result.length - 1]).toBe('Article_267');
    expect(result.length).toBe(expectedSize);
  });

  it("ne modifie pas le tableau original (pas de mutation)", () => {
    const articles = makeArticles(200);
    const original = [...articles];
    getHardModePool(articles);
    expect(articles).toEqual(original);
  });

  it("retourne un nouveau tableau (pas une référence vers l'original)", () => {
    const articles = makeArticles(200);
    const result = getHardModePool(articles);
    expect(result).not.toBe(articles);
  });

  // ─────────────────────────────────────────────
  // Edge cases — pool insuffisant
  // ─────────────────────────────────────────────

  it("retourne un tableau vide si le pool hard est < 2 articles (pool de 3)", () => {
    // 3 articles → dernier tiers = 1 article → insuffisant
    const articles = makeArticles(3);
    const result = getHardModePool(articles);
    expect(result.length).toBeLessThan(2);
  });

  it("retourne un tableau vide pour un tableau vide", () => {
    const result = getHardModePool([]);
    expect(result).toEqual([]);
  });

  it("retourne un tableau vide pour un tableau d'un seul article", () => {
    const result = getHardModePool(['Article unique']);
    expect(result.length).toBeLessThan(2);
  });

  it("retourne un tableau vide pour un tableau de deux articles", () => {
    // 2 articles → dernier tiers = 0 article → vide
    const result = getHardModePool(makeArticles(2));
    expect(result.length).toBeLessThan(2);
  });

  // ─────────────────────────────────────────────
  // Cas limites — pool juste suffisant
  // ─────────────────────────────────────────────

  it("retourne au moins 2 articles pour un pool de 6 articles", () => {
    // 6 articles → dernier tiers = 2 articles → suffisant
    const articles = makeArticles(6);
    const result = getHardModePool(articles);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it("retourne exactement le tiers inférieur du pool en taille", () => {
    const poolSizes = [200, 150, 100, 60, 30, 12, 9];
    for (const size of poolSizes) {
      const articles = makeArticles(size);
      const result = getHardModePool(articles);
      const expectedSize = Math.floor(size / 3);
      // Le résultat est soit le tiers attendu, soit vide (si < 2)
      if (expectedSize >= 2) {
        expect(result.length).toBe(expectedSize);
      } else {
        expect(result.length).toBeLessThan(2);
      }
    }
  });

  // ─────────────────────────────────────────────
  // Contenu correct
  // ─────────────────────────────────────────────

  it("les articles retournés appartiennent tous au tableau original", () => {
    const articles = makeArticles(200);
    const result = getHardModePool(articles);
    for (const article of result) {
      expect(articles).toContain(article);
    }
  });

  it("aucun article du premier deux-tiers n'apparaît dans le pool hard", () => {
    const articles = makeArticles(200);
    const result = getHardModePool(articles);
    const hardModeSize = Math.floor(200 / 3); // 66
    const cutIndex = 200 - hardModeSize; // 134
    const easyArticles = articles.slice(0, cutIndex);
    for (const article of result) {
      expect(easyArticles).not.toContain(article);
    }
  });
});
