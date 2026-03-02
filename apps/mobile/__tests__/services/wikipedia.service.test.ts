/**
 * Tests unitaires — wikipedia.service.ts (M-08)
 *
 * Couvre :
 *   - getArticleSummary : cas nominal, cache, 404, timeout (AbortError), HTTP 500
 *   - getArticleContent : cas nominal, 404, timeout
 *   - extractInternalLinks : extraction, filtrages, déduplication, encodage
 *
 * Stratégie de mock :
 *   - fetch : jest.spyOn(global, 'fetch') — jamais d'appel réseau réel en CI
 *   - extractInternalLinks est pure : testée sans mock fetch
 *
 * ADR-003 : Tests unitaires avec Jest + React Native Testing Library
 */

import type { ArticleSummary } from '@wikihop/shared';

import {
  WikipediaNetworkError,
  WikipediaNotFoundError,
  clearSummaryCache,
  extractInternalLinks,
  getArticleContent,
  getArticleSummary,
} from '../../src/services/wikipedia.service';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de mock fetch
// ─────────────────────────────────────────────────────────────────────────────

/** Crée un Response mock avec status et corps JSON */
function mockJsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}

/** Crée un Response mock avec status et corps texte */
function mockTextResponse(status: number, body: string): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(body),
  } as Response;
}

/** Corps de réponse API Wikipedia /page/summary typique */
const MOCK_SUMMARY_RESPONSE = {
  pageid: 681,
  title: 'Paris',
  extract: 'Paris est la capitale de la France.',
  content_urls: {
    desktop: {
      page: 'https://fr.wikipedia.org/wiki/Paris',
    },
  },
  thumbnail: {
    source: 'https://upload.wikimedia.org/paris.jpg',
  },
};

/** ArticleSummary attendu correspondant à MOCK_SUMMARY_RESPONSE */
const EXPECTED_SUMMARY: ArticleSummary = {
  id: '681',
  title: 'Paris',
  url: 'https://fr.wikipedia.org/wiki/Paris',
  language: 'fr',
  extract: 'Paris est la capitale de la France.',
  thumbnailUrl: 'https://upload.wikimedia.org/paris.jpg',
};

// ─────────────────────────────────────────────────────────────────────────────
// Setup global
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Vide le cache mémoire entre chaque test pour l'isolation
  clearSummaryCache();
});

// ─────────────────────────────────────────────────────────────────────────────
// getArticleSummary
// ─────────────────────────────────────────────────────────────────────────────

