/**
 * daily-news.service.test.ts — Tests TDD des fonctions pures du service daily-news
 *
 * Ces tests sont écrits AVANT l'implémentation (TDD strict).
 * Couvre les 3 fonctions pures :
 * - extractArticlesFromFeed
 * - isValidFeedArticle
 * - selectNewsPair
 *
 * Référence : docs/specs/F3-51-daily-challenge-news-precalculated.md — Section 8
 */

import {
  extractArticlesFromFeed,
  isValidFeedArticle,
  selectNewsPair,
} from '../../src/services/daily-news.service';

import type { FeaturedFeedResponse, FeedArticle } from '../../src/services/daily-news.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract valide de 201+ caractères */
const VALID_EXTRACT =
  "Cet article décrit en détail l'histoire de la science moderne depuis le XVIIe siècle jusqu'à nos jours, " +
  'en couvrant les découvertes fondamentales de la physique, de la chimie et de la biologie.';

function buildFeedArticle(overrides: Partial<FeedArticle> = {}): FeedArticle {
  return {
    title: overrides.title ?? 'Albert Einstein',
    extract: overrides.extract ?? VALID_EXTRACT,
    content_urls: overrides.content_urls ?? {
      desktop: { page: 'https://fr.wikipedia.org/wiki/Albert_Einstein' },
    },
    pageid: overrides.pageid ?? 1,
  };
}

// ---------------------------------------------------------------------------
// describe: extractArticlesFromFeed
// ---------------------------------------------------------------------------

