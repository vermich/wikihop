/**
 * WikipediaWebView — WikiHop Mobile — Réécriture WebView native
 *
 * Charge directement `https://{lang}.m.wikipedia.org/wiki/{titre}` dans la WebView.
 * Approche native Wikipedia mobile : layout officiel, zéro manipulation HTML custom.
 *
 * Mécanismes clés :
 *   - source={{ uri }} : URL Wikipedia mobile directe (pas de HTML injecté)
 *   - CSS minimal injecté via `injectedJavaScriptBeforeContentLoaded` : masque header/footer uniquement
 *   - `onShouldStartLoadWithRequest` : autorise les articles Wikipedia mobile jouables,
 *     bloque les namespaces non jouables et les liens externes
 *   - `onNavigationStateChange` : détecte chaque changement de page → compte les sauts,
 *     vérifie la victoire. Le comptage est délégué au parent via `onPageChange`.
 *   - Back button Android : géré par le parent via `webViewRef.current.goBack()`
 *
 * Fonctions pures exportées (TDD) :
 *   - `isPlayableWikipediaUrl(url, lang)` : filtre les URLs autorisées
 *   - `titlesMatch(a, b)` : comparaison de titres insensible à la casse/underscores
 *   - `extractTitleFromUrl(url, lang)` : extrait le titre depuis une URL Wikipedia mobile
 *
 * Références :
 *   Story : docs/stories/M-15-webview-css-injection.md
 *   Story : docs/stories/M-04-article-navigation.md
 *
 * Conventions :
 *   - Export nommé
 *   - StyleSheet.create() en bas du fichier
 */

import type { Language } from '@wikihop/shared';
import React, { type RefObject } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type {
  WebViewErrorEvent,
  WebViewNavigation,
} from 'react-native-webview/lib/WebViewTypes';

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Préfixes de namespaces non jouables dans les URLs Wikipedia mobile.
 * Ces préfixes correspondent à des pages de maintenance ou méta Wikipedia.
 * Note : les namespaces Wikipedia mobile sont identiques au desktop (même encodage).
 */
const BLOCKED_URL_PREFIXES = [
  'Special:',
  'Spécial:',
  'File:',
  'Fichier:',
  'Help:',
  'Aide:',
  'Category:',
  'Catégorie:',
  'Template:',
  'Modèle:',
  'Talk:',
  'Discussion:',
  'Wikipedia:',
  'Wikipédia:',
  'Portal:',
  'Portail:',
] as const;

/**
 * Script CSS injecté avant le premier paint pour masquer header/footer Minerva
 * (thème Wikipedia mobile). Injecté via `injectedJavaScriptBeforeContentLoaded`
 * pour éviter tout flash du layout Wikipedia original.
 *
 * Sélecteurs Minerva (layout mobile Wikipedia officiel) :
 *   - .header-container, .minerva-header, header.header-container : header Wikipedia mobile
 *   - #footer, .minerva-footer : footer Wikipedia mobile
 *   - .mw-editsection : boutons d'édition en ligne
 *   - .pre-content, #content : ajustement padding top après suppression header
 */
const CSS_INJECTION_SCRIPT = `
(function() {
  var css = [
    '.header-container { display: none !important; }',
    '.minerva-header { display: none !important; }',
    'header.header-container { display: none !important; }',
    '#footer { display: none !important; }',
    '.minerva-footer { display: none !important; }',
    '.mw-editsection { display: none !important; }',
    '.pre-content { padding-top: 8px !important; }',
    '#content { padding-top: 8px !important; }'
  ].join('\\n');
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  true;
})();
`;

// ─────────────────────────────────────────────────────────────────────────────
// Fonctions pures exportées (TDD)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Construit l'URL Wikipedia mobile pour un titre et une langue.
 *
 * @param title - Titre de l'article (non encodé, ex: "Tour Eiffel")
 * @param lang  - Langue ('fr' | 'en')
 * @returns URL complète Wikipedia mobile
 */
export function buildArticleUrl(title: string, lang: Language): string {
  return `https://${lang}.m.wikipedia.org/wiki/${encodeURIComponent(title)}`;
}

/**
 * Extrait le titre d'article depuis une URL Wikipedia mobile.
 * Retire les underscores, décode l'encodage URL, ignore les ancres (#).
 *
 * @param url  - URL Wikipedia mobile complète
 * @param lang - Langue attendue ('fr' | 'en')
 * @returns Titre décodé avec espaces, ou null si l'URL ne correspond pas
 */
export function extractTitleFromUrl(url: string, lang: Language): string | null {
  const mobileBase = `https://${lang}.m.wikipedia.org/wiki/`;
  if (!url.startsWith(mobileBase)) {
    return null;
  }
  // Retire le segment après /wiki/ et ignore les ancres (#section)
  const rawPath = url.slice(mobileBase.length).split('#')[0];
  if (rawPath === undefined || rawPath.length === 0) {
    return null;
  }
  try {
    return decodeURIComponent(rawPath).replace(/_/g, ' ');
  } catch {
    return null;
  }
}

