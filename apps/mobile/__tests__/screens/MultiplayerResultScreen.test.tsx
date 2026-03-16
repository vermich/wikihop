/**
 * Tests — MultiplayerResultScreen.tsx (F3-12, F3-29)
 *
 * Couvre :
 *   - Rendu de base : header, paire jouée, classement
 *   - Section "PAR MANCHE" : absente si roundHistory.length <= 1
 *   - Égalité : deux joueurs avec le même rang de victoires
 *   - Bouton "Rejouer" : disabled si pairState.status !== 'success'
 *   - Bouton "Retour à l'accueil" : appelle resetSession + navigation.reset
 *
 * Stratégie de mock :
 *   - useMultiplayerStore mocké avec jest.fn() sélecteur
 *   - useGameStore mocké
 *   - useRandomPair mocké
 *   - navigation mocké manuellement
 */

import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import type { Article } from '@wikihop/shared';
import React from 'react';

import { MultiplayerResultScreen } from '../../src/screens/MultiplayerResultScreen';
import type { MultiplayerRoundResult } from '../../src/store/multiplayer.store';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks stores
// ─────────────────────────────────────────────────────────────────────────────

const mockResetSession = jest.fn();
const mockRestartSession = jest.fn();
const mockClearSession = jest.fn().mockResolvedValue(undefined);
const mockStartSession = jest.fn().mockResolvedValue(undefined);

const ARTICLE_PARIS: Article = {
  id: '1',
  title: 'Paris',
  url: 'https://fr.wikipedia.org/wiki/Paris',
  language: 'fr',
};

const ARTICLE_ROME: Article = {
  id: '2',
  title: 'Rome',
  url: 'https://fr.wikipedia.org/wiki/Rome',
  language: 'fr',
};

// État par défaut du store multijoueur
let mockPlayers = [
  { name: 'Alice', status: 'done' as const, jumps: 3, durationMs: 45000, won: true },
  { name: 'Bob', status: 'done' as const, jumps: 5, durationMs: 60000, won: false },
];
let mockRoundHistory: MultiplayerRoundResult[][] = [];
let mockStartArticle: Article | null = ARTICLE_PARIS;
let mockTargetArticle: Article | null = ARTICLE_ROME;

