/**
 * Wikipedia Article CSS — WikiHop Mobile
 *
 * Styles injectés dans la WebView pour afficher les articles Wikipedia
 * en mode épuré, adapté au jeu mobile.
 *
 * Ce CSS est injecté via `injectedJavaScriptBeforeContentLoaded`
 * pour éviter tout flash du layout Wikipedia original (ADR-006).
 *
 * Conventions :
 *   - Constante exportée nommée, jamais inline dans le composant
 *   - JSON.stringify(WIKIPEDIA_ARTICLE_CSS) obligatoire pour l'injection
 *     (garantit l'échappement des guillemets et retours à la ligne)
 *
 * Spec : docs/stories/M-15-webview-css-injection.md
 * UX : Benjamin — spécifications visuelles M-15
 */

export const WIKIPEDIA_ARTICLE_CSS: string = `
  /* Masquage des éléments hors-jeu */
  #mw-head,
  #mw-panel,
  #mw-footer,
  .mw-notification-area,
  .vector-menu-tabs,
  .mw-editsection,
  .catlinks,
  #siteSub,
  #contentSub,
  .printfooter,
  .mw-indicators,
  .toc,
  #mw-navigation {
    display: none !important;
  }

  /* Mise en page mobile */
  body {
    font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
    font-size: 16px;
    line-height: 1.6;
    color: #1a1a1a;
    background-color: #FFFFFF;
    padding: 12px 16px;
    margin: 0;
    max-width: 100%;
    overflow-x: hidden;
  }

  /* Tableaux scrollables horizontalement */
  table {
    max-width: 100%;
    overflow-x: auto;
    display: block;
  }

  /* Images responsives */
  img {
    max-width: 100%;
    height: auto;
  }

  /* Liens internes — couleur distincte (critère M-03)
   *
   * L'API Wikipedia REST /page/html/ retourne du HTML Parsoid où les href
   * des liens internes sont en chemin relatif "./Titre_Article" (pas "/wiki/...").
   * Le sélecteur cible donc href^="./" pour matcher ce format.
   */
  a[href^="./"] {
    color: #3366cc;
    text-decoration: underline;
  }

  /* Liens externes visuellement différenciés (bloqués au niveau JS)
   *
   * Tout lien qui n'est pas un lien interne Parsoid (./) ni une ancre (#)
   * est traité comme externe : grisé et sans soulignement.
   */
  a:not([href^="./"]):not([href^="#"]) {
    color: #888888;
    text-decoration: none;
  }
`;
