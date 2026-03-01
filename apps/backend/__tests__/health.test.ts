/**
 * health.test.ts — Tests d'intégration Supertest sur GET /health
 *
 * Ces tests vérifient :
 * - Le code de réponse HTTP (200)
 * - La structure du body (schema Zod)
 * - La présence des champs timestamp et version
 *
 * Pas de connexion PostgreSQL requise pour ces tests (env.ts est satisfait
 * par jest.setup.ts mais le hook onReady BDD est skippé en NODE_ENV=test).
 */

import supertest from 'supertest';

import { buildApp } from '../src/app';

describe('GET /health', () => {
  const app = buildApp();

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return 200 with status "ok"', async () => {
    const response = await supertest(app.server).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ok',
    });
  });

  it('should include a valid ISO 8601 timestamp', async () => {
    const response = await supertest(app.server).get('/health');

    expect(response.status).toBe(200);
    expect(typeof response.body.timestamp).toBe('string');

    const parsed = new Date(response.body.timestamp as string);
    expect(parsed.toString()).not.toBe('Invalid Date');
  });

  it('should include a version field', async () => {
    const response = await supertest(app.server).get('/health');

    expect(response.status).toBe(200);
    expect(typeof response.body.version).toBe('string');
    expect((response.body.version as string).length).toBeGreaterThan(0);
  });

  it('should return Content-Type application/json', async () => {
    const response = await supertest(app.server).get('/health');

    expect(response.headers['content-type']).toMatch(/application\/json/);
  });
});
