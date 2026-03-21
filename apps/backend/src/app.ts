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
 *
 * Sécurité — logs Pino :
 * - Pino logue automatiquement method, url, statusCode, responseTime — pas de body, pas de headers sensibles.
 * - Les serializers ne sont pas configurés : comportement par défaut safe (pas de fuite de données personnelles).
 * - Le setErrorHandler ci-dessous masque les stack traces en production avant l'envoi au client.
 */

import type { IncomingMessage, Server, ServerResponse } from 'http';

import { fastify, type FastifyBaseLogger, type FastifyError, type FastifyInstance } from 'fastify';
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

  // Gestion des erreurs — masquer les stack traces en production
  // Les erreurs de validation Zod (400) passent ici — leur message n'est pas masqué (statusCode < 500).
  // Les erreurs 429 du rate limiter passent également ici — on préserve leur message.
  // Seules les erreurs 5xx en production voient leur message masqué.
  app.setErrorHandler((error: FastifyError, _request, reply) => {
    const isProduction = env.NODE_ENV === 'production';

    app.log.error(
      {
        err: error,
        statusCode: error.statusCode ?? 500,
      },
      'Request error',
    );

    const statusCode = error.statusCode ?? 500;

    // Pour les erreurs 429 (rate limit), utiliser le message explicite
    const isRateLimit = statusCode === 429;
    const errorName = isRateLimit ? 'Too Many Requests' : (error.name ?? 'Internal Server Error');

    void reply.status(statusCode).send({
      statusCode,
      error: errorName,
      // En production : message générique pour les erreurs 5xx uniquement. En dev/test : message réel.
      // Les erreurs 4xx (validation, rate limit, etc.) gardent leur message d'origine.
      message:
        isProduction && statusCode >= 500
          ? 'Une erreur interne est survenue.'
          : (error.message ?? 'Internal Server Error'),
      // Stack trace uniquement en développement (jamais pour les 4xx)
      ...(isProduction || statusCode < 500 ? {} : { stack: error.stack }),
    });
  });

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
