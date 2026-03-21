/**
 * daily-news.service.test.ts — Tests TDD des fonctions pures du service daily-news
 * + tests des fonctions impures (fetchValidFeedArticles, computeDailyChallengeFromNews)
 *
 * Ces tests couvrent :
 * - extractArticlesFromFeed    (pure — TDD strict)
 * - isValidFeedArticle         (pure — TDD strict)
 * - selectNewsPair             (pure — TDD strict)
 * - fetchValidFeedArticles     (impure — mock fetch)
 * - computeDailyChallengeFromNews (impure — mock fetch + mock utils)
 *
 * Référence : docs/specs/F3-51-daily-challenge-news-precalculated.md — Section 8
 */

import {
  extractArticlesFromFeed,
  isValidFeedArticle,
  selectNewsPair,
  fetchValidFeedArticles,
  computeDailyChallengeFromNews,
} from '../../src/services/daily-news.service';

import type { FeaturedFeedResponse, FeedArticle } from '../../src/services/daily-news.service';

// ---------------------------------------------------------------------------
// Mock de fetchArticleSummary (utilisé par computeDailyChallengeFromNews)
// ---------------------------------------------------------------------------

jest.mock('../../src/utils/wikipedia.utils', () => ({
  fetchArticleSummary: jest.fn(),
  WIKIPEDIA_USER_AGENT: 'WikiHop/1.0 (contact@wikihop.app)',
}));

import { fetchArticleSummary } from '../../src/utils/wikipedia.utils';

const mockFetchArticleSummary = fetchArticleSummary as jest.MockedFunction<typeof fetchArticleSummary>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract valide de 201+ caractères (comptés précisément) */
const VALID_EXTRACT =
  "Cet article décrit en détail l'histoire de la science moderne depuis le XVIIe siècle jusqu'à nos jours, " +
  'en couvrant les découvertes fondamentales de la physique, de la chimie et de la biologie. ' +
  "Il présente également l'évolution des méthodes scientifiques au cours des siècles.";

/**
 * Construit un FeedArticle valide avec possibilité de surcharger ou d'omettre des champs.
 * Utiliser `null` comme sentinelle pour forcer l'absence d'un champ optional.
 */
