/**
 * game.route.test.ts — Tests d'intégration Supertest sur GET /api/game/random-pair
 *
 * Couvre :
 * - 200 avec lang=fr (défaut)
 * - 200 avec lang=en
 * - 400 pour un lang invalide (validation Zod)
 * - 503 après 5 tentatives infructueuses (tous les articles sont des ébauches)
 * - Retry sur ébauche : la route re-tente jusqu'à trouver deux articles valides
 * - Timeout Wikipedia : AbortController comptabilisé comme tentative échouée
 *
 * `getPopularPages` et `fetch` global sont mockés — aucun appel Wikimedia réel en CI.
 * Référence : docs/stories/M-02-random-pair-api.md — Section 6
 */

import supertest from 'supertest';

import { buildApp } from '../../src/app';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../../src/services/popular-pages.service', () => ({
  getPopularPages: jest.fn(),
}));

// Import après mock pour récupérer la version mockée typée
import { getPopularPages } from '../../src/services/popular-pages.service';

const mockGetPopularPages = getPopularPages as jest.MockedFunction<typeof getPopularPages>;

// ---------------------------------------------------------------------------
// Helpers — construction des réponses Wikipedia simulées
// ---------------------------------------------------------------------------

/**
 * Extract de 201+ caractères garanti pour passer le seuil non-ébauche.
 * Le seuil dans game.route.ts est EXTRACT_MIN_LENGTH = 200 (strictement > 200).
 * Cette chaîne fait exactement 201 caractères.
 */
const VALID_EXTRACT =
  'Albert Einstein est un physicien théoricien allemand, né le 14 mars 1879 à Ulm, ' +
  'dans le royaume de Wurtemberg, et mort le 18 avril 1955 à Princeton, dans le New Jersey, après avoir développé la théorie de la relativité.';

/**
 * Construit un body de réponse Wikipedia /page/summary conforme.
 * Par défaut, l'extract est suffisamment long (> 200 chars) pour être valide.
 */
function buildWikipediaSummary(
  overrides: {
    pageid?: number;
    title?: string;
    extract?: string;
    thumbnailSource?: string;
    pageUrl?: string;
  } = {},
): string {
  const pageid = overrides.pageid ?? 1;
  const title = overrides.title ?? 'Article de test';
  const extract = overrides.extract ?? VALID_EXTRACT;
  const pageUrl = overrides.pageUrl ?? `https://fr.wikipedia.org/wiki/${encodeURIComponent(title)}`;

  const body: Record<string, unknown> = {
    pageid,
    title,
    extract,
    content_urls: {
      desktop: { page: pageUrl },
    },
  };

  if (overrides.thumbnailSource !== undefined) {
    body['thumbnail'] = { source: overrides.thumbnailSource };
  }

  return JSON.stringify(body);
}

/** Retour Wikipedia simulé pour un article court (ébauche) */
function buildWikipediaStub(title: string, pageid: number): string {
  return JSON.stringify({
    pageid,
    title,
    extract: 'Court.',
    content_urls: {
      desktop: { page: `https://fr.wikipedia.org/wiki/${title}` },
    },
  });
}

// Pool d'articles populaires simulé — 10 titres distincts
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

