/**
 * useGameTimer Tests — WikiHop Mobile — Wave 3 (M-05)
 *
 * Teste le hook useGameTimer :
 *   - Retourne "00:00" quand currentSession est null
 *   - Retourne "00:00" quand status !== 'in_progress'
 *   - Calcule correctement le temps écoulé
 *   - Nettoie l'intervalle au démontage
 *
 * Utilise jest.useFakeTimers() pour contrôler setInterval.
 *
 * ADR-003 : React Native Testing Library pour les tests
 */

import { renderHook, act } from '@testing-library/react-native';

import { useGameStore } from '../src/store/game.store';
import { formatSeconds, useGameTimer } from '../src/hooks/useGameTimer';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeInProgressSession(startedAt: Date) {
  return {
    id: 'test-session-id',
    startArticle: { id: '1', title: 'Start', url: 'https://fr.wikipedia.org/wiki/Start', language: 'fr' as const },
    targetArticle: { id: '2', title: 'Target', url: 'https://fr.wikipedia.org/wiki/Target', language: 'fr' as const },
    path: [{ id: '1', title: 'Start', url: 'https://fr.wikipedia.org/wiki/Start', language: 'fr' as const }],
    jumps: 0,
    startedAt,
    status: 'in_progress' as const,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests formatSeconds (pure function)
// ─────────────────────────────────────────────────────────────────────────────

describe('formatSeconds', () => {
  it('retourne "00:00" pour 0 secondes', () => {
    expect(formatSeconds(0)).toBe('00:00');
  });

  it('retourne "00:59" pour 59 secondes', () => {
    expect(formatSeconds(59)).toBe('00:59');
  });

  it('retourne "01:00" pour 60 secondes', () => {
    expect(formatSeconds(60)).toBe('01:00');
  });

  it('retourne "01:01" pour 61 secondes', () => {
    expect(formatSeconds(61)).toBe('01:01');
  });

  it('retourne "60:00" pour 3600 secondes', () => {
    expect(formatSeconds(3600)).toBe('60:00');
  });

  it('retourne "10:30" pour 630 secondes', () => {
    expect(formatSeconds(630)).toBe('10:30');
  });

  it('retourne "00:01" pour 1 seconde', () => {
    expect(formatSeconds(1)).toBe('00:01');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests useGameTimer
// ─────────────────────────────────────────────────────────────────────────────

describe('useGameTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Réinitialiser le store entre les tests
    useGameStore.setState({ currentSession: null, isHydrated: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('retourne "00:00" et 0 quand currentSession est null', () => {
    const { result } = renderHook(() => useGameTimer());
    expect(result.current.formattedTime).toBe('00:00');
    expect(result.current.elapsedSeconds).toBe(0);
  });

  it('retourne "00:00" et 0 quand status est "won"', () => {
    const session = {
      ...makeInProgressSession(new Date()),
      status: 'won' as const,
    };
    useGameStore.setState({ currentSession: session });

    const { result } = renderHook(() => useGameTimer());
    expect(result.current.formattedTime).toBe('00:00');
    expect(result.current.elapsedSeconds).toBe(0);
  });

  it('retourne "00:00" et 0 quand status est "abandoned"', () => {
    const session = {
      ...makeInProgressSession(new Date()),
      status: 'abandoned' as const,
    };
    useGameStore.setState({ currentSession: session });

    const { result } = renderHook(() => useGameTimer());
    expect(result.current.formattedTime).toBe('00:00');
    expect(result.current.elapsedSeconds).toBe(0);
  });

  it('calcule le temps écoulé depuis startedAt au montage', () => {
    // Session démarrée il y a 30 secondes
    const startedAt = new Date(Date.now() - 30_000);
    const session = makeInProgressSession(startedAt);
    useGameStore.setState({ currentSession: session });

    const { result } = renderHook(() => useGameTimer());
    // Au montage, le calcul initial doit donner ~30 secondes
    expect(result.current.elapsedSeconds).toBeGreaterThanOrEqual(30);
    expect(result.current.formattedTime).toBe('00:30');
  });

  it('incrémente le compteur après avance du temps', () => {
    const startedAt = new Date(Date.now());
    const session = makeInProgressSession(startedAt);
    useGameStore.setState({ currentSession: session });

    const { result } = renderHook(() => useGameTimer());
    expect(result.current.elapsedSeconds).toBe(0);

    act(() => {
      jest.advanceTimersByTime(5_000);
    });

    expect(result.current.elapsedSeconds).toBe(5);
    expect(result.current.formattedTime).toBe('00:05');
  });

  it('incrémente correctement sur plusieurs secondes', () => {
    const startedAt = new Date(Date.now());
    const session = makeInProgressSession(startedAt);
    useGameStore.setState({ currentSession: session });

    const { result } = renderHook(() => useGameTimer());

    act(() => {
      jest.advanceTimersByTime(65_000);
    });

    expect(result.current.elapsedSeconds).toBe(65);
    expect(result.current.formattedTime).toBe('01:05');
  });

  it('remet à 0 si la session passe à null', () => {
    const startedAt = new Date(Date.now());
    const session = makeInProgressSession(startedAt);
    useGameStore.setState({ currentSession: session });

    const { result } = renderHook(() => useGameTimer());

    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    expect(result.current.elapsedSeconds).toBe(10);

    act(() => {
      useGameStore.setState({ currentSession: null });
    });

    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.formattedTime).toBe('00:00');
  });

  it('nettoie l\'intervalle au démontage (pas de setState après démontage)', () => {
    const startedAt = new Date(Date.now());
    const session = makeInProgressSession(startedAt);
    useGameStore.setState({ currentSession: session });

    const { unmount } = renderHook(() => useGameTimer());

    // Démonter le hook
    unmount();

    // Avancer le temps après le démontage — ne doit pas provoquer d'erreur
    expect(() => {
      act(() => {
        jest.advanceTimersByTime(5_000);
      });
    }).not.toThrow();
  });
});
