/**
 * WikipediaWebView Tests — WikiHop Mobile — Wave 3 (M-15)
 *
 * Teste le comportement du composant WikipediaWebView :
 *   - Rendu sans crash
 *   - Traitement des messages postMessage (payload valide, invalide, malformé)
 *   - Appel de onError en cas d'erreur WebView
 *   - onLoadEnd appelé correctement
 *
 * Note : le composant WebView natif n'est pas testable unitairement.
 * On teste handleMessage en isolation via fireEvent.
 * La WebView est mockée par jest-expo.
 *
 * ADR-003 : React Native Testing Library pour les tests de composants
 */

import { render } from '@testing-library/react-native';
import React from 'react';

import type { Article } from '@wikihop/shared';

import { WikipediaWebView } from '../src/components/game/WikipediaWebView';

// ─────────────────────────────────────────────────────────────────────────────
// Mock react-native-webview
// ─────────────────────────────────────────────────────────────────────────────

// jest-expo ne mock pas react-native-webview automatiquement.
// On crée un mock minimal qui expose onMessage via un TestID accessible.
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  interface MockWebViewProps {
    testID?: string;
    onMessage?: (event: { nativeEvent: { data: string } }) => void;
    onLoadEnd?: () => void;
    onError?: (event: { nativeEvent: { description: string } }) => void;
  }

  // Exposer les handlers via une ref de module pour les tests
  let capturedOnMessage: ((event: { nativeEvent: { data: string } }) => void) | undefined;
  let capturedOnLoadEnd: (() => void) | undefined;
  let capturedOnError: ((event: { nativeEvent: { description: string } }) => void) | undefined;

  const MockWebView = React.forwardRef(function MockWebView(
    props: MockWebViewProps,
    _ref: React.Ref<unknown>,
  ) {
    capturedOnMessage = props.onMessage;
    capturedOnLoadEnd = props.onLoadEnd;
    capturedOnError = props.onError;

    return React.createElement(
      View,
      { testID: props.testID ?? 'mock-webview' },
      React.createElement(Text, null, 'MockWebView'),
    );
  });

  return {
    WebView: MockWebView,
    __getOnMessage: () => capturedOnMessage,
    __getOnLoadEnd: () => capturedOnLoadEnd,
    __getOnError: () => capturedOnError,
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const mockArticle: Article = {
  id: '1234',
  title: 'Tour Eiffel',
  url: 'https://fr.wikipedia.org/wiki/Tour_Eiffel',
  language: 'fr',
};

function getWebViewHandlers() {
  const webviewModule = jest.requireMock<{
    __getOnMessage: () => ((event: { nativeEvent: { data: string } }) => void) | undefined;
    __getOnLoadEnd: () => (() => void) | undefined;
    __getOnError: () => ((event: { nativeEvent: { description: string } }) => void) | undefined;
  }>('react-native-webview');
  return {
    onMessage: webviewModule.__getOnMessage(),
    onLoadEnd: webviewModule.__getOnLoadEnd(),
    onError: webviewModule.__getOnError(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────name──────────
// ─────────────────────────────────────────────────────────────────────────────

describe('WikipediaWebView', () => {
  describe('Rendu', () => {
    it('rend sans crash avec les props minimales', () => {
      const onWikiLinkPress = jest.fn();
      expect(() =>
        render(
          <WikipediaWebView
            html="<p>Test</p>"
            article={mockArticle}
            onWikiLinkPress={onWikiLinkPress}
          />,
        ),
      ).not.toThrow();
    });

    it('rend sans crash avec toutes les props', () => {
      const onWikiLinkPress = jest.fn();
      const onLoadEnd = jest.fn();
      const onError = jest.fn();
      expect(() =>
        render(
          <WikipediaWebView
            html="<p>Test</p>"
            article={mockArticle}
            onWikiLinkPress={onWikiLinkPress}
            onLoadEnd={onLoadEnd}
            onError={onError}
          />,
        ),
      ).not.toThrow();
    });
  });

  describe('handleMessage — payload WIKI_LINK valide', () => {
    it('appelle onWikiLinkPress avec le titre du lien', () => {
      const onWikiLinkPress = jest.fn();
      render(
        <WikipediaWebView
          html="<p>Test</p>"
          article={mockArticle}
          onWikiLinkPress={onWikiLinkPress}
        />,
      );

      const { onMessage } = getWebViewHandlers();
      expect(onMessage).toBeDefined();

      const payload = JSON.stringify({ type: 'WIKI_LINK', title: 'Paris' });
      onMessage?.({ nativeEvent: { data: payload } });

      expect(onWikiLinkPress).toHaveBeenCalledWith('Paris');
      expect(onWikiLinkPress).toHaveBeenCalledTimes(1);
    });

    it('appelle onWikiLinkPress avec un titre contenant des espaces', () => {
      const onWikiLinkPress = jest.fn();
      render(
        <WikipediaWebView
          html="<p>Test</p>"
          article={mockArticle}
          onWikiLinkPress={onWikiLinkPress}
        />,
      );

      const { onMessage } = getWebViewHandlers();
      const payload = JSON.stringify({ type: 'WIKI_LINK', title: 'Musée du Louvre' });
      onMessage?.({ nativeEvent: { data: payload } });

      expect(onWikiLinkPress).toHaveBeenCalledWith('Musée du Louvre');
    });
  });

  describe('handleMessage — payload invalide', () => {
    it('ignore un message avec un type inconnu', () => {
      const onWikiLinkPress = jest.fn();
      render(
        <WikipediaWebView
          html="<p>Test</p>"
          article={mockArticle}
          onWikiLinkPress={onWikiLinkPress}
        />,
      );

      const { onMessage } = getWebViewHandlers();
      const payload = JSON.stringify({ type: 'UNKNOWN_TYPE', title: 'Paris' });
      onMessage?.({ nativeEvent: { data: payload } });

      expect(onWikiLinkPress).not.toHaveBeenCalled();
    });

    it('ignore un message sans champ title', () => {
      const onWikiLinkPress = jest.fn();
      render(
        <WikipediaWebView
          html="<p>Test</p>"
          article={mockArticle}
          onWikiLinkPress={onWikiLinkPress}
        />,
      );

      const { onMessage } = getWebViewHandlers();
      const payload = JSON.stringify({ type: 'WIKI_LINK' });
      onMessage?.({ nativeEvent: { data: payload } });

      expect(onWikiLinkPress).not.toHaveBeenCalled();
    });

    it('ignore un message avec title non-string', () => {
      const onWikiLinkPress = jest.fn();
      render(
        <WikipediaWebView
          html="<p>Test</p>"
          article={mockArticle}
          onWikiLinkPress={onWikiLinkPress}
        />,
      );

      const { onMessage } = getWebViewHandlers();
      const payload = JSON.stringify({ type: 'WIKI_LINK', title: 42 });
      onMessage?.({ nativeEvent: { data: payload } });

      expect(onWikiLinkPress).not.toHaveBeenCalled();
    });
  });

  describe('handleMessage — JSON malformé', () => {
    it('ignore silencieusement un JSON invalide', () => {
      const onWikiLinkPress = jest.fn();
      render(
        <WikipediaWebView
          html="<p>Test</p>"
          article={mockArticle}
          onWikiLinkPress={onWikiLinkPress}
        />,
      );

      const { onMessage } = getWebViewHandlers();
      expect(() => {
        onMessage?.({ nativeEvent: { data: 'not-valid-json{{{' } });
      }).not.toThrow();

      expect(onWikiLinkPress).not.toHaveBeenCalled();
    });

    it('ignore un payload JSON null', () => {
      const onWikiLinkPress = jest.fn();
      render(
        <WikipediaWebView
          html="<p>Test</p>"
          article={mockArticle}
          onWikiLinkPress={onWikiLinkPress}
        />,
      );

      const { onMessage } = getWebViewHandlers();
      expect(() => {
        onMessage?.({ nativeEvent: { data: 'null' } });
      }).not.toThrow();

      expect(onWikiLinkPress).not.toHaveBeenCalled();
    });
  });

  describe('onLoadEnd', () => {
    it('appelle onLoadEnd quand la prop est fournie', () => {
      const onWikiLinkPress = jest.fn();
      const onLoadEnd = jest.fn();
      render(
        <WikipediaWebView
          html="<p>Test</p>"
          article={mockArticle}
          onWikiLinkPress={onWikiLinkPress}
          onLoadEnd={onLoadEnd}
        />,
      );

      const { onLoadEnd: capturedLoadEnd } = getWebViewHandlers();
      capturedLoadEnd?.();
      expect(onLoadEnd).toHaveBeenCalledTimes(1);
    });

    it('ne configure pas onLoadEnd si la prop est absente', () => {
      const onWikiLinkPress = jest.fn();
      render(
        <WikipediaWebView
          html="<p>Test</p>"
          article={mockArticle}
          onWikiLinkPress={onWikiLinkPress}
        />,
      );

      const { onLoadEnd } = getWebViewHandlers();
      // Sans prop onLoadEnd, la WebView ne doit pas avoir de handler
      expect(onLoadEnd).toBeUndefined();
    });
  });

  describe('onError', () => {
    it('appelle onError avec la description de l\'erreur', () => {
      const onWikiLinkPress = jest.fn();
      const onError = jest.fn();
      render(
        <WikipediaWebView
          html="<p>Test</p>"
          article={mockArticle}
          onWikiLinkPress={onWikiLinkPress}
          onError={onError}
        />,
      );

      const { onError: capturedError } = getWebViewHandlers();
      capturedError?.({ nativeEvent: { description: 'Network request failed' } });
      expect(onError).toHaveBeenCalledWith('Network request failed');
    });
  });
});
