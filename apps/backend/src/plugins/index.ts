/**
 * plugins/index.ts — Enregistrement des plugins Fastify
 *
 * Chaque plugin tiers est enregistré ici, centralisé pour faciliter
 * la maintenance et la testabilité (buildApp() reste propre).
 *
 * Ordre d'enregistrement obligatoire : helmet → cors → rateLimit
 * (le rate-limit doit être enregistré avant les routes)
 */

import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';

import { env } from '../env';

/**
 * Enregistre tous les plugins Fastify de l'application.
 * Appelé dans buildApp() avant l'enregistrement des routes.
 *
 * Note : les register() utilisent void intentionnellement — Fastify garantit
 * l'ordre d'initialisation des plugins via sa file interne (avoidant de
 * passer buildApp() en async).
 */
export function registerPlugins(app: FastifyInstance): void {
  // ── Helmet — headers de sécurité HTTP ──────────────────────────────────────
  // CSP minimaliste pour une API REST pure JSON (pas de rendu HTML).
  void app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
      },
    },
    // HSTS : 1 an, inclure les sous-domaines
    strictTransportSecurity: {
      maxAge: 31536000,
      includeSubDomains: true,
    },
    // Désactiver crossOriginEmbedderPolicy — non pertinent pour une API JSON
    // et peut bloquer les appels cross-origin légitimes
    crossOriginEmbedderPolicy: false,
  });

  // ── CORS ───────────────────────────────────────────────────────────────────
  // En production avec CORS_ORIGIN défini : liste d'origines restreinte.
  // Sinon : reflect origin (comportement permissif pour dev/test).
  // Note : les apps React Native natives n'envoient pas d'en-tête Origin —
  // cette configuration ne les affecte pas.
  const corsOrigin: boolean | string | string[] =
    env.NODE_ENV === 'production' && env.CORS_ORIGIN !== undefined
      ? env.CORS_ORIGIN.split(',').map((o) => o.trim())
      : true;

  void app.register(cors, {
    origin: corsOrigin,
    credentials: false,
  });

  // ── Rate limiting ──────────────────────────────────────────────────────────
  // 60 req/min par IP par défaut (configurable via RATE_LIMIT_MAX).
  // La route /health est exclue — appelée fréquemment par les health checks.
  void app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: '1 minute',
    // Réponse 429 normalisée en JSON — cohérente avec le format ApiError de @wikihop/shared
    errorResponseBuilder: (_request, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Limite de requêtes atteinte. Réessayez dans ${Math.ceil(context.ttl / 1000)} secondes.`,
    }),
    keyGenerator: (request) => request.ip,
    // Exclure la route /health des compteurs
    allowList: (request) => request.routeOptions.url === '/health',
  });
}