jest.mock('../../src/store/multiplayer.store', () => ({
  useMultiplayerStore: jest.fn((selector: (state: {
    players: typeof mockPlayers;
    roundHistory: MultiplayerRoundResult[][];
    startArticle: Article | null;
    targetArticle: Article | null;
    resetSession: jest.Mock;
    restartSession: jest.Mock;
  }) => unknown) =>
    selector({
      players: mockPlayers,
      roundHistory: mockRoundHistory,
      startArticle: mockStartArticle,
      targetArticle: mockTargetArticle,
      resetSession: mockResetSession,
      restartSession: mockRestartSession,
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
// Mock useRandomPair
// ─────────────────────────────────────────────────────────────────────────────

type PairStatus = 'loading' | 'success' | 'error';

let mockPairStatus: PairStatus = 'success';
const mockPairStart = {
  id: '10',
  title: 'Berlin',
  url: 'https://fr.wikipedia.org/wiki/Berlin',
  language: 'fr' as const,
  extract: 'Capitale de l\'Allemagne',
};
const mockPairTarget = {
  id: '11',
  title: 'Munich',
  url: 'https://fr.wikipedia.org/wiki/Munich',
  language: 'fr' as const,
  extract: 'Ville de Bavière',
};

jest.mock('../../src/hooks/useRandomPair', () => ({
  useRandomPair: jest.fn(() => {
    if (mockPairStatus === 'success') {
      return {
        state: { status: 'success', start: mockPairStart, target: mockPairTarget },
        refresh: jest.fn(),
      };
    }
    if (mockPairStatus === 'loading') {
      return {
        state: { status: 'loading' },
        refresh: jest.fn(),
      };
    }
    return {
      state: { status: 'error', message: 'Erreur réseau' },
      refresh: jest.fn(),
    };
  }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Mock navigation
// ─────────────────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  reset: mockReset,
  goBack: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
  canGoBack: jest.fn(() => false),
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function renderScreen(): ReturnType<typeof render> {
  return render(
    <MultiplayerResultScreen
      navigation={mockNavigation as never}
      route={{ key: 'MultiplayerResult', name: 'MultiplayerResult', params: undefined } as never}
    />,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockPairStatus = 'success';
  mockPlayers = [
    { name: 'Alice', status: 'done', jumps: 3, durationMs: 45000, won: true },
    { name: 'Bob', status: 'done', jumps: 5, durationMs: 60000, won: false },
  ];
  mockRoundHistory = [];
  mockStartArticle = ARTICLE_PARIS;
  mockTargetArticle = ARTICLE_ROME;
  mockClearSession.mockResolvedValue(undefined);
  mockStartSession.mockResolvedValue(undefined);
});

// ─────────────────────────────────────────────────────────────────────────────
// Rendu de base
// ─────────────────────────────────────────────────────────────────────────────

describe('MultiplayerResultScreen — rendu de base', () => {
  it('rend sans crash', () => {
    expect(() => renderScreen()).not.toThrow();
  });

  it('affiche le header "Résultats"', () => {
    const { getByText } = renderScreen();
    expect(getByText('Résultats')).toBeTruthy();
  });

  it('affiche la paire jouée', () => {
    const { getByText } = renderScreen();
    expect(getByText('Paris → Rome')).toBeTruthy();
  });

  it('affiche les noms des joueurs', () => {
    const { getByText } = renderScreen();
    expect(getByText('Alice')).toBeTruthy();
    expect(getByText('Bob')).toBeTruthy();
  });

  it('affiche le bouton Rejouer', () => {
    const { getByText } = renderScreen();
    expect(getByText('Rejouer')).toBeTruthy();
  });

  it('affiche le bouton Retour à l\'accueil', () => {
    const { getByText } = renderScreen();
    expect(getByText("Retour à l'accueil")).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Classement global (sans section PAR MANCHE — roundHistory vide)
// ─────────────────────────────────────────────────────────────────────────────

describe('MultiplayerResultScreen — classement global', () => {
  it('affiche la médaille 🥇 pour le premier joueur', () => {
    // Alice gagne → première place
    const { getAllByText } = renderScreen();
    const medals = getAllByText('🥇');
    expect(medals.length).toBeGreaterThanOrEqual(1);
  });

  it('n\'affiche pas de section PAR MANCHE si roundHistory.length === 0', () => {
    mockRoundHistory = [];
    const { queryByText } = renderScreen();
    expect(queryByText('PAR MANCHE')).toBeNull();
  });

  it('n\'affiche pas de section PAR MANCHE pour une session à 1 manche', () => {
    // Session 1 manche : roundHistory est vide (startNextRound ne flush que les manches précédentes)
    // la seule manche est dans players[]. completeRoundHistory.length === 1 → pas de section PAR MANCHE.
    mockRoundHistory = [];
    const { queryByText } = renderScreen();
    expect(queryByText('PAR MANCHE')).toBeNull();
  });

  it('met à jour le classement selon roundHistory quand roundHistory.length > 1', () => {
    // Avec 2 manches : Alice gagne manche 1, Bob gagne manche 2 → égalité 1 victoire chacun
    // Le classement global doit afficher les deux joueurs avec leur score
    mockRoundHistory = [
      [
        { jumps: 3, durationMs: 45000, won: true },
        { jumps: 5, durationMs: 60000, won: false },
      ],
      [
        { jumps: 4, durationMs: 50000, won: false },
        { jumps: 2, durationMs: 30000, won: true },
      ],
    ];
    const { getByText } = renderScreen();
    // Les deux joueurs apparaissent dans le classement
    expect(getByText('Alice')).toBeTruthy();
    expect(getByText('Bob')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Égalité — deux joueurs ex-aequo
// ─────────────────────────────────────────────────────────────────────────────

describe('MultiplayerResultScreen — égalité', () => {
  it('affiche des médailles pour les deux premiers joueurs ex-aequo', () => {
    // Session 1 manche : roundHistory vide, la manche (Alice et Bob gagnent) est dans players[].
    // completeRoundHistory = [lastRoundSnapshot] → Alice 1 victoire, Bob 1 victoire.
    mockPlayers = [
      { name: 'Alice', status: 'done', jumps: 3, durationMs: 45000, won: true },
      { name: 'Bob', status: 'done', jumps: 3, durationMs: 45000, won: true },
    ];
    mockRoundHistory = [];

    // Vérifier que les deux joueurs sont affichés avec leurs noms
    const { getByText } = renderScreen();
    expect(getByText('Alice')).toBeTruthy();
    expect(getByText('Bob')).toBeTruthy();
    // Les deux ont wins > 0 → badge vert (1 victoire chacun)
    const victoriesBadges = renderScreen().getAllByText('1 victoire');
    expect(victoriesBadges.length).toBeGreaterThanOrEqual(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bouton Rejouer — état disabled
// ─────────────────────────────────────────────────────────────────────────────

describe('MultiplayerResultScreen — bouton Rejouer', () => {
  it('est activé (enabled) quand pairState.status === "success"', () => {
    mockPairStatus = 'success';
    const { getByLabelText } = renderScreen();
    const btn = getByLabelText('Rejouer avec les mêmes joueurs');
    expect(btn.props.accessibilityState?.disabled).toBe(false);
  });

  it('est disabled quand pairState.status === "loading"', () => {
    mockPairStatus = 'loading';
    const { getByLabelText } = renderScreen();
    const btn = getByLabelText('Rejouer avec les mêmes joueurs');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
  });

  it('est disabled quand pairState.status === "error"', () => {
    mockPairStatus = 'error';
    const { getByLabelText } = renderScreen();
    const btn = getByLabelText('Rejouer avec les mêmes joueurs');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
  });

  it('appelle clearSession, startSession, et navigate PassPhone au tap (pairState success)', async () => {
    mockPairStatus = 'success';
    const { getByLabelText } = renderScreen();

    await act(async () => {
      fireEvent.press(getByLabelText('Rejouer avec les mêmes joueurs'));
    });

    await waitFor(() => {
      expect(mockRestartSession).toHaveBeenCalled();
      expect(mockClearSession).toHaveBeenCalled();
      expect(mockStartSession).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('PassPhone', { playerName: 'Alice' });
    });
  });

  it('ne fait rien au tap si pairState.status !== "success"', async () => {
    mockPairStatus = 'loading';
    const { getByLabelText } = renderScreen();

    await act(async () => {
      fireEvent.press(getByLabelText('Rejouer avec les mêmes joueurs'));
    });

    expect(mockClearSession).not.toHaveBeenCalled();
    expect(mockStartSession).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bouton Retour à l'accueil
// ─────────────────────────────────────────────────────────────────────────────

describe('MultiplayerResultScreen — bouton Retour à l\'accueil', () => {
  it('appelle resetSession et navigation.reset vers Home', () => {
    const { getByLabelText } = renderScreen();
    fireEvent.press(getByLabelText("Retour à l'accueil"));

    expect(mockResetSession).toHaveBeenCalled();
    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Paire non disponible
// ─────────────────────────────────────────────────────────────────────────────

describe('MultiplayerResultScreen — paire non disponible', () => {
  it('n\'affiche pas la paire si startArticle ou targetArticle est null', () => {
    mockStartArticle = null;
    mockTargetArticle = null;
    const { queryByText } = renderScreen();
    expect(queryByText('Paire jouée :')).toBeNull();
  });
});