describe('getArticleSummary', () => {
  it('retourne un ArticleSummary valide depuis la réponse JSON Wikipedia', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      mockJsonResponse(200, MOCK_SUMMARY_RESPONSE),
    );

    const result = await getArticleSummary('Paris', 'fr');

    expect(result).toEqual(EXPECTED_SUMMARY);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Vérifie l'URL construite
    const calledUrl = (fetchSpy.mock.calls[0] as [string, RequestInit])[0];
    expect(calledUrl).toBe(
      'https://fr.wikipedia.org/api/rest_v1/page/summary/Paris',
    );

    // Vérifie le header User-Agent
    const calledInit = (fetchSpy.mock.calls[0] as [string, RequestInit])[1];
    expect(calledInit?.headers).toEqual(
      expect.objectContaining({ 'User-Agent': 'WikiHop/1.0 (contact@wikihop.app)' }),
    );
  });

  it("utilise le cache au deuxième appel (fetch appelé une seule fois)", async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      mockJsonResponse(200, MOCK_SUMMARY_RESPONSE),
    );

    const first = await getArticleSummary('Paris', 'fr');
    const second = await getArticleSummary('Paris', 'fr');

    expect(first).toEqual(second);
    // fetch n'est appelé qu'une fois, le deuxième appel est servi par le cache
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("n'utilise pas le cache si la langue diffère (clé cache = lang:title)", async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      mockJsonResponse(200, { ...MOCK_SUMMARY_RESPONSE, title: 'Paris' }),
    );

    await getArticleSummary('Paris', 'fr');
    await getArticleSummary('Paris', 'en');

    // Deux appels distincts car les clés de cache diffèrent (fr:Paris vs en:Paris)
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('lève WikipediaNotFoundError si HTTP 404', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      mockJsonResponse(404, { type: 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found' }),
    );

    let thrownError: unknown;
    try {
      await getArticleSummary('ArticleInexistant', 'fr');
    } catch (e: unknown) {
      thrownError = e;
    }

    expect(thrownError).toBeInstanceOf(WikipediaNotFoundError);
    expect((thrownError as Error).message).toBe(
      'Article non trouvé : ArticleInexistant (fr)',
    );
  });

  it('lève WikipediaNetworkError si timeout (AbortError)', async () => {
    jest.spyOn(global, 'fetch').mockImplementationOnce(() => {
      const error = new Error('The operation was aborted.');
      error.name = 'AbortError';
      return Promise.reject(error);
    });

    // Utilise un titre sans cache pour éviter la pollution entre tests
    let thrownError: unknown;
    try {
      await getArticleSummary('TitreUnique_Timeout', 'fr');
    } catch (e: unknown) {
      thrownError = e;
    }

    expect(thrownError).toBeInstanceOf(WikipediaNetworkError);
    expect((thrownError as Error).message).toContain('Timeout');
  });

  it('lève WikipediaNetworkError si HTTP 500', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      mockJsonResponse(500, { error: 'Internal Server Error' }),
    );

    let thrownError: unknown;
    try {
      await getArticleSummary('TitreUnique_500', 'fr');
    } catch (e: unknown) {
      thrownError = e;
    }

    expect(thrownError).toBeInstanceOf(WikipediaNetworkError);
    expect((thrownError as Error).message).toContain('HTTP 500');
  });

  it('lève WikipediaNetworkError si erreur réseau générique (fetch rejette)', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network request failed'));

    await expect(getArticleSummary('Paris', 'fr')).rejects.toThrow(WikipediaNetworkError);
  });

  it('gère un article sans thumbnail (thumbnailUrl absent du résultat)', async () => {
    const responseWithoutThumbnail = {
      pageid: 999,
      title: 'ArticleSansThumbnail',
      extract: 'Un article sans image.',
      content_urls: {
        desktop: {
          page: 'https://fr.wikipedia.org/wiki/ArticleSansThumbnail',
        },
      },
      // Pas de thumbnail dans la réponse
    };

    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      mockJsonResponse(200, responseWithoutThumbnail),
    );

    const result = await getArticleSummary('ArticleSansThumbnail', 'fr');

    expect(result.thumbnailUrl).toBeUndefined();
    expect(result.extract).toBe('Un article sans image.');
  });

  it("gère un article sans extract (extract vide = '')", async () => {
    const responseWithoutExtract = {
      pageid: 888,
      title: 'ArticleSansExtrait',
      // Pas de extract dans la réponse
      content_urls: {
        desktop: {
          page: 'https://fr.wikipedia.org/wiki/ArticleSansExtrait',
        },
      },
    };

    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      mockJsonResponse(200, responseWithoutExtract),
    );

    const result = await getArticleSummary('ArticleSansExtrait', 'fr');

    expect(result.extract).toBe('');
  });

  it("encode correctement les titres avec caractères spéciaux dans l'URL", async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      mockJsonResponse(200, MOCK_SUMMARY_RESPONSE),
    );

    await getArticleSummary('Tour Eiffel', 'fr');

    const calledUrl = (fetchSpy.mock.calls[0] as [string, RequestInit])[0];
    expect(calledUrl).toContain('Tour%20Eiffel');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getArticleContent
// ─────────────────────────────────────────────────────────────────────────────

