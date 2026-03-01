/**
 * popular-pages.service.test.ts — Tests unitaires du service popular-pages
 *
 * Couvre :
 * - fetchPopularPagesFromWikimedia : succès, timeout, erreur réseau, HTTP non-2xx, JSON malformé,
 *   filtre d'exclusion, normalisation underscores, respect du paramètre limit
 * - getPopularPagesFromFallback : tableau non vide FR et EN, types corrects
 * - getPopularPages : source 'wikimedia' si API répond, source 'fallback' si API échoue,
 *   jamais de tableau vide
 *
 * Référence : docs/stories/M-16-popular-pages-strategy.md — Section A3
 */

import {
  fetchPopularPagesFromWikimedia,
  getPopularPages,
  getPopularPagesFromFallback,
} from '../../src/services/popular-pages.service';

// ---------------------------------------------------------------------------
// Helpers — construction des réponses Wikimedia simulées
// ---------------------------------------------------------------------------

interface MockArticle {
  article: string;
  views: number;
  rank: number;
}

function buildWikimediaResponse(articles: MockArticle[]): string {
  return JSON.stringify({
    items: [
      {
        project: 'fr.wikipedia',
        access: 'all-access',
        year: '2026',
        month: '02',
        day: 'all-days',
        articles,
      },
    ],
  });
}

function buildMockArticles(titles: string[]): MockArticle[] {
  return titles.map((title, index) => ({
    article: title,
    views: 100_000 - index * 1_000,
    rank: index + 1,
  }));
}

// ---------------------------------------------------------------------------
// describe: fetchPopularPagesFromWikimedia
// ---------------------------------------------------------------------------

