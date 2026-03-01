/**
 * app.ts — Création et configuration de l'instance Fastify
 *
 * Ce module exporte buildApp() utilisé par :
 * - server.ts (démarrage en production/dev)
 * - __tests__/ (tests d'intégration Supertest)
 *
 * ADR-002 :
 * - fastify-type-provider-zod pour la validation/sérialisation
 * - Pino comme logger (intégré à Fastify)
 * - Pas de console.log dans le code applicatif
 */

import type { IncomingMessage, Server, ServerResponse } from 'http';

import { fastify, type FastifyBaseLogger, type FastifyInstance } from 'fastify';
import { type ZodTypeProvider, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';

import { checkDatabaseConnection } from './db/index';
import { env } from './env';
import { registerPlugins } from './plugins/index';
import { registerRoutes } from './routes/index';

/**
 * Construit et configure l'instance Fastify.
 *
 * @returns Instance Fastify configurée (pas encore en écoute — voir server.ts)
 */
export function buildApp(): FastifyInstance<Server, IncomingMessage, ServerResponse, FastifyBaseLogger, ZodTypeProvider> {
  const app = fastify({
    logger: {
      level: env.LOG_LEVEL,
      ...(env.NODE_ENV === 'development'
        ? {
            transport: {
              target: 'pino-pretty',
              options: { colorize: true },
            },
          }
        : {}),
      // En test : logger silencieux pour ne pas polluer la sortie Jest
      ...(env.NODE_ENV === 'test' ? { level: 'silent' } : {}),
    },
  }).withTypeProvider<ZodTypeProvider>();

  // Zod comme provider de validation et sérialisation (ADR-002)
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Plugins (CORS, etc.)
  registerPlugins(app);

  // Routes
  registerRoutes(app);

  // Vérification de la connexion BDD avant d'accepter du trafic
  // En test : la connexion BDD est optionnelle (db.test.ts la teste séparément)
  if (env.NODE_ENV !== 'test') {
    app.addHook('onReady', async () => {
      await checkDatabaseConnection();
      app.log.info('Database connection verified');
    });
  }

  return app;
}
