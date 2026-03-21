/**
 * server.ts — Point d'entrée de l'application
 *
 * Ce fichier est le seul à appeler app.listen().
 * Il ne doit pas être importé dans les tests — utiliser buildApp() directement.
 *
 * ADR-002 : Séparation app.ts (construction) / server.ts (démarrage)
 * pour permettre l'import de l'app en tests sans déclencher listen().
 */

import { buildApp } from './app';
import { env } from './env';

async function start(): Promise<void> {
  const app = buildApp();

  // P-04 : NODE_ENV non défini explicitement → comportement par défaut 'development'
  // En production, NODE_ENV doit être déclaré explicitement dans l'environnement.
  if (process.env['NODE_ENV'] === undefined) {
    app.log.warn(
      'NODE_ENV is not set — defaulting to "development". Set NODE_ENV=production in production environments.',
    );
  }

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    // Fastify log l'adresse d'écoute automatiquement via Pino
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void start();