describe('fetchPopularPagesFromWikimedia', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('parse correctement la réponse Wikimedia et retourne un tableau de titres normalisés', async () => {
    const mockArticles = buildMockArticles([
      'Albert_Einstein',
      'Marie_Curie',
      'Isaac_Newton',
    ]);

    fetchSpy.mockResolvedValueOnce(
      new Response(buildWikimediaResponse(mockArticles), { status: 200 }),
    );

    const result = await fetchPopularPagesFromWikimedia('fr');

    expect(result).not.toBeNull();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toContain('Albert Einstein');
    expect(result).toContain('Marie Curie');
    expect(result).toContain('Isaac Newton');
  });

  it('normalise les underscores en espaces', async () => {
    const mockArticles = buildMockArticles([
      'Guerre_froide',
      'Première_Guerre_mondiale',
      'Révolution_française',
    ]);

    fetchSpy.mockResolvedValueOnce(
      new Response(buildWikimediaResponse(mockArticles), { status: 200 }),
    );

    const result = await fetchPopularPagesFromWikimedia('fr');

    expect(result).not.toBeNull();
    expect(result).toContain('Guerre froide');
    expect(result).toContain('Première Guerre mondiale');
    expect(result).toContain('Révolution française');
    // Les underscores ne doivent plus être présents
    expect(result?.join(' ')).not.toMatch(/_/);
  });

  it('filtre les portails (Portail:, Portal:)', async () => {
    const mockArticles = buildMockArticles([
      'Albert_Einstein',
      'Portail:Sciences',
      'Portal:History',
      'Marie_Curie',
    ]);

    fetchSpy.mockResolvedValueOnce(
      new Response(buildWikimediaResponse(mockArticles), { status: 200 }),
    );

    const result = await fetchPopularPagesFromWikimedia('fr');

    expect(result).not.toBeNull();
    expect(result).not.toContain('Portail:Sciences');
    expect(result).not.toContain('Portal:History');
    expect(result).toContain('Albert Einstein');
    expect(result).toContain('Marie Curie');
  });

  it('filtre les catégories (Catégorie:, Category:)', async () => {
    const mockArticles = buildMockArticles([
      'Catégorie:Physiciens',
      'Category:Scientists',
      'Isaac_Newton',
    ]);

    fetchSpy.mockResolvedValueOnce(
      new Response(buildWikimediaResponse(mockArticles), { status: 200 }),
    );

    const result = await fetchPopularPagesFromWikimedia('fr');

    expect(result).not.toBeNull();
    expect(result).not.toContain('Catégorie:Physiciens');
    expect(result).not.toContain('Category:Scientists');
    expect(result).toContain('Isaac Newton');
  });

  it('filtre les listes (Liste des, List of)', async () => {
    const mockArticles = buildMockArticles([
      'Liste des présidents français',
      'List of Nobel laureates',
      'Charles_Darwin',
    ]);

    fetchSpy.mockResolvedValueOnce(
      new Response(buildWikimediaResponse(mockArticles), { status: 200 }),
    );

    const result = await fetchPopularPagesFromWikimedia('fr');

    expect(result).not.toBeNull();
    expect(result).not.toContain('Liste des présidents français');
    expect(result).not.toContain('List of Nobel laureates');
    expect(result).toContain('Charles Darwin');
  });

  it("filtre Accueil et Main Page", async () => {
    const mockArticles = buildMockArticles([
      'Accueil',
      'Main_Page',
      'Nikola_Tesla',
    ]);

    fetchSpy.mockResolvedValueOnce(
      new Response(buildWikimediaResponse(mockArticles), { status: 200 }),
    );

    const result = await fetchPopularPagesFromWikimedia('fr');

    expect(result).not.toBeNull();
    expect(result).not.toContain('Accueil');
    expect(result).not.toContain('Main Page');
    expect(result).toContain('Nikola Tesla');
  });

  it('retourne null en cas de timeout', async () => {
    // Simule un AbortError (comme AbortController qui déclenche abort())
    fetchSpy.mockRejectedValueOnce(
      new DOMException('The operation was aborted.', 'AbortError'),
    );

    const result = await fetchPopularPagesFromWikimedia('fr');

    expect(result).toBeNull();
  });

  it('retourne null si HTTP status non-2xx (404)', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response('Not Found', { status: 404 }),
    );

    const result = await fetchPopularPagesFromWikimedia('fr');

    expect(result).toBeNull();
  });

  it('retourne null si HTTP status non-2xx (500)', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response('Internal Server Error', { status: 500 }),
    );

    const result = await fetchPopularPagesFromWikimedia('fr');

    expect(result).toBeNull();
  });

  it('retourne null si la réponse JSON est malformée', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response('not valid json {{{', { status: 200 }),
    );

    const result = await fetchPopularPagesFromWikimedia('fr');

    expect(result).toBeNull();
  });

  it('retourne null si la structure JSON ne correspond pas au schéma Wikimedia attendu', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ unexpected: 'structure' }), { status: 200 }),
    );

    const result = await fetchPopularPagesFromWikimedia('fr');

    expect(result).toBeNull();
  });

  it("retourne null en cas d'erreur réseau", async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const result = await fetchPopularPagesFromWikimedia('fr');

    expect(result).toBeNull();
  });

  it('respecte le paramètre limit', async () => {
    const mockArticles = buildMockArticles(
      Array.from({ length: 50 }, (_, i) => `Article_${String(i + 1)}`),
    );

    fetchSpy.mockResolvedValueOnce(
      new Response(buildWikimediaResponse(mockArticles), { status: 200 }),
    );

    const result = await fetchPopularPagesFromWikimedia('fr', 10);

    expect(result).not.toBeNull();
    expect(result?.length).toBe(10);
  });

  it('fonctionne avec la langue "en"', async () => {
    const mockArticles = buildMockArticles(['Alan_Turing', 'Ada_Lovelace']);

    fetchSpy.mockResolvedValueOnce(
      new Response(buildWikimediaResponse(mockArticles), { status: 200 }),
    );

    const result = await fetchPopularPagesFromWikimedia('en');

    expect(result).not.toBeNull();
    expect(result).toContain('Alan Turing');
    expect(result).toContain('Ada Lovelace');
  });
});

// ---------------------------------------------------------------------------
// describe: getPopularPagesFromFallback
// ---------------------------------------------------------------------------

