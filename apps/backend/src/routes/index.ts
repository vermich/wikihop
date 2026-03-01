/**
 * routes/index.ts — Enregistrement centralisé des routes
 *
 * Chaque domaine de routes est un plugin Fastify séparé.
 * Ajouter les nouvelles routes ici au fil des phases.
 */

import type { FastifyInstance } from 'fastify';

import { healthRoutes } from './health.route';

/**
 * Enregistre toutes les routes de l'application.
 * Appelé dans buildApp() après les plugins.
 */
export function registerRoutes(app: FastifyInstance): void {
  // Système
  void app.register(healthRoutes);

  // Phase 2 — À ajouter :
  // void app.register(wikipediaRoutes, { prefix: '/wikipedia' });
  // void app.register(sessionRoutes, { prefix: '/sessions' });
  // void app.register(challengeRoutes, { prefix: '/challenges' });
}
