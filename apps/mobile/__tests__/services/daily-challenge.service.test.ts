/**
 * Tests TDD — daily-challenge.service.ts (F3-01)
 *
 * Écrits AVANT l'implémentation — ordre TDD strict.
 *
 * Couvre :
 *   - fetchDailyChallenge : cas nominal, erreur réseau, erreur HTTP (4xx/5xx)
 *
 * Stratégie de mock :
 *   - fetch : jest.spyOn(global, 'fetch') — jamais d'appel réseau réel en CI
 */

import type { ArticleSummary } from '@wikihop/shared';

import { fetchDailyChallenge } from '../../src/services/daily-challenge.service';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de mock fetch
// ─────────────────────────────────────────────────────────────────────────────

function makeFetchOk(body: unknown): jest.SpyInstance {
  return jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as Response);
}

function makeFetchError(status: number): jest.SpyInstance {
  return jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: false,
    status,
    json: () => Promise.resolve({ error: 'error' }),
  } as Response);
}

function makeFetchNetworkError(): jest.SpyInstance {
  return jest.spyOn(global, 'fetch').mockRejectedValueOnce(
    new Error('Network request failed'),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const startSummary: ArticleSummary = {
  id: '101',
  title: 'Tour Eiffel',
  url: 'https://fr.wikipedia.org/wiki/Tour_Eiffel',
  language: 'fr',
  extract: 'La Tour Eiffel est une tour en fer puddlé.',
};

const targetSummary: ArticleSummary = {
  id: '202',
  title: 'Paris',
  url: 'https://fr.wikipedia.org/wiki/Paris',
  language: 'fr',
  extract: 'Paris est la capitale de la France.',
};

const mockApiResponse = {
  date: '2026-03-10',
  start: startSummary,
  target: targetSummary,
};

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('fetchDailyChallenge', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('cas nominal', () => {
    it('retourne un DailyChallengeResponse correctement parsé', async () => {
      makeFetchOk(mockApiResponse);

      const result = await fetchDailyChallenge('fr');

      expect(result).not.toBeNull();
      expect(result?.date).toBe('2026-03-10');
      expect(result?.start.title).toBe('Tour Eiffel');
      expect(result?.target.title).toBe('Paris');
    });

    it('appelle le bon endpoint avec le bon lang', async () => {
      const spy = makeFetchOk(mockApiResponse);

      await fetchDailyChallenge('fr');

      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('lang=fr'),
        expect.any(Object),
      );
    });

    it('appelle le bon endpoint avec lang=en', async () => {
      const spy = makeFetchOk({
        date: '2026-03-10',
        start: { ...startSummary, language: 'en' },
        target: { ...targetSummary, language: 'en' },
      });

      await fetchDailyChallenge('en');

      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('lang=en'),
        expect.any(Object),
      );
    });

    it('retourne la date du défi correctement', async () => {
      makeFetchOk(mockApiResponse);

      const result = await fetchDailyChallenge('fr');

      expect(result?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('erreur réseau', () => {
    it('retourne null en cas d\'erreur réseau', async () => {
      makeFetchNetworkError();

      const result = await fetchDailyChallenge('fr');

      expect(result).toBeNull();
    });
  });

  describe('erreur HTTP', () => {
    it('retourne null en cas de HTTP 503', async () => {
      makeFetchError(503);

      const result = await fetchDailyChallenge('fr');

      expect(result).toBeNull();
    });

    it('retourne null en cas de HTTP 500', async () => {
      makeFetchError(500);

      const result = await fetchDailyChallenge('fr');

      expect(result).toBeNull();
    });

    it('retourne null en cas de HTTP 404', async () => {
      makeFetchError(404);

      const result = await fetchDailyChallenge('fr');

      expect(result).toBeNull();
    });

    it('retourne null en cas de HTTP 400', async () => {
      makeFetchError(400);

      const result = await fetchDailyChallenge('fr');

      expect(result).toBeNull();
    });
  });
});
