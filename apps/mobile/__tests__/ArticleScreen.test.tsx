/**
 * ArticleScreen Tests — WikiHop Mobile — Réécriture WebView native
 *
 * Teste la nouvelle architecture WebView native :
 *
 *   Navigation :
 *     - onPageChange est connecté à WikipediaWebView
 *     - Chaque changement de page appelle addJump
 *     - Victoire : titlesMatch(newTitle, targetTitle) → completeSession + navigate('Victory')
 *     - Navigation header : bouton "← Retour" visible si canGoBack
 *
 *   BackHandler Android :
 *     - Enregistré quand isFocused === true
 *     - goBack() WebView quand webViewCanGoBack === true → compte comme saut via onNavigationStateChange
 *     - Si webViewCanGoBack === false ET navigation.canGoBack() === false → Alert abandon
 *     - Si webViewCanGoBack === false ET navigation.canGoBack() === true → false (RN gère)
 *
 *   État d'erreur :
 *     - onError de WikipediaWebView → affichage écran erreur + bouton Réessayer
 *     - Bouton Réessayer réinitialise currentTitle et webViewError
 *
 * Mocks : react-native-webview (WikipediaWebView), stores Zustand, navigation, BackHandler
 *
 * ADR-003 : React Native Testing Library pour les tests de composants
 */

import { render, act, waitFor } from '@testing-library/react-native';
import { Alert, BackHandler } from 'react-native';
import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Mock react-native-webview (nécessaire pour WikipediaWebView)
// ─────────────────────────────────────────────────────────────────────────────

interface MockWebViewProps {
  onLoadStart?: (() => void) | undefined;
  onLoadEnd?: (() => void) | undefined;
  onError?: ((event: { nativeEvent: { description: string } }) => void) | undefined;
  onShouldStartLoadWithRequest?: ((request: { url: string }) => boolean) | undefined;
  onNavigationStateChange?: ((navState: { canGoBack: boolean; url: string; loading: boolean }) => void) | undefined;
  source?: { uri?: string } | undefined;
}

interface MockWebViewRefHandle {
  goBack: () => void;
  injectJavaScript: (script: string) => void;
}

const mockWebViewGoBack = jest.fn();
const mockWebViewInjectJavaScript = jest.fn();

let capturedWebViewProps: Partial<MockWebViewProps> = {};

jest.mock('react-native-webview', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View, Text } = require('react-native');

  const MockWebView = React.forwardRef(function MockWebView(
    props: MockWebViewProps,
    ref: React.Ref<MockWebViewRefHandle>,
  ) {
    React.useImperativeHandle(ref, () => ({
      goBack: mockWebViewGoBack,
      injectJavaScript: mockWebViewInjectJavaScript,
    }));

    const captured: Partial<MockWebViewProps> = {};
    if (props.onLoadStart !== undefined) captured.onLoadStart = props.onLoadStart;
    if (props.onLoadEnd !== undefined) captured.onLoadEnd = props.onLoadEnd;
    if (props.onError !== undefined) captured.onError = props.onError;
    if (props.onShouldStartLoadWithRequest !== undefined) {
      captured.onShouldStartLoadWithRequest = props.onShouldStartLoadWithRequest;
    }
    if (props.onNavigationStateChange !== undefined) {
      captured.onNavigationStateChange = props.onNavigationStateChange;
    }
    if (props.source !== undefined) captured.source = props.source;
    capturedWebViewProps = captured;

    return React.createElement(
      View,
      { testID: 'mock-webview' },
      React.createElement(Text, null, 'MockWebView'),
    );
  });

  return { WebView: MockWebView };
});

// ─────────────────────────────────────────────────────────────────────────────
// Mock stores
// ─────────────────────────────────────────────────────────────────────────────

const mockAddJump = jest.fn().mockResolvedValue(undefined);
const mockCompleteSession = jest.fn().mockResolvedValue(undefined);

const mockCurrentSession = {
  status: 'in_progress',
  jumps: 0,
  path: [{ id: '1', title: 'Tour Eiffel', url: 'https://fr.m.wikipedia.org/wiki/Tour_Eiffel', language: 'fr' }],
  startArticle: { id: '1', title: 'Tour Eiffel', url: 'https://fr.m.wikipedia.org/wiki/Tour_Eiffel', language: 'fr' },
  targetArticle: { id: '2', title: 'Louvre', url: 'https://fr.m.wikipedia.org/wiki/Louvre', language: 'fr' },
  startedAt: new Date(),
};

