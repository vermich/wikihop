/**
 * db.test.ts — Tests de connexion PostgreSQL
 *
 * PRÉREQUIS : Une base PostgreSQL accessible via DATABASE_URL.
 * - En local : démarrer avec `npm run db:up` depuis la racine
 * - En CI : le service postgres est lancé par le workflow GitHub Actions
 *
 * Si DATABASE_URL pointe vers une base inaccessible, les tests échouent
 * avec un timeout — c'est le comportement attendu.
 *
 * Ces tests sont séparés de health.test.ts pour permettre de les skipper
 * en environnement sans base de données (ex: machines sans Docker).
 */

import { checkDatabaseConnection, pool, query } from '../src/db/index';

// En CI sans PostgreSQL, passer CI_SKIP_DB=true pour ignorer ces tests
const hasDatabase = process.env['CI_SKIP_DB'] !== 'true';
const describeOrSkip = hasDatabase ? describe : describe.skip;

describeOrSkip('Database connection', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('should connect to PostgreSQL successfully', async () => {
    await expect(checkDatabaseConnection()).resolves.not.toThrow();
  });

  it('should execute a simple arithmetic query', async () => {
    const client = await pool.connect();
    try {
      const result = await client.query<{ result: number }>(
        'SELECT 1 + 1 AS result',
      );
      // noUncheckedIndexedAccess : vérifier l'existence avant d'accéder
      expect(result.rows[0]?.result).toBe(2);
    } finally {
      client.release();
    }
  });

  it('should use parameterized queries safely', async () => {
    const rows = await query<{ result: number }>(
      'SELECT $1::integer + $2::integer AS result',
      [10, 32],
    );
    expect(rows[0]?.result).toBe(42);
  });
});
