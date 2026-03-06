/**
 * WikipediaWebView Tests — WikiHop Mobile — Rollback V1
 *
 * Teste :
 *   1. Fonctions pures (TDD) :
 *      - isPlayableWikipediaUrl : filtrage des URLs Wikipedia mobile jouables
 *      - titlesMatch : comparaison de titres insensible casse/underscores
 *      - extractTitleFromUrl : extraction du titre depuis une URL mobile
 *      - buildArticleUrl : construction de l'URL mobile
 *
 *   2. Composant WikipediaWebView :
 *      - Rendu sans crash
 *      - Configuration WebView : source URI, injectedJavaScript (post-chargement)
 *      - onNavigationStateChange : notifie le parent ET appelle onPageChange si nouvel article
 *      - onLoadEnd et onError transmis correctement
 *      - Pas de onShouldStartLoadWithRequest (rollback V1 — supprimé pour éviter page blanche)
 *
 * ADR-003 : React Native Testing Library pour les tests de composants
 */

import { render } from '@testing-library/react-native';
import React from 'react';

import {
  WikipediaWebView,
  buildArticleUrl,
  extractTitleFromUrl,
  isPlayableWikipediaUrl,
  titlesMatch,
} from '../src/components/game/WikipediaWebView';

// ─────────────────────────────────────────────────────────────────────────────
// Mock react-native-webview
// ─────────────────────────────────────────────────────────────────────────────

