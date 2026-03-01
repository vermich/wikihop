# ADR-006 : Affichage des articles Wikipedia — WebView vs rendu HTML natif

## Statut
Accepté

## Contexte
WikiHop affiche le contenu complet d'articles Wikipedia dans un écran de jeu (story M-03). Le joueur doit pouvoir naviguer d'article en article en tapant sur des liens internes (`/wiki/Titre_article`), tandis que les liens externes (hors Wikipedia) doivent être bloqués. L'expérience de scroll doit être fluide et l'accessibilité correcte sur iOS et Android.

Le contenu Wikipedia est obtenu via l'API REST Wikipedia qui retourne du HTML arbitraire (balises, images, tableaux, infoboxes, formules MathML, etc.). Deux approches sont possibles pour le rendre :

- **WebView** (`react-native-webview`) : un composant qui embarque un moteur de rendu web natif (WKWebView sur iOS, WebView sur Android) et affiche le HTML tel quel, avec injection CSS possible
- **Rendu natif** : parser le HTML et le transformer en composants React Native via une librairie comme `react-native-render-html` (RNRH)

Les stories concernées sont M-03 (affichage article), M-04 (navigation entre articles), et M-15 (injection CSS / thème visuel).

## Décision
**`react-native-webview` (WebView) est retenu** pour afficher les articles Wikipedia.

### Justification technique

Le HTML des articles Wikipedia est dense et imprévisible : tableaux complexes, infoboxes imbriquées, formules LaTeX/MathML, SVG inline, cartes interactives. `react-native-render-html` ne supporte pas ces structures sans customrenderers extensifs et fragiles. Une solution custom de parsing HTML impliquerait un travail d'ingénierie disproportionné (plusieurs semaines) pour un résultat dégradé par rapport à un vrai moteur web.

WebView délègue le rendu au moteur natif du système (WKWebView sur iOS, Chromium WebView sur Android), garantissant un rendu fidèle et des performances de scroll satisfaisantes.

### Interception des liens — comportements iOS / Android

Les deux plateformes exposent des mécanismes différents qui doivent être gérés conjointement :

**iOS — `onShouldStartLoadWithRequest`** (synchrone)
```
Retourne false pour bloquer, true pour autoriser.
Appelé avant toute navigation, y compris le chargement initial.
Distinguer le chargement initial (request.navigationType === 'other') des taps utilisateur.
```

**Android — `onNavigationStateChange`** (asynchrone, post-navigation)
```
Déclenché après que la navigation a commencé.
Nécessite un stopLoading() immédiat si la navigation doit être bloquée.
Ne pas utiliser seul : combiner avec injectedJavaScript pour intercepter les taps au niveau DOM.
```

**Stratégie unifiée retenue :**
Injection d'un script JS avant le chargement du contenu (`injectedJavaScriptBeforeContentLoaded`) qui :
1. Intercepte tous les événements `click` sur les balises `<a>` au niveau du document
2. Appelle `window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'WIKI_LINK', path: href }))` pour les liens `/wiki/...`
3. Appelle `event.preventDefault()` pour tous les autres liens (liens externes bloqués)

Le handler `onMessage` côté React Native reçoit ces messages et déclenche la navigation vers l'article suivant.

### Mitigation du flash de layout (Android)

Le chargement du HTML Wikipedia avec CSS injection via `injectedJavaScript` (post-chargement) provoque un flash visible sur Android : le layout original s'affiche brièvement avant que le CSS custom soit appliqué.

**Mitigation obligatoire** : utiliser `injectedJavaScriptBeforeContentLoaded` (exécuté avant le premier paint) pour injecter une balise `<style>` dans le `<head>` du document. Cette approche supprime le flash car le CSS est présent dès le premier rendu.