describe('getPopularPagesFromFallback', () => {
  it('retourne un tableau non vide pour "fr"', () => {
    const result = getPopularPagesFromFallback('fr');

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('retourne un tableau non vide pour "en"', () => {
    const result = getPopularPagesFromFallback('en');

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('retourne au minimum 200 titres pour "fr"', () => {
    const result = getPopularPagesFromFallback('fr');
    expect(result.length).toBeGreaterThanOrEqual(200);
  });

  it('retourne au minimum 200 titres pour "en"', () => {
    const result = getPopularPagesFromFallback('en');
    expect(result.length).toBeGreaterThanOrEqual(200);
  });

  it('tous les titres FR sont des strings non vides', () => {
    const result = getPopularPagesFromFallback('fr');
    for (const title of result) {
      expect(typeof title).toBe('string');
      expect(title.trim().length).toBeGreaterThan(0);
    }
  });

  it('tous les titres EN sont des strings non vides', () => {
    const result = getPopularPagesFromFallback('en');
    for (const title of result) {
      expect(typeof title).toBe('string');
      expect(title.trim().length).toBeGreaterThan(0);
    }
  });

  it('aucun titre FR ne contient des underscores', () => {
    const result = getPopularPagesFromFallback('fr');
    for (const title of result) {
      expect(title).not.toContain('_');
    }
  });

  it('aucun titre EN ne contient des underscores', () => {
    const result = getPopularPagesFromFallback('en');
    for (const title of result) {
      expect(title).not.toContain('_');
    }
  });
});

// ---------------------------------------------------------------------------
// describe: getPopularPages (stratégie hybride)
// ---------------------------------------------------------------------------

describe('getPopularPages', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('retourne source "wikimedia" si l\'API répond correctement', async () => {
    const mockArticles = buildMockArticles([
      'Albert_Einstein',
      'Marie_Curie',
      'Isaac_Newton',
    ]);

    fetchSpy.mockResolvedValueOnce(
      new Response(buildWikimediaResponse(mockArticles), { status: 200 }),
    );

    const result = await getPopularPages('fr');

    expect(result.source).toBe('wikimedia');
    expect(result.language).toBe('fr');
    expect(Array.isArray(result.articles)).toBe(true);
    expect(result.articles.length).toBeGreaterThan(0);
  });

  it('retourne source "fallback" si l\'API échoue (erreur réseau)', async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const result = await getPopularPages('fr');

    expect(result.source).toBe('fallback');
    expect(result.language).toBe('fr');
    expect(Array.isArray(result.articles)).toBe(true);
    expect(result.articles.length).toBeGreaterThan(0);
  });

  it('retourne source "fallback" si l\'API retourne HTTP 500', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response('Internal Server Error', { status: 500 }),
    );

    const result = await getPopularPages('en');

    expect(result.source).toBe('fallback');
    expect(result.language).toBe('en');
    expect(result.articles.length).toBeGreaterThan(0);
  });

  it('retourne source "fallback" en cas de timeout', async () => {
    fetchSpy.mockRejectedValueOnce(
      new DOMException('The operation was aborted.', 'AbortError'),
    );

    const result = await getPopularPages('fr');

    expect(result.source).toBe('fallback');
    expect(result.articles.length).toBeGreaterThan(0);
  });

  it('ne retourne jamais un tableau vide (wikimedia succès)', async () => {
    const mockArticles = buildMockArticles(['Albert_Einstein']);

    fetchSpy.mockResolvedValueOnce(
      new Response(buildWikimediaResponse(mockArticles), { status: 200 }),
    );

    const result = await getPopularPages('fr');

    expect(result.articles.length).toBeGreaterThan(0);
  });

  it('ne retourne jamais un tableau vide (wikimedia echec → fallback)', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('Network failure'));

    const result = await getPopularPages('fr');

    expect(result.articles.length).toBeGreaterThan(0);
  });

  it('retourne les articles dans la langue demandée', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('Network failure'));

    const resultFr = await getPopularPages('fr');
    const resultEn = await getPopularPages('en');

    // Les deux résultats sont distincts (fallback charge la bonne langue)
    expect(resultFr.language).toBe('fr');
    expect(resultEn.language).toBe('en');
  });

  it('respecte le paramètre limit en mode wikimedia', async () => {
    const mockArticles = buildMockArticles(
      Array.from({ length: 50 }, (_, i) => `Article_${String(i + 1)}`),
    );

    fetchSpy.mockResolvedValueOnce(
      new Response(buildWikimediaResponse(mockArticles), { status: 200 }),
    );

    const result = await getPopularPages('fr', 5);

    expect(result.source).toBe('wikimedia');
    expect(result.articles.length).toBeLessThanOrEqual(5);
  });

  it('respecte le paramètre limit en mode fallback', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('Network failure'));

    const result = await getPopularPages('fr', 10);

    expect(result.source).toBe('fallback');
    expect(result.articles.length).toBeLessThanOrEqual(10);
  });
});
