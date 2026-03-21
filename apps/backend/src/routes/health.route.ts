/**
 * health.route.ts — Route de santé GET /health
 *
 * Retourne l'état de l'API et de la base de données.
 * Utilisée par les health checks Docker, le load balancer (Phase 4) et Uptime Robot.
 *
 * Le code HTTP est toujours 200 — même si la DB est inaccessible.
 * L'état dégradé est communiqué dans le corps JSON (status: 'degraded').
 * Cela évite que les load balancers coupent le trafic sur un état transitoire.
 *
 * Ne jamais exposer d'informations sensibles (stack traces, connexions BDD, etc.)
 * ADR-002 : Schema Zod obligatoire sur entrée et sortie.
 * P-09 : Check DB avec latence — seuil dégradation 500ms.
 */

import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod/v4';

import { pool } from '../db';

/** Seuil au-delà duquel la DB est considérée dégradée (en ms) */
const DB_LATENCY_WARN_MS = 500;

const healthDbSchema = z.object({
  status: z.enum(['ok', 'error']),
  latencyMs: z.number().optional(),
});

const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  timestamp: z.string().datetime(),
  version: z.string(),
  db: healthDbSchema,
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type HealthDbStatus = z.infer<typeof healthDbSchema>;

/**
 * Vérifie la disponibilité et la latence de la base de données.
 * Exportée pour les tests unitaires (permet le mock du pool).
 * Ne throw jamais — absorbe toutes les erreurs.
 */
export async function checkDb(): Promise<HealthDbStatus> {
  const start = Date.now();
  try {
    await pool.query('SELECT 1');
    const latencyMs = Date.now() - start;
    return { status: 'ok', latencyMs };
  } catch {
    return { status: 'error' };
  }
}

/**
 * Plugin Fastify pour la route /health.
 * Enregistré dans routes/index.ts.
 */
export async function healthRoutes(instance: FastifyInstance): Promise<void> {
  const app = instance.withTypeProvider<ZodTypeProvider>();

  app.get(
    '/health',
    {
      schema: {
        description: 'Health check endpoint — retourne état API + DB',
        tags: ['system'],
        response: {
          200: healthResponseSchema,
        },
      },
    },
    async (): Promise<HealthResponse> => {
      const dbStatus = await checkDb();
      const isOk = dbStatus.status === 'ok' && (dbStatus.latencyMs ?? 0) < DB_LATENCY_WARN_MS;

      return {
        status: isOk ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        version: process.env['npm_package_version'] ?? '0.0.0',
        db: dbStatus,
      };
    },
  );
}
