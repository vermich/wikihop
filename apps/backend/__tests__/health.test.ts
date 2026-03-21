/**
 * health.test.ts — Tests d'intégration Supertest sur GET /health
 *
 * Ces tests vérifient :
 * - Le code de réponse HTTP (200 toujours, même si la DB est inaccessible)
 * - La structure du body (schema Zod) : status, timestamp, version, db
 * - Le check DB : status ok/degraded selon l'état du pool
 *
 * Pas de connexion PostgreSQL requise pour les tests unitaires de checkDb
 * (mock du pool). Les tests d'intégration Supertest utilisent un mock pool.
 */

import supertest from 'supertest';

// Mock du pool AVANT l'import de buildApp / health.route
jest.mock('../src/db', () => ({
  pool: {
    query: jest.fn(),
  },
}));

import { pool } from '../src/db';
import { checkDb } from '../src/routes/health.route';
import { buildApp } from '../src/app';

const mockPool = pool as { query: jest.Mock };

// ─────────────────────────────────────────────────────────────────────────────
// Tests unitaires de checkDb()
// ─────────────────────────────────────────────────────────────────────────────

describe('checkDb()', () => {
  beforeEach(() => {
    mockPool.query.mockReset();
  });

  it('retourne status ok avec latencyMs quand pool.query réussit', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

    const result = await checkDb();

    expect(result.status).toBe('ok');
    expect(typeof result.latencyMs).toBe('number');
  });

  it('latencyMs est >= 0 quand db.status est ok', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const result = await checkDb();

    expect(result.status).toBe('ok');
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('retourne { status: "error" } sans latencyMs quand pool.query throw', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const result = await checkDb();

    expect(result.status).toBe('error');
    expect(result.latencyMs).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests d'intégration GET /health
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /health', () => {
  const app = buildApp();

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockPool.query.mockReset();
  });

  it('should return HTTP 200 quand DB répond normalement', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const response = await supertest(app.server).get('/health');

    expect(response.status).toBe(200);
  });

  it('should return status "ok" quand DB répond normalement', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const response = await supertest(app.server).get('/health');

    expect(response.body).toMatchObject({
      status: 'ok',
      db: { status: 'ok' },
    });
    expect(typeof response.body.db.latencyMs).toBe('number');
  });

  it('should return HTTP 200 même quand DB inaccessible', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const response = await supertest(app.server).get('/health');

    expect(response.status).toBe(200);
  });

  it('should return status "degraded" et db.status "error" quand DB inaccessible', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const response = await supertest(app.server).get('/health');

    expect(response.body).toMatchObject({
      status: 'degraded',
      db: { status: 'error' },
    });
    expect(response.body.db.latencyMs).toBeUndefined();
  });

  it('should include a valid ISO 8601 timestamp', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const response = await supertest(app.server).get('/health');

    expect(typeof response.body.timestamp).toBe('string');
    const parsed = new Date(response.body.timestamp as string);
    expect(parsed.toString()).not.toBe('Invalid Date');
  });

  it('should include a non-empty version field', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const response = await supertest(app.server).get('/health');

    expect(typeof response.body.version).toBe('string');
    expect((response.body.version as string).length).toBeGreaterThan(0);
  });

  it('should return Content-Type application/json', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const response = await supertest(app.server).get('/health');

    expect(response.headers['content-type']).toMatch(/application\/json/);
  });
});
