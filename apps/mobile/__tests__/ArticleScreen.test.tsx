/**
 * ArticleScreen Tests — WikiHop Mobile
 *
 * Teste les deux corrections de navigation :
 *
 *   Bug 1 — Sauts non comptabilisés :
 *     - onShouldStartLoadWithRequest bloque les URLs http/https (navigation native)
 *     - onShouldStartLoadWithRequest autorise about:blank, data:, blob:
 *     - Un tap sur un lien /wiki/ déclenche addJump via onWikiLinkPress
 *     - navigation.push est appelé vers le nouvel article
 *
 *   Bug 2 — Back button ramène à HomeScreen :
 *     - BackHandler Android est enregistré quand isFocused === true
 *     - BackHandler retourne true (bloque RN) quand webViewCanGoBack === true
 *     - BackHandler retourne false (laisse RN gérer) quand webViewCanGoBack === false
 *     - onNavigationStateChange met à jour webViewCanGoBack
 *
 * Mocks : react-native-webview, useArticleContent, useGameStore, useLanguageStore,
 *         wikipedia.service, BackHandler, useIsFocused.
 *
 * ADR-003 : React Native Testing Library pour les tests de composants
 */

import { render, act, waitFor } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import React from 'react';

import type { ArticleSummary } from '@wikihop/shared';

// ─────────────────────────────────────────────────────────────────────────────
// Mock react-native-webview
// Expose les handlers capturés pour les tests
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Props du composant WebView mock.
 * Toutes les props sont optionnelles avec "| undefined" explicite pour satisfaire
 * exactOptionalPropertyTypes lors de l'assignation depuis les props réelles.
 */
interface MockWebViewProps {
  onMessage?: ((event: { nativeEvent: { data: string } }) => void) | undefined;
  onLoadEnd?: (() => void) | undefined;
  onError?: ((event: { nativeEvent: { description: string } }) => void) | undefined;
  onShouldStartLoadWithRequest?: ((request: { url: string }) => boolean) | undefined;
  onNavigationStateChange?: ((navState: { canGoBack: boolean; url: string }) => void) | undefined;
}

/**
 * État partagé contenant les handlers capturés lors du rendu du mock WebView.
 * On utilise Partial<> pour éviter l'assignation d'un objet vide incompatible.
 */
let capturedWebViewHandlers: Partial<Required<MockWebViewProps>> = {};

/** Instance mock WebView exposée via useImperativeHandle */
const mockWebViewGoBack = jest.fn();
const mockWebViewInjectJavaScript = jest.fn();

