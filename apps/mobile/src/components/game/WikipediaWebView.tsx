/**
 * WikipediaWebView — WikiHop Mobile — Rollback V1
 *
 * Charge directement `https://{lang}.m.wikipedia.org/wiki/{titre}` dans la WebView.
 * Approche V1 : source={{ uri }} direct, onNavigationStateChange pour détecter les sauts,
 * CSS injecté via injectedJavaScript (post-chargement), zéro manipulation des liens.
 *
 * Mécanismes clés :
 *   - source={{ uri }} : URL Wikipedia mobile directe (pas de HTML injecté)
 *   - injectedJavaScript : CSS minimal injecté après chargement pour masquer header/footer
 *     (post-chargement = moins de risque de page blanche Android vs BeforeContentLoaded)
 *   - Pas de onShouldStartLoadWithRequest : on laisse Wikipedia gérer ses propres redirections
 *   - onNavigationStateChange : détecte chaque changement de page → compte les sauts,
 *     vérifie la victoire. Le comptage est délégué au parent via onPageChange.
 *   - Back button Android : géré par le parent via webViewRef.current.goBack()
 *
 * Fonctions pures exportées (TDD) :
 *   - isPlayableWikipediaUrl(url, lang) : filtre les URLs autorisées (utilisée pour le logging)
 *   - titlesMatch(a, b) : comparaison de titres insensible à la casse/underscores
 *   - extractTitleFromUrl(url, lang) : extrait le titre depuis une URL Wikipedia mobile
 *   - buildArticleUrl(title, lang) : construit l'URL Wikipedia mobile
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
 * Utilisés pour le filtrage dans isPlayableWikipediaUrl (fonction pure TDD).
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
 * Script CSS injecté après chargement de la page pour masquer header/footer Minerva
 * (thème Wikipedia mobile). Injecté via injectedJavaScript (post-chargement).
 *
 * Approche V1 : on injecte après le premier paint, ce qui évite les problèmes
 * de page blanche observés avec injectedJavaScriptBeforeContentLoaded sur Android.
 *
 * Sélecteurs Minerva (layout mobile Wikipedia officiel) :
 *   - .header-container, .minerva-header, header.header-container : header Wikipedia mobile
 *   - #footer, .minerva-footer : footer Wikipedia mobile
 *   - .mw-editsection : boutons d'édition en ligne
 *   - .pre-content, #content : ajustement padding top après suppression header
 */
export const CSS_INJECTION_SCRIPT = `
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
 * Extrait le titre d'article depuis une URL Wikipedia.
 * Cherche le segment `/wiki/` dans l'URL (sans contrainte de domaine),
 * retire les ancres (#) et les query params (?), décode l'encodage URL.
 *
 * Approche permissive (alignée V1) : on accepte les URLs desktop et mobile,
 * les redirections Wikipedia, et les URLs avec query params.
 *
 * @param url  - URL à analyser
 * @param _lang - Langue (non utilisée, conservée pour compatibilité interface)
 * @returns Titre décodé avec espaces, ou null si l'URL ne contient pas /wiki/[titre]
 */
export function extractTitleFromUrl(url: string, _lang: Language): string | null {
  const wikiIndex = url.indexOf('/wiki/');
  if (wikiIndex === -1) {
    return null;
  }
  // Extrait tout après /wiki/, ignore les ancres et les query params
  const rawPath = (url.slice(wikiIndex + '/wiki/'.length).split('#')[0] ?? '').split('?')[0] ?? '';
  if (rawPath.length === 0) {
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
 * Note : cette fonction n'est plus utilisée dans onShouldStartLoadWithRequest
 * (supprimé pour le rollback V1), mais reste exportée pour usage futur ou logging.
 *
 * @param url  - URL à évaluer
 * @param lang - Langue courante du jeu
 * @returns true si l'URL correspond à un article Wikipedia jouable
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

  // Pas de initialUri fixée — source dynamique alignée sur currentTitle (approche V1)

  /**
   * Dernier titre rapporté au parent via onPageChange.
   * Utilisé pour le dédoublonnage (ancres #section, rechargement du même article).
   *
   * Ref (pas state) pour ne pas déclencher de re-rendu et éviter les stale closures
   * liées aux re-rendus de WikipediaWebView.
   */
  const lastReportedTitle = React.useRef<string>(currentTitle);

  /**
   * Déclenché à chaque changement d'état de navigation.
   * Approche V1 : seul mécanisme pour détecter les changements de page.
   *
   * - Notifie le parent de canGoBack (pour BackHandler Android)
   * - Extrait le titre depuis l'URL (null si URL non-Wikipedia → skip)
   * - Ignore si même titre que le dernier rapporté (ancre #section, rechargement)
   * - Met à jour lastReportedTitle AVANT d'appeler onPageChange (évite double-comptage)
   * - Appelle onPageChange pour que le parent comptabilise le saut et vérifie la victoire
   *
   * Note Android : on ne filtre PAS sur navState.loading.
   * Sur Android WebView, l'URL cible n'apparaît parfois que dans l'événement
   * loading=true (onPageStarted). L'événement loading=false (onPageFinished)
   * peut arriver avec l'ancienne URL ou ne pas arriver du tout.
   * La déduplication via lastReportedTitle.current empêche le double-comptage :
   * le premier événement avec un nouveau titre déclenche onPageChange,
   * les événements suivants avec le même titre sont ignorés.
   */
  function handleNavigationStateChange(navState: WebViewNavigation): void {
    // Notifier le parent du canGoBack courant (pour le BackHandler Android)
    if (props.onNavigationStateChange !== undefined) {
      props.onNavigationStateChange({ canGoBack: navState.canGoBack, url: navState.url });
    }

    const title = extractTitleFromUrl(navState.url, lang);
    if (title === null) {
      return;
    }

    // Ignorer si même titre que le dernier rapporté (ancre #section ou rechargement)
    if (titlesMatch(title, lastReportedTitle.current)) {
      return;
    }

    // eslint-disable-next-line no-console
    console.log('[WikiHop] onPageChange:', title, '| url:', navState.url, '| loading:', navState.loading);
    lastReportedTitle.current = title;
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
        injectedJavaScript={CSS_INJECTION_SCRIPT}
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
