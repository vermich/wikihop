/**
 * game.route.ts — Route GET /api/game/random-pair
 *
 * Sélectionne deux articles Wikipedia aléatoires et distincts depuis le pool
 * des pages populaires (service M-16), valide qu'ils sont non-ébauche
 * (extract > 200 chars), et retourne la paire au client mobile.
 *
 * Logique de retry : max 5 tentatives. Si toutes échouent → 503.
 * Chaque appel Wikipedia est soumis à un timeout de 3 secondes.
 *
 * Les deux appels Wikipedia d'une tentative sont lancés en parallèle (Promise.all)
 * pour respecter le critère p95 < 2s (voir notes M-02, point 5).
 *
 * ADR-002 : Schema Zod obligatoire sur entrée et sortie.
 * Référence : docs/stories/M-02-random-pair-api.md
 */

import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod/v4';

import { getPopularPages } from '../services/popular-pages.service';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const MAX_ATTEMPTS = 5;
const WIKIPEDIA_TIMEOUT_MS = 3_000;
const EXTRACT_MIN_LENGTH = 200;
const WIKIPEDIA_USER_AGENT = 'WikiHop/1.0 (contact@wikihop.app)';

// ---------------------------------------------------------------------------
// Type guard interne — réponse Wikipedia REST /page/summary/{title}
// ---------------------------------------------------------------------------

interface WikipediaSummaryResponse {
  pageid: number;
  title: string;
  extract?: string;
  content_urls: {
    desktop: { page: string };
  };
  thumbnail?: { source: string };
}

function isWikipediaSummaryResponse(value: unknown): value is WikipediaSummaryResponse {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj['pageid'] === 'number' &&
    typeof obj['title'] === 'string' &&
    typeof obj['content_urls'] === 'object' &&
    obj['content_urls'] !== null
  );
}

// ---------------------------------------------------------------------------
// Schemas Zod
// ---------------------------------------------------------------------------

const randomPairQuerySchema = z.object({
  lang: z.enum(['fr', 'en']).default('fr'),
});

const articleSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url(),
  language: z.enum(['fr', 'en']),
  extract: z.string(),
  thumbnailUrl: z.string().url().optional(),
});

const randomPairResponseSchema = z.object({
  start: articleSummarySchema,
  target: articleSummarySchema,
});

const serviceUnavailableSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.literal('RANDOM_PAIR_UNAVAILABLE'),
    message: z.string(),
  }),
});

export type ArticleSummaryResponse = z.infer<typeof articleSummarySchema>;
export type RandomPairResponse = z.infer<typeof randomPairResponseSchema>;

// ---------------------------------------------------------------------------
// Logique métier — fetching d'un article Wikipedia
// ---------------------------------------------------------------------------

/**
 * Appelle GET https://{lang}.wikipedia.org/api/rest_v1/page/summary/{encodedTitle}
 * avec un timeout de 3 secondes.
 *
 * Retourne l'`ArticleSummaryResponse` si l'article est valide (HTTP 200, extract > 200 chars).
 * Retourne `null` si l'article est invalide (ébauche, timeout, HTTP non-200, JSON malformé).
 */
async function fetchArticleSummary(
  title: string,
  lang: 'fr' | 'en',
): Promise<ArticleSummaryResponse | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, WIKIPEDIA_TIMEOUT_MS);

  try {
    const encodedTitle = encodeURIComponent(title);
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodedTitle}`;

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': WIKIPEDIA_USER_AGENT,
      },
    });

    if (!response.ok) {
      return null;
    }

    let parsed: unknown;
    try {
      parsed = (await response.json()) as unknown;
    } catch {
      return null;
    }

    if (!isWikipediaSummaryResponse(parsed)) {
      return null;
    }

    const extract = parsed.extract ?? '';

    // Critère non-ébauche : extract doit dépasser EXTRACT_MIN_LENGTH caractères
    if (extract.length <= EXTRACT_MIN_LENGTH) {
      return null;
    }

    // Construction de la réponse typée
    const contentUrls = parsed.content_urls.desktop;
    const articleUrl = contentUrls.page;

    const result: ArticleSummaryResponse = {
      id: String(parsed.pageid),
      title: parsed.title,
      url: articleUrl,
      language: lang,
      extract,
    };

    if (parsed.thumbnail?.source !== undefined) {
      result.thumbnailUrl = parsed.thumbnail.source;
    }

    return result;
  } catch (error: unknown) {
    // AbortError (timeout) ou erreur réseau — retourne null silencieusement
    void error;
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Sélectionne 2 indices distincts aléatoirement depuis un tableau.
 * Précondition : array.length >= 2.
 */
function pickTwoDistinctIndices(length: number): [number, number] {
  const first = Math.floor(Math.random() * length);
  let second = Math.floor(Math.random() * (length - 1));
  if (second >= first) {
    second += 1;
  }
  return [first, second];
}

// ---------------------------------------------------------------------------
// Plugin Fastify
// ---------------------------------------------------------------------------

/**
 * Plugin Fastify pour la route /api/game/random-pair.
 * Enregistré dans routes/index.ts.
 */
export async function gameRoutes(instance: FastifyInstance): Promise<void> {
  const app = instance.withTypeProvider<ZodTypeProvider>();

  app.get(
    '/api/game/random-pair',
    {
      schema: {
        description: "Retourne une paire d'articles Wikipedia aléatoires pour démarrer une partie",
        tags: ['game'],
        querystring: randomPairQuerySchema,
        response: {
          200: randomPairResponseSchema,
          503: serviceUnavailableSchema,
        },
      },
    },
    async (request, reply) => {
      const { lang } = request.query;

      const popularPages = await getPopularPages(lang);
      const articles = popularPages.articles;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        // Besoin d'au moins 2 articles pour sélectionner une paire distincte
        if (articles.length < 2) {
          request.log.warn({ attempt, lang, reason: 'pool trop petit' }, 'random-pair: tentative invalide');
          break;
        }

        const [idxStart, idxTarget] = pickTwoDistinctIndices(articles.length);
        const titleStart = articles[idxStart];
        const titleTarget = articles[idxTarget];

        // noUncheckedIndexedAccess : vérification explicite après sélection
        if (titleStart === undefined || titleTarget === undefined) {
          request.log.warn({ attempt, lang, reason: 'index hors limites' }, 'random-pair: tentative invalide');
          continue;
        }

        // Les deux appels Wikipedia sont lancés en parallèle (p95 < 2s)
        const [start, target] = await Promise.all([
          fetchArticleSummary(titleStart, lang),
          fetchArticleSummary(titleTarget, lang),
        ]);

        if (start === null || target === null) {
          request.log.warn(
            {
              attempt,
              lang,
              reason: start === null ? 'start invalide ou ébauche' : 'target invalide ou ébauche',
              titleStart,
              titleTarget,
            },
            'random-pair: tentative invalide',
          );
          continue;
        }

        return reply.code(200).send({ start, target });
      }

      // Toutes les tentatives ont échoué
      request.log.error(
        { lang, maxAttempts: MAX_ATTEMPTS },
        'random-pair: impossible de générer une paire valide après toutes les tentatives',
      );

      return reply.code(503).send({
        success: false,
        error: {
          code: 'RANDOM_PAIR_UNAVAILABLE',
          message: `Impossible de générer une paire valide après ${String(MAX_ATTEMPTS)} tentatives`,
        },
      });
    },
  );
}