describe('extractArticlesFromFeed', () => {
  it('retourne les titres depuis feed.news[].links[]', () => {
    const feed: FeaturedFeedResponse = {
      news: [
        {
          links: [
            buildFeedArticle({ title: 'Albert Einstein' }),
            buildFeedArticle({ title: 'Marie Curie' }),
          ],
        },
      ],
    };

    const result = extractArticlesFromFeed(feed);

    expect(result).toContain('Albert Einstein');
    expect(result).toContain('Marie Curie');
    expect(result).toHaveLength(2);
  });

  it('retourne les titres depuis feed.onthisday[].pages[] si news absent', () => {
    const feed: FeaturedFeedResponse = {
      onthisday: [
        {
          pages: [
            buildFeedArticle({ title: 'Isaac Newton' }),
            buildFeedArticle({ title: 'Galilée' }),
          ],
        },
      ],
    };

    const result = extractArticlesFromFeed(feed);

    expect(result).toContain('Isaac Newton');
    expect(result).toContain('Galilée');
    expect(result).toHaveLength(2);
  });

  it('fusionne news et onthisday et déduplique les doublons', () => {
    const feed: FeaturedFeedResponse = {
      news: [
        {
          links: [
            buildFeedArticle({ title: 'Albert Einstein' }),
            buildFeedArticle({ title: 'Marie Curie' }),
          ],
        },
      ],
      onthisday: [
        {
          pages: [
            buildFeedArticle({ title: 'Albert Einstein' }), // doublon
            buildFeedArticle({ title: 'Isaac Newton' }),
          ],
        },
      ],
    };

    const result = extractArticlesFromFeed(feed);

    // Albert Einstein ne doit apparaître qu'une seule fois
    expect(result.filter((t) => t === 'Albert Einstein')).toHaveLength(1);
    expect(result).toContain('Marie Curie');
    expect(result).toContain('Isaac Newton');
    expect(result).toHaveLength(3);
  });

  it('retourne [] pour un feed vide {}', () => {
    const feed: FeaturedFeedResponse = {};

    const result = extractArticlesFromFeed(feed);

    expect(result).toEqual([]);
  });

  it('retourne [] pour feed.news = []', () => {
    const feed: FeaturedFeedResponse = {
      news: [],
    };

    const result = extractArticlesFromFeed(feed);

    expect(result).toEqual([]);
  });

  it("ignore silencieusement les liens sans title (article malformé)", () => {
    const feed: FeaturedFeedResponse = {
      news: [
        {
          links: [
            { title: undefined } as unknown as FeedArticle, // pas de title
            buildFeedArticle({ title: 'Albert Einstein' }),
          ],
        },
      ],
    };

    const result = extractArticlesFromFeed(feed);

    expect(result).toContain('Albert Einstein');
    expect(result).toHaveLength(1);
  });

  it('gère les entrées news sans links (undefined)', () => {
    const feed: FeaturedFeedResponse = {
      news: [
        {}, // pas de links
        { links: [buildFeedArticle({ title: 'Marie Curie' })] },
      ],
    };

    const result = extractArticlesFromFeed(feed);

    expect(result).toContain('Marie Curie');
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// describe: isValidFeedArticle
// ---------------------------------------------------------------------------

describe('isValidFeedArticle', () => {
  it("retourne true pour un article avec tous les champs et extract > 200 chars", () => {
    const article = buildFeedArticle();
    // VALID_EXTRACT fait 201+ chars — vérifié
    expect(VALID_EXTRACT.length).toBeGreaterThan(200);

    expect(isValidFeedArticle(article)).toBe(true);
  });

  it("retourne false si extract est absent", () => {
    const article = buildFeedArticle({ extract: undefined });

    expect(isValidFeedArticle(article)).toBe(false);
  });

  it("retourne false si extract.length === 200 (strictement supérieur requis)", () => {
    const extract200 = 'a'.repeat(200);
    expect(extract200.length).toBe(200);
    const article = buildFeedArticle({ extract: extract200 });

    expect(isValidFeedArticle(article)).toBe(false);
  });

  it("retourne true si extract.length === 201", () => {
    const extract201 = 'a'.repeat(201);
    expect(extract201.length).toBe(201);
    const article = buildFeedArticle({ extract: extract201 });

    expect(isValidFeedArticle(article)).toBe(true);
  });

  it("retourne false si content_urls est absent", () => {
    const article = buildFeedArticle({ content_urls: undefined });

    expect(isValidFeedArticle(article)).toBe(false);
  });

  it("retourne false si title est absent", () => {
    const article = buildFeedArticle({ title: undefined });

    expect(isValidFeedArticle(article)).toBe(false);
  });

  it("retourne false si title est une chaîne vide", () => {
    const article = buildFeedArticle({ title: '' });

    expect(isValidFeedArticle(article)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// describe: selectNewsPair
// ---------------------------------------------------------------------------

describe('selectNewsPair', () => {
  it('retourne une paire avec un pool de 2 titres', () => {
    const titles = ['Albert Einstein', 'Marie Curie'];

    const result = selectNewsPair(titles, 12345);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
  });

  it('retourne null avec un pool de 1 titre', () => {
    const titles = ['Albert Einstein'];

    const result = selectNewsPair(titles, 12345);

    expect(result).toBeNull();
  });

  it('retourne null avec un pool vide', () => {
    const result = selectNewsPair([], 12345);

    expect(result).toBeNull();
  });

  it('est déterministe : même hash + même pool → même résultat', () => {
    const titles = ['Albert Einstein', 'Marie Curie', 'Isaac Newton', 'Charles Darwin'];
    const hash = 999888777;

    const result1 = selectNewsPair(titles, hash);
    const result2 = selectNewsPair(titles, hash);

    expect(result1).toEqual(result2);
  });

  it('retourne deux titres distincts (result[0] !== result[1])', () => {
    const titles = ['Albert Einstein', 'Marie Curie', 'Isaac Newton', 'Charles Darwin', 'Galilée'];

    // Tester plusieurs hashes pour s'assurer de la distinctivité
    for (let hash = 0; hash < 100; hash += 10) {
      const result = selectNewsPair(titles, hash);
      if (result !== null) {
        expect(result[0]).not.toBe(result[1]);
      }
    }
  });

  it('utilise un pool de 10 titres sans erreur', () => {
    const titles = [
      'Albert Einstein',
      'Marie Curie',
      'Isaac Newton',
      'Charles Darwin',
      'Louis Pasteur',
      'Nikola Tesla',
      'Galilée',
      'Max Planck',
      'Ada Lovelace',
      'Alan Turing',
    ];

    const result = selectNewsPair(titles, 4294967295); // max uint32

    expect(result).not.toBeNull();
    if (result !== null) {
      expect(result[0]).not.toBe(result[1]);
      expect(titles).toContain(result[0]);
      expect(titles).toContain(result[1]);
    }
  });
});