/**
 * Vérifie si une URL Wikipedia mobile est jouable dans WikiHop.
 *
 * Règles :
 *   - about:blank → autorisé (chargement initial WebView)
 *   - URL Wikipedia mobile de la bonne langue → autorisé si le path n'est pas un namespace bloqué
 *   - Tout le reste → bloqué (liens externes, autres langues, namespaces maintenance)
 *
 * Fonction pure — testable directement (TDD).
 *
 * @param url  - URL à évaluer
 * @param lang - Langue courante du jeu
 * @returns true si la WebView peut charger cette URL
 */
export function isPlayableWikipediaUrl(url: string, lang: Language): boolean {
  // Chargement initial de la WebView
  if (url === 'about:blank') {
    return true;
  }

  const mobileBase = `https://${lang}.m.wikipedia.org/wiki/`;
  if (!url.startsWith(mobileBase)) {
    return false;
  }

  // Extraire le segment après /wiki/ (ignorer ancres)
  const rawPath = url.slice(mobileBase.length).split('#')[0];
  if (rawPath === undefined || rawPath.length === 0) {
    // URL = base exacte sans titre → page principale, bloquée
    return false;
  }

  let path: string;
  try {
    path = decodeURIComponent(rawPath);
  } catch {
    return false;
  }

  // Vérifier que le path n'est pas un namespace non jouable
  const isBlocked = BLOCKED_URL_PREFIXES.some((prefix) =>
    path.startsWith(prefix),
  );

  return !isBlocked;
}

/**
 * Compare deux titres d'articles Wikipedia de façon normalisée.
 * Insensible à la casse et aux underscores (Wikipedia utilise les deux).
 *
 * Fonction pure — testable directement (TDD).
 *
 * @param a - Premier titre
 * @param b - Deuxième titre
 * @returns true si les titres correspondent au même article
 */
export function titlesMatch(a: string, b: string): boolean {
  return a.toLowerCase().replace(/_/g, ' ') === b.toLowerCase().replace(/_/g, ' ');
}

// ─────────────────────────────────────────────────────────────────────────────
// Types du composant
// ─────────────────────────────────────────────────────────────────────────────

export interface WikipediaWebViewProps {
  /** Titre de l'article courant à afficher (non encodé) */
  currentTitle: string;
  /** Langue Wikipedia courante */
  lang: Language;
  /**
   * Appelé quand le joueur navigue vers un nouvel article (saut comptabilisé).
   * Reçoit le titre de l'article cible (déjà décodé, espaces normalisés).
   * Appelé également pour les retours arrière (chaque changement de page = 1 saut).
   */
  onPageChange: (newTitle: string) => void;
  /** Appelé quand le chargement de la page est terminé */
  onLoadEnd?: () => void;
  /** Appelé en cas d'erreur de chargement WebView */
  onError?: (error: string) => void;
  /**
   * Ref optionnelle vers la WebView native — permet au parent d'appeler
   * goBack() via le BackHandler Android.
   */
  webViewRef?: RefObject<WebView | null>;
  /**
   * Appelé à chaque changement d'état de navigation.
   * Permet au parent de suivre canGoBack pour le BackHandler Android.
   */
  onNavigationStateChange?: (navState: { canGoBack: boolean; url: string }) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────────────────────────────────────

export function WikipediaWebView(props: WikipediaWebViewProps): React.JSX.Element {
  const { currentTitle, lang, onPageChange, webViewRef } = props;

  const [isLoading, setIsLoading] = React.useState(true);

  /**
   * Filtre les navigations autorisées dans la WebView.
   * Autorise : about:blank, articles Wikipedia mobile jouables de la bonne langue.
   * Bloque : liens externes, namespaces maintenance, autres langues.
   */
  function handleShouldStartLoadWithRequest(request: WebViewNavigation): boolean {
    return isPlayableWikipediaUrl(request.url, lang);
  }

  /**
   * Déclenché à chaque changement d'état de navigation (nouvelle page chargée).
   * - Notifie le parent de canGoBack (pour BackHandler Android)
   * - Ignore les états "en cours de chargement"
   * - Extrait le titre depuis l'URL
   * - Ignore si c'est la même page (ancre #section ou navigation initiale)
   * - Appelle onPageChange pour que le parent comptabilise le saut et vérifie la victoire
   */
  function handleNavigationStateChange(navState: WebViewNavigation): void {
    // Notifier le parent du canGoBack courant (pour le BackHandler Android)
    if (props.onNavigationStateChange !== undefined) {
      props.onNavigationStateChange({ canGoBack: navState.canGoBack, url: navState.url });
    }

    // Ne traiter que les pages chargées (pas en cours)
    if (navState.loading) {
      return;
    }

    const title = extractTitleFromUrl(navState.url, lang);
    if (title === null) {
      return;
    }

    // Ignorer si même page (ancre #section ou navigation initiale vers currentTitle)
    if (titlesMatch(title, currentTitle)) {
      return;
    }

    onPageChange(title);
  }

  // exactOptionalPropertyTypes : spread conditionnel pour onError
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

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        style={styles.webView}
        source={{ uri: buildArticleUrl(currentTitle, lang) }}
        injectedJavaScriptBeforeContentLoaded={CSS_INJECTION_SCRIPT}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadStart={() => { setIsLoading(true); }}
        onLoadEnd={() => {
          setIsLoading(false);
          if (props.onLoadEnd !== undefined) {
            props.onLoadEnd();
          }
        }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        {...optionalOnError}
      />
      {isLoading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
