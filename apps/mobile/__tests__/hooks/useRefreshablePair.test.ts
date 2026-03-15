/**
 * Tests TDD — useRefreshablePair (F3-32)
 *
 * TDD strict : ce fichier est committé AVANT l'implémentation.
 * Les tests doivent être rouges au moment du premier commit.
 *
 * Cas couverts :
 *   1. Au montage : state initial 'loading', puis 'success' après fetch réussi
 *   2. refresh() : remet le state à 'loading' et relance le fetch
 *   3. Deux appels refresh() rapides : seul le dernier fetch aboutit (AbortController)
 *   4. Fetch retourne HTTP 503 : state 'error' avec message "Service temporairement indisponible"
 *   5. Fetch retourne autre erreur HTTP : state 'error' avec message générique
 *   6. Démontage pendant fetch : pas de setState (AbortError ignoré)
 */

import { act, renderHook } from '@testing-library/react-native';

import { useRefreshablePair } from '../../src/hooks/useRefreshablePair';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

// Mock du store de langue
jest.mock('../../src/store/language.store', () => ({
  useLanguageStore: jest.fn((selector: (s: { language: string }) => unknown) =>
    selector({ language: 'fr' }),
  ),
}));

// Données de réponse mock
const mockStart = {
  id: 'start-id',
  title: 'Article Départ',
  url: 'https://fr.m.wikipedia.org/wiki/Article_D%C3%A9part',
  language: 'fr',
  extract: 'Extrait de départ',
};

const mockTarget = {
  id: 'target-id',
  title: 'Article Cible',
  url: 'https://fr.m.wikipedia.org/wiki/Article_Cible',
  language: 'fr',
  extract: 'Extrait de cible',
};

const mockSuccessResponse = { start: mockStart, target: mockTarget };

// ─────────────────────────────────────────────────────────────────────────────
// Setup / Teardown
// ─────────────────────────────────────────────────────────────────────────────

let fetchSpy: jest.SpyInstance;

beforeEach(() => {
  fetchSpy = jest.spyOn(global, 'fetch');
});

afterEach(() => {
  fetchSpy.mockRestore();
  jest.clearAllTimers();
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('useRefreshablePair', () => {
  it('cas 1 — state initial loading, puis success après fetch réussi', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockSuccessResponse,
    } as Response);

    const { result } = renderHook(() => useRefreshablePair());

    // État initial : loading
    expect(result.current.state.status).toBe('loading');

    // Attendre la résolution du fetch
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.state.status).toBe('success');
    if (result.current.state.status !== 'success') return;
    expect(result.current.state.start.title).toBe('Article Départ');
    expect(result.current.state.target.title).toBe('Article Cible');
  });

  it('cas 2 — refresh() remet state à loading et relance le fetch', async () => {
    // Premier fetch : succès
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockSuccessResponse,
    } as Response);

    const { result } = renderHook(() => useRefreshablePair());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.state.status).toBe('success');

    // Deuxième fetch : nouveau succès
    const mockStart2 = { ...mockStart, title: 'Nouveau Départ' };
    const mockTarget2 = { ...mockTarget, title: 'Nouvelle Cible' };
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ start: mockStart2, target: mockTarget2 }),
    } as Response);

    // Appel refresh
    act(() => {
      result.current.refresh();
    });

    // Doit repassser en loading immédiatement
    expect(result.current.state.status).toBe('loading');

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.state.status).toBe('success');
    if (result.current.state.status !== 'success') return;
    expect(result.current.state.start.title).toBe('Nouveau Départ');
  });

  it('cas 3 — deux refresh() rapides : seul le dernier aboutit (fetch précédent annulé)', async () => {
    // Trois fetches : montage + deux refresh rapides
    // Le premier refresh sera annulé par le second
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSuccessResponse,
      } as Response)
      .mockImplementationOnce(
        (_url: string, options: { signal?: AbortSignal }) =>
          new Promise<Response>((_resolve, reject) => {
            // Simuler une requête annulable
            const signal = options?.signal;
            if (signal !== undefined) {
              signal.addEventListener('abort', () => {
                reject(new DOMException('Aborted', 'AbortError'));
              });
            }
          }),
      )
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          start: { ...mockStart, title: 'Dernier Départ' },
          target: { ...mockTarget, title: 'Dernière Cible' },
        }),
      } as Response);

    const { result } = renderHook(() => useRefreshablePair());

    // Attendre le montage
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.state.status).toBe('success');

    // Deux refresh rapides
    act(() => {
      result.current.refresh();
    });
    act(() => {
      result.current.refresh();
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // Le state final doit correspondre au dernier fetch
    expect(result.current.state.status).toBe('success');
    if (result.current.state.status !== 'success') return;
    expect(result.current.state.start.title).toBe('Dernier Départ');
  });

  it('cas 4 — HTTP 503 : state error avec message "Service temporairement indisponible"', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({}),
    } as Response);

    const { result } = renderHook(() => useRefreshablePair());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.state.status).toBe('error');
    if (result.current.state.status !== 'error') return;
    expect(result.current.state.message).toContain('Service temporairement indisponible');
  });

  it('cas 5 — autre erreur HTTP (ex: 500) : state error avec message générique', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);

    const { result } = renderHook(() => useRefreshablePair());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.state.status).toBe('error');
    if (result.current.state.status !== 'error') return;
    // Le message générique doit contenir "connexion" ou "Erreur"
    expect(result.current.state.message.length).toBeGreaterThan(0);
  });

  it('cas 6 — démontage pendant fetch : pas de setState, AbortError ignoré', async () => {
    // Fetch qui ne se résout jamais sauf si annulé
    fetchSpy.mockImplementationOnce(
      (_url: string, options: { signal?: AbortSignal }) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = options?.signal;
          if (signal !== undefined) {
            signal.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }
        }),
    );

    const { result, unmount } = renderHook(() => useRefreshablePair());

    // Toujours loading pendant le fetch
    expect(result.current.state.status).toBe('loading');

    // Démonter le composant — doit annuler le fetch sans erreur
    act(() => {
      unmount();
    });

    // Pas d'erreur "setState on unmounted component"
    // Le state reste loading (aucun setState appelé après unmount)
    expect(result.current.state.status).toBe('loading');
  });
});
