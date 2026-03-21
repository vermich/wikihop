/**
 * admin.route.ts — Routes d'administration WikiHop
 *
 * Routes :
 * - POST /api/admin/daily-challenges/precompute
 *   Pré-calcule le défi du jour pour J+1, toutes langues supportées.
 *   Déclenché manuellement ou via cron externe (pas de cron intégré — ADR-009).
 *
 * IMPORTANT : Pas d'authentification sur ces routes en Phase 3.
 * Raison : route accessible en réseau interne uniquement (hors scope Phase 3).
 * À sécuriser en Phase 4 (Bearer token ou IP whitelist).
 *
 * Référence : docs/specs/F3-51-daily-challenge-news-precalculated.md — Section 6
 */

import { SUPPORTED_LANGUAGES } from '@wikihop/shared';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod/v4';


import { query } from '../db/index';
import type { DailyChallengeRow } from '../db/schema';
import { computeDailyChallengeFromNews } from '../services/daily-news.service';
import { djb2Hash } from '../utils/daily-challenge.utils';

// ---------------------------------------------------------------------------
// Schemas Zod
// ---------------------------------------------------------------------------

const langResultSchema = z.object({
  lang: z.string(),
  status: z.enum(['ok', 'fallback', 'error']),
  source: z.string().optional(),
});

const precomputeResponseSchema = z.object({
  date: z.string(),
  results: z.array(langResultSchema),
});

const serviceErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type LangResult = z.infer<typeof langResultSchema>;
export type PrecomputeResponse = z.infer<typeof precomputeResponseSchema>;

// ---------------------------------------------------------------------------
// Plugin Fastify
// ---------------------------------------------------------------------------

/**
 * Plugin Fastify pour les routes /api/admin/*.
 * Enregistré dans routes/index.ts.
 */
export async function adminRoutes(instance: FastifyInstance): Promise<void> {
  const app = instance.withTypeProvider<ZodTypeProvider>();

  // ─────────────────────────────────────────────
  // POST /api/admin/daily-challenges/precompute
  // ─────────────────────────────────────────────

  app.post(
    '/api/admin/daily-challenges/precompute',
    {
      schema: {
        description:
          'Pré-calcule le défi du jour pour J+1 pour toutes les langues supportées. ' +
          'Idempotent — safe pour le rejeu (ON CONFLICT DO UPDATE). ' +
          'Pas d\'authentification en Phase 3 — accès réseau interne uniquement.',
        tags: ['admin'],
        response: {
          200: precomputeResponseSchema,
          500: serviceErrorSchema,
        },
      },
    },
    async (request, reply) => {
      // Calculer J+1 en UTC
      const targetDate = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

      request.log.info({ targetDate }, 'admin: démarrage du pré-calcul daily-challenges');

      const results: LangResult[] = [];

      for (const lang of SUPPORTED_LANGUAGES) {
        const hash = djb2Hash(`${targetDate}:${lang}`);

        try {
          const pair = await computeDailyChallengeFromNews(lang, targetDate, hash);

          if (pair !== null) {
            // Insérer en base — idempotent via ON CONFLICT DO UPDATE
            await query<DailyChallengeRow>(
              `INSERT INTO daily_challenges (date, lang, start_article, target_article, source, created_at)
               VALUES ($1, $2, $3, $4, $5, NOW())
               ON CONFLICT (date, lang) DO UPDATE SET
                 start_article  = EXCLUDED.start_article,
                 target_article = EXCLUDED.target_article,
                 source         = EXCLUDED.source,
                 created_at     = NOW()`,
              [targetDate, lang, JSON.stringify(pair.start), JSON.stringify(pair.target), 'news'],
            );

            request.log.info({ lang, targetDate }, 'admin: paire insérée/mise à jour en base');

            results.push({ lang, status: 'ok', source: 'news' });
          } else {
            // Pool insuffisant pour cette langue — le fallback hash+pageviews sera utilisé
            request.log.info(
              { lang, targetDate },
              'admin: pool insuffisant — fallback hash+pageviews',
            );
            results.push({ lang, status: 'fallback' });
          }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          request.log.error({ lang, targetDate, error: message }, 'admin: erreur lors du pré-calcul');
          results.push({ lang, status: 'error' });
        }
      }

      const okCount = results.filter((r) => r.status === 'ok').length;
      const fallbackCount = results.filter((r) => r.status === 'fallback').length;
      const errorCount = results.filter((r) => r.status === 'error').length;

      request.log.info(
        { targetDate, okCount, fallbackCount, errorCount },
        'admin: pré-calcul terminé',
      );

      return reply.code(200).send({ date: targetDate, results });
    },
  );
}
