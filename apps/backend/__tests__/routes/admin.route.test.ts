/**
 * admin.route.test.ts — Tests d'intégration Supertest sur POST /api/admin/daily-challenges/precompute
 *
 * Couvre :
 * - 200 avec pool suffisant (status 'ok' pour les langues avec feed valide)
 * - 200 avec pool insuffisant (status 'fallback' quand computeDailyChallengeFromNews retourne null)
 * - 200 avec erreur API Wikimedia mockée (status 'error')
 * - Structure de la réponse : { date, results }
 * - Idempotence : le rejeu ne crée pas de doublon
 *
 * `computeDailyChallengeFromNews` et `query` sont mockés — aucun appel réseau réel en CI.
 * Référence : docs/specs/F3-51-daily-challenge-news-precalculated.md — Section 6
 */

import supertest from 'supertest';

import { buildApp } from '../../src/app';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../../src/services/daily-news.service', () => ({
  computeDailyChallengeFromNews: jest.fn(),
}));

jest.mock('../../src/db/index', () => ({
  query: jest.fn(),
  pool: {
    on: jest.fn(),
    end: jest.fn().mockResolvedValue(undefined),
  },
  checkDatabaseConnection: jest.fn().mockResolvedValue(undefined),
}));

import { computeDailyChallengeFromNews } from '../../src/services/daily-news.service';
import { query } from '../../src/db/index';

const mockComputeDailyChallenge = computeDailyChallengeFromNews as jest.MockedFunction<
  typeof computeDailyChallengeFromNews
>;
const mockQuery = query as jest.MockedFunction<typeof query>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_EXTRACT =
  'Albert Einstein est un physicien théoricien allemand, né le 14 mars 1879 à Ulm, ' +
  'dans le royaume de Wurtemberg, et mort le 18 avril 1955 à Princeton, dans le New Jersey, ' +
  'après avoir développé la théorie de la relativité générale et restreinte.';

function buildArticleSummary(lang: string = 'fr', titleSuffix: string = '') {
  return {
    id: `123${titleSuffix}`,
    title: `Albert Einstein${titleSuffix}`,
    url: `https://${lang}.wikipedia.org/wiki/Albert_Einstein`,
    language: lang,
    extract: VALID_EXTRACT,
  };
}

// ---------------------------------------------------------------------------
// describe: POST /api/admin/daily-challenges/precompute
// ---------------------------------------------------------------------------