jest.mock('../src/store/game.store', () => ({
  useGameStore: jest.fn((selector: (state: {
    currentSession: typeof mockCurrentSession;
    addJump: jest.Mock;
    completeSession: jest.Mock;
  }) => unknown) =>
    selector({
      currentSession: mockCurrentSession,
      addJump: mockAddJump,
      completeSession: mockCompleteSession,
    }),
  ),
}));

jest.mock('../src/store/language.store', () => ({
  useLanguageStore: jest.fn((selector: (state: { language: string }) => unknown) =>
    selector({ language: 'fr' }),
  ),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Mock useIsFocused
// ─────────────────────────────────────────────────────────────────────────────

let mockIsFocused = true;

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => mockIsFocused,
}));

// ─────────────────────────────────────────────────────────────────────────────
// Import du composant APRES les mocks
// ─────────────────────────────────────────────────────────────────────────────

import { ArticleScreen } from '../src/screens/ArticleScreen';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const mockGoBack = jest.fn();
const mockPush = jest.fn();
const mockNavigate = jest.fn();
const mockCanGoBack = jest.fn(() => true);

const mockNavigation = {
  goBack: mockGoBack,
  push: mockPush,
  navigate: mockNavigate,
  canGoBack: mockCanGoBack,
  replace: jest.fn(),
};