function buildFeedArticle(
  overrides: Partial<{
    title: string | undefined;
    extract: string | undefined;
    content_urls: { desktop: { page: string } } | undefined;
    pageid: number | undefined;
  }> = {},
): FeedArticle {
  const article: FeedArticle = {};

  // title
  if ('title' in overrides) {
    article.title = overrides.title;
  } else {
    article.title = 'Albert Einstein';
  }

  // extract
  if ('extract' in overrides) {
    article.extract = overrides.extract;
  } else {
    article.extract = VALID_EXTRACT;
  }

  // content_urls
  if ('content_urls' in overrides) {
    article.content_urls = overrides.content_urls;
  } else {
    article.content_urls = {
      desktop: { page: 'https://fr.wikipedia.org/wiki/Albert_Einstein' },
    };
  }

  // pageid
  if ('pageid' in overrides) {
    article.pageid = overrides.pageid;
  } else {
    article.pageid = 1;
  }

  return article;
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

// ---------------------------------------------------------------------------
// Helpers pour les tests de fonctions impures
// ---------------------------------------------------------------------------

/** Construit une réponse fetch simulant une réponse HTTP */
function makeFetchResponse(body: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Feed minimal valide avec 6 articles dans news[].links[] */
function buildValidFeedResponse(): FeaturedFeedResponse {
  const articles: FeedArticle[] = Array.from({ length: 6 }, (_, i) => ({
    title: `Article ${String(i + 1)}`,
    extract: 'a'.repeat(201),
    content_urls: { desktop: { page: `https://fr.wikipedia.org/wiki/Article_${String(i + 1)}` } },
    pageid: i + 1,
  }));

  return {
    news: [{ links: articles }],
  };
}

/** Construit un ArticleSummaryResponse minimal pour les mocks */
function buildArticleSummaryResponse(title: string) {
  return {
    id: '123',
    title,
    url: `https://fr.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    language: 'fr' as const,
    extract: 'a'.repeat(201),
  };
}

// ---------------------------------------------------------------------------
// describe: fetchValidFeedArticles
// ---------------------------------------------------------------------------

describe('fetchValidFeedArticles', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('retourne null si la réponse HTTP est non-200 (404)', async () => {
    fetchSpy.mockResolvedValue(makeFetchResponse({ error: 'not found' }, 404));

    const result = await fetchValidFeedArticles('fr', '2026-03-22');

    expect(result).toBeNull();
  });

  it('retourne null si le JSON est malformé', async () => {
    fetchSpy.mockResolvedValue(
      new Response('{ invalid json {{{{', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await fetchValidFeedArticles('fr', '2026-03-22');

    expect(result).toBeNull();
  });

  it("retourne null en cas de timeout (AbortController)", async () => {
    // fetch ne résout jamais — le AbortController déclenche l'AbortError
    fetchSpy.mockImplementation(
      () =>
        new Promise<Response>((_, reject) => {
          // Simuler un abort immédiat pour ne pas attendre 5s
          const err = new DOMException('The operation was aborted.', 'AbortError');
          setTimeout(() => {
            reject(err);
          }, 10);
        }),
    );

    const result = await fetchValidFeedArticles('fr', '2026-03-22');

    expect(result).toBeNull();
  });

  it("retourne null en cas d'erreur réseau (fetch qui throw)", async () => {
    fetchSpy.mockRejectedValue(new TypeError('Network request failed'));

    const result = await fetchValidFeedArticles('fr', '2026-03-22');

    expect(result).toBeNull();
  });

  it("retourne null si isFeaturedFeedResponse retourne false (valeur non-objet)", async () => {
    // La réponse JSON est un tableau — pas un objet, donc le type guard échoue
    fetchSpy.mockResolvedValue(makeFetchResponse(null, 200));

    const result = await fetchValidFeedArticles('fr', '2026-03-22');

    expect(result).toBeNull();
  });

  it('retourne un tableau de FeedArticle pour une réponse valide', async () => {
    const feedResponse = buildValidFeedResponse();
    fetchSpy.mockImplementation(() => makeFetchResponse(feedResponse, 200));

    const result = await fetchValidFeedArticles('fr', '2026-03-22');

    expect(result).not.toBeNull();
    expect(Array.isArray(result)).toBe(true);
    expect((result ?? []).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// describe: computeDailyChallengeFromNews
// ---------------------------------------------------------------------------

describe('computeDailyChallengeFromNews', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
    mockFetchArticleSummary.mockReset();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('retourne null si fetchValidFeedArticles retourne null (erreur réseau)', async () => {
    fetchSpy.mockRejectedValue(new TypeError('Network error'));

    const result = await computeDailyChallengeFromNews('fr', '2026-03-22', 12345);

    expect(result).toBeNull();
  });

  it('retourne null si le pool news contient moins de 5 articles', async () => {
    // Feed avec seulement 3 articles — sous le seuil MIN_NEWS_POOL_SIZE (5)
    const smallFeed: FeaturedFeedResponse = {
      news: [
        {
          links: [
            { title: 'Article 1', extract: 'a'.repeat(201), content_urls: { desktop: { page: 'https://fr.wikipedia.org/wiki/A1' } } },
            { title: 'Article 2', extract: 'a'.repeat(201), content_urls: { desktop: { page: 'https://fr.wikipedia.org/wiki/A2' } } },
            { title: 'Article 3', extract: 'a'.repeat(201), content_urls: { desktop: { page: 'https://fr.wikipedia.org/wiki/A3' } } },
          ],
        },
      ],
    };
    fetchSpy.mockImplementation(() => makeFetchResponse(smallFeed, 200));

    const result = await computeDailyChallengeFromNews('fr', '2026-03-22', 12345);

    expect(result).toBeNull();
  });

  it("retourne null si le pool filtré par isValidFeedArticle contient moins de 2 articles valides", async () => {
    // Feed avec 6 articles mais tous avec extract trop court (ébauches)
    const feedWithStubs: FeaturedFeedResponse = {
      news: [
        {
          links: Array.from({ length: 6 }, (_, i) => ({
            title: `Article ${String(i + 1)}`,
            extract: 'a'.repeat(50), // trop court — < 200 chars
            content_urls: { desktop: { page: `https://fr.wikipedia.org/wiki/A${String(i + 1)}` } },
          })),
        },
      ],
    };
    fetchSpy.mockImplementation(() => makeFetchResponse(feedWithStubs, 200));

    const result = await computeDailyChallengeFromNews('fr', '2026-03-22', 12345);

    expect(result).toBeNull();
  });

  it("retourne null si selectNewsPair retourne null (pool de titres valides < 2 après map)", async () => {
    // Feed avec 5 articles mais seulement 1 avec extract valide
    const feedOnlyOneValid: FeaturedFeedResponse = {
      news: [
        {
          links: [
            { title: 'Valide', extract: 'a'.repeat(201), content_urls: { desktop: { page: 'https://fr.wikipedia.org/wiki/Valide' } } },
            { title: 'Stub 1', extract: 'a'.repeat(50), content_urls: { desktop: { page: 'https://fr.wikipedia.org/wiki/S1' } } },
            { title: 'Stub 2', extract: 'a'.repeat(50), content_urls: { desktop: { page: 'https://fr.wikipedia.org/wiki/S2' } } },
            { title: 'Stub 3', extract: 'a'.repeat(50), content_urls: { desktop: { page: 'https://fr.wikipedia.org/wiki/S3' } } },
            { title: 'Stub 4', extract: 'a'.repeat(50), content_urls: { desktop: { page: 'https://fr.wikipedia.org/wiki/S4' } } },
          ],
        },
      ],
    };
    fetchSpy.mockImplementation(() => makeFetchResponse(feedOnlyOneValid, 200));

    const result = await computeDailyChallengeFromNews('fr', '2026-03-22', 12345);

    expect(result).toBeNull();
  });

  it("retourne null si fetchArticleSummary retourne null pour l'article start", async () => {
    const feedResponse = buildValidFeedResponse();
    fetchSpy.mockImplementation(() => makeFetchResponse(feedResponse, 200));

    // start → null, target → valide
    mockFetchArticleSummary
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(buildArticleSummaryResponse('Article 2'));

    const result = await computeDailyChallengeFromNews('fr', '2026-03-22', 12345);

    expect(result).toBeNull();
  });

  it("retourne { start, target, source: 'news' } pour un chemin nominal complet", async () => {
    const feedResponse = buildValidFeedResponse();
    fetchSpy.mockImplementation(() => makeFetchResponse(feedResponse, 200));

    const startSummary = buildArticleSummaryResponse('Article 1');
    const targetSummary = buildArticleSummaryResponse('Article 2');

    mockFetchArticleSummary
      .mockResolvedValueOnce(startSummary)
      .mockResolvedValueOnce(targetSummary);

    const result = await computeDailyChallengeFromNews('fr', '2026-03-22', 12345);

    expect(result).not.toBeNull();
    if (result !== null) {
      expect(result.start).toBeDefined();
      expect(result.target).toBeDefined();
      expect(result.start.title).toBe(startSummary.title);
      expect(result.target.title).toBe(targetSummary.title);
    }
  });
});