// Le composant WebView natif n'est pas testable unitairement.
// On mock minimal pour capturer les props passées par WikipediaWebView.
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  interface MockWebViewProps {
    testID?: string;
    source?: { uri?: string };
    onLoadStart?: () => void;
    onLoadEnd?: () => void;
    onError?: (event: { nativeEvent: { description: string } }) => void;
    onNavigationStateChange?: (navState: { url: string; canGoBack: boolean; loading: boolean }) => void;
    injectedJavaScript?: string;
    onShouldStartLoadWithRequest?: unknown;
  }

  let capturedSource: { uri?: string } | undefined;
  let capturedOnLoadEnd: (() => void) | undefined;
  let capturedOnError: ((event: { nativeEvent: { description: string } }) => void) | undefined;
  let capturedOnNavigationStateChange: ((navState: { url: string; canGoBack: boolean; loading: boolean }) => void) | undefined;
  let capturedInjectedScript: string | undefined;
  let capturedOnLoadStart: (() => void) | undefined;
  let capturedOnShouldStartLoadWithRequest: unknown;

  const MockWebView = React.forwardRef(function MockWebView(
    props: MockWebViewProps,
    _ref: React.Ref<unknown>,
  ) {
    capturedSource = props.source;
    capturedOnLoadEnd = props.onLoadEnd;
    capturedOnError = props.onError;
    capturedOnNavigationStateChange = props.onNavigationStateChange;
    capturedInjectedScript = props.injectedJavaScript;
    capturedOnLoadStart = props.onLoadStart;
    capturedOnShouldStartLoadWithRequest = props.onShouldStartLoadWithRequest;

    return React.createElement(
      View,
      { testID: props.testID ?? 'mock-webview' },
      React.createElement(Text, null, 'MockWebView'),
    );
  });

  return {
    WebView: MockWebView,
    __getSource: () => capturedSource,
    __getOnLoadEnd: () => capturedOnLoadEnd,
    __getOnError: () => capturedOnError,
    __getOnNavigationStateChange: () => capturedOnNavigationStateChange,
    __getInjectedScript: () => capturedInjectedScript,
    __getOnLoadStart: () => capturedOnLoadStart,
    __getOnShouldStartLoadWithRequest: () => capturedOnShouldStartLoadWithRequest,
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper : accès aux handlers capturés
// ─────────────────────────────────────────────────────────────────────────────

type MockWebViewModule = {
  __getSource: () => { uri?: string } | undefined;
  __getOnLoadEnd: () => (() => void) | undefined;
  __getOnError: () => ((event: { nativeEvent: { description: string } }) => void) | undefined;
  __getOnNavigationStateChange: () => ((navState: { url: string; canGoBack: boolean; loading: boolean }) => void) | undefined;
  __getInjectedScript: () => string | undefined;
  __getOnLoadStart: () => (() => void) | undefined;
  __getOnShouldStartLoadWithRequest: () => unknown;
};

function getWebViewHandlers() {
  const webviewModule = jest.requireMock<MockWebViewModule>('react-native-webview');
  return {
    source: webviewModule.__getSource(),
    onLoadEnd: webviewModule.__getOnLoadEnd(),
    onError: webviewModule.__getOnError(),
    onNavigationStateChange: webviewModule.__getOnNavigationStateChange(),
    injectedScript: webviewModule.__getInjectedScript(),
    onLoadStart: webviewModule.__getOnLoadStart(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de test
// ─────────────────────────────────────────────────────────────────────────────

const defaultProps = {
  currentTitle: 'Tour Eiffel',
  lang: 'fr' as const,
  onPageChange: jest.fn(),
};

// ─────────────────────────────────────────────────────────────────────────────
// TDD — isPlayableWikipediaUrl
// ─────────────────────────────────────────────────────────────────────────────

describe('isPlayableWikipediaUrl (fonction pure)', () => {
  describe('URLs autorisées', () => {
    it('autorise about:blank (chargement initial WebView)', () => {
      expect(isPlayableWikipediaUrl('about:blank', 'fr')).toBe(true);
    });

    it('autorise une URL Wikipedia mobile française valide', () => {
      expect(isPlayableWikipediaUrl('https://fr.m.wikipedia.org/wiki/Tour_Eiffel', 'fr')).toBe(true);
    });

    it('autorise une URL Wikipedia mobile anglaise valide', () => {
      expect(isPlayableWikipediaUrl('https://en.m.wikipedia.org/wiki/Eiffel_Tower', 'en')).toBe(true);
    });

    it('autorise un titre avec des espaces encodés', () => {
      expect(isPlayableWikipediaUrl('https://fr.m.wikipedia.org/wiki/Mus%C3%A9e%20du%20Louvre', 'fr')).toBe(true);
    });

    it('autorise un titre avec une ancre #section', () => {
      // L'ancre est ignorée, le préfixe de l'article est valide
      expect(isPlayableWikipediaUrl('https://fr.m.wikipedia.org/wiki/Paris#Histoire', 'fr')).toBe(true);
    });
  });

  describe('URLs bloquées — mauvaise langue', () => {
    it('bloque une URL Wikipedia mobile de mauvaise langue (fr vs en)', () => {
      expect(isPlayableWikipediaUrl('https://fr.m.wikipedia.org/wiki/Paris', 'en')).toBe(false);
    });

    it('bloque une URL Wikipedia mobile de mauvaise langue (en vs fr)', () => {
      expect(isPlayableWikipediaUrl('https://en.m.wikipedia.org/wiki/Paris', 'fr')).toBe(false);
    });

    it('bloque une URL Wikipedia desktop (pas mobile)', () => {
      expect(isPlayableWikipediaUrl('https://fr.wikipedia.org/wiki/Paris', 'fr')).toBe(false);
    });
  });

  describe('URLs bloquées — namespaces non jouables', () => {
    it('bloque Special:', () => {
      expect(isPlayableWikipediaUrl('https://fr.m.wikipedia.org/wiki/Special:Search', 'fr')).toBe(false);
    });

    it('bloque Spécial:', () => {
      expect(isPlayableWikipediaUrl('https://fr.m.wikipedia.org/wiki/Sp%C3%A9cial:Recherche', 'fr')).toBe(false);
    });

    it('bloque File:', () => {
      expect(isPlayableWikipediaUrl('https://fr.m.wikipedia.org/wiki/File:Image.jpg', 'fr')).toBe(false);
    });

    it('bloque Fichier:', () => {
      expect(isPlayableWikipediaUrl('https://fr.m.wikipedia.org/wiki/Fichier:Image.jpg', 'fr')).toBe(false);
    });

    it('bloque Help:', () => {
      expect(isPlayableWikipediaUrl('https://en.m.wikipedia.org/wiki/Help:Editing', 'en')).toBe(false);
    });

    it('bloque Aide:', () => {
      expect(isPlayableWikipediaUrl('https://fr.m.wikipedia.org/wiki/Aide:%C3%89dition', 'fr')).toBe(false);
    });

    it('bloque Category:', () => {
      expect(isPlayableWikipediaUrl('https://en.m.wikipedia.org/wiki/Category:History', 'en')).toBe(false);
    });

    it('bloque Catégorie:', () => {
      expect(isPlayableWikipediaUrl('https://fr.m.wikipedia.org/wiki/Cat%C3%A9gorie:Histoire', 'fr')).toBe(false);
    });

    it('bloque Template:', () => {
      expect(isPlayableWikipediaUrl('https://en.m.wikipedia.org/wiki/Template:Infobox', 'en')).toBe(false);
    });

    it('bloque Talk:', () => {
      expect(isPlayableWikipediaUrl('https://en.m.wikipedia.org/wiki/Talk:Paris', 'en')).toBe(false);
    });

    it('bloque Wikipedia:', () => {
      expect(isPlayableWikipediaUrl('https://en.m.wikipedia.org/wiki/Wikipedia:Policy', 'en')).toBe(false);
    });

    it('bloque Wikipédia:', () => {
      expect(isPlayableWikipediaUrl('https://fr.m.wikipedia.org/wiki/Wikip%C3%A9dia:Politique', 'fr')).toBe(false);
    });

    it('bloque Portal:', () => {
      expect(isPlayableWikipediaUrl('https://en.m.wikipedia.org/wiki/Portal:Science', 'en')).toBe(false);
    });

    it('bloque Portail:', () => {
      expect(isPlayableWikipediaUrl('https://fr.m.wikipedia.org/wiki/Portail:Histoire', 'fr')).toBe(false);
    });
  });

  describe('URLs bloquées — liens externes', () => {
    it('bloque https://example.com', () => {
      expect(isPlayableWikipediaUrl('https://example.com', 'fr')).toBe(false);
    });

    it('bloque http://example.com', () => {
      expect(isPlayableWikipediaUrl('http://example.com/page', 'fr')).toBe(false);
    });

    it('bloque une URL vide', () => {
      expect(isPlayableWikipediaUrl('', 'fr')).toBe(false);
    });

    it('bloque une URL sans path d\'article', () => {
      // URL mobile sans /wiki/[titre] → path vide → bloqué
      expect(isPlayableWikipediaUrl('https://fr.m.wikipedia.org/wiki/', 'fr')).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TDD — titlesMatch
// ─────────────────────────────────────────────────────────────────────────────

describe('titlesMatch (fonction pure)', () => {
  it('retourne true pour des titres identiques', () => {
    expect(titlesMatch('Tour Eiffel', 'Tour Eiffel')).toBe(true);
  });

  it('retourne true insensible à la casse', () => {
    expect(titlesMatch('tour eiffel', 'Tour Eiffel')).toBe(true);
    expect(titlesMatch('TOUR EIFFEL', 'tour eiffel')).toBe(true);
  });

  it('retourne true avec underscores vs espaces', () => {
    expect(titlesMatch('Tour_Eiffel', 'Tour Eiffel')).toBe(true);
    expect(titlesMatch('Tour Eiffel', 'Tour_Eiffel')).toBe(true);
  });

  it('retourne true avec mélange casse et underscores', () => {
    expect(titlesMatch('tour_eiffel', 'Tour Eiffel')).toBe(true);
  });

  it('retourne false pour des titres différents', () => {
    expect(titlesMatch('Tour Eiffel', 'Louvre')).toBe(false);
  });

  it('retourne false pour des titres partiellement similaires', () => {
    expect(titlesMatch('Paris', 'Paris (ville)')).toBe(false);
  });

  it('gère les chaînes vides', () => {
    expect(titlesMatch('', '')).toBe(true);
    expect(titlesMatch('', 'Paris')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TDD — extractTitleFromUrl
// ─────────────────────────────────────────────────────────────────────────────

describe('extractTitleFromUrl (fonction pure)', () => {
  it('extrait le titre d\'une URL mobile française', () => {
    expect(extractTitleFromUrl('https://fr.m.wikipedia.org/wiki/Tour_Eiffel', 'fr'))
      .toBe('Tour Eiffel');
  });

  it('extrait le titre d\'une URL mobile anglaise', () => {
    expect(extractTitleFromUrl('https://en.m.wikipedia.org/wiki/Eiffel_Tower', 'en'))
      .toBe('Eiffel Tower');
  });

  it('ignore les ancres (#section)', () => {
    expect(extractTitleFromUrl('https://fr.m.wikipedia.org/wiki/Paris#Histoire', 'fr'))
      .toBe('Paris');
  });

  it('décode les caractères URL-encodés', () => {
    expect(extractTitleFromUrl('https://fr.m.wikipedia.org/wiki/Mus%C3%A9e_du_Louvre', 'fr'))
      .toBe('Musée du Louvre');
  });

  it('extrait le titre d\'une URL Wikipedia de mauvaise langue (approche permissive)', () => {
    // Pas de restriction de domaine — on accepte toute URL contenant /wiki/
    expect(extractTitleFromUrl('https://en.m.wikipedia.org/wiki/Paris', 'fr'))
      .toBe('Paris');
  });

  it('extrait le titre d\'une URL desktop (approche permissive)', () => {
    // Pas de restriction mobile/desktop — on accepte toute URL contenant /wiki/
    expect(extractTitleFromUrl('https://fr.wikipedia.org/wiki/Paris', 'fr'))
      .toBe('Paris');
  });

  it('ignore les query params dans le titre', () => {
    expect(extractTitleFromUrl('https://fr.m.wikipedia.org/wiki/Paris?useskin=minerva', 'fr'))
      .toBe('Paris');
  });

  it('retourne null pour about:blank', () => {
    expect(extractTitleFromUrl('about:blank', 'fr')).toBeNull();
  });

  it('retourne null si le path est vide', () => {
    expect(extractTitleFromUrl('https://fr.m.wikipedia.org/wiki/', 'fr')).toBeNull();
  });

  it('remplace les underscores par des espaces', () => {
    expect(extractTitleFromUrl('https://fr.m.wikipedia.org/wiki/Musée_du_Louvre', 'fr'))
      .toBe('Musée du Louvre');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TDD — buildArticleUrl
// ─────────────────────────────────────────────────────────────────────────────

describe('buildArticleUrl (fonction pure)', () => {
  it('construit une URL mobile française', () => {
    expect(buildArticleUrl('Tour Eiffel', 'fr'))
      .toBe('https://fr.m.wikipedia.org/wiki/Tour%20Eiffel');
  });

  it('construit une URL mobile anglaise', () => {
    expect(buildArticleUrl('Eiffel Tower', 'en'))
      .toBe('https://en.m.wikipedia.org/wiki/Eiffel%20Tower');
  });

  it('encode les caractères spéciaux', () => {
    expect(buildArticleUrl('Musée du Louvre', 'fr'))
      .toBe('https://fr.m.wikipedia.org/wiki/Mus%C3%A9e%20du%20Louvre');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Composant WikipediaWebView
// ─────────────────────────────────────────────────────────────────────────────

describe('WikipediaWebView (composant)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    defaultProps.onPageChange.mockClear();
  });

  describe('Rendu', () => {
    it('rend sans crash avec les props minimales', () => {
      expect(() =>
        render(<WikipediaWebView {...defaultProps} />),
      ).not.toThrow();
    });

    it('rend sans crash avec toutes les props', () => {
      const onLoadEnd = jest.fn();
      const onError = jest.fn();
      const onNavigationStateChange = jest.fn();
      expect(() =>
        render(
          <WikipediaWebView
            {...defaultProps}
            onLoadEnd={onLoadEnd}
            onError={onError}
            onNavigationStateChange={onNavigationStateChange}
          />,
        ),
      ).not.toThrow();
    });
  });

  describe('Configuration de la source WebView', () => {
    it('passe l\'URL mobile correcte comme source', () => {
      render(<WikipediaWebView {...defaultProps} />);
      const { source } = getWebViewHandlers();
      expect(source?.uri).toBe('https://fr.m.wikipedia.org/wiki/Tour%20Eiffel');
    });

    it('met à jour la source quand currentTitle change', () => {
      const { rerender } = render(<WikipediaWebView {...defaultProps} />);
      rerender(
        <WikipediaWebView
          {...defaultProps}
          currentTitle="Louvre"
        />,
      );
      const { source } = getWebViewHandlers();
      expect(source?.uri).toBe('https://fr.m.wikipedia.org/wiki/Louvre');
    });

    it('utilise la langue anglaise correctement', () => {
      render(
        <WikipediaWebView
          currentTitle="Eiffel Tower"
          lang="en"
          onPageChange={jest.fn()}
        />,
      );
      const { source } = getWebViewHandlers();
      expect(source?.uri).toBe('https://en.m.wikipedia.org/wiki/Eiffel%20Tower');
    });
  });

  describe('CSS injection (injectedJavaScript — post-chargement)', () => {
    it('injecte le script CSS via injectedJavaScript', () => {
      render(<WikipediaWebView {...defaultProps} />);
      const { injectedScript } = getWebViewHandlers();
      expect(injectedScript).toBeDefined();
      expect(typeof injectedScript).toBe('string');
    });

    it('le script CSS masque le header Minerva', () => {
      render(<WikipediaWebView {...defaultProps} />);
      const { injectedScript } = getWebViewHandlers();
      expect(injectedScript).toContain('header-container');
    });

    it('le script CSS masque le footer Minerva', () => {
      render(<WikipediaWebView {...defaultProps} />);
      const { injectedScript } = getWebViewHandlers();
      expect(injectedScript).toContain('minerva-footer');
    });

    it('le script CSS masque les boutons d\'édition', () => {
      render(<WikipediaWebView {...defaultProps} />);
      const { injectedScript } = getWebViewHandlers();
      expect(injectedScript).toContain('mw-editsection');
    });

    it('le script se termine par true (requis Android)', () => {
      render(<WikipediaWebView {...defaultProps} />);
      const { injectedScript } = getWebViewHandlers();
      expect(injectedScript?.trimEnd()).toMatch(/true;\s*\}\)\(\);/s);
    });
  });

  describe('onNavigationStateChange', () => {
    it('configure onNavigationStateChange', () => {
      render(<WikipediaWebView {...defaultProps} />);
      const { onNavigationStateChange } = getWebViewHandlers();
      expect(onNavigationStateChange).toBeDefined();
    });

    it('déclenche onPageChange même si loading === true (comportement Android)', () => {
      // Sur Android WebView, la nouvelle URL n'apparaît parfois que dans l'événement
      // loading=true (onPageStarted). On ne filtre donc plus sur loading.
      const onPageChange = jest.fn();
      render(
        <WikipediaWebView
          {...defaultProps}
          onPageChange={onPageChange}
        />,
      );
      const { onNavigationStateChange } = getWebViewHandlers();
      onNavigationStateChange?.({
        url: 'https://fr.m.wikipedia.org/wiki/Paris',
        canGoBack: false,
        loading: true,
      });
      expect(onPageChange).toHaveBeenCalledWith('Paris');
    });

    it('ne déclenche pas onPageChange si même titre que currentTitle', () => {
      const onPageChange = jest.fn();
      render(
        <WikipediaWebView
          currentTitle="Tour Eiffel"
          lang="fr"
          onPageChange={onPageChange}
        />,
      );
      const { onNavigationStateChange } = getWebViewHandlers();
      // URL correspondant au titre courant → pas de saut
      onNavigationStateChange?.({
        url: 'https://fr.m.wikipedia.org/wiki/Tour_Eiffel',
        canGoBack: false,
        loading: false,
      });
      expect(onPageChange).not.toHaveBeenCalled();
    });

    it('ne déclenche pas onPageChange si même titre (ancre #section)', () => {
      const onPageChange = jest.fn();
      render(
        <WikipediaWebView
          currentTitle="Tour Eiffel"
          lang="fr"
          onPageChange={onPageChange}
        />,
      );
      const { onNavigationStateChange } = getWebViewHandlers();
      onNavigationStateChange?.({
        url: 'https://fr.m.wikipedia.org/wiki/Tour_Eiffel#Architecture',
        canGoBack: false,
        loading: false,
      });
      expect(onPageChange).not.toHaveBeenCalled();
    });

    it('déclenche onPageChange avec le nouveau titre quand on change de page', () => {
      const onPageChange = jest.fn();
      render(
        <WikipediaWebView
          currentTitle="Tour Eiffel"
          lang="fr"
          onPageChange={onPageChange}
        />,
      );
      const { onNavigationStateChange } = getWebViewHandlers();
      onNavigationStateChange?.({
        url: 'https://fr.m.wikipedia.org/wiki/Paris',
        canGoBack: true,
        loading: false,
      });
      expect(onPageChange).toHaveBeenCalledWith('Paris');
      expect(onPageChange).toHaveBeenCalledTimes(1);
    });

    it('normalise les underscores en espaces dans le titre', () => {
      const onPageChange = jest.fn();
      render(
        <WikipediaWebView
          currentTitle="Tour Eiffel"
          lang="fr"
          onPageChange={onPageChange}
        />,
      );
      const { onNavigationStateChange } = getWebViewHandlers();
      onNavigationStateChange?.({
        url: 'https://fr.m.wikipedia.org/wiki/Musée_du_Louvre',
        canGoBack: true,
        loading: false,
      });
      expect(onPageChange).toHaveBeenCalledWith('Musée du Louvre');
    });

    it('ne déclenche pas onPageChange si URL non-Wikipedia (about:blank)', () => {
      const onPageChange = jest.fn();
      render(
        <WikipediaWebView
          currentTitle="Tour Eiffel"
          lang="fr"
          onPageChange={onPageChange}
        />,
      );
      const { onNavigationStateChange } = getWebViewHandlers();
      onNavigationStateChange?.({
        url: 'about:blank',
        canGoBack: false,
        loading: false,
      });
      expect(onPageChange).not.toHaveBeenCalled();
    });

    it('notifie onNavigationStateChange du parent avec canGoBack', () => {
      const onParentNavStateChange = jest.fn();
      render(
        <WikipediaWebView
          {...defaultProps}
          onNavigationStateChange={onParentNavStateChange}
        />,
      );
      const { onNavigationStateChange } = getWebViewHandlers();
      onNavigationStateChange?.({
        url: 'https://fr.m.wikipedia.org/wiki/Paris',
        canGoBack: true,
        loading: false,
      });
      expect(onParentNavStateChange).toHaveBeenCalledWith({
        canGoBack: true,
        url: 'https://fr.m.wikipedia.org/wiki/Paris',
      });
    });

    it('notifie onNavigationStateChange même si loading === true (pour canGoBack)', () => {
      const onParentNavStateChange = jest.fn();
      render(
        <WikipediaWebView
          {...defaultProps}
          onNavigationStateChange={onParentNavStateChange}
        />,
      );
      const { onNavigationStateChange } = getWebViewHandlers();
      onNavigationStateChange?.({
        url: 'https://fr.m.wikipedia.org/wiki/Paris',
        canGoBack: false,
        loading: true,
      });
      // onNavigationStateChange parent est toujours appelé (même pendant le chargement)
      expect(onParentNavStateChange).toHaveBeenCalled();
    });
  });

  describe('onLoadEnd', () => {
    it('appelle onLoadEnd quand la prop est fournie', () => {
      const onLoadEnd = jest.fn();
      render(
        <WikipediaWebView
          {...defaultProps}
          onLoadEnd={onLoadEnd}
        />,
      );
      const { onLoadEnd: capturedLoadEnd } = getWebViewHandlers();
      capturedLoadEnd?.();
      expect(onLoadEnd).toHaveBeenCalledTimes(1);
    });

    it('configure toujours onLoadEnd (gère le spinner de chargement en interne)', () => {
      render(<WikipediaWebView {...defaultProps} />);
      const { onLoadEnd } = getWebViewHandlers();
      // onLoadEnd est toujours configuré même sans prop (pour le spinner interne)
      expect(onLoadEnd).toBeDefined();
    });
  });

  describe('onError', () => {
    it('appelle onError avec la description de l\'erreur', () => {
      const onError = jest.fn();
      render(
        <WikipediaWebView
          {...defaultProps}
          onError={onError}
        />,
      );
      const { onError: capturedError } = getWebViewHandlers();
      capturedError?.({ nativeEvent: { description: 'Network request failed' } });
      expect(onError).toHaveBeenCalledWith('Network request failed');
    });

    it('ne configure pas onError si la prop est absente', () => {
      render(<WikipediaWebView {...defaultProps} />);
      const { onError } = getWebViewHandlers();
      // Sans prop onError, la WebView ne doit pas avoir de handler onError
      expect(onError).toBeUndefined();
    });
  });

  describe('Pas de onShouldStartLoadWithRequest (rollback V1)', () => {
    it('ne configure pas onShouldStartLoadWithRequest sur la WebView', () => {
      // Approche V1 : on laisse Wikipedia gérer ses redirections internes
      // sans bloquer les requêtes via onShouldStartLoadWithRequest
      render(<WikipediaWebView {...defaultProps} />);
      const webviewModule = jest.requireMock<MockWebViewModule>('react-native-webview');
      expect(webviewModule.__getOnShouldStartLoadWithRequest()).toBeUndefined();
    });
  });
});