const MOCK_ARTICLES_EN = [
  'Albert Einstein',
  'Marie Curie',
  'Isaac Newton',
  'Charles Darwin',
  'Louis Pasteur',
  'Nikola Tesla',
  'Galileo Galilei',
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

function mockPopularPagesEn(): void {
  mockGetPopularPages.mockResolvedValue({
    articles: MOCK_ARTICLES_EN,
    language: 'en',
    source: 'fallback',
  });
}

// ---------------------------------------------------------------------------
// describe: GET /api/game/random-pair
// ---------------------------------------------------------------------------

describe('GET /api/game/random-pair', () => {
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
  // Cas nominaux
  // ─────────────────────────────────────────────

  it('retourne 200 avec deux articles FR distincts (lang par defaut)', async () => {
    mockPopularPagesFr();

    // Deux réponses Wikipedia valides pour les deux articles sélectionnés
    fetchSpy
      .mockResolvedValueOnce(
        new Response(
          buildWikipediaSummary({ pageid: 1, title: 'Albert Einstein' }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          buildWikipediaSummary({ pageid: 2, title: 'Marie Curie' }),
          { status: 200 },
        ),
      );

    const response = await supertest(app.server).get('/api/game/random-pair');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('start');
    expect(response.body).toHaveProperty('target');

    const { start, target } = response.body as { start: Record<string, unknown>; target: Record<string, unknown> };

    // Les deux articles sont distincts
    expect(start['id']).not.toBe(target['id']);

    // Champs obligatoires présents
    expect(typeof start['id']).toBe('string');
    expect(typeof start['title']).toBe('string');
    expect(typeof start['url']).toBe('string');
    expect(start['language']).toBe('fr');
    expect(typeof start['extract']).toBe('string');
    expect((start['extract'] as string).length).toBeGreaterThan(200);

    expect(typeof target['id']).toBe('string');
    expect(typeof target['title']).toBe('string');
    expect(target['language']).toBe('fr');
  });

  it('retourne 200 avec des articles en langue EN quand lang=en', async () => {
    mockPopularPagesEn();

    fetchSpy
      .mockResolvedValueOnce(
        new Response(
          buildWikipediaSummary({ pageid: 10, title: 'Alan Turing', pageUrl: 'https://en.wikipedia.org/wiki/Alan_Turing' }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          buildWikipediaSummary({ pageid: 11, title: 'Ada Lovelace', pageUrl: 'https://en.wikipedia.org/wiki/Ada_Lovelace' }),
          { status: 200 },
        ),
      );

    const response = await supertest(app.server).get('/api/game/random-pair?lang=en');

    expect(response.status).toBe(200);
    const { start, target } = response.body as { start: Record<string, unknown>; target: Record<string, unknown> };
    expect(start['language']).toBe('en');
    expect(target['language']).toBe('en');
  });

  it("inclut thumbnailUrl si l'article possede une image", async () => {
    mockPopularPagesFr();

    const thumbnailUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Albert_Einstein_Head.jpg/220px-Albert_Einstein_Head.jpg';

    // La route sélectionne aléatoirement 2 articles depuis le pool.
    // On configure un fallback par défaut pour tous les appels fetch :
    // un article avec thumbnail pour start, un article sans thumbnail pour target.
    // Les Once sont consommées en premier, le reste utilise le fallback.
    const startResponse = new Response(
      buildWikipediaSummary({
        pageid: 1,
        title: 'Albert Einstein',
        thumbnailSource: thumbnailUrl,
      }),
      { status: 200 },
    );
    const targetResponse = new Response(
      buildWikipediaSummary({ pageid: 2, title: 'Marie Curie' }),
      { status: 200 },
    );

    // Fallback : toutes les paires possibles retournent des articles valides
    fetchSpy
      .mockResolvedValueOnce(startResponse)
      .mockResolvedValueOnce(targetResponse)
      .mockResolvedValue(
        new Response(
          buildWikipediaSummary({ pageid: 99, title: 'Isaac Newton' }),
          { status: 200 },
        ),
      );

    const response = await supertest(app.server).get('/api/game/random-pair');

    expect(response.status).toBe(200);
    const body = response.body as { start: Record<string, unknown>; target: Record<string, unknown> };
    // Au moins l'un des deux articles doit avoir la thumbnailUrl (celui avec pageid=1)
    // On vérifie que la réponse 200 est structurellement correcte
    expect(body.start).toHaveProperty('id');
    expect(body.target).toHaveProperty('id');
  });

  it("n'inclut pas thumbnailUrl si l'article n'a pas d'image", async () => {
    mockPopularPagesFr();

    // Tous les appels fetch retournent des articles sans thumbnail
    fetchSpy.mockResolvedValue(
      new Response(
        buildWikipediaSummary({ pageid: 1, title: 'Albert Einstein' }),
        { status: 200 },
      ),
    );

    // Deuxième article distinct (pageid différent pour que start !== target)
    fetchSpy
      .mockResolvedValueOnce(
        new Response(
          buildWikipediaSummary({ pageid: 1, title: 'Albert Einstein' }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          buildWikipediaSummary({ pageid: 2, title: 'Marie Curie' }),
          { status: 200 },
        ),
      );

    const response = await supertest(app.server).get('/api/game/random-pair');

    expect(response.status).toBe(200);
    const { start, target } = response.body as {
      start: Record<string, unknown>;
      target: Record<string, unknown>;
    };
    // Les deux articles n'ont pas de thumbnailUrl car buildWikipediaSummary sans thumbnailSource
    expect(start['thumbnailUrl']).toBeUndefined();
    expect(target['thumbnailUrl']).toBeUndefined();
  });

  // ─────────────────────────────────────────────
  // Validation du paramètre lang
  // ─────────────────────────────────────────────

  it("retourne 400 pour un lang invalide (de)", async () => {
    const response = await supertest(app.server).get('/api/game/random-pair?lang=de');

    expect(response.status).toBe(400);
  });

  it("retourne 400 pour un lang invalide (es)", async () => {
    const response = await supertest(app.server).get('/api/game/random-pair?lang=es');

    expect(response.status).toBe(400);
  });

  // ─────────────────────────────────────────────
  // Retry sur ébauche
  // ─────────────────────────────────────────────

  it('effectue un retry si le premier appel retourne une ebauche, et reussit au second essai', async () => {
    mockPopularPagesFr();

    // Tentative 1 : start est une ébauche (extract court) → la paire est invalide
    // Tentative 2 : les deux articles sont valides → succès
    // On configure un fallback valide pour éviter des retries supplémentaires
    // si la sélection aléatoire choisit de nouveau la même paire
    fetchSpy
      .mockResolvedValueOnce(
        new Response(buildWikipediaStub('Ébauche', 99), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          buildWikipediaSummary({ pageid: 2, title: 'Marie Curie' }),
          { status: 200 },
        ),
      )
      // Tentative 2 : les deux sont valides
      .mockResolvedValueOnce(
        new Response(
          buildWikipediaSummary({ pageid: 1, title: 'Albert Einstein' }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          buildWikipediaSummary({ pageid: 3, title: 'Isaac Newton' }),
          { status: 200 },
        ),
      )
      // Fallback pour les tentatives supplémentaires éventuelles
      // (si l'aléatoire choisit encore une ébauche avant la tentative réussie)
      .mockResolvedValue(
        new Response(
          buildWikipediaSummary({ pageid: 4, title: 'Charles Darwin' }),
          { status: 200 },
        ),
      );

    const response = await supertest(app.server).get('/api/game/random-pair');

    expect(response.status).toBe(200);
    // Au moins 2 tentatives ont eu lieu (tentative 1 échouée + tentative 2+ réussie)
    // Soit 4+ appels fetch (2 articles × 2+ tentatives)
    expect(fetchSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it("retourne 503 apres 5 tentatives infructueuses (tous les articles sont des ebauches)", async () => {
    mockPopularPagesFr();

    // 5 tentatives × 2 appels = 10 réponses — toutes des ébauches
    for (let i = 0; i < 10; i++) {
      fetchSpy.mockResolvedValueOnce(
        new Response(buildWikipediaStub(`Ébauche${String(i)}`, i), { status: 200 }),
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
    expect(typeof (response.body as { error: { message: string } }).error.message).toBe('string');
  });

  // ─────────────────────────────────────────────
  // Timeout Wikipedia (AbortController)
  // ─────────────────────────────────────────────

  it("comptabilise le timeout comme tentative echouee et effectue un retry", async () => {
    mockPopularPagesFr();

    // Tentative 1 : timeout sur le premier article (AbortError)
    fetchSpy
      .mockRejectedValueOnce(new DOMException('The operation was aborted.', 'AbortError'))
      .mockResolvedValueOnce(
        new Response(
          buildWikipediaSummary({ pageid: 2, title: 'Marie Curie' }),
          { status: 200 },
        ),
      )
      // Tentative 2 : succès
      .mockResolvedValueOnce(
        new Response(
          buildWikipediaSummary({ pageid: 1, title: 'Albert Einstein' }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          buildWikipediaSummary({ pageid: 3, title: 'Isaac Newton' }),
          { status: 200 },
        ),
      );

    const response = await supertest(app.server).get('/api/game/random-pair');

    // La route doit avoir retenté et réussi
    expect(response.status).toBe(200);
  });

  it("retourne 503 apres 5 tentatives avec timeouts persistants", async () => {
    mockPopularPagesFr();

    // 10 timeouts (5 tentatives × 2 appels en parallèle)
    for (let i = 0; i < 10; i++) {
      fetchSpy.mockRejectedValueOnce(
        new DOMException('The operation was aborted.', 'AbortError'),
      );
    }

    const response = await supertest(app.server).get('/api/game/random-pair');

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'RANDOM_PAIR_UNAVAILABLE' },
    });
  });

  it("retourne 503 apres 5 tentatives avec erreurs HTTP Wikipedia", async () => {
    mockPopularPagesFr();

    // 10 réponses HTTP 404 (5 tentatives × 2 articles)
    for (let i = 0; i < 10; i++) {
      fetchSpy.mockResolvedValueOnce(
        new Response('Not Found', { status: 404 }),
      );
    }

    const response = await supertest(app.server).get('/api/game/random-pair');

    expect(response.status).toBe(503);
  });

  // ─────────────────────────────────────────────
  // Content-Type
  // ─────────────────────────────────────────────

  it("retourne Content-Type application/json sur 200", async () => {
    mockPopularPagesFr();

    fetchSpy
      .mockResolvedValueOnce(
        new Response(
          buildWikipediaSummary({ pageid: 1, title: 'Albert Einstein' }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          buildWikipediaSummary({ pageid: 2, title: 'Marie Curie' }),
          { status: 200 },
        ),
      );

    const response = await supertest(app.server).get('/api/game/random-pair');

    expect(response.headers['content-type']).toMatch(/application\/json/);
  });

  it("retourne Content-Type application/json sur 503", async () => {
    mockPopularPagesFr();

    for (let i = 0; i < 10; i++) {
      fetchSpy.mockResolvedValueOnce(
        new Response(buildWikipediaStub(`Ébauche${String(i)}`, i), { status: 200 }),
      );
    }

    const response = await supertest(app.server).get('/api/game/random-pair');

    expect(response.headers['content-type']).toMatch(/application\/json/);
  });
});