describe('POST /api/admin/daily-challenges/precompute', () => {
  const app = buildApp();

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockQuery.mockResolvedValue([]);
  });

  afterEach(() => {
    mockComputeDailyChallenge.mockReset();
    mockQuery.mockReset();
  });

  // ─────────────────────────────────────────────
  // Cas nominal — pool suffisant pour toutes les langues
  // ─────────────────────────────────────────────

  it("retourne 200 avec status 'ok' quand computeDailyChallengeFromNews retourne une paire", async () => {
    const pair = {
      start: buildArticleSummary('fr', '-start'),
      target: buildArticleSummary('fr', '-target'),
    };

    // Pour toutes les langues — retourne une paire valide
    mockComputeDailyChallenge.mockResolvedValue(pair);
    mockQuery.mockResolvedValue([]);

    const response = await supertest(app.server)
      .post('/api/admin/daily-challenges/precompute')
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('date');
    expect(response.body).toHaveProperty('results');

    const body = response.body as { date: string; results: Array<{ lang: string; status: string }> };
    expect(Array.isArray(body.results)).toBe(true);
    expect(body.results.length).toBeGreaterThan(0);

    // Au moins un résultat 'ok'
    const okResults = body.results.filter((r) => r.status === 'ok');
    expect(okResults.length).toBeGreaterThan(0);
  });

  it("retourne status 'ok' avec source 'news' pour les langues avec paire disponible", async () => {
    const pair = {
      start: buildArticleSummary('fr', '-start'),
      target: buildArticleSummary('fr', '-target'),
    };

    mockComputeDailyChallenge.mockResolvedValue(pair);
    mockQuery.mockResolvedValue([]);

    const response = await supertest(app.server)
      .post('/api/admin/daily-challenges/precompute')
      .send();

    expect(response.status).toBe(200);

    const body = response.body as { results: Array<{ status: string; source?: string }> };
    const okResult = body.results.find((r) => r.status === 'ok');
    expect(okResult?.source).toBe('news');
  });

  it("retourne la date J+1 au format YYYY-MM-DD", async () => {
    mockComputeDailyChallenge.mockResolvedValue(null);

    const response = await supertest(app.server)
      .post('/api/admin/daily-challenges/precompute')
      .send();

    expect(response.status).toBe(200);
    const body = response.body as { date: string };
    expect(body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // La date doit être dans le futur (J+1)
    const today = new Date().toISOString().slice(0, 10);
    expect(body.date > today).toBe(true);
  });

  // ─────────────────────────────────────────────
  // Cas fallback — pool insuffisant
  // ─────────────────────────────────────────────

  it("retourne status 'fallback' quand computeDailyChallengeFromNews retourne null", async () => {
    // Simule un pool insuffisant pour toutes les langues
    mockComputeDailyChallenge.mockResolvedValue(null);

    const response = await supertest(app.server)
      .post('/api/admin/daily-challenges/precompute')
      .send();

    expect(response.status).toBe(200);

    const body = response.body as { results: Array<{ status: string }> };
    const fallbackResults = body.results.filter((r) => r.status === 'fallback');
    expect(fallbackResults.length).toBeGreaterThan(0);

    // Aucune insertion en base si fallback
    expect(mockQuery).not.toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────
  // Cas erreur — exception lors du calcul
  // ─────────────────────────────────────────────

  it("retourne status 'error' quand computeDailyChallengeFromNews lance une exception", async () => {
    mockComputeDailyChallenge.mockRejectedValue(new Error('API Wikimedia indisponible'));

    const response = await supertest(app.server)
      .post('/api/admin/daily-challenges/precompute')
      .send();

    expect(response.status).toBe(200);

    const body = response.body as { results: Array<{ status: string }> };
    const errorResults = body.results.filter((r) => r.status === 'error');
    expect(errorResults.length).toBeGreaterThan(0);
  });

  // ─────────────────────────────────────────────
  // Structure de la réponse
  // ─────────────────────────────────────────────

  it("retourne une réponse avec les champs date et results", async () => {
    mockComputeDailyChallenge.mockResolvedValue(null);

    const response = await supertest(app.server)
      .post('/api/admin/daily-challenges/precompute')
      .send();

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);

    const body = response.body as { date: string; results: unknown[] };
    expect(typeof body.date).toBe('string');
    expect(Array.isArray(body.results)).toBe(true);
  });

  it("retourne des résultats pour toutes les langues supportées", async () => {
    mockComputeDailyChallenge.mockResolvedValue(null);

    const response = await supertest(app.server)
      .post('/api/admin/daily-challenges/precompute')
      .send();

    expect(response.status).toBe(200);

    const body = response.body as { results: Array<{ lang: string }> };
    const langs = body.results.map((r) => r.lang);

    // Toutes les langues supportées doivent avoir un résultat
    expect(langs).toContain('fr');
    expect(langs).toContain('en');
    expect(langs).toContain('es');
    expect(langs).toContain('de');
  });

  // ─────────────────────────────────────────────
  // Idempotence — rejeu safe (ON CONFLICT DO UPDATE)
  // ─────────────────────────────────────────────

  it("appelle query avec INSERT ON CONFLICT DO UPDATE quand une paire est disponible", async () => {
    const pair = {
      start: buildArticleSummary('fr', '-start'),
      target: buildArticleSummary('fr', '-target'),
    };

    mockComputeDailyChallenge.mockResolvedValue(pair);
    mockQuery.mockResolvedValue([]);

    await supertest(app.server)
      .post('/api/admin/daily-challenges/precompute')
      .send();

    // Vérifie que query a été appelé avec ON CONFLICT DO UPDATE
    expect(mockQuery).toHaveBeenCalled();
    const firstCall = mockQuery.mock.calls[0];
    expect(firstCall?.[0]).toMatch(/ON CONFLICT.*DO UPDATE/i);
  });
});
