/**
 * game.route.ts — Routes du jeu WikiHop
 *
 * Routes :
 * - GET /api/game/random-pair  — Paire aléatoire (normal ou hard mode)
 * - GET /api/game/daily        — Défi quotidien (même paire pour tous les joueurs)
 *
 * Logique de retry : max 5 tentatives par route. Si toutes échouent → 503.
 * Chaque appel Wikipedia est soumis à un timeout de 3 secondes.
 *
 * Les deux appels Wikipedia d'une tentative sont lancés en parallèle (Promise.all)
 * pour respecter le critère p95 < 2s (voir notes M-02, point 5).
 *
 * ADR-002 : Schema Zod obligatoire sur entrée et sortie.
 * Références :
 * - docs/stories/phase-2/M-02-random-pair-api.md
 * - docs/stories/phase-3/F3-01-daily-challenge.md
 * - docs/stories/phase-3/F3-05-hard-mode.md
 */

import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod/v4';

import { getPopularPages } from '../services/popular-pages.service';
import { computeDailyIndices, djb2Hash, getTodayUTC } from '../utils/daily-challenge.utils';
import { getHardModePool } from '../utils/hard-mode.utils';

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

/** Langues Wikipedia supportées — F3-26 (doit rester synchronisé avec Language dans packages/shared) */
const SUPPORTED_LANGS = ['fr', 'en', 'es', 'de', 'pt', 'it', 'nl', 'pl'] as const;
type SupportedLang = (typeof SUPPORTED_LANGS)[number];

const langSchema = z.enum(SUPPORTED_LANGS).default('fr');

const randomPairQuerySchema = z.object({
  lang: langSchema,
  difficulty: z.enum(['normal', 'hard']).default('normal'),
});

const dailyQuerySchema = z.object({
  lang: langSchema,
});

const articleSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url(),
  language: z.enum(SUPPORTED_LANGS),
  extract: z.string(),
  thumbnailUrl: z.string().url().optional(),
});

const randomPairResponseSchema = z.object({
  start: articleSummarySchema,
  target: articleSummarySchema,
});

const dailyResponseSchema = z.object({
  date: z.string(),
  start: articleSummarySchema,
  target: articleSummarySchema,
});

const serviceUnavailableSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type ArticleSummaryResponse = z.infer<typeof articleSummarySchema>;
export type RandomPairResponse = z.infer<typeof randomPairResponseSchema>;
export type DailyResponse = z.infer<typeof dailyResponseSchema>;

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
  lang: SupportedLang,
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
 * Plugin Fastify pour les routes /api/game/*.
 * Enregistré dans routes/index.ts.
 */
export async function gameRoutes(instance: FastifyInstance): Promise<void> {
  const app = instance.withTypeProvider<ZodTypeProvider>();

  // ─────────────────────────────────────────────
  // GET /api/game/random-pair
  // ─────────────────────────────────────────────

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
      const { lang, difficulty } = request.query;

      const popularPages = await getPopularPages(lang);
      let articles = popularPages.articles;

      // Mode difficile : restreindre le pool au dernier tiers (F3-05)
      if (difficulty === 'hard') {
        const hardPool = getHardModePool(articles);

        // Guard : pool hard insuffisant → 503 immédiat, pas de retry inutile
        if (hardPool.length < 2) {
          request.log.warn(
            { lang, reason: 'pool hard insuffisant', poolSize: articles.length },
            'random-pair: pool hard mode < 2 articles',
          );
          return reply.code(503).send({
            success: false,
            error: {
              code: 'hard_pool_insufficient',
              message: 'Le pool du mode difficile est insuffisant (moins de 2 articles)',
            },
          });
        }

        articles = hardPool;
      }

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        // Besoin d'au moins 2 articles pour sélectionner une paire distincte
        if (articles.length < 2) {
          request.log.warn(
            { attempt, lang, difficulty, reason: 'pool trop petit' },
            'random-pair: tentative invalide',
          );
          break;
        }

        const [idxStart, idxTarget] = pickTwoDistinctIndices(articles.length);
        const titleStart = articles[idxStart];
        const titleTarget = articles[idxTarget];

        // noUncheckedIndexedAccess : vérification explicite après sélection
        if (titleStart === undefined || titleTarget === undefined) {
          request.log.warn(
            { attempt, lang, difficulty, reason: 'index hors limites' },
            'random-pair: tentative invalide',
          );
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
              difficulty,
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
        { lang, difficulty, maxAttempts: MAX_ATTEMPTS },
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

  // ─────────────────────────────────────────────
  // GET /api/game/daily
  // ─────────────────────────────────────────────

  app.get(
    '/api/game/daily',
    {
      schema: {
        description: 'Retourne le défi quotidien — même paire pour tous les joueurs ce jour',
        tags: ['game'],
        querystring: dailyQuerySchema,
        response: {
          200: dailyResponseSchema,
          503: serviceUnavailableSchema,
        },
      },
    },
    async (request, reply) => {
      const { lang } = request.query;

      // Date du jour en UTC — garantit le changement à minuit UTC
      const date = getTodayUTC();

      // Hash déterministe de la date + langue pour varier selon la langue
      const hashInput = `${date}:${lang}`;
      const hash = djb2Hash(hashInput);

      const popularPages = await getPopularPages(lang);
      const articles = popularPages.articles;

      if (articles.length < 2) {
        request.log.error(
          { lang, date, reason: 'pool insuffisant' },
          'daily: pool trop petit pour générer un défi quotidien',
        );
        return reply.code(503).send({
          success: false,
          error: {
            code: 'DAILY_POOL_INSUFFICIENT',
            message: 'Le pool est insuffisant pour générer le défi quotidien',
          },
        });
      }

      // Indices déterministes basés sur la date — idempotent
      const [idxStart, idxTarget] = computeDailyIndices(hash, articles.length);
      const titleStart = articles[idxStart];
      const titleTarget = articles[idxTarget];

      // noUncheckedIndexedAccess : vérification explicite
      if (titleStart === undefined || titleTarget === undefined) {
        request.log.error(
          { lang, date, idxStart, idxTarget, poolSize: articles.length },
          'daily: indices hors limites — erreur algorithmique',
        );
        return reply.code(503).send({
          success: false,
          error: {
            code: 'DAILY_UNAVAILABLE',
            message: 'Erreur interne lors du calcul du défi quotidien',
          },
        });
      }

      // Retry : même paire cible à chaque tentative (déterminisme)
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const [start, target] = await Promise.all([
          fetchArticleSummary(titleStart, lang),
          fetchArticleSummary(titleTarget, lang),
        ]);

        if (start !== null && target !== null) {
          return reply.code(200).send({ date, start, target });
        }

        request.log.warn(
          { attempt, lang, date, reason: 'échec Wikipedia' },
          'daily: tentative de fetching échouée',
        );
      }

      // Toutes les tentatives ont échoué
      request.log.error(
        { lang, date, maxAttempts: MAX_ATTEMPTS },
        'daily: impossible de récupérer les articles du défi quotidien',
      );

      return reply.code(503).send({
        success: false,
        error: {
          code: 'DAILY_UNAVAILABLE',
          message: `Impossible de récupérer le défi quotidien après ${String(MAX_ATTEMPTS)} tentatives`,
        },
      });
    },
  );
}
