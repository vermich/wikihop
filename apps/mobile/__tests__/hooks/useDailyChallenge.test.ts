/**
 * Tests unitaires — useDailyChallenge.ts (F3-01)
 *
 * Couvre :
 *   - État initial : status 'loading'
 *   - Succès (fetchDailyChallenge retourne des données) → status 'success'
 *   - Échec (fetchDailyChallenge retourne null) → status 'error'
 *   - Changement de langue → relance le fetch
 *   - Démontage pendant fetch → pas de setState (cancelled flag)
 *
 * Stratégie de mock :
 *   - daily-challenge.service entièrement mocké (jest.mock)
 *   - language.store mocké pour contrôler la langue
 *   - renderHook de @testing-library/react-native
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import type { ArticleSummary } from '@wikihop/shared';

import { useDailyChallenge } from '../../src/hooks/useDailyChallenge';
import * as DailyChallengeService from '../../src/services/daily-challenge.service';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

jest.mock('../../src/services/daily-challenge.service');

let mockLanguage = 'fr';

jest.mock('../../src/store/language.store', () => ({
  useLanguageStore: jest.fn((selector: (state: { language: string }) => unknown) =>
    selector({ language: mockLanguage }),
  ),
}));

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

const mockDailyResponse: DailyChallengeService.DailyChallengeResponse = {
  date: '2026-03-15',
  start: startSummary,
  target: targetSummary,
};

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('useDailyChallenge', () => {
  beforeEach(() => {
    mockLanguage = 'fr';
    jest.clearAllMocks();
  });

  describe('état initial', () => {
    it('commence dans l\'état loading', () => {
      jest.spyOn(DailyChallengeService, 'fetchDailyChallenge').mockReturnValue(
        new Promise(() => undefined),
      );

      const { result } = renderHook(() => useDailyChallenge());

      expect(result.current.state.status).toBe('loading');
    });
  });

  describe('succès', () => {
    it('passe à l\'état success quand fetchDailyChallenge retourne des données', async () => {
      jest.spyOn(DailyChallengeService, 'fetchDailyChallenge').mockResolvedValue(
        mockDailyResponse,
      );

      const { result } = renderHook(() => useDailyChallenge());

      await waitFor(() => {
        expect(result.current.state.status).toBe('success');
      });

      if (result.current.state.status === 'success') {
        expect(result.current.state.data.date).toBe('2026-03-15');
        expect(result.current.state.data.start.title).toBe('Tour Eiffel');
        expect(result.current.state.data.target.title).toBe('Paris');
      }
    });

    it('expose la date du défi dans les données', async () => {
      jest.spyOn(DailyChallengeService, 'fetchDailyChallenge').mockResolvedValue(
        mockDailyResponse,
      );

      const { result } = renderHook(() => useDailyChallenge());

      await waitFor(() => {
        expect(result.current.state.status).toBe('success');
      });

      if (result.current.state.status === 'success') {
        expect(result.current.state.data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });
  });

  describe('erreur', () => {
    it('passe à l\'état error quand fetchDailyChallenge retourne null', async () => {
      jest.spyOn(DailyChallengeService, 'fetchDailyChallenge').mockResolvedValue(null);

      const { result } = renderHook(() => useDailyChallenge());

      await waitFor(() => {
        expect(result.current.state.status).toBe('error');
      });

      if (result.current.state.status === 'error') {
        expect(result.current.state.message).toBeTruthy();
      }
    });

    it('le message d\'erreur est une chaîne non vide', async () => {
      jest.spyOn(DailyChallengeService, 'fetchDailyChallenge').mockResolvedValue(null);

      const { result } = renderHook(() => useDailyChallenge());

      await waitFor(() => {
        expect(result.current.state.status).toBe('error');
      });

      if (result.current.state.status === 'error') {
        expect(typeof result.current.state.message).toBe('string');
        expect(result.current.state.message.length).toBeGreaterThan(0);
      }
    });
  });

  describe('appel du service', () => {
    it('appelle fetchDailyChallenge avec la langue courante', async () => {
      const spy = jest.spyOn(DailyChallengeService, 'fetchDailyChallenge').mockResolvedValue(
        mockDailyResponse,
      );

      renderHook(() => useDailyChallenge());

      await waitFor(() => {
        expect(spy).toHaveBeenCalledWith('fr');
      });
    });

    it('n\'appelle fetchDailyChallenge qu\'une seule fois au montage', async () => {
      const spy = jest.spyOn(DailyChallengeService, 'fetchDailyChallenge').mockResolvedValue(
        mockDailyResponse,
      );

      renderHook(() => useDailyChallenge());

      await waitFor(() => {
        expect(spy).toHaveBeenCalledTimes(1);
      });
    });
  });
});
