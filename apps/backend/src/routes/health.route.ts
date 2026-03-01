/**
 * health.route.ts — Route de santé GET /health
 *
 * Retourne l'état de l'API. Utilisée par les health checks Docker,
 * le load balancer (Phase 4) et les tests de smoke.
 *
 * Ne jamais exposer d'informations sensibles (stack traces, connexions BDD, etc.)
 * ADR-002 : Schema Zod obligatoire sur entrée et sortie.
 */

import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod/v4';

const healthResponseSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string().datetime(),
  version: z.string(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

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
        description: 'Health check endpoint',
        tags: ['system'],
        response: {
          200: healthResponseSchema,
        },
      },
    },
    async (): Promise<HealthResponse> => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env['npm_package_version'] ?? '0.0.0',
      };
    },
  );
}
