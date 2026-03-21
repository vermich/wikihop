/**
 * daily-retry.route.test.ts — Tests d'intégration P-16 sur GET /api/game/daily
 *
 * Couvre le comportement de retry avec paires différentes (P-16) :
 * - Cas 1 : tentative 0 réussit (nominal — 2 appels fetch exactement)
 * - Cas 2 : tentative 0 échoue (extract trop court), tentative 1 réussit
 * - Cas 3 : toutes les tentatives échouent → 503 DAILY_POOL_EXHAUSTED
 * - Cas 4 : chemin DB prioritaire (régression F3-51 — fetch non appelé)
 *
 * `query`, `getPopularPages` et `fetch` global sont mockés.
 * Référence : docs/stories/phase-4/P-16-fix-daily-route-retry.md
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

/**
 * Extract de 201+ caractères garanti pour passer le seuil non-ébauche (> 200 chars strict).
 */
const VALID_EXTRACT =
  'Albert Einstein est un physicien théoricien allemand, né le 14 mars 1879 à Ulm, ' +
  'dans le royaume de Wurtemberg, et mort le 18 avril 1955 à Princeton, dans le New Jersey, après avoir développé la théorie de la relativité.';

/** Extract court — ébauche (≤ 200 chars) */
const STUB_EXTRACT = 'Article trop court.';

function buildWikipediaSummary(overrides: {
  pageid?: number;
  title?: string;
  extract?: string;
} = {}): string {
  const pageid = overrides.pageid ?? 1;
  const title = overrides.title ?? 'Article de test';
  const extract = overrides.extract ?? VALID_EXTRACT;
  return JSON.stringify({
    pageid,
    title,
    extract,
    content_urls: {
      desktop: { page: `https://fr.wikipedia.org/wiki/${encodeURIComponent(title)}` },
    },
  });
}

function buildArticleSummary(lang: string = 'fr', title: string = 'Albert Einstein') {
  return {
    id: '12345',
    title,
    url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    language: lang,
    extract: VALID_EXTRACT,
  };
}

const MOCK_ARTICLES_FR = [
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

function mockPopularPagesFr(): void {
  mockGetPopularPages.mockResolvedValue({
    articles: MOCK_ARTICLES_FR,
    language: 'fr',
    source: 'fallback',
  });
}

// ---------------------------------------------------------------------------
// describe: GET /api/game/daily — fallback retry avec paires différentes (P-16)
// ---------------------------------------------------------------------------

describe("GET /api/game/daily — fallback retry avec paires différentes (P-16)", () => {
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
    // Par défaut : aucune paire en base → fallback hash+pageviews activé
    mockQuery.mockResolvedValue([]);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    mockGetPopularPages.mockReset();
    mockQuery.mockReset();
  });

  // ─────────────────────────────────────────────
  // Cas 1 — Tentative 0 réussit (nominal)
  // ─────────────────────────────────────────────

  it("retourne 200 quand la tentative 0 (deterministe) reussit — 2 appels fetch exactement", async () => {
    mockPopularPagesFr();

    // Tentative 0 : les 2 articles sont valides dès le premier appel
    fetchSpy
      .mockResolvedValueOnce(
        new Response(buildWikipediaSummary({ pageid: 1, title: 'Albert Einstein' }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(buildWikipediaSummary({ pageid: 2, title: 'Marie Curie' }), { status: 200 }),
      );

    const response = await supertest(app.server).get('/api/game/daily?lang=fr');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('start');
    expect(response.body).toHaveProperty('target');

    // La tentative 0 réussit → exactement 2 appels fetch (un par article)
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  // ─────────────────────────────────────────────
  // Cas 2 — Tentative 0 échoue, tentative 1 réussit
  // ─────────────────────────────────────────────

  it("retourne 200 quand la tentative 0 echoue (extract court) et la tentative 1 reussit", async () => {
    mockPopularPagesFr();

    // Tentative 0 : les 2 articles ont un extract trop court → rejetés
    fetchSpy
      .mockResolvedValueOnce(
        new Response(buildWikipediaSummary({ pageid: 10, title: 'Ébauche A', extract: STUB_EXTRACT }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(buildWikipediaSummary({ pageid: 11, title: 'Ébauche B', extract: STUB_EXTRACT }), { status: 200 }),
      )
      // Tentative 1 : paire aléatoire différente — articles valides
      .mockResolvedValueOnce(
        new Response(buildWikipediaSummary({ pageid: 3, title: 'Isaac Newton' }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(buildWikipediaSummary({ pageid: 4, title: 'Charles Darwin' }), { status: 200 }),
      );

    const response = await supertest(app.server).get('/api/game/daily?lang=fr');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('start');
    expect(response.body).toHaveProperty('target');

    // Au moins 4 appels fetch : 2 pour tentative 0 échouée + 2 pour tentative 1 réussie
    expect(fetchSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  // ─────────────────────────────────────────────
  // Cas 3 — Toutes les tentatives échouent
  // ─────────────────────────────────────────────

  it("retourne 503 avec code DAILY_POOL_EXHAUSTED quand toutes les tentatives echouent", async () => {
    mockPopularPagesFr();

    // 5 tentatives × 2 appels = 10 réponses avec extract trop court
    for (let i = 0; i < 10; i++) {
      fetchSpy.mockResolvedValueOnce(
        new Response(
          buildWikipediaSummary({ pageid: i, title: `Ébauche${String(i)}`, extract: STUB_EXTRACT }),
          { status: 200 },
        ),
      );
    }

    const response = await supertest(app.server).get('/api/game/daily?lang=fr');

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'DAILY_POOL_EXHAUSTED',
      },
    });
    expect(typeof (response.body as { error: { message: string } }).error.message).toBe('string');
  });

  // ─────────────────────────────────────────────
  // Cas 4 — Chemin DB prioritaire (régression F3-51)
  // ─────────────────────────────────────────────

  it("retourne 200 depuis la DB sans appeler fetchArticleSummary (regression F3-51)", async () => {
    const startArticle = buildArticleSummary('fr', 'Albert Einstein');
    const targetArticle = buildArticleSummary('fr', 'Marie Curie');

    // La DB retourne une paire valide → le fallback hash+pageviews ne doit pas être déclenché
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
    const body = response.body as { start: { title: string }; target: { title: string } };
    expect(body.start.title).toBe('Albert Einstein');
    expect(body.target.title).toBe('Marie Curie');

    // fetchArticleSummary ne doit pas être appelé — les données viennent de la DB
    expect(fetchSpy).not.toHaveBeenCalled();
    // getPopularPages non plus
    expect(mockGetPopularPages).not.toHaveBeenCalled();
  });
});