describe('getArticleContent', () => {
  it('retourne le HTML brut de l\'article', async () => {
    const htmlContent = '<html><body><p>Contenu de l\'article</p></body></html>';

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      mockTextResponse(200, htmlContent),
    );

    const result = await getArticleContent('Paris', 'fr');

    expect(result).toBe(htmlContent);

    // Vérifie l'URL construite pour /page/html/
    const calledUrl = (fetchSpy.mock.calls[0] as [string, RequestInit])[0];
    expect(calledUrl).toBe(
      'https://fr.wikipedia.org/api/rest_v1/page/html/Paris',
    );
  });

  it('lève WikipediaNotFoundError si HTTP 404', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      mockTextResponse(404, 'Not found'),
    );

    let thrownError: unknown;
    try {
      await getArticleContent('ArticleInexistant', 'fr');
    } catch (e: unknown) {
      thrownError = e;
    }

    expect(thrownError).toBeInstanceOf(WikipediaNotFoundError);
    expect((thrownError as Error).message).toContain('ArticleInexistant');
  });

  it('lève WikipediaNetworkError si timeout (AbortError)', async () => {
    jest.spyOn(global, 'fetch').mockImplementationOnce(() => {
      const error = new Error('The operation was aborted.');
      error.name = 'AbortError';
      return Promise.reject(error);
    });

    let thrownError: unknown;
    try {
      await getArticleContent('TitreUnique_TimeoutContent', 'fr');
    } catch (e: unknown) {
      thrownError = e;
    }

    expect(thrownError).toBeInstanceOf(WikipediaNetworkError);
    expect((thrownError as Error).message).toContain('Timeout');
  });

  it('lève WikipediaNetworkError si HTTP 503', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      mockTextResponse(503, 'Service Unavailable'),
    );

    let thrownError: unknown;
    try {
      await getArticleContent('TitreUnique_503', 'fr');
    } catch (e: unknown) {
      thrownError = e;
    }

    expect(thrownError).toBeInstanceOf(WikipediaNetworkError);
    expect((thrownError as Error).message).toContain('HTTP 503');
  });

  it('utilise le header User-Agent sur les requêtes /page/html/', async () => {
    const htmlContent = '<html><body></body></html>';
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      mockTextResponse(200, htmlContent),
    );

    await getArticleContent('Paris', 'fr');

    const calledInit = (fetchSpy.mock.calls[0] as [string, RequestInit])[1];
    expect(calledInit?.headers).toEqual(
      expect.objectContaining({ 'User-Agent': 'WikiHop/1.0 (contact@wikihop.app)' }),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// extractInternalLinks — fonction pure, pas de mock fetch
// ─────────────────────────────────────────────────────────────────────────────

describe('extractInternalLinks', () => {
  it('extrait correctement les liens /wiki/ du HTML', () => {
    const html = `
      <a href="/wiki/Tour_Eiffel">Tour Eiffel</a>
      <a href="/wiki/Gustave_Eiffel">Gustave Eiffel</a>
      <a href="/wiki/France">France</a>
    `;

    const links = extractInternalLinks(html);

    expect(links).toContain('Tour Eiffel');
    expect(links).toContain('Gustave Eiffel');
    expect(links).toContain('France');
  });

  it('filtre les namespaces non-jouables français (Catégorie:, Portail:, Aide:, etc.)', () => {
    const html = `
      <a href="/wiki/Catégorie:Villes_de_France">Catégorie</a>
      <a href="/wiki/Portail:France">Portail</a>
      <a href="/wiki/Aide:Premiers_pas">Aide</a>
      <a href="/wiki/Wikipédia:Accueil_de_la_communauté">Wikipédia</a>
      <a href="/wiki/Modèle:Infobox_Commune">Modèle</a>
      <a href="/wiki/Spécial:Recherche">Spécial</a>
      <a href="/wiki/Fichier:Paris_montage.jpg">Fichier</a>
      <a href="/wiki/Paris">Paris</a>
    `;

    const links = extractInternalLinks(html);

    expect(links).not.toContain('Catégorie:Villes de France');
    expect(links).not.toContain('Portail:France');
    expect(links).not.toContain('Aide:Premiers pas');
    expect(links).not.toContain('Wikipédia:Accueil de la communauté');
    expect(links).not.toContain('Modèle:Infobox Commune');
    expect(links).not.toContain('Spécial:Recherche');
    expect(links).not.toContain('Fichier:Paris montage.jpg');
    // L'article jouable est conservé
    expect(links).toContain('Paris');
  });

  it('filtre les namespaces non-jouables anglais (Category:, Portal:, Help:, etc.)', () => {
    const html = `
      <a href="/wiki/Category:Cities">Category</a>
      <a href="/wiki/Portal:France">Portal</a>
      <a href="/wiki/Help:Getting_started">Help</a>
      <a href="/wiki/Wikipedia:About">Wikipedia</a>
      <a href="/wiki/Template:Infobox">Template</a>
      <a href="/wiki/Special:Search">Special</a>
      <a href="/wiki/File:Paris.jpg">File</a>
      <a href="/wiki/List_of_cities">List of cities</a>
      <a href="/wiki/Eiffel_Tower">Eiffel Tower</a>
    `;

    const links = extractInternalLinks(html);

    expect(links).not.toContain('Category:Cities');
    expect(links).not.toContain('Portal:France');
    expect(links).not.toContain('Help:Getting started');
    expect(links).not.toContain('Wikipedia:About');
    expect(links).not.toContain('Template:Infobox');
    expect(links).not.toContain('Special:Search');
    expect(links).not.toContain('File:Paris.jpg');
    expect(links).not.toContain('List of cities');
    // L'article jouable est conservé
    expect(links).toContain('Eiffel Tower');
  });

  it("filtre 'Accueil' et 'Main Page' (pages d'accueil non jouables)", () => {
    const html = `
      <a href="/wiki/Accueil">Accueil</a>
      <a href="/wiki/Main_Page">Main Page</a>
      <a href="/wiki/Paris">Paris</a>
    `;

    const links = extractInternalLinks(html);

    expect(links).not.toContain('Accueil');
    expect(links).not.toContain('Main Page');
    expect(links).toContain('Paris');
  });

  it('déduplique les liens répétés', () => {
    const html = `
      <a href="/wiki/Paris">Paris</a>
      <a href="/wiki/Paris">Paris (lien dupliqué)</a>
      <a href="/wiki/Paris">Paris (troisième fois)</a>
      <a href="/wiki/France">France</a>
    `;

    const links = extractInternalLinks(html);

    const parisCount = links.filter((l) => l === 'Paris').length;
    expect(parisCount).toBe(1);
    expect(links).toContain('France');
  });

  it("retourne un tableau vide si aucun lien interne n'est présent", () => {
    const html = `
      <a href="https://example.com">Lien externe</a>
      <a href="/page/about">Lien non-wiki</a>
      <p>Pas de lien wiki ici.</p>
    `;

    const links = extractInternalLinks(html);

    expect(links).toHaveLength(0);
  });

  it('retourne un tableau vide pour une chaîne HTML vide', () => {
    expect(extractInternalLinks('')).toHaveLength(0);
  });

  it("gère correctement les titres encodés (%C3%A9 → é)", () => {
    const html = `
      <a href="/wiki/%C3%89l%C3%A9ment">Élément</a>
      <a href="/wiki/Caf%C3%A9">Café</a>
    `;

    const links = extractInternalLinks(html);

    expect(links).toContain('Élément');
    expect(links).toContain('Café');
  });

  it('convertit les underscores en espaces dans les titres', () => {
    const html = `
      <a href="/wiki/Tour_Eiffel">Tour Eiffel</a>
      <a href="/wiki/Gustave_Eiffel">Gustave Eiffel</a>
    `;

    const links = extractInternalLinks(html);

    expect(links).toContain('Tour Eiffel');
    expect(links).toContain('Gustave Eiffel');
    // Pas d'underscores dans les titres retournés
    expect(links).not.toContain('Tour_Eiffel');
    expect(links).not.toContain('Gustave_Eiffel');
  });

  it('ignore les ancres (#) dans les href — ne capture que les titres d\'articles', () => {
    const html = `
      <a href="/wiki/Paris#Géographie">Paris — section Géographie</a>
      <a href="/wiki/Paris#Histoire">Paris — section Histoire</a>
      <a href="/wiki/France">France</a>
    `;

    const links = extractInternalLinks(html);

    // Les ancres sont exclues par la regex ([^"#]+)
    // Paris apparaît donc zéro fois (les deux liens ont des ancres)
    expect(links).not.toContain('Paris#Géographie');
    expect(links).not.toContain('Paris#Histoire');
    expect(links).toContain('France');
  });

  it('filtre les préfixes Liste de / Liste des (variantes françaises)', () => {
    const html = `
      <a href="/wiki/Liste_de_communes">Liste de communes</a>
      <a href="/wiki/Liste_des_présidents">Liste des présidents</a>
      <a href="/wiki/France">France</a>
    `;

    const links = extractInternalLinks(html);

    expect(links).not.toContain('Liste de communes');
    expect(links).not.toContain('Liste des présidents');
    expect(links).toContain('France');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// clearSummaryCache
// ─────────────────────────────────────────────────────────────────────────────

describe('clearSummaryCache', () => {
  it('invalide le cache — le prochain appel déclenche un fetch réseau', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      mockJsonResponse(200, MOCK_SUMMARY_RESPONSE),
    );

    // Premier appel — peuple le cache
    await getArticleSummary('Paris', 'fr');
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Vide le cache
    clearSummaryCache();

    // Deuxième appel — le cache est vide, un nouveau fetch est déclenché
    await getArticleSummary('Paris', 'fr');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
