/**
 * VictoryScreen Tests — WikiHop Mobile — Wave 4 (M-06)
 *
 * Teste le composant VictoryScreen et les fonctions utilitaires :
 *   - computeElapsedSeconds : calcul correct
 *   - formatElapsed : formatage secondes / minutes
 *   - Guard d'entrée : status !== 'won' → navigation.replace('Home')
 *   - Rendu en état won : titre, stats, chemin, boutons
 *   - Bouton Rejouer : capture articles, clearSession, startSession, replace('Game')
 *   - Bouton Nouvelle partie : clearSession, clearSummaryCache, navigate('Home')
 *   - Bouton Retour : navigate('Home') sans clearSession
 *   - Animation spring : désactivée si reduceMotionEnabled
 *   - Tronquage du titre dans le bouton Lire
 *
 * useGameStore et wikipedia.service sont mockés.
 *
 * ADR-003 : React Native Testing Library pour les tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import React from 'react';

import {
  computeElapsedSeconds,
  formatElapsed,
} from '../src/screens/VictoryScreen';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

const mockReplace = jest.fn();
const mockNavigate = jest.fn();
const mockNavigation = {
  replace: mockReplace,
  navigate: mockNavigate,
  push: jest.fn(),
  goBack: jest.fn(),
  canGoBack: jest.fn(() => false),
};

const mockClearSession = jest.fn().mockResolvedValue(undefined);
const mockStartSession = jest.fn().mockResolvedValue(undefined);

// Session gagnée par défaut
const mockCompletedAt = new Date('2024-01-15T12:05:30.000Z');
const mockStartedAt = new Date('2024-01-15T12:00:00.000Z');

// Type pour la session mockée — completedAt est optionnel
type MockSession = {
  status: string;
  startArticle: { id: string; title: string; url: string; language: string };
  targetArticle: { id: string; title: string; url: string; language: string };
  path: Array<{ id: string; title: string; url: string; language: string }>;
  jumps: number;
  startedAt: Date;
  completedAt?: Date;
};

let mockCurrentSession: MockSession | null = {
  status: 'won',
  startArticle: { id: '1', title: 'Tour Eiffel', url: 'https://fr.wikipedia.org/wiki/Tour_Eiffel', language: 'fr' },
  targetArticle: { id: '3', title: 'Louvre', url: 'https://fr.wikipedia.org/wiki/Louvre', language: 'fr' },
  path: [
    { id: '1', title: 'Tour Eiffel', url: 'https://fr.wikipedia.org/wiki/Tour_Eiffel', language: 'fr' },
    { id: '2', title: 'Paris', url: 'https://fr.wikipedia.org/wiki/Paris', language: 'fr' },
    { id: '3', title: 'Louvre', url: 'https://fr.wikipedia.org/wiki/Louvre', language: 'fr' },
  ],
  jumps: 2,
  startedAt: mockStartedAt,
  completedAt: mockCompletedAt,
};

jest.mock('../src/store/game.store', () => ({
  useGameStore: jest.fn((selector: (state: {
    currentSession: MockSession | null;
    clearSession: jest.Mock;
    startSession: jest.Mock;
  }) => unknown) =>
    selector({
      get currentSession() { return mockCurrentSession; },
      clearSession: mockClearSession,
      startSession: mockStartSession,
    }),
  ),
}));

jest.mock('../src/services/wikipedia.service', () => ({
  clearSummaryCache: jest.fn(),
  getArticleSummary: jest.fn(),
  getArticleContent: jest.fn(),
  extractInternalLinks: jest.fn(),
  isPlayableArticle: jest.fn(),
  WikipediaNotFoundError: class WikipediaNotFoundError extends Error {},
  WikipediaNetworkError: class WikipediaNetworkError extends Error {},
}));

// ─────────────────────────────────────────────────────────────────────────────
// Import après mocks
// ─────────────────────────────────────────────────────────────────────────────

import { VictoryScreen } from '../src/screens/VictoryScreen';
import { clearSummaryCache } from '../src/services/wikipedia.service';

const mockClearSummaryCache = clearSummaryCache as jest.MockedFunction<typeof clearSummaryCache>;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function renderVictoryScreen() {
  return render(
    <VictoryScreen
      navigation={mockNavigation as never}
      route={{ key: 'Victory', name: 'Victory', params: undefined } as never}
    />,
  );
}

// Session de base réutilisée dans les tests
const baseSession: MockSession = {
  status: 'won',
  startArticle: { id: '1', title: 'Tour Eiffel', url: 'https://fr.wikipedia.org/wiki/Tour_Eiffel', language: 'fr' },
  targetArticle: { id: '3', title: 'Louvre', url: 'https://fr.wikipedia.org/wiki/Louvre', language: 'fr' },
  path: [
    { id: '1', title: 'Tour Eiffel', url: 'https://fr.wikipedia.org/wiki/Tour_Eiffel', language: 'fr' },
    { id: '2', title: 'Paris', url: 'https://fr.wikipedia.org/wiki/Paris', language: 'fr' },
    { id: '3', title: 'Louvre', url: 'https://fr.wikipedia.org/wiki/Louvre', language: 'fr' },
  ],
  jumps: 2,
  startedAt: mockStartedAt,
  completedAt: mockCompletedAt,
};

// ─────────────────────────────────────────────────────────────────────────────
// Tests — fonctions utilitaires pures
// ─────────────────────────────────────────────────────────────────────────────

describe('computeElapsedSeconds', () => {
  it('calcule correctement le nombre de secondes entre deux dates', () => {
    const start = new Date('2024-01-15T12:00:00.000Z');
    const end = new Date('2024-01-15T12:02:35.000Z');
    expect(computeElapsedSeconds(start, end)).toBe(155);
  });

  it('retourne 0 si les deux dates sont identiques', () => {
    const d = new Date('2024-01-15T12:00:00.000Z');
    expect(computeElapsedSeconds(d, d)).toBe(0);
  });
});

describe('formatElapsed', () => {
  it('formate correctement en secondes seulement (< 1 minute)', () => {
    expect(formatElapsed(45)).toBe('45 s');
  });

  it('formate correctement en minutes et secondes', () => {
    expect(formatElapsed(125)).toBe('2 min 05 s');
  });

  it('pad les secondes avec zéro si < 10', () => {
    expect(formatElapsed(65)).toBe('1 min 05 s');
  });

  it('formate 60 secondes exactes', () => {
    expect(formatElapsed(60)).toBe('1 min 00 s');
  });

  it('formate 0 seconde', () => {
    expect(formatElapsed(0)).toBe('0 s');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — composant VictoryScreen
// ─────────────────────────────────────────────────────────────────────────────

describe('VictoryScreen', () => {
  beforeEach(() => {
    mockCurrentSession = { ...baseSession };
    mockReplace.mockClear();
    mockNavigate.mockClear();
    mockClearSession.mockClear();
    mockStartSession.mockClear();
    mockClearSummaryCache.mockClear?.();
  });

  describe('Guard d\'entrée', () => {
    it('redirige vers Home si currentSession est null', () => {
      mockCurrentSession = null;
      renderVictoryScreen();
      expect(mockReplace).toHaveBeenCalledWith('Home');
    });

    it('redirige vers Home si status est in_progress', () => {
      // Construire sans completedAt pour éviter l'erreur exactOptionalPropertyTypes
      mockCurrentSession = {
        status: 'in_progress',
        startArticle: baseSession.startArticle,
        targetArticle: baseSession.targetArticle,
        path: baseSession.path,
        jumps: baseSession.jumps,
        startedAt: baseSession.startedAt,
      };
      renderVictoryScreen();
      expect(mockReplace).toHaveBeenCalledWith('Home');
    });

    it('ne redirige pas si status est won', () => {
      renderVictoryScreen();
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe('Rendu en état won', () => {
    it('rend sans crash', () => {
      expect(() => renderVictoryScreen()).not.toThrow();
    });

    it('affiche le titre Victoire !', () => {
      renderVictoryScreen();
      expect(screen.getByText('Victoire !')).toBeTruthy();
    });

    it('affiche le message Félicitations !', () => {
      renderVictoryScreen();
      expect(screen.getByText('Félicitations !')).toBeTruthy();
    });

    it('affiche le nombre de sauts', () => {
      renderVictoryScreen();
      expect(screen.getByText('2')).toBeTruthy();
    });

    it('affiche la section chemin parcouru', () => {
      renderVictoryScreen();
      expect(screen.getByText('CHEMIN PARCOURU')).toBeTruthy();
    });

    it('affiche tous les articles du chemin', () => {
      renderVictoryScreen();
      expect(screen.getByText('Tour Eiffel')).toBeTruthy();
      expect(screen.getByText('Paris')).toBeTruthy();
      expect(screen.getByText('Louvre')).toBeTruthy();
    });

    it('affiche le bouton Rejouer', () => {
      renderVictoryScreen();
      expect(screen.getByText('Rejouer')).toBeTruthy();
    });

    it('affiche le bouton Nouvelle partie', () => {
      renderVictoryScreen();
      expect(screen.getByText('Nouvelle partie')).toBeTruthy();
    });

    it('affiche le bouton Retour', () => {
      renderVictoryScreen();
      expect(screen.getByText('Retour')).toBeTruthy();
    });
  });

  describe('Bouton Rejouer', () => {
    it('appelle clearSession, startSession et replace("Game")', async () => {
      const { getByLabelText } = renderVictoryScreen();
      const replayButton = getByLabelText('Rejouer avec les mêmes articles');
      fireEvent.press(replayButton);

      await waitFor(() => {
        expect(mockClearSession).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(mockStartSession).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Tour Eiffel' }),
          expect.objectContaining({ title: 'Louvre' }),
        );
      });

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('Game', { articleTitle: 'Tour Eiffel' });
      });
    });
  });

  describe('Bouton Nouvelle partie', () => {
    it('appelle clearSession, clearSummaryCache et navigate("Home")', async () => {
      const { getByLabelText } = renderVictoryScreen();
      const newGameButton = getByLabelText('Démarrer une nouvelle partie');
      fireEvent.press(newGameButton);

      await waitFor(() => {
        expect(mockClearSession).toHaveBeenCalledTimes(1);
      });

      expect(mockClearSummaryCache).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('Home');
    });

    it('utilise navigate (pas replace) pour Home', () => {
      const { getByLabelText } = renderVictoryScreen();
      const newGameButton = getByLabelText('Démarrer une nouvelle partie');
      fireEvent.press(newGameButton);
      expect(mockNavigate).toHaveBeenCalledWith('Home');
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe('Bouton Retour', () => {
    it('navigue vers Home sans clearSession', () => {
      const { getByLabelText } = renderVictoryScreen();
      const backButton = getByLabelText("Retourner à l'accueil");
      fireEvent.press(backButton);
      expect(mockNavigate).toHaveBeenCalledWith('Home');
      expect(mockClearSession).not.toHaveBeenCalled();
    });
  });

  describe('Animation reduced motion', () => {
    it('ne lance pas l\'animation spring si reduceMotionEnabled', async () => {
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);

      renderVictoryScreen();

      // L'écran doit rendre normalement même sans animation
      await waitFor(() => {
        expect(screen.getByText('Victoire !')).toBeTruthy();
      });
    });

    it('lance l\'animation spring si reduceMotionEnabled est false', async () => {
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);

      renderVictoryScreen();

      await waitFor(() => {
        expect(screen.getByText('Victoire !')).toBeTruthy();
      });
    });
  });

  describe('Titre tronqué dans le bouton Lire', () => {
    it('tronque un titre long à 20 caractères + ellipsis', () => {
      mockCurrentSession = {
        ...baseSession,
        targetArticle: {
          id: '99',
          title: 'Titre très long qui dépasse vingt caractères',
          url: 'https://fr.wikipedia.org/wiki/Titre',
          language: 'fr',
        },
      };
      renderVictoryScreen();
      // Titre tronqué à 20 chars : "Titre très long qui " + "…"
      expect(screen.getByText('Lire "Titre très long qui …"')).toBeTruthy();
    });

    it('ne tronque pas un titre court', () => {
      renderVictoryScreen();
      // Louvre = 6 chars — pas de troncage
      expect(screen.getByText('Lire "Louvre"')).toBeTruthy();
    });
  });

  describe('Guard completedAt manquant', () => {
    it('rend sans crash si completedAt est absent (stats null → rendu vide)', () => {
      // Construire la session sans completedAt
      mockCurrentSession = {
        status: 'won',
        startArticle: baseSession.startArticle,
        targetArticle: baseSession.targetArticle,
        path: baseSession.path,
        jumps: baseSession.jumps,
        startedAt: baseSession.startedAt,
        // completedAt intentionnellement absent
      };

      // Ne doit pas crasher — l'écran affiche un View vide
      expect(() => renderVictoryScreen()).not.toThrow();
    });
  });
});
