/**
 * plugins/index.ts — Enregistrement des plugins Fastify
 *
 * Chaque plugin tiers est enregistré ici, centralisé pour faciliter
 * la maintenance et la testabilité (buildApp() reste propre).
 */

import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';

/**
 * Enregistre tous les plugins Fastify de l'application.
 * Appelé dans buildApp() avant l'enregistrement des routes.
 */
export function registerPlugins(app: FastifyInstance): void {
  // CORS — autorise toutes les origines en développement
  // En production, restreindre aux origines connues (Phase 4 — ADR à créer)
  void app.register(cors, {
    origin: true, // Reflect request origin — adapter en production
    credentials: false,
  });
}
