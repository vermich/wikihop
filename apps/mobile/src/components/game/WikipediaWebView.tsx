/**
 * WikipediaWebView — WikiHop Mobile — Wave 3 (M-15)
 *
 * Composant fondation qui affiche le contenu HTML d'un article Wikipedia
 * dans une WebView épurée, sans les éléments de navigation Wikipedia.
 *
 * Mécanismes clés :
 *   - CSS injecté via `injectedJavaScriptBeforeContentLoaded` (ADR-006 : pas de flash Android)
 *   - Interception des taps sur liens /wiki/ via postMessage
 *   - Liens externes bloqués silencieusement (pas de sortie de l'app)
 *   - Ancres #section laissées au scroll natif WebView
 *
 * Références :
 *   ADR-006 : WebView — interception des liens, injection CSS
 *   Story   : docs/stories/M-15-webview-css-injection.md
 *
 * Conventions :
 *   - Export nommé
 *   - CSS dans constants/wikipedia-css.ts (jamais inline)
 *   - useMemo pour le script injecté (la constante CSS ne change pas)
 */

import type { Article } from '@wikihop/shared';
import React, { useMemo, type RefObject } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type {
  WebViewErrorEvent,
  WebViewNavigation,
} from 'react-native-webview/lib/WebViewTypes';


import { WIKIPEDIA_ARTICLE_CSS } from '../../constants/wikipedia-css';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Type du message postMessage reçu depuis la WebView */
export interface WikiLinkMessage {
  type: 'WIKI_LINK';
  /** Titre de l'article cible, déjà décodé (replace(/_/g, ' ') appliqué côté JS injecté) */
  title: string;
}