jest.mock('react-native-webview', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View, Text } = require('react-native');

  interface MockWebViewRefHandle {
    goBack: () => void;
    injectJavaScript: (script: string) => void;
  }

  const MockWebView = React.forwardRef(function MockWebView(
    props: MockWebViewProps,
    ref: React.Ref<MockWebViewRefHandle>,
  ) {
    // Exposer une instance WebView mock via la ref pour que webViewRef.current !== null
    // Cela permet au BackHandler de passer le guard `webViewRef.current !== null`
    React.useImperativeHandle(ref, () => ({
      goBack: mockWebViewGoBack,
      injectJavaScript: mockWebViewInjectJavaScript,
    }));

    // Capturer uniquement les props définies pour éviter les problèmes
    // d'exactOptionalPropertyTypes lors de l'assignation
    const handlers: Partial<Required<MockWebViewProps>> = {};
    if (props.onMessage !== undefined) {
      handlers.onMessage = props.onMessage;
    }
    if (props.onLoadEnd !== undefined) {
      handlers.onLoadEnd = props.onLoadEnd;
    }
    if (props.onError !== undefined) {
      handlers.onError = props.onError;
    }
    if (props.onShouldStartLoadWithRequest !== undefined) {
      handlers.onShouldStartLoadWithRequest = props.onShouldStartLoadWithRequest;
    }
    if (props.onNavigationStateChange !== undefined) {
      handlers.onNavigationStateChange = props.onNavigationStateChange;
    }
    capturedWebViewHandlers = handlers;

    return React.createElement(
      View,
      { testID: 'mock-webview' },
      React.createElement(Text, null, 'MockWebView'),
    );
  });

  return {
    WebView: MockWebView,
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// Mock useArticleContent
// ─────────────────────────────────────────────────────────────────────────────

type ArticleContentState =
  | { status: 'loading' }
  | { status: 'success'; html: string }
  | { status: 'not_found'; title: string }
  | { status: 'error'; message: string };

let mockContentState: ArticleContentState = {
  status: 'success',
  html: '<p>Contenu de l\'article</p>',
};
const mockRetry = jest.fn();

jest.mock('../src/hooks/useArticleContent', () => ({
  useArticleContent: () => ({ state: mockContentState, retry: mockRetry }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Mock wikipedia.service
// ─────────────────────────────────────────────────────────────────────────────

const mockGetArticleSummary = jest.fn();
const mockIsPlayableArticle = jest.fn<boolean, [string]>(() => true);

jest.mock('../src/services/wikipedia.service', () => ({
  // Déléguer au mock externe via une closure — évite le problème de spread
  // sur unknown[] (TS2556 : spread doit être un tuple ou rest param)
  getArticleSummary: (title: string, lang: string) => mockGetArticleSummary(title, lang),
  isPlayableArticle: (title: string) => mockIsPlayableArticle(title),
  WikipediaNotFoundError: class WikipediaNotFoundError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'WikipediaNotFoundError';
    }
  },
  WikipediaNetworkError: class WikipediaNetworkError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'WikipediaNetworkError';
    }
  },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Mock stores
// ─────────────────────────────────────────────────────────────────────────────

const mockAddJump = jest.fn().mockResolvedValue(undefined);
const mockCompleteSession = jest.fn().mockResolvedValue(undefined);

const mockCurrentSession = {
  status: 'in_progress',
  jumps: 0,
  path: [{ id: '1', title: 'Tour Eiffel', url: 'https://fr.wikipedia.org/wiki/Tour_Eiffel', language: 'fr' }],
  startArticle: { id: '1', title: 'Tour Eiffel', url: 'https://fr.wikipedia.org/wiki/Tour_Eiffel', language: 'fr' },
  targetArticle: { id: '2', title: 'Louvre', url: 'https://fr.wikipedia.org/wiki/Louvre', language: 'fr' },
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

const defaultSummary: ArticleSummary = {
  id: '1',
  title: 'Tour Eiffel',
  url: 'https://fr.wikipedia.org/wiki/Tour_Eiffel',
  language: 'fr',
  extract: 'La tour Eiffel est une tour de fer forgé.',
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
    capturedWebViewHandlers = {};
    mockIsFocused = true;
    mockContentState = { status: 'success', html: '<p>Contenu</p>' };
    mockIsPlayableArticle.mockReturnValue(true);
    mockGetArticleSummary.mockResolvedValue(defaultSummary);
    mockCanGoBack.mockReturnValue(true);
    mockWebViewGoBack.mockClear();
    mockWebViewInjectJavaScript.mockClear();
  });

  // ── Rendu de base ────────────────────────────────────────────────────────────

  describe('Rendu de base', () => {
    it('rend sans crash', async () => {
      expect(() => renderArticleScreen()).not.toThrow();
      await act(async () => { await Promise.resolve(); });
    });

    it('affiche le titre de l\'article dans le header', async () => {
      const { getByText } = renderArticleScreen('Tour Eiffel');
      await act(async () => { await Promise.resolve(); });
      expect(getByText('Tour Eiffel')).toBeTruthy();
    });

    it('affiche le bouton retour si canGoBack === true', async () => {
      mockCanGoBack.mockReturnValue(true);
      const { getByText } = renderArticleScreen();
      await act(async () => { await Promise.resolve(); });
      expect(getByText('← Retour')).toBeTruthy();
    });
  });

  // ── Bug 1 — onShouldStartLoadWithRequest ────────────────────────────────────

  describe('Bug 1 — onShouldStartLoadWithRequest (blocage navigation native)', () => {
    it('configure onShouldStartLoadWithRequest sur la WebView', async () => {
      renderArticleScreen();
      await act(async () => { await Promise.resolve(); });
      expect(capturedWebViewHandlers.onShouldStartLoadWithRequest).toBeDefined();
    });

    it('autorise le chargement about:blank (source initiale)', async () => {
      renderArticleScreen();
      await act(async () => { await Promise.resolve(); });
      const handler = capturedWebViewHandlers.onShouldStartLoadWithRequest;
      expect(handler?.({ url: 'about:blank' })).toBe(true);
    });

    it('autorise les URLs data: (HTML inline)', async () => {
      renderArticleScreen();
      await act(async () => { await Promise.resolve(); });
      const handler = capturedWebViewHandlers.onShouldStartLoadWithRequest;
      expect(handler?.({ url: 'data:text/html;charset=utf-8,<html/>' })).toBe(true);
    });

    it('autorise les URLs blob:', async () => {
      renderArticleScreen();
      await act(async () => { await Promise.resolve(); });
      const handler = capturedWebViewHandlers.onShouldStartLoadWithRequest;
      expect(handler?.({ url: 'blob:https://fr.wikipedia.org/abc123' })).toBe(true);
    });

    it('bloque la navigation vers une URL https Wikipedia', async () => {
      renderArticleScreen();
      await act(async () => { await Promise.resolve(); });
      const handler = capturedWebViewHandlers.onShouldStartLoadWithRequest;
      expect(handler?.({ url: 'https://fr.wikipedia.org/wiki/Tour_Eiffel' })).toBe(false);
    });

    it('bloque la navigation vers une URL http quelconque', async () => {
      renderArticleScreen();
      await act(async () => { await Promise.resolve(); });
      const handler = capturedWebViewHandlers.onShouldStartLoadWithRequest;
      expect(handler?.({ url: 'http://example.com/page' })).toBe(false);
    });

    it('bloque les liens /wiki/ résolus en URL absolue', async () => {
      renderArticleScreen();
      await act(async () => { await Promise.resolve(); });
      const handler = capturedWebViewHandlers.onShouldStartLoadWithRequest;
      // Ce que le pont natif Android verrait après résolution du href /wiki/Paris
      expect(handler?.({ url: 'https://fr.wikipedia.org/wiki/Paris' })).toBe(false);
    });

    it('autorise le baseUrl exact — chargement initial de la WebView (fix page 2+)', async () => {
      // react-native-webview appelle onShouldStartLoadWithRequest avec request.url = baseUrl
      // lors du chargement initial de source={{ html, baseUrl }}.
      // Sans cette exception, les pages 2, 3, etc. ne chargent jamais.
      renderArticleScreen('Tour Eiffel');
      await act(async () => { await Promise.resolve(); });
      const handler = capturedWebViewHandlers.onShouldStartLoadWithRequest;
      // Article en français → baseUrl = "https://fr.wikipedia.org"
      expect(handler?.({ url: 'https://fr.wikipedia.org' })).toBe(true);
    });

    it('bloque une URL wikipedia avec chemin même si elle commence par le baseUrl', async () => {
      // Garantit que l'exception baseUrl est stricte (égalité, pas startsWith)
      renderArticleScreen('Tour Eiffel');
      await act(async () => { await Promise.resolve(); });
      const handler = capturedWebViewHandlers.onShouldStartLoadWithRequest;
      expect(handler?.({ url: 'https://fr.wikipedia.org/wiki/Tour_Eiffel' })).toBe(false);
    });
  });

  // ── Bug 1 — addJump appelé via postMessage ───────────────────────────────────

  describe('Bug 1 — addJump appelé sur tap lien', () => {
    const parisSummary: ArticleSummary = {
      id: '99',
      title: 'Paris',
      url: 'https://fr.wikipedia.org/wiki/Paris',
      language: 'fr',
      extract: 'Paris est la capitale de la France.',
    };

    it('appelle addJump quand onWikiLinkPress est déclenché', async () => {
      mockGetArticleSummary.mockResolvedValue(defaultSummary);
      renderArticleScreen();
      await act(async () => { await Promise.resolve(); });

      // Simuler un tap sur un lien /wiki/ via le handler onMessage de WikipediaWebView
      // (qui est appelé par le handleMessage de WikipediaWebView en réponse au postMessage)
      mockGetArticleSummary.mockResolvedValueOnce(parisSummary);

      const { onMessage } = capturedWebViewHandlers;
      expect(onMessage).toBeDefined();

      const payload = JSON.stringify({ type: 'WIKI_LINK', title: 'Paris' });
      await act(async () => {
        onMessage?.({ nativeEvent: { data: payload } });
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(mockAddJump).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Paris' }),
        );
      });
    });

    it('appelle navigation.push vers le nouvel article après addJump', async () => {
      mockGetArticleSummary
        .mockResolvedValueOnce(defaultSummary) // résumé initial
        .mockResolvedValueOnce(parisSummary);  // résumé pour Paris

      renderArticleScreen();
      await act(async () => { await Promise.resolve(); });

      const { onMessage } = capturedWebViewHandlers;
      const payload = JSON.stringify({ type: 'WIKI_LINK', title: 'Paris' });

      await act(async () => {
        onMessage?.({ nativeEvent: { data: payload } });
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('Game', { articleTitle: 'Paris' });
      });
    });

    it('ne compte pas les liens non jouables', async () => {
      mockIsPlayableArticle.mockReturnValue(false);
      mockGetArticleSummary.mockResolvedValue(defaultSummary);

      renderArticleScreen();
      await act(async () => { await Promise.resolve(); });

      const { onMessage } = capturedWebViewHandlers;
      const payload = JSON.stringify({ type: 'WIKI_LINK', title: 'Aide:Bienvenue' });

      await act(async () => {
        onMessage?.({ nativeEvent: { data: payload } });
        await Promise.resolve();
      });

      expect(mockAddJump).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  // ── Bug 2 — BackHandler Android ─────────────────────────────────────────────

  describe('Bug 2 — BackHandler Android', () => {
    it('enregistre un listener BackHandler quand isFocused === true', () => {
      const addEventListenerSpy = jest.spyOn(BackHandler, 'addEventListener');
      mockIsFocused = true;

      renderArticleScreen();

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'hardwareBackPress',
        expect.any(Function),
      );
    });

    it('retourne true (bloque RN) quand webViewCanGoBack est true', async () => {
      mockIsFocused = true;

      // Stocker le handler capturé dans un tableau pour éviter le problème de type
      // avec null (TS ne peut pas inférer le type après l'assignation dans un closure)
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
      // Cela déclenche setWebViewCanGoBack(true) → re-rendu → useEffect re-exécuté
      // → nouveau BackHandler enregistré
      await act(async () => {
        capturedWebViewHandlers.onNavigationStateChange?.({
          canGoBack: true,
          url: 'about:blank',
        });
      });

      // Attendre que le useEffect BackHandler soit re-exécuté avec la nouvelle valeur
      await waitFor(() => {
        expect(handlers.length).toBeGreaterThan(initialCount);
      });

      // Le dernier BackHandler enregistré capture webViewCanGoBack = true
      const lastHandler = handlers[handlers.length - 1];
      expect(lastHandler).toBeDefined();
      expect(lastHandler?.()).toBe(true);
    });

    it('retourne false (laisse RN gérer) si webViewCanGoBack est false', async () => {
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

      // webViewCanGoBack reste false (état initial), le BackHandler retourne false
      const lastHandler = handlers[handlers.length - 1];
      expect(lastHandler).toBeDefined();
      expect(lastHandler?.()).toBe(false);
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

  // ── Bug 2 — onNavigationStateChange met à jour canGoBack ────────────────────

  describe('Bug 2 — onNavigationStateChange', () => {
    it('configure onNavigationStateChange sur la WebView', async () => {
      renderArticleScreen();
      await act(async () => { await Promise.resolve(); });

      expect(capturedWebViewHandlers.onNavigationStateChange).toBeDefined();
    });

    it('met à jour webViewCanGoBack quand navState.canGoBack change', async () => {
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

      // État initial : webViewCanGoBack = false → le premier handler retourne false
      const initialCount = handlers.length;
      const initialHandler = handlers[initialCount - 1];
      expect(initialHandler?.()).toBe(false);

      // Simuler une navigation interne dans la WebView (ex: ancre #section)
      // Cela déclenche setWebViewCanGoBack(true) → re-rendu → useEffect se ré-exécute
      await act(async () => {
        capturedWebViewHandlers.onNavigationStateChange?.({
          canGoBack: true,
          url: 'about:blank',
        });
      });

      // Attendre que le useEffect BackHandler soit re-exécuté avec webViewCanGoBack = true
      await waitFor(() => {
        expect(handlers.length).toBeGreaterThan(initialCount);
      });

      // Le dernier handler doit retourner true (capture webViewCanGoBack = true)
      const updatedHandler = handlers[handlers.length - 1];
      expect(updatedHandler?.()).toBe(true);
    });
  });

  // ── États de chargement ──────────────────────────────────────────────────────

  describe('États de chargement', () => {
    it('affiche le skeleton en état loading', () => {
      mockContentState = { status: 'loading' };
      const { getByRole } = renderArticleScreen();
      // En état loading, le header est affiché avec le titre
      expect(getByRole('header')).toBeTruthy();
    });

    it('affiche l\'erreur not_found correctement', async () => {
      mockContentState = { status: 'not_found', title: 'Article Inexistant' };
      const { getByText } = renderArticleScreen('Article Inexistant');
      await act(async () => { await Promise.resolve(); });
      expect(getByText('Article introuvable')).toBeTruthy();
    });

    it('affiche l\'erreur réseau avec bouton retry', async () => {
      mockContentState = { status: 'error', message: 'Network error' };
      const { getByText } = renderArticleScreen();
      await act(async () => { await Promise.resolve(); });
      expect(getByText('Impossible de charger cet article.')).toBeTruthy();
      expect(getByText('Réessayer')).toBeTruthy();
    });
  });
});
