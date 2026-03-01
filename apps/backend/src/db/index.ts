/**
 * db/index.ts — Pool de connexions PostgreSQL
 *
 * ADR-002 : node-postgres (pg) direct, pas d'ORM.
 * Toutes les requêtes utilisent des paramètres préparés ($1, $2...) — jamais
 * d'interpolation de string. Violation = faille d'injection SQL.
 *
 * Le pool est un singleton exporté — ne pas créer d'autres instances de Pool.
 * En tests, appeler pool.end() dans afterAll().
 */

import { Pool } from 'pg';

import { env } from '../env';

/**
 * Pool de connexions PostgreSQL partagé.
 *
 * Paramètres :
 * - max: 10 connexions simultanées (à ajuster en production selon la charge)
 * - idleTimeoutMillis: 30s avant de fermer une connexion inactive
 * - connectionTimeoutMillis: 2s max pour obtenir une connexion du pool
 */
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
});

// Log des erreurs du pool (connexions orphelines, erreurs réseau)
pool.on('error', (err: Error) => {
  // On ne peut pas utiliser app.log ici (pas d'accès à Fastify depuis ce module)
  // Pino sera utilisé depuis app.ts — ici on log sur stderr uniquement
  process.stderr.write(`[wikihop:db] Pool error: ${err.message}\n`);
});

/**
 * Exécute une requête SQL paramétrée et retourne les lignes typées.
 *
 * @param sql - Requête SQL avec placeholders ($1, $2...)
 * @param params - Valeurs des paramètres (jamais interpolées dans sql)
 * @returns Tableau des lignes du résultat, typé T
 *
 * @example
 * const sessions = await query<{ id: string }>('SELECT id FROM game_sessions WHERE status = $1', ['in_progress']);
 */
export async function query<T extends object = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await pool.query<T>(sql, params);
  return result.rows;
}

/**
 * Vérifie que la connexion PostgreSQL est opérationnelle.
 * Appelé dans le hook onReady de Fastify avant d'accepter du trafic.
 *
 * @throws Error si la connexion échoue
 */
export async function checkDatabaseConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}
