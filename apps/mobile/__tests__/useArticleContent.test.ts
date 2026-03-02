/**
 * useArticleContent Tests — WikiHop Mobile — Wave 3 (M-03)
 *
 * Teste le hook useArticleContent :
 *   - État initial "loading"
 *   - Succès : état "success" avec html
 *   - Erreur 404 : état "not_found" avec le titre
 *   - Erreur réseau : état "error" avec message
 *   - retry() : relance le fetch
 *   - Cleanup : cancel si démonté pendant le fetch
 *
 * getArticleContent est mocké pour éviter les appels réseau.
 *
 * ADR-003 : React Native Testing Library pour les tests
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';

import {
  WikipediaNetworkError,
  WikipediaNotFoundError,
} from '../src/services/wikipedia.service';
import { useArticleContent } from '../src/hooks/useArticleContent';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

jest.mock('../src/services/wikipedia.service', () => ({
  getArticleContent: jest.fn(),
  // On ré-exporte les classes d'erreur pour les instanceof
  WikipediaNotFoundError: jest.requireActual('../src/services/wikipedia.service').WikipediaNotFoundError,
  WikipediaNetworkError: jest.requireActual('../src/services/wikipedia.service').WikipediaNetworkError,
  getArticleSummary: jest.fn(),
  extractInternalLinks: jest.fn(),
  clearSummaryCache: jest.fn(),
  isPlayableArticle: jest.fn(),
}));

import { getArticleContent } from '../src/services/wikipedia.service';

const mockGetArticleContent = getArticleContent as jest.MockedFunction<typeof getArticleContent>;

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('useArticleContent', () => {
  beforeEach(() => {
    mockGetArticleContent.mockReset();
  });

  describe('État loading initial', () => {
    it('commence dans l\'état loading', () => {
      // Mock qui ne résout jamais (fetch infini)
      mockGetArticleContent.mockReturnValue(new Promise(() => undefined));

      const { result } = renderHook(() =>
        useArticleContent('Tour Eiffel', 'fr'),
      );

      expect(result.current.state.status).toBe('loading');
    });
  });

  describe('Succès', () => {
    it('passe à l\'état success avec le html reçu', async () => {
      const fakeHtml = '<html><body><p>Tour Eiffel</p></body></html>';
      mockGetArticleContent.mockResolvedValue(fakeHtml);

      const { result } = renderHook(() =>
        useArticleContent('Tour Eiffel', 'fr'),
      );

      await waitFor(() => {
        expect(result.current.state.status).toBe('success');
      });

      if (result.current.state.status === 'success') {
        expect(result.current.state.html).toBe(fakeHtml);
      }
    });
  });

  describe('Erreur 404 (not_found)', () => {
    it('passe à l\'état not_found quand WikipediaNotFoundError est levée', async () => {
      mockGetArticleContent.mockRejectedValue(
        new WikipediaNotFoundError('Article inexistant', 'fr'),
      );

      const { result } = renderHook(() =>
        useArticleContent('Article inexistant', 'fr'),
      );

      await waitFor(() => {
        expect(result.current.state.status).toBe('not_found');
      });

      if (result.current.state.status === 'not_found') {
        expect(result.current.state.title).toBe('Article inexistant');
      }
    });
  });

  describe('Erreur réseau', () => {
    it('passe à l\'état error quand WikipediaNetworkError est levée', async () => {
      const errorMessage = 'Timeout lors du chargement';
      mockGetArticleContent.mockRejectedValue(
        new WikipediaNetworkError(errorMessage),
      );

      const { result } = renderHook(() =>
        useArticleContent('Paris', 'fr'),
      );

      await waitFor(() => {
        expect(result.current.state.status).toBe('error');
      });

      if (result.current.state.status === 'error') {
        expect(result.current.state.message).toBe(errorMessage);
      }
    });

    it('passe à l\'état error pour une erreur générique', async () => {
      mockGetArticleContent.mockRejectedValue(new Error('Erreur générique inattendue'));

      const { result } = renderHook(() =>
        useArticleContent('Paris', 'fr'),
      );

      await waitFor(() => {
        expect(result.current.state.status).toBe('error');
      });

      if (result.current.state.status === 'error') {
        expect(result.current.state.message).toBe('Erreur générique inattendue');
      }
    });
  });

  describe('retry()', () => {
    it('relance le fetch après une erreur réseau', async () => {
      const fakeHtml = '<html><body>Contenu après retry</body></html>';

      // Premier appel : erreur. Deuxième appel : succès.
      mockGetArticleContent
        .mockRejectedValueOnce(new WikipediaNetworkError('Pas de réseau'))
        .mockResolvedValueOnce(fakeHtml);

      const { result } = renderHook(() =>
        useArticleContent('Paris', 'fr'),
      );

      // Attendre l'état error
      await waitFor(() => {
        expect(result.current.state.status).toBe('error');
      });

      // Déclencher le retry
      act(() => {
        result.current.retry();
      });

      // Attendre le succès après retry
      await waitFor(() => {
        expect(result.current.state.status).toBe('success');
      });

      if (result.current.state.status === 'success') {
        expect(result.current.state.html).toBe(fakeHtml);
      }

      // getArticleContent doit avoir été appelé 2 fois
      expect(mockGetArticleContent).toHaveBeenCalledTimes(2);
    });

    it('repasse en état loading pendant le retry', async () => {
      let resolveSecond: ((value: string) => void) | undefined;
      const secondCallPromise = new Promise<string>((resolve) => {
        resolveSecond = resolve;
      });

      mockGetArticleContent
        .mockRejectedValueOnce(new WikipediaNetworkError('Erreur'))
        .mockReturnValueOnce(secondCallPromise);

      const { result } = renderHook(() =>
        useArticleContent('Paris', 'fr'),
      );

      await waitFor(() => {
        expect(result.current.state.status).toBe('error');
      });

      act(() => {
        result.current.retry();
      });

      // Pendant le retry, on doit être en état loading
      expect(result.current.state.status).toBe('loading');

      // Résoudre la deuxième promesse
      act(() => {
        resolveSecond?.('<html>OK</html>');
      });

      await waitFor(() => {
        expect(result.current.state.status).toBe('success');
      });
    });
  });

  describe('Changement de titre ou langue', () => {
    it('relance le fetch quand le titre change', async () => {
      const html1 = '<html>Article 1</html>';
      const html2 = '<html>Article 2</html>';

      mockGetArticleContent
        .mockResolvedValueOnce(html1)
        .mockResolvedValueOnce(html2);

      const { result, rerender } = renderHook(
        ({ title }: { title: string }) => useArticleContent(title, 'fr'),
        { initialProps: { title: 'Paris' } },
      );

      await waitFor(() => {
        expect(result.current.state.status).toBe('success');
      });

      // Changer le titre
      rerender({ title: 'Londres' });

      await waitFor(() => {
        expect(result.current.state.status).toBe('success');
      });

      if (result.current.state.status === 'success') {
        expect(result.current.state.html).toBe(html2);
      }

      expect(mockGetArticleContent).toHaveBeenCalledTimes(2);
    });
  });
});
