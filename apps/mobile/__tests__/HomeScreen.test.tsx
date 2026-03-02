/**
 * HomeScreen Tests — WikiHop Mobile — Wave 4 (M-01)
 *
 * Teste le composant HomeScreen Wave 4 :
 *   - Rendu sans crash
 *   - Affichage du titre WikiHop
 *   - Skeleton loading affiché dans l'état loading
 *   - Cartes articles affichées dans l'état success
 *   - Bouton Jouer actif dans l'état success
 *   - Bouton Jouer désactivé dans l'état loading
 *   - Message d'erreur + bouton Réessayer dans l'état error
 *   - Sélecteur de langue affiché après hydratation
 *   - Bouton Nouveaux articles visible
 *
 * useRandomPair et les stores sont mockés pour des tests déterministes.
 *
 * ADR-003 : React Native Testing Library pour les tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';

import type { RandomPairState } from '../src/hooks/useRandomPair';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

const mockRefresh = jest.fn();
let mockPairState: RandomPairState = { status: 'loading' };

jest.mock('../src/hooks/useRandomPair', () => ({
  useRandomPair: () => ({ state: mockPairState, refresh: mockRefresh }),
}));

const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  push: jest.fn(),
  replace: jest.fn(),
  goBack: jest.fn(),
  canGoBack: jest.fn(() => false),
};

const mockStartSession = jest.fn().mockResolvedValue(undefined);
const mockClearSession = jest.fn().mockResolvedValue(undefined);

let mockIsHydrated = true;
let mockCurrentSession: {
  status: string;
  path: Array<{ title: string }>;
  startArticle: { title: string };
  targetArticle: { title: string };
} | null = null;

jest.mock('../src/store/game.store', () => ({
  useGameStore: jest.fn((selector: (state: {
    startSession: jest.Mock;
    clearSession: jest.Mock;
    currentSession: typeof mockCurrentSession;
    isHydrated: boolean;
  }) => unknown) =>
    selector({
      startSession: mockStartSession,
      clearSession: mockClearSession,
      get currentSession() { return mockCurrentSession; },
      get isHydrated() { return mockIsHydrated; },
    }),
  ),
}));

let mockLanguage = 'fr';
let mockIsLanguageHydrated = true;
const mockSetLanguage = jest.fn().mockResolvedValue(undefined);

jest.mock('../src/store/language.store', () => ({
  useLanguageStore: jest.fn((selector: (state: {
    language: string;
    setLanguage: jest.Mock;
    isLanguageHydrated: boolean;
  }) => unknown) =>
    selector({
      get language() { return mockLanguage; },
      setLanguage: mockSetLanguage,
      get isLanguageHydrated() { return mockIsLanguageHydrated; },
    }),
  ),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Import du composant après les mocks
// ─────────────────────────────────────────────────────────────────────────────

import { HomeScreen } from '../src/screens/HomeScreen';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function renderHomeScreen() {
  return render(
    <HomeScreen
      navigation={mockNavigation as never}
      route={{ key: 'Home', name: 'Home', params: undefined } as never}
    />,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('HomeScreen', () => {
  beforeEach(() => {
    mockPairState = { status: 'loading' };
    mockIsHydrated = true;
    mockCurrentSession = null;
    mockLanguage = 'fr';
    mockIsLanguageHydrated = true;
    mockNavigate.mockClear();
    mockStartSession.mockClear();
    mockClearSession.mockClear();
    mockRefresh.mockClear();
    mockSetLanguage.mockClear();
  });

  describe('Rendu de base', () => {
    it('rend sans crash', () => {
      expect(() => renderHomeScreen()).not.toThrow();
    });

    it('affiche le titre WikiHop', () => {
      renderHomeScreen();
      expect(screen.getByText('WikiHop')).toBeTruthy();
    });
  });

  describe('État loading', () => {
    it('affiche le bouton Jouer désactivé en état loading', () => {
      mockPairState = { status: 'loading' };
      const { UNSAFE_getByProps } = renderHomeScreen();
      // En état loading, le bouton Jouer est affiché avec disabled={true}
      const playButton = UNSAFE_getByProps({ accessibilityLabel: 'Jouer', disabled: true });
      expect(playButton).toBeTruthy();
    });

    it('affiche le bouton Nouveaux articles', () => {
      mockPairState = { status: 'loading' };
      renderHomeScreen();
      expect(screen.getByText('Nouveaux articles')).toBeTruthy();
    });
  });

  describe('État success', () => {
    beforeEach(() => {
      mockPairState = {
        status: 'success',
        start: {
          id: '1',
          title: 'Tour Eiffel',
          url: 'https://fr.wikipedia.org/wiki/Tour_Eiffel',
          language: 'fr',
          extract: 'La tour Eiffel est une tour de fer forgé.',
        },
        target: {
          id: '2',
          title: 'Louvre',
          url: 'https://fr.wikipedia.org/wiki/Louvre',
          language: 'fr',
          extract: 'Le Louvre est un musée parisien.',
        },
      };
    });

    it('affiche les titres des deux articles', () => {
      renderHomeScreen();
      expect(screen.getByText('Tour Eiffel')).toBeTruthy();
      expect(screen.getByText('Louvre')).toBeTruthy();
    });

    it('affiche les labels DÉPART et DESTINATION', () => {
      renderHomeScreen();
      expect(screen.getByText('DÉPART')).toBeTruthy();
      expect(screen.getByText('DESTINATION')).toBeTruthy();
    });

    it('affiche les extraits des articles', () => {
      renderHomeScreen();
      expect(screen.getByText('La tour Eiffel est une tour de fer forgé.')).toBeTruthy();
      expect(screen.getByText('Le Louvre est un musée parisien.')).toBeTruthy();
    });

    it('affiche le bouton Jouer actif', () => {
      renderHomeScreen();
      expect(screen.getByText('Jouer')).toBeTruthy();
    });

    it('appuyer sur Jouer démarre une session et navigue vers Game', async () => {
      const { getByLabelText } = renderHomeScreen();
      const playButton = getByLabelText('Jouer');
      fireEvent.press(playButton);

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
        expect(mockNavigate).toHaveBeenCalledWith('Game', { articleTitle: 'Tour Eiffel' });
      });
    });

    it('appuyer sur Nouveaux articles appelle refresh', () => {
      const { getByLabelText } = renderHomeScreen();
      const refreshButton = getByLabelText('Tirer de nouveaux articles');
      fireEvent.press(refreshButton);
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('affiche une Alert si startSession throw et ne crash pas', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');

      mockStartSession.mockRejectedValueOnce(new Error('Erreur inattendue'));

      const { getByLabelText } = renderHomeScreen();
      const playButton = getByLabelText('Jouer');
      fireEvent.press(playButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Erreur',
          'Impossible de démarrer la partie. Réessayez.',
        );
      });

      alertSpy.mockRestore();
    });
  });

  describe('État error', () => {
    it('affiche le message d\'erreur', () => {
      mockPairState = { status: 'error', message: 'Erreur lors du chargement. Vérifiez votre connexion.' };
      renderHomeScreen();
      expect(screen.getByText('Impossible de charger les articles.')).toBeTruthy();
    });

    it('affiche le bouton Réessayer', () => {
      mockPairState = { status: 'error', message: 'Erreur réseau' };
      const { getByLabelText } = renderHomeScreen();
      const retryButton = getByLabelText('Réessayer de charger les articles');
      expect(retryButton).toBeTruthy();
    });

    it('appuyer sur Réessayer appelle refresh', () => {
      mockPairState = { status: 'error', message: 'Erreur réseau' };
      const { getByLabelText } = renderHomeScreen();
      const retryButton = getByLabelText('Réessayer de charger les articles');
      fireEvent.press(retryButton);
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('Sélecteur de langue', () => {
    it('affiche les options FR et EN quand isLanguageHydrated est true', () => {
      mockIsLanguageHydrated = true;
      renderHomeScreen();
      expect(screen.getByText('FR')).toBeTruthy();
      expect(screen.getByText('EN')).toBeTruthy();
    });

    it('appuyer sur EN appelle setLanguage("en")', () => {
      mockIsLanguageHydrated = true;
      const { getByLabelText } = renderHomeScreen();
      const enButton = getByLabelText('Langue anglaise');
      fireEvent.press(enButton);
      expect(mockSetLanguage).toHaveBeenCalledWith('en');
    });

    it('appuyer sur FR appelle setLanguage("fr")', () => {
      mockIsLanguageHydrated = true;
      mockLanguage = 'en';
      const { getByLabelText } = renderHomeScreen();
      const frButton = getByLabelText('Langue française');
      fireEvent.press(frButton);
      expect(mockSetLanguage).toHaveBeenCalledWith('fr');
    });
  });
});
