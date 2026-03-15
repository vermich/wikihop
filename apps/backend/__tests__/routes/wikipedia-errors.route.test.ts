/**
 * wikipedia-errors.route.test.ts — Tests d'intégration Supertest : cas d'erreur Wikipedia
 *
 * Scope F3-07 : lacunes identifiées dans les tests existants.
 *
 * Couvre :
 * - Body JSON Wikipedia malformé (JSON.parse rejette) → retrie et échoue en 503 (pas 500)
 * - Body JSON Wikipedia structurellement invalide (champ obligatoire absent : content_urls)
 *   → retrie et échoue en 503 (pas 500)
 * - Réponse JSON partiellement invalide : `content_urls` null → retrie et échoue en 503
 * - Récupération après erreur ponctuelle : 1 tentative JSON malformé puis 2 articles valides → 200
 * - Content-Type application/json préservé sur les 503 causés par erreurs Wikipedia
 *
 * Référence : docs/stories/phase-3/🔄-F3-07-integration-tests.md — Section 6
 *
 * Architecture de mock : jest.spyOn(global, 'fetch') + jest.mock sur popular-pages.service
 * — même pattern que game.route.test.ts
 */

import supertest from 'supertest';

import { buildApp } from '../../src/app';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../../src/services/popular-pages.service', () => ({
  getPopularPages: jest.fn(),
}));

import { getPopularPages } from '../../src/services/popular-pages.service';

const mockGetPopularPages = getPopularPages as jest.MockedFunction<typeof getPopularPages>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/** Extract valide : > 200 caractères pour passer le seuil non-ébauche */
const VALID_EXTRACT =
  'Albert Einstein est un physicien théoricien allemand, né le 14 mars 1879 à Ulm, ' +
  'dans le royaume de Wurtemberg, et mort le 18 avril 1955 à Princeton, dans le New Jersey, après avoir développé la théorie de la relativité.';

// ---------------------------------------------------------------------------
// describe: GET /api/game/random-pair — cas d'erreur Wikipedia
// ---------------------------------------------------------------------------

describe('GET /api/game/random-pair — gestion des erreurs Wikipedia', () => {
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
  });

  // ─────────────────────────────────────────────
  // Body JSON malformé
  // ─────────────────────────────────────────────

  it('retourne 503 (pas 500) quand tous les appels Wikipedia retournent du JSON malformé', async () => {
    mockPopularPagesFr();

    // 5 tentatives × 2 appels = 10 réponses avec du JSON invalide.
    // fetchArticleSummary doit attraper l'erreur JSON.parse et retourner null silencieusement.
    // Le handler retrie jusqu'à MAX_ATTEMPTS puis retourne 503 proprement (pas de crash 500).
    for (let i = 0; i < 10; i++) {
      fetchSpy.mockResolvedValueOnce(
        new Response('not valid json {{{ <html>', { status: 200 }),
      );
    }

    const response = await supertest(app.server).get('/api/game/random-pair');

    // Critère clé : pas de 500 (crash non géré), mais 503 (dégradation gracieuse)
    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'RANDOM_PAIR_UNAVAILABLE',
      },
    });
    expect(typeof (response.body as { error: { message: string } }).error.message).toBe('string');
  });

  it('retourne 503 (pas 500) quand les réponses Wikipedia ont un body JSON vide ({})', async () => {
    mockPopularPagesFr();

    // JSON valide mais structure vide — JSON.parse réussit mais isWikipediaSummaryResponse
    // doit rejeter proprement (pas de crash) : pageid, title, content_urls manquants.
    for (let i = 0; i < 10; i++) {
      fetchSpy.mockResolvedValueOnce(
        new Response('{}', { status: 200 }),
      );
    }

    const response = await supertest(app.server).get('/api/game/random-pair');

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'RANDOM_PAIR_UNAVAILABLE',
      },
    });
  });

  // ─────────────────────────────────────────────
  // Champ obligatoire absent : content_urls
  // ─────────────────────────────────────────────

  it('retourne 503 quand content_urls est absent du body Wikipedia', async () => {
    mockPopularPagesFr();

    // Body structurellement invalide : pageid et title présents, mais content_urls absent.
    // isWikipediaSummaryResponse doit retourner false → fetchArticleSummary retourne null.
    const bodyWithoutContentUrls = JSON.stringify({
      pageid: 1,
      title: 'Albert Einstein',
      extract: VALID_EXTRACT,
      // content_urls intentionnellement absent
    });

    for (let i = 0; i < 10; i++) {
      fetchSpy.mockResolvedValueOnce(
        new Response(bodyWithoutContentUrls, { status: 200 }),
      );
    }

    const response = await supertest(app.server).get('/api/game/random-pair');

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'RANDOM_PAIR_UNAVAILABLE',
      },
    });
  });

  it('retourne 503 quand content_urls est null dans le body Wikipedia', async () => {
    mockPopularPagesFr();

    // content_urls présent mais null — isWikipediaSummaryResponse doit le rejeter
    // (guard `obj['content_urls'] !== null`).
    const bodyWithNullContentUrls = JSON.stringify({
      pageid: 1,
      title: 'Albert Einstein',
      extract: VALID_EXTRACT,
      content_urls: null,
    });

    for (let i = 0; i < 10; i++) {
      fetchSpy.mockResolvedValueOnce(
        new Response(bodyWithNullContentUrls, { status: 200 }),
      );
    }

    const response = await supertest(app.server).get('/api/game/random-pair');

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'RANDOM_PAIR_UNAVAILABLE',
      },
    });
  });

  // ─────────────────────────────────────────────
  // Récupération après erreur ponctuelle
  // ─────────────────────────────────────────────

  it('retente et retourne 200 si le JSON malformé est ponctuel (tentative 1 invalide, tentative 2 succès)', async () => {
    mockPopularPagesFr();

    // Tentative 1 : deux réponses JSON malformées → null + null → retry
    // Tentative 2 : deux articles valides → 200
    fetchSpy
      .mockResolvedValueOnce(new Response('INVALID JSON <<<', { status: 200 }))
      .mockResolvedValueOnce(new Response('INVALID JSON <<<', { status: 200 }))
      // Tentative 2 : articles valides
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            pageid: 1,
            title: 'Albert Einstein',
            extract: VALID_EXTRACT,
            content_urls: {
              desktop: { page: 'https://fr.wikipedia.org/wiki/Albert_Einstein' },
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            pageid: 2,
            title: 'Marie Curie',
            extract: VALID_EXTRACT,
            content_urls: {
              desktop: { page: 'https://fr.wikipedia.org/wiki/Marie_Curie' },
            },
          }),
          { status: 200 },
        ),
      );

    const response = await supertest(app.server).get('/api/game/random-pair');

    // Après la première tentative invalide, la route doit retenter et réussir
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('start');
    expect(response.body).toHaveProperty('target');
  });

  // ─────────────────────────────────────────────
  // Content-Type sur les 503 d'erreur Wikipedia
  // ─────────────────────────────────────────────

  it('retourne Content-Type application/json sur les 503 causés par des erreurs Wikipedia', async () => {
    mockPopularPagesFr();

    for (let i = 0; i < 10; i++) {
      fetchSpy.mockResolvedValueOnce(
        new Response('bad json {', { status: 200 }),
      );
    }

    const response = await supertest(app.server).get('/api/game/random-pair');

    expect(response.status).toBe(503);
    expect(response.headers['content-type']).toMatch(/application\/json/);
  });
});