```
injectedJavaScriptBeforeContentLoaded={`
  const style = document.createElement('style');
  style.textContent = \`${CSS_WIKIPEDIA_CUSTOM}\`;
  document.head.appendChild(style);
  true; // obligatoire sur Android
`}
```

### Propriétés WebView obligatoires

| Propriété | Valeur | Raison |
|-----------|--------|--------|
| `originWhitelist` | `['*']` | Permet le chargement du HTML injecté via `source={{ html }}` |
| `javaScriptEnabled` | `true` | Requis pour l'interception des liens |
| `domStorageEnabled` | `false` | Pas de localStorage dans le contexte Wikipedia |
| `allowsInlineMediaPlayback` | `false` | Pas de vidéos autoplay |
| `mediaPlaybackRequiresUserAction` | `true` | Idem |
| `showsHorizontalScrollIndicator` | `false` | UI propre |
| `scalesPageToFit` | `false` (Android) | Empêche le zoom automatique non désiré |

### Blocage des liens externes
Tout lien dont le `href` ne commence pas par `/wiki/` est bloqué au niveau du script d'interception DOM. Les liens vers les sections internes (`#section`) sont optionnellement autorisés (scroll dans la page) ou bloqués selon le choix UI (à définir avec UX/UI Benjamin).

### Impact sur les stories
- **M-03** : le composant `ArticleWebView` encapsule `WebView` avec les propriétés et scripts décrits
- **M-04** : `onMessage` déclenche `navigation.push('Game', { articleTitle })` dans le navigateur React Navigation
- **M-15** : le CSS custom est injecté via `injectedJavaScriptBeforeContentLoaded` — une constante `WIKIPEDIA_ARTICLE_CSS` est définie dans `apps/mobile/src/constants/styles.ts`

## Conséquences positives
- Rendu HTML fidèle sans parsing custom — tableaux, infoboxes, formules MathML rendus correctement par le moteur web natif
- Performances de scroll gérées nativement par WKWebView / WebView — pas de FlatList custom à maintenir
- CSS injection simple via `injectedJavaScriptBeforeContentLoaded` — personnalisation visuelle complète (thème WikiHop, masquage des éléments hors-jeu comme les bandeaux d'édition)
- Isolation du contenu Wikipedia : le WebView est sandboxé, aucun code Wikipedia ne peut accéder au contexte React Native

## Conséquences négatives
- **Accessibilité dégradée** : les éléments dans un WebView ne sont pas exposés en tant qu'éléments natifs d'accessibilité (VoiceOver / TalkBack). Les lecteurs d'écran utilisent le mode "web content" qui est moins bien intégré que les composants natifs. Acceptable en Phase 2, à adresser en Phase 4.
- **Taille de bundle** : `react-native-webview` ajoute ~500 Ko au bundle natif (acceptable)
- **Différences iOS / Android** : les comportements `onShouldStartLoadWithRequest` et `onNavigationStateChange` diffèrent — la stratégie `postMessage` unifiée contourne ce problème mais nécessite des tests sur les deux plateformes
- **Opacité du rendu** : impossible de contrôler précisément le rendu de chaque élément HTML (tableaux, images) sans CSS. Les articles avec une mise en page complexe peuvent afficher des scrolls horizontaux non désirés (mitigation CSS : `max-width: 100%; overflow-x: hidden`)

## Alternatives considérées
- **`react-native-render-html` (RNRH)** — parse le HTML et génère des composants React Native natifs. Accessibilité native meilleure, mais ne supporte pas les tableaux HTML complexes, les SVG inline ni MathML. Les articles Wikipedia contiennent systématiquement ces structures. Le coût de maintenance des customrenderers serait élevé pour un résultat dégradé.
- **Parser HTML custom** — transformer le HTML Wikipedia en JSON de composants RN. Travail d'ingénierie estimé à plusieurs semaines, fragile face aux évolutions du format HTML Wikipedia. Écarté sans hésitation.
- **Expo WebBrowser / liens externes** — afficher les articles dans le navigateur système. Détruit l'expérience de jeu (sortie de l'app, pas d'interception des liens). Écarté.