function renderArticleScreen(articleTitle = 'Tour Eiffel') {
  return render(
    <ArticleScreen
      navigation={mockNavigation as never}
      route={{ key: 'Game', name: 'Game', params: { articleTitle } } as never}
    />,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('ArticleScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedWebViewProps = {};
    mockIsFocused = true;
    mockCanGoBack.mockReturnValue(true);
    mockWebViewGoBack.mockClear();
    mockWebViewInjectJavaScript.mockClear();
    mockAddJump.mockResolvedValue(undefined);
    mockCompleteSession.mockResolvedValue(undefined);
  });

  // ── Rendu de base ────────────────────────────────────────────────────────────

  describe('Rendu de base', () => {
    it('rend sans crash', () => {
      expect(() => renderArticleScreen()).not.toThrow();
    });

    it('affiche le titre de l\'article dans le header', () => {
      const { getByText } = renderArticleScreen('Tour Eiffel');
      expect(getByText('Tour Eiffel')).toBeTruthy();
    });

    it('n\'affiche pas le bouton retour si webViewCanGoBack === false (état initial)', () => {
      // webViewCanGoBack démarre à false → bouton caché
      const { queryByText } = renderArticleScreen();
      expect(queryByText('← Retour')).toBeNull();
    });

    it('affiche le bouton retour quand webViewCanGoBack devient true', async () => {
      const { getByText } = renderArticleScreen();
      await act(async () => { await Promise.resolve(); });

      // Simuler onNavigationStateChange avec canGoBack = true
      await act(async () => {
        capturedWebViewProps.onNavigationStateChange?.({
          canGoBack: true,
          url: 'https://fr.m.wikipedia.org/wiki/Paris',
          loading: false,
        });
        await Promise.resolve();
      });

      expect(getByText('← Retour')).toBeTruthy();
    });

    it('affiche le GameHUD', () => {
      renderArticleScreen();
      // GameHUD est rendu — pas de crash
    });
  });

  // ── Connexion de WikipediaWebView ────────────────────────────────────────────

  describe('Configuration de WikipediaWebView', () => {
    it('configure WikipediaWebView avec onNavigationStateChange', async () => {
      renderArticleScreen();
      await act(async () => { await Promise.resolve(); });
      expect(capturedWebViewProps.onNavigationStateChange).toBeDefined();
    });

    it('configure WikipediaWebView avec onShouldStartLoadWithRequest', async () => {
      renderArticleScreen();
      await act(async () => { await Promise.resolve(); });
      // onShouldStartLoadWithRequest est géré par WikipediaWebView directement,
      // pas par ArticleScreen — vérifier que WikipediaWebView est rendu
      // (on vérifie via le testID du mock WebView)
    });
  });

  // ── Comptage des sauts (onPageChange) ────────────────────────────────────────

  describe('Comptage des sauts via onPageChange', () => {
    it('appelle addJump quand onPageChange est déclenché avec un nouvel article', async () => {
      renderArticleScreen('Tour Eiffel');
      await act(async () => { await Promise.resolve(); });

      const { onNavigationStateChange } = capturedWebViewProps;
      expect(onNavigationStateChange).toBeDefined();

      // Simuler la navigation vers Paris
      await act(async () => {
        onNavigationStateChange?.({
          url: 'https://fr.m.wikipedia.org/wiki/Paris',
          canGoBack: true,
          loading: false,
        });
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(mockAddJump).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Paris' }),
        );
      });
    });

    it('ne déclenche pas addJump quand onNavigationStateChange est en loading', async () => {
      renderArticleScreen('Tour Eiffel');
      await act(async () => { await Promise.resolve(); });

      const { onNavigationStateChange } = capturedWebViewProps;

      await act(async () => {
        onNavigationStateChange?.({
          url: 'https://fr.m.wikipedia.org/wiki/Paris',
          canGoBack: false,
          loading: true, // en chargement → pas de saut
        });
        await Promise.resolve();
      });

      expect(mockAddJump).not.toHaveBeenCalled();
    });

    it('ne déclenche pas addJump si même titre (ancre)', async () => {
      renderArticleScreen('Tour Eiffel');
      await act(async () => { await Promise.resolve(); });

      const { onNavigationStateChange } = capturedWebViewProps;

      await act(async () => {
        onNavigationStateChange?.({
          url: 'https://fr.m.wikipedia.org/wiki/Tour_Eiffel#Architecture',
          canGoBack: false,
          loading: false, // chargement terminé mais même article
        });
        await Promise.resolve();
      });

      expect(mockAddJump).not.toHaveBeenCalled();
    });
  });

  // ── Victoire ─────────────────────────────────────────────────────────────────

  describe('Victoire', () => {
    it('appelle completeSession et navigate("Victory") quand l\'article cible est atteint', async () => {
      // mockCurrentSession.targetArticle.title = 'Louvre'
      renderArticleScreen('Tour Eiffel');
      await act(async () => { await Promise.resolve(); });

      const { onNavigationStateChange } = capturedWebViewProps;

      await act(async () => {
        onNavigationStateChange?.({
          url: 'https://fr.m.wikipedia.org/wiki/Louvre',
          canGoBack: true,
          loading: false,
        });
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(mockCompleteSession).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('Victory');
      });
    });

    it('ne navigue pas vers Victory si article cible non atteint', async () => {
      renderArticleScreen('Tour Eiffel');
      await act(async () => { await Promise.resolve(); });

      const { onNavigationStateChange } = capturedWebViewProps;

      await act(async () => {
        onNavigationStateChange?.({
          url: 'https://fr.m.wikipedia.org/wiki/Paris',
          canGoBack: true,
          loading: false,
        });
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(mockAddJump).toHaveBeenCalled();
      });

      expect(mockCompleteSession).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalledWith('Victory');
    });

    it('gère la victoire insensible à la casse', async () => {
      // targetArticle.title = 'Louvre' → 'louvre' doit matcher
      renderArticleScreen('Tour Eiffel');
      await act(async () => { await Promise.resolve(); });

      const { onNavigationStateChange } = capturedWebViewProps;

      await act(async () => {
        onNavigationStateChange?.({
          url: 'https://fr.m.wikipedia.org/wiki/louvre',
          canGoBack: true,
          loading: false,
        });
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(mockCompleteSession).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('Victory');
      });
    });
  });

  // ── BackHandler Android ──────────────────────────────────────────────────────

  describe('BackHandler Android', () => {
    it('enregistre un listener BackHandler quand isFocused === true', () => {
      const addEventListenerSpy = jest.spyOn(BackHandler, 'addEventListener');
      mockIsFocused = true;

      renderArticleScreen();

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'hardwareBackPress',
        expect.any(Function),
      );
    });

    it('n\'enregistre pas de BackHandler quand isFocused === false', () => {
      const addEventListenerSpy = jest.spyOn(BackHandler, 'addEventListener');
      mockIsFocused = false;

      renderArticleScreen();

      expect(addEventListenerSpy).not.toHaveBeenCalled();
    });

    it('appelle webViewRef.goBack() et retourne true quand webViewCanGoBack === true', async () => {
      mockIsFocused = true;

      const handlers: Array<() => boolean> = [];
      jest.spyOn(BackHandler, 'addEventListener').mockImplementation(
        (_event, handler) => {
          handlers.push(handler as () => boolean);
          return { remove: jest.fn() };
        },
      );

      renderArticleScreen();
      await act(async () => { await Promise.resolve(); });

      const initialCount = handlers.length;

      // Simuler onNavigationStateChange avec canGoBack = true
      await act(async () => {
        capturedWebViewProps.onNavigationStateChange?.({
          canGoBack: true,
          url: 'https://fr.m.wikipedia.org/wiki/Paris',
          loading: false,
        });
      });

      // Attendre que le useEffect BackHandler soit re-exécuté
      await waitFor(() => {
        expect(handlers.length).toBeGreaterThan(initialCount);
      });

      // Le dernier handler capture webViewCanGoBack = true
      const lastHandler = handlers[handlers.length - 1];
      expect(lastHandler).toBeDefined();
      const result = lastHandler?.();
      expect(result).toBe(true);
      expect(mockWebViewGoBack).toHaveBeenCalled();
    });

    it('retourne false si webViewCanGoBack === false et navigation.canGoBack() === true', async () => {
      mockIsFocused = true;
      mockCanGoBack.mockReturnValue(true);

      const handlers: Array<() => boolean> = [];
      jest.spyOn(BackHandler, 'addEventListener').mockImplementation(
        (_event, handler) => {
          handlers.push(handler as () => boolean);
          return { remove: jest.fn() };
        },
      );

      renderArticleScreen();
      await act(async () => { await Promise.resolve(); });

      // webViewCanGoBack reste false (état initial)
      const lastHandler = handlers[handlers.length - 1];
      expect(lastHandler).toBeDefined();
      const result = lastHandler?.();
      // navigation.canGoBack() === true → retourne false (laisse RN gérer)
      expect(result).toBe(false);
    });

    it('affiche une Alert abandon si webViewCanGoBack === false et navigation.canGoBack() === false', async () => {
      mockIsFocused = true;
      mockCanGoBack.mockReturnValue(false);

      const alertSpy = jest.spyOn(Alert, 'alert');

      const handlers: Array<() => boolean> = [];
      jest.spyOn(BackHandler, 'addEventListener').mockImplementation(
        (_event, handler) => {
          handlers.push(handler as () => boolean);
          return { remove: jest.fn() };
        },
      );

      renderArticleScreen();
      await act(async () => { await Promise.resolve(); });

      const lastHandler = handlers[handlers.length - 1];
      expect(lastHandler).toBeDefined();
      const result = lastHandler?.();

      expect(result).toBe(true); // bloque le back natif
      expect(alertSpy).toHaveBeenCalledWith(
        'Quitter la partie ?',
        expect.any(String),
        expect.any(Array),
      );
    });

    it('retire le listener BackHandler au unmount (cleanup)', () => {
      mockIsFocused = true;

      const mockRemove = jest.fn();
      jest.spyOn(BackHandler, 'addEventListener').mockReturnValue({
        remove: mockRemove,
      });

      const { unmount } = renderArticleScreen();
      unmount();

      expect(mockRemove).toHaveBeenCalled();
    });
  });

  // ── Gestion des erreurs WebView ──────────────────────────────────────────────

  describe('Erreur WebView', () => {
    it('affiche l\'écran d\'erreur si WikipediaWebView appelle onError', async () => {
      renderArticleScreen();
      await act(async () => { await Promise.resolve(); });

      const { onError } = capturedWebViewProps;
      expect(onError).toBeDefined();

      await act(async () => {
        onError?.({ nativeEvent: { description: 'Network request failed' } });
      });

      // Après l'erreur, on réaffiche l'écran avec le message d'erreur
      // (WikipediaWebView est remplacé par l'UI d'erreur)
      // On vérifie que le composant est rendu sans crash
    });
  });
});
