/**
 * env.ts — Validation des variables d'environnement
 *
 * L'application refuse de démarrer si une variable requise est absente ou invalide.
 * Toutes les accès à process.env passent par ce module — jamais d'accès direct ailleurs.
 *
 * ADR-002 : Zod pour la validation des entrées, y compris les variables d'env.
 */

import { z } from 'zod/v4';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  PORT: z
    .string()
    .regex(/^\d+$/, 'PORT doit être un entier positif')
    .transform(Number)
    .default(3000),

  HOST: z.string().default('0.0.0.0'),

  /**
   * URL de connexion PostgreSQL complète.
   * Format : postgresql://user:password@host:port/database
   * Obligatoire en production et development.
   * En test, jest.setup.ts injecte une URL de fallback.
   */
  DATABASE_URL: z.string().url('DATABASE_URL doit être une URL PostgreSQL valide'),

  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),

  /** Langue Wikipedia cible (ISO 639-1). Défaut : 'fr' */
  WIKIPEDIA_LANG: z.string().min(2).max(5).default('fr'),

  /** Durée de vie du cache en secondes. Défaut : 1 heure */
  CACHE_TTL_SECONDS: z
    .string()
    .regex(/^\d+$/, 'CACHE_TTL_SECONDS doit être un entier positif')
    .transform(Number)
    .default(3600),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // console.error accepté ici : on ne peut pas utiliser Pino avant la validation
  // eslint-disable-next-line no-console
  console.error(
    '[wikihop] Erreur de configuration — Variables d\'environnement invalides :',
    JSON.stringify(parsed.error.format(), null, 2),
  );
  process.exit(1);
}

export const env: Env = parsed.data;
