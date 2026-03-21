/**
 * daily-challenge-db.route.test.ts — Tests d'intégration F3-51 sur GET /api/game/daily
 *
 * Couvre les nouveaux cas introduits par F3-51 :
 * - 200 avec paire lue depuis daily_challenges en base (cas nominal F3-51)
 * - 200 avec fallback hash+pageviews si aucun enregistrement en base
 * - 200 avec fallback si données JSONB corrompues en base
 * - 200 avec fallback si erreur DB (DB inaccessible)
 *
 * `query`, `getPopularPages` et `fetch` global sont mockés.
 * Référence : docs/specs/F3-51-daily-challenge-news-precalculated.md — Section 7
 */

import supertest from 'supertest';

import { buildApp } from '../../src/app';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../../src/services/popular-pages.service', () => ({
  getPopularPages: jest.fn(),
}));

jest.mock('../../src/db/index', () => ({
  query: jest.fn(),
  pool: {
    on: jest.fn(),
    end: jest.fn().mockResolvedValue(undefined),
  },
  checkDatabaseConnection: jest.fn().mockResolvedValue(undefined),
}));

import { getPopularPages } from '../../src/services/popular-pages.service';
import { query } from '../../src/db/index';

const mockGetPopularPages = getPopularPages as jest.MockedFunction<typeof getPopularPages>;
const mockQuery = query as jest.MockedFunction<typeof query>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_EXTRACT =
  'Albert Einstein est un physicien théoricien allemand, né le 14 mars 1879 à Ulm, ' +
  'dans le royaume de Wurtemberg, et mort le 18 avril 1955 à Princeton, dans le New Jersey, ' +
  'après avoir développé la théorie de la relativité générale et restreinte.';

function buildArticleSummary(lang: string = 'fr', title: string = 'Albert Einstein') {
  return {
    id: '12345',
    title,
    url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    language: lang,
    extract: VALID_EXTRACT,
  };
}

function buildWikipediaSummary(overrides: {
  pageid?: number;
  title?: string;
  extract?: string;
  lang?: string;
} = {}): string {
  const pageid = overrides.pageid ?? 1;
  const title = overrides.title ?? 'Albert Einstein';
  const extract = overrides.extract ?? VALID_EXTRACT;
  const lang = overrides.lang ?? 'fr';
  return JSON.stringify({
    pageid,
    title,
    extract,
    content_urls: {
      desktop: { page: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}` },
    },
  });
}

const MOCK_ARTICLES_FR = [
  'Albert Einstein', 'Marie Curie', 'Isaac Newton', 'Charles Darwin', 'Louis Pasteur',
  'Nikola Tesla', 'Galilée', 'Max Planck', 'Ada Lovelace', 'Alan Turing',
];

function mockPopularPagesFr(): void {
  mockGetPopularPages.mockResolvedValue({
    articles: MOCK_ARTICLES_FR,
    language: 'fr',
    source: 'fallback',
  });
}

// ---------------------------------------------------------------------------
// describe: GET /api/game/daily — cas F3-51 (lecture DB)
// ---------------------------------------------------------------------------

describe('GET /api/game/daily — lecture depuis daily_challenges (F3-51)', () => {
  const app = buildApp();
  let fetchSpy: jest.SpyInstance;

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    mockGetPopularPages.mockReset();
    mockQuery.mockReset();
  });

  // ─────────────────────────────────────────────
  // Cas nominal — paire en base
  // ─────────────────────────────────────────────

  it("retourne 200 avec la paire de daily_challenges si elle existe en base", async () => {
    const startArticle = buildArticleSummary('fr', 'Albert Einstein');
    const targetArticle = buildArticleSummary('fr', 'Marie Curie');

    // Simule une ligne trouvée en base
    mockQuery.mockResolvedValueOnce([
      {
        date: new Date(),
        lang: 'fr',
        start_article: startArticle,
        target_article: targetArticle,
        source: 'news',
        created_at: new Date(),
      },
    ]);

    const response = await supertest(app.server).get('/api/game/daily?lang=fr');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('date');
    expect(response.body).toHaveProperty('start');
    expect(response.body).toHaveProperty('target');

    const body = response.body as { start: { title: string }; target: { title: string } };
    expect(body.start.title).toBe('Albert Einstein');
    expect(body.target.title).toBe('Marie Curie');

    // Pas d'appel Wikipedia si paire trouvée en base
    expect(fetchSpy).not.toHaveBeenCalled();
    // Pas d'appel à getPopularPages si paire trouvée en base
    expect(mockGetPopularPages).not.toHaveBeenCalled();
  });

  it("ne fait pas d'appel Wikipedia si la paire est en base (éco-conception)", async () => {
    const startArticle = buildArticleSummary('fr', 'Albert Einstein');
    const targetArticle = buildArticleSummary('fr', 'Marie Curie');

    mockQuery.mockResolvedValueOnce([
      {
        date: new Date(),
        lang: 'fr',
        start_article: startArticle,
        target_article: targetArticle,
        source: 'news',
        created_at: new Date(),
      },
    ]);

    await supertest(app.server).get('/api/game/daily?lang=fr');

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────
  // Cas fallback — pas de paire en base
  // ─────────────────────────────────────────────

  it("utilise le fallback hash+pageviews si aucune paire en base", async () => {
    // Aucune ligne en base
    mockQuery.mockResolvedValueOnce([]);
    mockPopularPagesFr();

    fetchSpy.mockImplementation(() =>
      Promise.resolve(
        new Response(
          buildWikipediaSummary({ pageid: 1, title: 'Albert Einstein' }),
          { status: 200 },
        ),
      ),
    );

    const response = await supertest(app.server).get('/api/game/daily?lang=fr');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('date');
    expect(response.body).toHaveProperty('start');
    expect(response.body).toHaveProperty('target');

    // getPopularPages doit avoir été appelé (fallback)
    expect(mockGetPopularPages).toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────
  // Cas données corrompues
  // ─────────────────────────────────────────────

  it("utilise le fallback hash+pageviews si les données JSONB en base sont corrompues", async () => {
    // Ligne en base mais JSONB invalide (ne correspond pas à ArticleSummaryResponse)
    mockQuery.mockResolvedValueOnce([
      {
        date: new Date(),
        lang: 'fr',
        start_article: { invalid: 'data', missing: 'required fields' },
        target_article: { also: 'invalid' },
        source: 'news',
        created_at: new Date(),
      },
    ]);
    mockPopularPagesFr();

    fetchSpy.mockImplementation(() =>
      Promise.resolve(
        new Response(
          buildWikipediaSummary({ pageid: 1, title: 'Albert Einstein' }),
          { status: 200 },
        ),
      ),
    );

    const response = await supertest(app.server).get('/api/game/daily?lang=fr');

    expect(response.status).toBe(200);
    // Le fallback prend le relais — getPopularPages doit avoir été appelé
    expect(mockGetPopularPages).toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────
  // Cas erreur DB
  // ─────────────────────────────────────────────

  it("utilise le fallback hash+pageviews si la DB est inaccessible", async () => {
    // Erreur DB
    mockQuery.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    mockPopularPagesFr();

    fetchSpy.mockImplementation(() =>
      Promise.resolve(
        new Response(
          buildWikipediaSummary({ pageid: 1, title: 'Albert Einstein' }),
          { status: 200 },
        ),
      ),
    );

    const response = await supertest(app.server).get('/api/game/daily?lang=fr');

    expect(response.status).toBe(200);
    // Le fallback prend le relais
    expect(mockGetPopularPages).toHaveBeenCalled();
  });
});