export interface WikipediaWebViewProps {
  /** HTML brut retourné par getArticleContent() */
  html: string;
  /** Article actuellement affiché — utilisé pour construire le baseUrl */
  article: Article;
  /** Appelé quand le joueur tape un lien interne Wikipedia navigable */
  onWikiLinkPress: (title: string) => void;
  /** Appelé quand le chargement initial de la WebView est terminé */
  onLoadEnd?: () => void;
  /** Appelé en cas d'erreur de chargement WebView */
  onError?: (error: string) => void;
  /**
   * Ref optionnelle vers la WebView native — permet au parent d'appeler
   * injectJavaScript (ex: scroll-to-top au retour arrière M-04).
   */
  webViewRef?: RefObject<WebView | null>;
  /**
   * Appelé à chaque changement d'état de navigation de la WebView.
   * Permet au parent de suivre canGoBack pour le BackHandler Android (fix Bug 2).
   */
  onNavigationStateChange?: (navState: WebViewNavigation) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────────────────────────────────────

export function WikipediaWebView(props: WikipediaWebViewProps): React.JSX.Element {
  /**
   * Script injecté avant le premier paint (mitigation flash Android — ADR-006).
   * JSON.stringify(WIKIPEDIA_ARTICLE_CSS) garantit l'échappement correct
   * des guillemets et retours à la ligne dans le CSS.
   *
   * Calculé avec useMemo car la constante CSS ne change jamais —
   * pas de recréation à chaque rendu.
   */
  const injectedScript = useMemo(
    () => `
  (function() {
    // 1. Injection CSS avant le premier paint (mitigation flash Android — ADR-006)
    var style = document.createElement('style');
    style.textContent = ${JSON.stringify(WIKIPEDIA_ARTICLE_CSS)};
    document.head.appendChild(style);

    // 2. Interception des taps sur les liens (phase capture = true)
    document.addEventListener('click', function(event) {
      var target = event.target;
      // Remonter jusqu'à l'ancre parente (le tap peut être sur un enfant du lien)
      while (target && target.tagName !== 'A') {
        target = target.parentElement;
      }
      if (!target) return;

      var href = target.getAttribute('href');
      if (!href) return;

      // Ancres internes (#section) — laisser le scroll natif de la WebView opérer
      if (href.startsWith('#')) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      // Liens internes Wikipedia — navigables dans le jeu.
      //
      // L'API REST Wikipedia /page/html/ retourne du HTML Parsoid où les liens
      // internes ont un href relatif "./Titre_Article" (pas "/wiki/Titre").
      // Le baseUrl "https://{lang}.wikipedia.org" passé à la WebView résout ces
      // chemins correctement côté navigateur, mais getAttribute('href') retourne
      // l'attribut brut du DOM, c'est-à-dire "./Titre_Article".
      if (href.startsWith('./')) {
        var rawTitle = href.slice(2); // Retire le "./" initial
        var decodedTitle;
        try {
          decodedTitle = decodeURIComponent(rawTitle).replace(/_/g, ' ');
        } catch (e) {
          return; // Titre malformé — ignorer
        }
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'WIKI_LINK',
          title: decodedTitle
        }));
        return;
      }

      // Liens externes — bloqués silencieusement (pas de postMessage)
    }, true); // true = phase de capture, intercepte avant les handlers Wikipedia

    true; // Obligatoire Android — le script doit retourner true
  })();
`,
    [],
  );

  function handleMessage(event: WebViewMessageEvent): void {
    try {
      const data = JSON.parse(event.nativeEvent.data) as unknown;
      if (
        typeof data === 'object' &&
        data !== null &&
        'type' in data &&
        (data as Record<string, unknown>)['type'] === 'WIKI_LINK' &&
        'title' in data &&
        typeof (data as Record<string, unknown>)['title'] === 'string'
      ) {
        const message = data as WikiLinkMessage;
        props.onWikiLinkPress(message.title);
      }
    } catch {
      // Message JSON malformé ou inattendu — ignorer silencieusement
    }
  }

  /**
   * Bloque toute navigation native de la WebView (fix Bug 1).
   *
   * Contexte : même avec event.preventDefault() dans le JS injecté, le pont
   * natif Android peut déclencher une navigation vers l'URL résolue d'un lien
   * avant que le handler JS ait eu le temps de s'exécuter. Sans ce garde,
   * la WebView navigue directement vers l'article cible, court-circuitant le
   * mécanisme postMessage → onWikiLinkPress → addJump.
   *
   * Règle : seules les sources "locales" (about:blank, data:, blob:) sont
   * autorisées — elles correspondent au chargement initial du HTML statique.
   * Toute autre URL (http://, https://) est bloquée ici : les taps sur liens
   * /wiki/ sont déjà gérés via postMessage par le JS injecté.
   */
  function handleShouldStartLoadWithRequest(request: WebViewNavigation): boolean {
    const url = request.url;
    // Autoriser le chargement initial du HTML statique
    if (
      url === 'about:blank' ||
      url.startsWith('data:') ||
      url.startsWith('blob:')
    ) {
      return true;
    }
    // Bloquer toute navigation http/https — gérée par postMessage côté JS
    return false;
  }

  // exactOptionalPropertyTypes : ne pas passer les props optionnelles si elles sont undefined.
  // Utiliser des spreads conditionnels pour onLoadEnd, onError et onNavigationStateChange.
  const optionalLoadEnd =
    props.onLoadEnd !== undefined
      ? { onLoadEnd: props.onLoadEnd }
      : {};

  const optionalOnError =
    props.onError !== undefined
      ? {
          onError: (syntheticEvent: WebViewErrorEvent) => {
            // props.onError est forcément défini ici (guard ci-dessus)
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            props.onError!(syntheticEvent.nativeEvent.description);
          },
        }
      : {};

  const optionalNavStateChange =
    props.onNavigationStateChange !== undefined
      ? { onNavigationStateChange: props.onNavigationStateChange }
      : {};

  return (
    <WebView
      ref={props.webViewRef}
      style={styles.webView}
      source={{
        html: props.html,
        baseUrl: `https://${props.article.language}.wikipedia.org`,
      }}
      originWhitelist={['*']}
      javaScriptEnabled={true}
      domStorageEnabled={false}
      allowsInlineMediaPlayback={false}
      mediaPlaybackRequiresUserAction={true}
      showsHorizontalScrollIndicator={false}
      scalesPageToFit={false}
      injectedJavaScriptBeforeContentLoaded={injectedScript}
      onMessage={handleMessage}
      onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
      {...optionalLoadEnd}
      {...optionalOnError}
      {...optionalNavStateChange}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  webView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
