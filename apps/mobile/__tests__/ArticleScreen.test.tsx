/**
 * ArticleScreen Tests — WikiHop Mobile — Hotfix boucle de sauts (F3-34)
 *
 * Teste la nouvelle architecture deux états (webViewSource / currentTitle) :
 *
 *   Navigation :
 *     - onPageChange est connecté à WikipediaWebView via onNavigationStateChange
 *     - Chaque changement de page (forward) appelle addJump et push dans articleStack
 *     - Victoire : titlesMatch(newTitle, targetTitle) → completeSession + navigate('Victory')
 *     - Navigation header : bouton "← Retour" visible si stackSize > 1
 *       (stack applicatif, pas webViewCanGoBack)
 *
 *   Architecture deux états (hotfix boucle de sauts) :
 *     - webViewSource : pilote la source de WikipediaWebView, ne change QUE lors d'un retour
 *     - currentTitle : affichage header uniquement, ne déclenche pas de rechargement WebView
 *     - Forward nav : setCurrentTitle + push + setStackSize dans le même call synchrone
 *       → un seul render → webViewSource inchangé → pas de boucle de rechargement
 *
 *   BackHandler Android (F3-34) :
 *     - Enregistré quand isFocused === true
 *     - stackSize > 1 → handleGoBack() (pop stack + setWebViewSource) → return true
 *     - stackSize === 1 → handleAbandon() (Alert) + return true
 *     - mockWebViewGoBack ne doit PLUS être appelé (architecture F3-34)
 *
 *   Retour arrière via bouton header :
 *     - isBackNavigation flag distingue pop stack d'un saut forward
 *     - pop stack → setWebViewSource(prevTitle) → onNavigationStateChange déclenché
 *     - Ne compte PAS de saut (pas addJump)
 *
 *   État d'erreur :
 *     - onError de WikipediaWebView → affichage écran erreur + bouton Réessayer
 *     - Bouton Réessayer réinitialise webViewSource, currentTitle et webViewError
 *
 * Mocks : react-native-webview (WikipediaWebView), stores Zustand, navigation, BackHandler
 *
 * ADR-003 : React Native Testing Library pour les tests de composants
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { render, act, waitFor, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { Alert, BackHandler } from 'react-native';

import type { RootStackParamList } from '../src/navigation/RootNavigator';

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
const mockAbandonSession = jest.fn().mockResolvedValue(undefined);

// P-17 : session mutable — isDailyChallenge peut être activé/désactivé par test
// L'objet est muté directement (pas de spread) pour que la closure dans jest.mock
// lise toujours la valeur courante au moment de l'appel du sélecteur.
const mockCurrentSession: {
  status: string;
  jumps: number;
  path: Array<{ id: string; title: string; url: string; language: string }>;
  startArticle: { id: string; title: string; url: string; language: string };
  targetArticle: { id: string; title: string; url: string; language: string };
  startedAt: Date;
  isDailyChallenge?: boolean;
} = {
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
    abandonSession: jest.Mock;
    clearSession: jest.Mock;
    startSession: jest.Mock;
  }) => unknown) =>
    selector({
      currentSession: mockCurrentSession,
      addJump: mockAddJump,
      completeSession: mockCompleteSession,
      abandonSession: mockAbandonSession,
      clearSession: jest.fn().mockResolvedValue(undefined),
      startSession: jest.fn().mockResolvedValue(undefined),
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

const mockNavigation = {
  goBack: mockGoBack,
  push: mockPush,
  navigate: mockNavigate,
  canGoBack: jest.fn(() => false),
  replace: jest.fn(),
};

type GameScreenProps = NativeStackScreenProps<RootStackParamList, 'Game'>;

function renderArticleScreen(articleTitle = 'Tour Eiffel'): ReturnType<typeof render> {
  return render(
    <ArticleScreen
      navigation={mockNavigation as unknown as GameScreenProps['navigation']}
      route={{ key: 'Game', name: 'Game', params: { articleTitle } } as unknown as GameScreenProps['route']}
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
    // P-17 : réinitialiser isDailyChallenge à false entre chaque test
    delete mockCurrentSession.isDailyChallenge;
    mockWebViewGoBack.mockClear();
    mockWebViewInjectJavaScript.mockClear();
    mockAddJump.mockResolvedValue(undefined);
    mockCompleteSession.mockResolvedValue(undefined);
    mockAbandonSession.mockResolvedValue(undefined);
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

    it('n\'affiche pas le bouton retour si stackSize === 1 (état initial — F3-34)', async () => {
      // F3-34 : le bouton est conditionné sur stackSize > 1 (stack applicatif)
      // stackSize démarre à 1 — aucun saut forward encore
      const { queryByText } = renderArticleScreen();
      await act(async () => { await Promise.resolve(); });
      expect(queryByText('← Retour')).toBeNull();
    });

    it('affiche le bouton retour après un saut forward (stackSize > 1 — F3-34)', async () => {
      // F3-34 : le bouton devient visible après un saut forward (push dans articleStack)
      const { queryByText } = renderArticleScreen();
      await act(async () => { await Promise.resolve(); });

      // Simuler un saut forward : Paris (nouvel article)
      await act(async () => {
        capturedWebViewProps.onNavigationStateChange?.({
          canGoBack: true,
          url: 'https://fr.m.wikipedia.org/wiki/Paris',
          loading: false,
        });
        await Promise.resolve();
      });

      // Attendre addJump (qui indique le saut forward pris en compte)
      await waitFor(() => {
        expect(mockAddJump).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Paris' }),
        );
      });

      expect(queryByText('← Retour')).toBeTruthy();
    });

    it('affiche le GameHUD', () => {
      renderArticleScreen();
      // GameHUD est rendu — pas de crash
    });
  });

  // ── Connexion de WikipediaWebView ────────────────────────────────────────────

  describe('Configuration de WikipediaWebView', () => {
    it('configure WikipediaWebView avec onNavigationStateChange (pour le comptage de sauts)', async () => {
      renderArticleScreen();
      await act(async () => { await Promise.resolve(); });
      expect(capturedWebViewProps.onNavigationStateChange).toBeDefined();
    });

    it('rend WikipediaWebView dans le DOM', async () => {
      renderArticleScreen();
      await act(async () => { await Promise.resolve(); });
      // WikipediaWebView est rendu (testID mock-webview)
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

    it('déclenche addJump même si loading === true (comportement Android)', async () => {
      // Sur Android, la nouvelle URL n'apparaît parfois que dans loading=true.
      renderArticleScreen('Tour Eiffel');
      await act(async () => { await Promise.resolve(); });

      const { onNavigationStateChange } = capturedWebViewProps;

      await act(async () => {
        onNavigationStateChange?.({
          url: 'https://fr.m.wikipedia.org/wiki/Paris',
          canGoBack: false,
          loading: true,
        });
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(mockAddJump).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Paris' }),
        );
      });
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

    it('ne déclenche pas addJump lors d\'un retour arrière (isBackNavigation flag — F3-34)', async () => {
      // F3-34 hotfix : quand handleGoBack() est appelé, isBackNavigation.current = true
      // + setWebViewSource(prevTitle) déclenche le rechargement
      // Le prochain onNavigationStateChange doit être ignoré (pas de addJump)
      const { queryByText } = renderArticleScreen('Tour Eiffel');
      await act(async () => { await Promise.resolve(); });

      const { onNavigationStateChange } = capturedWebViewProps;

      // 1. Saut forward : Paris
      await act(async () => {
        onNavigationStateChange?.({
          url: 'https://fr.m.wikipedia.org/wiki/Paris',
          canGoBack: true,
          loading: false,
        });
        await Promise.resolve();
      });
      await waitFor(() => { expect(mockAddJump).toHaveBeenCalledTimes(1); });

      // 2. Retour arrière via bouton header
      mockAddJump.mockClear();
      const backButton = queryByText('← Retour');
      expect(backButton).toBeTruthy();

      await act(async () => {
        if (backButton) {
          fireEvent.press(backButton);
        }
        await Promise.resolve();
      });

      // 3. onNavigationStateChange déclenché par le changement de source (retour)
      await act(async () => {
        onNavigationStateChange?.({
          url: 'https://fr.m.wikipedia.org/wiki/Tour_Eiffel',
          canGoBack: false,
          loading: false,
        });
        await Promise.resolve();
      });

      // addJump NE doit PAS être appelé (retour arrière)
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

    it('appelle handleGoBack (pop stack) et retourne true si stackSize > 1 (F3-34)', async () => {
      // F3-34 : le BackHandler utilise le stack applicatif, pas webViewRef.goBack()
      // Hotfix : handleGoBack appelle setWebViewSource (pas setCurrentTitle) pour recharger la WebView
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

      // Simuler un saut forward pour que stackSize > 1
      await act(async () => {
        capturedWebViewProps.onNavigationStateChange?.({
          canGoBack: true,
          url: 'https://fr.m.wikipedia.org/wiki/Paris',
          loading: false,
        });
        await Promise.resolve();
      });

      await waitFor(() => { expect(mockAddJump).toHaveBeenCalledTimes(1); });

      // Le dernier handler BackHandler a été enregistré avec stackSize > 1
      const lastHandler = handlers[handlers.length - 1];
      expect(lastHandler).toBeDefined();

      // Encapsuler dans act car handleGoBack déclenche plusieurs setState (webViewSource, currentTitle, stackSize)
      let result: boolean | undefined;
      await act(async () => {
        result = lastHandler?.();
        await Promise.resolve();
      });

      expect(result).toBe(true);
      // F3-34 : webViewRef.goBack() ne doit plus être appelé
      expect(mockWebViewGoBack).not.toHaveBeenCalled();
    });

    it('appelle handleAbandon (Alert) et retourne true si stackSize === 1', async () => {
      // F3-34 : si stack vide (article initial) → proposer abandon
      mockIsFocused = true;
      // stackSize est 1 par défaut (pas de saut forward)

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
      // stackSize === 1 → handleAbandon() + return true
      expect(result).toBe(true);
      expect(alertSpy).toHaveBeenCalledWith(
        'Abandonner la partie ?',
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

  // ── Bouton Abandonner ────────────────────────────────────────────────────────

  describe('Bouton Abandonner', () => {
    it('affiche le bouton Abandonner dans le header', () => {
      const { getByText } = renderArticleScreen();
      expect(getByText('Abandonner')).toBeTruthy();
    });

    it('affiche une Alert avec "Reprendre" et "Confirmer" au tap', () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByLabelText } = renderArticleScreen();

      fireEvent.press(getByLabelText('Abandonner la partie'));

      expect(alertSpy).toHaveBeenCalledWith(
        'Abandonner la partie ?',
        'Votre progression sera perdue.',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Reprendre', style: 'cancel' }),
          expect.objectContaining({ text: 'Confirmer', style: 'destructive' }),
        ]),
      );
    });

    it('appelle abandonSession puis navigate("Home") sur confirmation', async () => {
      let confirmCallback: (() => void) | undefined;
      jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
        const confirmBtn = (buttons as Array<{ text: string; onPress?: () => void }>)
          .find((b) => b.text === 'Confirmer');
        confirmCallback = confirmBtn?.onPress;
      });

      const { getByLabelText } = renderArticleScreen();
      fireEvent.press(getByLabelText('Abandonner la partie'));

      expect(confirmCallback).toBeDefined();
      await act(async () => { confirmCallback?.(); await Promise.resolve(); });

      await waitFor(() => {
        expect(mockAbandonSession).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('Home');
      });
    });
  });

  // ── Gestion des erreurs WebView ──────────────────────────────────────────────

  describe('Erreur WebView', () => {
    it('affiche l\'écran d\'erreur si WikipediaWebView appelle onError', async () => {
      const { getByText } = renderArticleScreen();
      await act(async () => { await Promise.resolve(); });

      const { onError } = capturedWebViewProps;
      expect(onError).toBeDefined();

      await act(async () => {
        onError?.({ nativeEvent: { description: 'Network request failed' } });
      });

      // Après l'erreur, l'UI d'erreur est affichée
      expect(getByText('Impossible de charger cet article.')).toBeTruthy();
    });

    it('affiche le message de connexion dans l\'écran d\'erreur', async () => {
      const { getByText } = renderArticleScreen();
      await act(async () => { await Promise.resolve(); });

      await act(async () => {
        capturedWebViewProps.onError?.({ nativeEvent: { description: 'Timeout' } });
      });

      expect(getByText('Vérifiez votre connexion internet.')).toBeTruthy();
    });

    it('affiche le bouton Réessayer dans l\'écran d\'erreur', async () => {
      const { getByLabelText } = renderArticleScreen();
      await act(async () => { await Promise.resolve(); });

      await act(async () => {
        capturedWebViewProps.onError?.({ nativeEvent: { description: 'Error' } });
      });

      expect(getByLabelText("Réessayer de charger l'article")).toBeTruthy();
    });

    it('le bouton Réessayer réinitialise l\'état d\'erreur et recharge l\'article', async () => {
      const { getByLabelText, queryByText } = renderArticleScreen('Tour Eiffel');
      await act(async () => { await Promise.resolve(); });

      // Déclencher l'erreur
      await act(async () => {
        capturedWebViewProps.onError?.({ nativeEvent: { description: 'Error' } });
      });

      // Vérifier que l'erreur est affichée
      expect(queryByText('Impossible de charger cet article.')).toBeTruthy();

      // Appuyer sur Réessayer
      await act(async () => {
        fireEvent.press(getByLabelText("Réessayer de charger l'article"));
      });

      // L'écran d'erreur disparaît
      expect(queryByText('Impossible de charger cet article.')).toBeNull();
    });
  });

  // ── Bouton retour header (stackSize > 1 — F3-34) ─────────────────────────

  describe('Bouton retour header (F3-34 — stack applicatif)', () => {
    it('appelle handleGoBack au clic et décrémente le stack', async () => {
      // F3-34 : le bouton retour appelle handleGoBack() qui pop le stack applicatif
      const { getByLabelText, queryByText } = renderArticleScreen('Tour Eiffel');
      await act(async () => { await Promise.resolve(); });

      // Saut forward pour que stackSize > 1
      await act(async () => {
        capturedWebViewProps.onNavigationStateChange?.({
          canGoBack: true,
          url: 'https://fr.m.wikipedia.org/wiki/Paris',
          loading: false,
        });
        await Promise.resolve();
      });

      await waitFor(() => { expect(mockAddJump).toHaveBeenCalledTimes(1); });
      expect(queryByText('← Retour')).toBeTruthy();

      // Appuyer sur le bouton retour → handleGoBack → pop stack
      mockAddJump.mockClear();
      fireEvent.press(getByLabelText("Retour à l'article précédent"));

      // Après le retour, le stack revient à 1 → le bouton disparaît
      await waitFor(() => {
        expect(queryByText('← Retour')).toBeNull();
      });
    });

    it('ne comptabilise pas de saut lors du retour (isBackNavigation flag)', async () => {
      // F3-34 hotfix : handleGoBack pose isBackNavigation.current = true + setWebViewSource(prevTitle)
      // Le prochain onPageChange (déclenché par le rechargement WebView via webViewSource) ne doit PAS appeler addJump
      const { queryByText } = renderArticleScreen('Tour Eiffel');
      await act(async () => { await Promise.resolve(); });

      // Saut forward : Paris
      await act(async () => {
        capturedWebViewProps.onNavigationStateChange?.({
          url: 'https://fr.m.wikipedia.org/wiki/Paris',
          canGoBack: true,
          loading: false,
        });
        await Promise.resolve();
      });
      await waitFor(() => { expect(mockAddJump).toHaveBeenCalledTimes(1); });

      // Retour arrière via bouton header
      mockAddJump.mockClear();
      const backButton = queryByText('← Retour');
      expect(backButton).toBeTruthy();

      await act(async () => {
        if (backButton) { fireEvent.press(backButton); }
        await Promise.resolve();
      });

      // WikipediaWebView change de source → onPageChange déclenché avec le titre précédent
      await act(async () => {
        capturedWebViewProps.onNavigationStateChange?.({
          url: 'https://fr.m.wikipedia.org/wiki/Tour_Eiffel',
          canGoBack: false,
          loading: false,
        });
        await Promise.resolve();
      });

      // addJump NE doit PAS être appelé (retour arrière — isBackNavigation flag)
      expect(mockAddJump).not.toHaveBeenCalled();
    });
  });

  // ── P-17 — Bouton retour header et BackHandler en mode défi quotidien ─────────

  describe('P-17 — Bouton retour header et BackHandler en mode défi quotidien', () => {
    it('Cas 1 — Mode solo, stackSize > 1 : bouton retour visible', async () => {
      // isDailyChallenge = false (par défaut), stack = 2 après un saut forward
      mockCurrentSession.isDailyChallenge = false;
      const { queryByLabelText } = renderArticleScreen();
      await act(async () => { await Promise.resolve(); });

      // Simuler un saut forward pour stackSize > 1
      await act(async () => {
        capturedWebViewProps.onNavigationStateChange?.({
          canGoBack: true,
          url: 'https://fr.m.wikipedia.org/wiki/Paris',
          loading: false,
        });
        await Promise.resolve();
      });
      await waitFor(() => { expect(mockAddJump).toHaveBeenCalledTimes(1); });

      // Le bouton retour doit être visible (mode solo + stackSize > 1)
      expect(queryByLabelText("Retour à l'article précédent")).toBeTruthy();
    });

    it('Cas 2 — Mode défi, stackSize > 1 : bouton retour masqué', async () => {
      // isDailyChallenge = true → bouton retour masqué même si stackSize > 1
      mockCurrentSession.isDailyChallenge = true;
      const { queryByLabelText } = renderArticleScreen();
      await act(async () => { await Promise.resolve(); });

      // Simuler un saut forward pour stackSize > 1
      await act(async () => {
        capturedWebViewProps.onNavigationStateChange?.({
          canGoBack: true,
          url: 'https://fr.m.wikipedia.org/wiki/Paris',
          loading: false,
        });
        await Promise.resolve();
      });
      await waitFor(() => { expect(mockAddJump).toHaveBeenCalledTimes(1); });

      // Le bouton retour NE doit PAS être visible (mode défi)
      expect(queryByLabelText("Retour à l'article précédent")).toBeNull();
    });

    it('Cas 3 — Mode solo, stackSize = 1 : placeholder (non régressé)', async () => {
      // isDailyChallenge = false, stackSize = 1 (aucun saut forward)
      mockCurrentSession.isDailyChallenge = false;
      const { queryByLabelText } = renderArticleScreen();
      await act(async () => { await Promise.resolve(); });

      // Aucun saut forward → stackSize = 1 → bouton retour non visible
      expect(queryByLabelText("Retour à l'article précédent")).toBeNull();
    });

    it('Cas 4 — BackHandler mode défi → alerte daily_quit_title', async () => {
      // isDailyChallenge = true → BackHandler doit appeler Alert avec daily_quit_title
      mockCurrentSession.isDailyChallenge = true;
      mockIsFocused = true;

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

      let result: boolean | undefined;
      await act(async () => {
        result = lastHandler?.();
        await Promise.resolve();
      });

      expect(result).toBe(true);
      // Doit appeler Alert avec le titre daily_quit_title (résolu depuis fr.json)
      expect(alertSpy).toHaveBeenCalledWith(
        'Quitter le défi ?',
        expect.any(String),
        expect.any(Array),
      );
      // handleGoBack ne doit pas être appelé
      expect(mockWebViewGoBack).not.toHaveBeenCalled();
    });

    it('Cas 6 — confirmation daily_quit → navigate(Home) sans deuxième alerte (fix P-17-01)', async () => {
      // Vérifie que handleDailyQuit n'affiche qu'UNE seule alerte, et que la confirmation
      // navigue directement vers Home sans passer par handleAbandon (double alerte).
      mockCurrentSession.isDailyChallenge = true;
      mockIsFocused = true;

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

      // Déclenche le BackHandler → handleDailyQuit → Alert affiché
      const lastHandler = handlers[handlers.length - 1];
      await act(async () => { lastHandler?.(); await Promise.resolve(); });

      expect(alertSpy).toHaveBeenCalledTimes(1);
      expect(alertSpy).toHaveBeenCalledWith('Quitter le défi ?', expect.any(String), expect.any(Array));

      // Récupère les boutons de l'alerte et appuie sur "Quitter" (index 1)
      const alertButtons = alertSpy.mock.calls[0]?.[2] as Array<{ text: string; onPress?: () => void }>;
      const confirmButton = alertButtons?.[1];
      expect(confirmButton).toBeDefined();

      await act(async () => {
        confirmButton?.onPress?.();
        await Promise.resolve();
      });

      // Une seule alerte au total — handleAbandon() ne doit pas en afficher une deuxième
      expect(alertSpy).toHaveBeenCalledTimes(1);
      // Navigation vers Home après confirmation
      expect(mockNavigate).toHaveBeenCalledWith('Home');
      expect(mockAbandonSession).toHaveBeenCalled();
    });

    it('Cas 5 — BackHandler mode solo, stackSize > 1 → handleGoBack (non régressé)', async () => {
      // isDailyChallenge = false, stackSize > 1 → comportement inchangé (handleGoBack)
      mockCurrentSession.isDailyChallenge = false;
      mockIsFocused = true;

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

      // Saut forward pour stackSize > 1
      await act(async () => {
        capturedWebViewProps.onNavigationStateChange?.({
          canGoBack: true,
          url: 'https://fr.m.wikipedia.org/wiki/Paris',
          loading: false,
        });
        await Promise.resolve();
      });
      await waitFor(() => { expect(mockAddJump).toHaveBeenCalledTimes(1); });

      const lastHandler = handlers[handlers.length - 1];
      expect(lastHandler).toBeDefined();

      let result: boolean | undefined;
      await act(async () => {
        result = lastHandler?.();
        await Promise.resolve();
      });

      expect(result).toBe(true);
      // handleGoBack a été appelé (pop du stack) → webViewGoBack non appelé (architecture F3-34)
      expect(mockWebViewGoBack).not.toHaveBeenCalled();
      // Alert daily_quit ne doit pas être appelée
      expect(alertSpy).not.toHaveBeenCalledWith(
        'Quitter le défi ?',
        expect.any(String),
        expect.any(Array),
      );
    });
  });
});
