/**
 * db/migrate.ts — Script d'exécution des migrations SQL
 *
 * Utilise node-pg-migrate pour appliquer les migrations de façon versionnée.
 * Ce script est un CLI — il termine le processus après exécution.
 *
 * Usage :
 *   npm run db:migrate           ← applique toutes les migrations en attente
 *   npm run db:migrate:down      ← annule la dernière migration (si possible)
 *
 * ADR-002 : Migrations SQL versionnées, pas de migration générée par ORM.
 *
 * Note : import.meta.url n'est pas disponible en CommonJS.
 * On utilise __dirname (disponible nativement en CJS) pour résoudre le chemin.
 */

import * as path from 'path';

import { runner } from 'node-pg-migrate';

import { env } from '../env';

const direction = process.argv.includes('--direction')
  ? (process.argv[process.argv.indexOf('--direction') + 1] as 'up' | 'down')
  : 'up';

async function migrate(): Promise<void> {
  await runner({
    databaseUrl: env.DATABASE_URL,
    migrationsTable: 'pgmigrations',
    dir: path.join(__dirname, 'migrations'),
    direction,
    verbose: true,
  });

  // console.log acceptable dans un script CLI de migration
  // eslint-disable-next-line no-console
  console.log(`[wikihop:migrate] Migrations (${direction}) completed.`);
  process.exit(0);
}

migrate().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  // eslint-disable-next-line no-console
  console.error(`[wikihop:migrate] Migration failed: ${message}`);
  process.exit(1);
});
