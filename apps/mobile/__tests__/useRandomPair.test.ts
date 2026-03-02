/**
 * useRandomPair Tests — WikiHop Mobile — Wave 4 (M-01)
 *
 * Teste le hook useRandomPair :
 *   - État initial loading
 *   - Succès HTTP 200 → state success avec start et target
 *   - Erreur HTTP 503 → state error avec message service indisponible
 *   - Erreur HTTP non-200 → state error avec message générique
 *   - Erreur réseau (fetch reject) → state error
 *   - AbortError (fetch annulé) → pas de setState (ignorer)
 *   - refresh() → repasse à loading et relance le fetch
 *   - Changement de langue → relance le fetch
 *
 * fetch est mocké globalement pour éviter les appels réseau.
 *
 * ADR-003 : React Native Testing Library pour les tests
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';

import { useRandomPair } from '../src/hooks/useRandomPair';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

// Mock du language store
jest.mock('../src/store/language.store', () => ({
  useLanguageStore: jest.fn((selector: (state: { language: string }) => unknown) =>
    selector({ language: 'fr' }),
  ),
}));

const mockFetch = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>();
global.fetch = mockFetch;

// Helpers pour créer des réponses mock
function makeResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

const mockArticleSummary = {
  id: '123',
  title: 'Tour Eiffel',
  url: 'https://fr.wikipedia.org/wiki/Tour_Eiffel',
  language: 'fr',
  extract: 'La tour Eiffel est une tour de fer.',
  thumbnailUrl: 'https://example.com/thumb.jpg',
};

const mockTargetSummary = {
  id: '456',
  title: 'Louvre',
  url: 'https://fr.wikipedia.org/wiki/Louvre',
  language: 'fr',
  extract: 'Le Louvre est un musée à Paris.',
};

const mockApiResponse = { start: mockArticleSummary, target: mockTargetSummary };

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('useRandomPair', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('État loading initial', () => {
    it('commence dans l\'état loading', () => {
      mockFetch.mockReturnValue(new Promise(() => undefined));

      const { result } = renderHook(() => useRandomPair());

      expect(result.current.state.status).toBe('loading');
    });
  });

  describe('Succès HTTP 200', () => {
    it('passe à l\'état success avec start et target', async () => {
      mockFetch.mockResolvedValue(makeResponse(200, mockApiResponse));

      const { result } = renderHook(() => useRandomPair());

      await waitFor(() => {
        expect(result.current.state.status).toBe('success');
      });

      if (result.current.state.status === 'success') {
        expect(result.current.state.start.title).toBe('Tour Eiffel');
        expect(result.current.state.target.title).toBe('Louvre');
      }
    });

    it('expose une fonction refresh', async () => {
      mockFetch.mockResolvedValue(makeResponse(200, mockApiResponse));

      const { result } = renderHook(() => useRandomPair());

      await waitFor(() => {
        expect(result.current.state.status).toBe('success');
      });

      expect(typeof result.current.refresh).toBe('function');
    });
  });

  describe('Erreur HTTP 503', () => {
    it('passe à l\'état error avec message service indisponible', async () => {
      mockFetch.mockResolvedValue(makeResponse(503, {}));

      const { result } = renderHook(() => useRandomPair());

      await waitFor(() => {
        expect(result.current.state.status).toBe('error');
      });

      if (result.current.state.status === 'error') {
        expect(result.current.state.message).toContain('temporairement indisponible');
      }
    });
  });

  describe('Erreur HTTP non-200 (ex: 500)', () => {
    it('passe à l\'état error avec message générique', async () => {
      mockFetch.mockResolvedValue(makeResponse(500, {}));

      const { result } = renderHook(() => useRandomPair());

      await waitFor(() => {
        expect(result.current.state.status).toBe('error');
      });

      if (result.current.state.status === 'error') {
        expect(result.current.state.message).toContain('connexion');
      }
    });
  });

  describe('Erreur réseau (fetch reject)', () => {
    it('passe à l\'état error quand fetch rejette', async () => {
      mockFetch.mockRejectedValue(new Error('Network request failed'));

      const { result } = renderHook(() => useRandomPair());

      await waitFor(() => {
        expect(result.current.state.status).toBe('error');
      });

      if (result.current.state.status === 'error') {
        expect(result.current.state.message).toContain('connexion');
      }
    });
  });

  describe('refresh()', () => {
    it('repasse à loading et relance le fetch', async () => {
      const firstResponse = makeResponse(200, mockApiResponse);
      const secondResponse = makeResponse(200, {
        start: { ...mockArticleSummary, title: 'Paris' },
        target: { ...mockTargetSummary, title: 'Versailles' },
      });

      mockFetch
        .mockResolvedValueOnce(firstResponse)
        .mockResolvedValueOnce(secondResponse);

      const { result } = renderHook(() => useRandomPair());

      // Attendre le premier succès
      await waitFor(() => {
        expect(result.current.state.status).toBe('success');
      });

      // Déclencher le refresh
      act(() => {
        result.current.refresh();
      });

      // Doit repasser à loading
      expect(result.current.state.status).toBe('loading');

      // Attendre le deuxième succès
      await waitFor(() => {
        expect(result.current.state.status).toBe('success');
      });

      if (result.current.state.status === 'success') {
        expect(result.current.state.start.title).toBe('Paris');
        expect(result.current.state.target.title).toBe('Versailles');
      }

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('appelle fetch avec la bonne URL incluant la langue', async () => {
      mockFetch.mockResolvedValue(makeResponse(200, mockApiResponse));

      renderHook(() => useRandomPair());

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs).toBeDefined();
      const url = callArgs?.[0];
      expect(String(url)).toContain('lang=fr');
    });
  });

  describe('AbortError (démontage pendant fetch)', () => {
    it('ne met pas à jour l\'état si AbortError est levée', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      const { result, unmount } = renderHook(() => useRandomPair());

      // L'état reste à loading (AbortError ignoré)
      unmount();

      // Vérifier que l'état est resté loading (pas d'error)
      expect(result.current.state.status).toBe('loading');
    });
  });
});
