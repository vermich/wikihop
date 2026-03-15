/**
 * Tests — MultiplayerRoundTransitionScreen.tsx (F3-28, F3-32)
 *
 * Architecture F3-32 :
 *   - Lit la paire depuis allPairs[currentRound] du store (plus de useRandomPair)
 *   - Transition quasi-instantanée — un seul rendu spinner + texte manche
 *   - Cas défensif : allPairs[currentRound] === undefined → navigate MultiplayerResult
 *
 * Couvre :
 *   - Affichage loading : ActivityIndicator + texte manche courante/totale
 *   - Transition automatique : startNextRound, clearSession, startSession, replace PassPhone
 *   - Fallback si allPairs[currentRound] undefined → navigate MultiplayerResult
 *
 * Stratégie de mock :
 *   - useMultiplayerStore mocké (allPairs, currentRound, roundCount, players, startNextRound)
 *   - useGameStore mocké (clearSession, startSession)
 *   - navigation mocké manuellement
 */

import { act, render, waitFor } from '@testing-library/react-native';
import type { Article } from '@wikihop/shared';
import React from 'react';

import { MultiplayerRoundTransitionScreen } from '../../src/screens/MultiplayerRoundTransitionScreen';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks stores
// ─────────────────────────────────────────────────────────────────────────────

const mockStartNextRound = jest.fn();
const mockClearSession = jest.fn().mockResolvedValue(undefined);
const mockStartSession = jest.fn().mockResolvedValue(undefined);

const mockPlayers = [
  { name: 'Alice', status: 'waiting' as const, jumps: null, durationMs: null, won: false },
  { name: 'Bob', status: 'waiting' as const, jumps: null, durationMs: null, won: false },
];

// Paires préchargées : allPairs[0] = manche 1, allPairs[1] = manche 2
const mockAllPairs: Array<{ start: Article; target: Article }> = [
  {
    start: { id: '1', title: 'Paris', url: 'https://fr.wikipedia.org/wiki/Paris', language: 'fr' },
    target: { id: '2', title: 'Rome', url: 'https://fr.wikipedia.org/wiki/Rome', language: 'fr' },
  },
  {
    start: { id: '3', title: 'Berlin', url: 'https://fr.wikipedia.org/wiki/Berlin', language: 'fr' },
    target: { id: '4', title: 'Munich', url: 'https://fr.wikipedia.org/wiki/Munich', language: 'fr' },
  },
];

// currentRound = 1 → allPairs[1] = manche 2 (prochaine manche)
let mockCurrentRound = 1;
let mockAllPairsValue: Array<{ start: Article; target: Article }> = mockAllPairs;

jest.mock('../../src/store/multiplayer.store', () => ({
  useMultiplayerStore: jest.fn((selector: (state: {
    allPairs: typeof mockAllPairsValue;
    currentRound: number;
    roundCount: number;
    players: typeof mockPlayers;
    startNextRound: jest.Mock;
  }) => unknown) =>
    selector({
      allPairs: mockAllPairsValue,
      currentRound: mockCurrentRound,
      roundCount: 3,
      players: mockPlayers,
      startNextRound: mockStartNextRound,
    }),
  ),
}));

jest.mock('../../src/store/game.store', () => ({
  useGameStore: jest.fn((selector: (state: {
    clearSession: jest.Mock;
    startSession: jest.Mock;
  }) => unknown) =>
    selector({
      clearSession: mockClearSession,
      startSession: mockStartSession,
    }),
  ),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Mock navigation
// ─────────────────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  replace: mockReplace,
  goBack: jest.fn(),
  push: jest.fn(),
  reset: jest.fn(),
  canGoBack: jest.fn(() => false),
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function renderScreen(): ReturnType<typeof render> {
  return render(
    <MultiplayerRoundTransitionScreen
      navigation={mockNavigation as never}
      route={{
        key: 'MultiplayerRoundTransition',
        name: 'MultiplayerRoundTransition',
        params: undefined,
      } as never}
    />,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockCurrentRound = 1;
  mockAllPairsValue = mockAllPairs;
  mockClearSession.mockResolvedValue(undefined);
  mockStartSession.mockResolvedValue(undefined);
});

// ─────────────────────────────────────────────────────────────────────────────
// Affichage spinner (rendu initial)
// ─────────────────────────────────────────────────────────────────────────────

describe('MultiplayerRoundTransitionScreen — affichage', () => {
  it('affiche un ActivityIndicator', async () => {
    const { UNSAFE_queryByProps } = renderScreen();
    await act(async () => { await Promise.resolve(); });
    const indicator = UNSAFE_queryByProps({ color: '#2563EB' });
    expect(indicator).toBeTruthy();
  });

  it('affiche le texte de chargement avec manche courante et totale', async () => {
    mockCurrentRound = 1;
    const { getByText } = renderScreen();
    await act(async () => { await Promise.resolve(); });
    expect(getByText('Chargement de la manche 1/3...')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Transition automatique — allPairs[currentRound] disponible
// ─────────────────────────────────────────────────────────────────────────────

describe('MultiplayerRoundTransitionScreen — transition automatique', () => {
  it('appelle startNextRound avec la paire allPairs[currentRound]', async () => {
    // currentRound = 1 → allPairs[1] = Berlin → Munich
    mockCurrentRound = 1;
    renderScreen();

    await waitFor(() => {
      expect(mockStartNextRound).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Berlin' }) as Article,
        expect.objectContaining({ title: 'Munich' }) as Article,
      );
    });
  });

  it('appelle clearSession et startSession avec la paire préchargée', async () => {
    mockCurrentRound = 1;
    renderScreen();

    await waitFor(() => {
      expect(mockClearSession).toHaveBeenCalled();
      expect(mockStartSession).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Berlin' }),
        expect.objectContaining({ title: 'Munich' }),
        { isMultiplayer: true },
      );
    });
  });

  it('navigue vers PassPhone (replace) avec le nom du premier joueur', async () => {
    mockCurrentRound = 1;
    renderScreen();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('PassPhone', { playerName: 'Alice' });
    });
  });

  it('utilise navigation.replace (pas navigate) pour ne pas empiler l\'écran', async () => {
    mockCurrentRound = 1;
    renderScreen();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalledWith('PassPhone', expect.anything());
    });
  });

  it('utilise la paire de la manche 0 si currentRound = 0', async () => {
    // Cas manche 1 → currentRound=0 → allPairs[0] = Paris → Rome
    mockCurrentRound = 0;
    renderScreen();

    await waitFor(() => {
      expect(mockStartNextRound).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Paris' }),
        expect.objectContaining({ title: 'Rome' }),
      );
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Fallback — allPairs[currentRound] undefined
// ─────────────────────────────────────────────────────────────────────────────

describe('MultiplayerRoundTransitionScreen — fallback défensif', () => {
  it('navigue vers MultiplayerResult si allPairs[currentRound] est undefined', async () => {
    // allPairs n'a que 2 entrées (index 0 et 1), currentRound = 5 → undefined
    mockCurrentRound = 5;
    mockAllPairsValue = mockAllPairs; // seulement 2 entrées

    renderScreen();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('MultiplayerResult');
    });

    // startNextRound ne doit PAS être appelé
    expect(mockStartNextRound).not.toHaveBeenCalled();
  });

  it('ne lance pas de transition si allPairs est vide', async () => {
    mockAllPairsValue = [];
    mockCurrentRound = 0;

    renderScreen();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('MultiplayerResult');
    });
  });
});
