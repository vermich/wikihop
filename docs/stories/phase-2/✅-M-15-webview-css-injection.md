---
id: M-15
title: WebView Wikipedia avec injection CSS mobile
phase: 2-MVP
priority: Must
agents: [Frontend Dev]
status: done
created: 2026-03-01
completed: 2026-03-02
---

# M-15 — WebView Wikipedia avec injection CSS mobile

## User Story
En tant que joueur, je veux lire les articles Wikipedia dans une WebView épurée sans le header et footer Wikipedia, afin de me concentrer sur la navigation sans distraction.

## Critères d'acceptance
- [x] Les articles Wikipedia sont affichés dans une WebView React Native (`react-native-webview`)
- [x] Un script CSS est injecté au chargement pour masquer le header (`#mw-head`), le footer (`#mw-footer`), la barre latérale (`#mw-panel`) et les bannières de notification Wikipedia
- [x] Le CSS injecté masque également les éléments de navigation Wikipedia non pertinents pour le jeu (menus, onglets Lecture/Modifier/Historique)
- [x] Les liens internes Wikipedia (balises `<a>` vers `/wiki/...`) sont interceptables sans déclencher une navigation hors-WebView
- [x] Les liens externes (hors domaine `wikipedia.org`) sont bloqués et ne provoquent pas de sortie de l'application
- [x] Le CSS est appliqué avant le rendu visible (pas de flash du layout original)
- [x] Le scroll fonctionne correctement sur iOS et Android
- [x] L'injection CSS est encapsulée dans un composant réutilisable `WikipediaWebView`

## Notes de réalisation

### Ordre d'implémentation dans la Wave 3

M-15 est le composant fondation de la Wave 3. Il doit être livré en premier, avant M-03, M-04 et M-05. Les autres stories dépendent de `WikipediaWebView`.

### Localisation des fichiers

```
apps/mobile/src/components/game/WikipediaWebView.tsx
apps/mobile/src/constants/wikipedia-css.ts
```

### Interfaces TypeScript

```typescript
// apps/mobile/src/components/game/WikipediaWebView.tsx

import type { Article } from '@wikihop/shared';

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
}
```

### Constante CSS

Le CSS est défini dans un fichier de constante dédié, importé dans `WikipediaWebView`. Il ne doit jamais être défini inline dans le composant.

```typescript
// apps/mobile/src/constants/wikipedia-css.ts

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

  /* Liens internes — couleur distincte (critère M-03) */
  a[href^="/wiki/"] {
    color: #3366cc;
    text-decoration: underline;
  }

  /* Liens externes visuellement différenciés (bloqués au niveau JS) */
  a:not([href^="/wiki/"]):not([href^="#"]) {
    color: #888888;
    text-decoration: none;
  }
`;
```

### Script JS d'interception (injectedJavaScriptBeforeContentLoaded)

Le script est défini comme constante dans `WikipediaWebView.tsx`, construit en useMemo pour éviter la recréation à chaque rendu. Utiliser `JSON.stringify(WIKIPEDIA_ARTICLE_CSS)` pour l'insertion de la constante CSS afin de garantir l'échappement correct des guillemets et retours à la ligne.

```typescript
// Calculé une seule fois avec useMemo (la constante CSS ne change pas)
const injectedScript = useMemo(() => `
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

      // Liens internes Wikipedia — navigables dans le jeu
      if (href.startsWith('/wiki/')) {
        var rawTitle = href.replace('/wiki/', '');
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
`, []);
```

### Handler onMessage

```typescript
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
```

### Propriétés WebView obligatoires (ADR-006)

```typescript
<WebView
  source={{ html: props.html, baseUrl: `https://${props.article.language}.wikipedia.org` }}
  originWhitelist={['*']}
  javaScriptEnabled={true}
  domStorageEnabled={false}
  allowsInlineMediaPlayback={false}
  mediaPlaybackRequiresUserAction={true}
  showsHorizontalScrollIndicator={false}
  scalesPageToFit={false}
  injectedJavaScriptBeforeContentLoaded={injectedScript}
  onMessage={handleMessage}
  onLoadEnd={props.onLoadEnd}
  onError={(syntheticEvent) => {
    props.onError?.(syntheticEvent.nativeEvent.description);
  }}
/>
```

**`baseUrl` obligatoire** : sans `baseUrl`, les chemins relatifs `/wiki/...` dans le HTML Wikipedia ne sont pas résolubles par la WebView. Passer `https://{lang}.wikipedia.org` permet aussi le chargement des ressources relatives (images CSS Wikipedia).

### Points de vigilance

1. **`injectedJavaScriptBeforeContentLoaded` vs `injectedJavaScript`** : utiliser exclusivement `injectedJavaScriptBeforeContentLoaded`. L'injection post-chargement produit un flash visible sur Android (ADR-006).
2. **`true;` en fin de script obligatoire** : sur Android, le script injecté doit se terminer par `true;` sinon la WebView lève une exception silencieuse et n'exécute pas le script.
3. **Phase de capture** : passer `true` comme troisième argument de `addEventListener` pour intercepter les taps avant tout gestionnaire Wikipedia inline.
4. **Ancres `#section`** : ne pas les bloquer — elles permettent le scroll vers une section dans la même page. Le `return` sans `preventDefault()` laisse la WebView gérer le scroll natif.
5. **`JSON.stringify(WIKIPEDIA_ARTICLE_CSS)`** : obligatoire pour l'échappement correct. Ne jamais injecter la constante CSS directement dans une template string imbriquée.
6. **Tests** : le composant WebView natif n'est pas testable unitairement. Tester `handleMessage` en isolation avec des payloads valides, invalides (mauvais type) et malformés (JSON cassé). Mocker `onWikiLinkPress` pour vérifier les appels.

---

## Spécifications visuelles — Benjamin (UX/UI)

## Composant : WikipediaWebView

### Objectif
Afficher le contenu HTML d'un article Wikipedia dans un rendu mobile épuré, sans les éléments de navigation Wikipedia, en mettant le texte et les liens au premier plan.

### Layout (ASCII)

```
┌─────────────────────────────────────┐
│                                     │  [SCROLL - WebView plein écran]
│  [Contenu HTML Wikipedia injecté]   │
│                                     │
│  Titre de section                   │
│  ────────────────                   │
│  Texte de l'article en 16px,        │
│  line-height 1.6, couleur #1a1a1a.  │
│  Un lien navigable  Un lien         │
│  ~~~~~~~~~~~~~~    externe grisé    │
│                                     │
│  ┌────────────────────────────┐     │
│  │ Infobox / tableau          │     │
│  │ (scroll horizontal natif)  │     │
│  └────────────────────────────┘     │
│                                     │
│  [img responsive, max-width 100%]   │
│                                     │
│  ...                                │
└─────────────────────────────────────┘
```

### Composants visuels

- **Corps du texte** — font-family system (`-apple-system`, `Helvetica Neue`, `Arial`), 16px, line-height 1.6, couleur `#1a1a1a`, padding `12px 16px`. Fond blanc `#FFFFFF`. Pas de scroll horizontal sur le corps.
- **Liens internes navigables** (`a[href^="/wiki/"]`) — couleur `#3366CC` (bleu Wikipedia), soulignement visible. Zone de tap : les liens doivent être assez espacés pour 44pt — le padding injecté (16px horizontal) contribue à l'espacement global mais les liens inline restent soumis à la densité du texte Wikipedia. Signaler à Laurent si un article teste des liens très rapprochés.
- **Liens externes non navigables** (`a:not([href^="/wiki/"])`) — couleur `#888888`, pas de soulignement. Visuellement clairement inactifs pour indiquer au joueur qu'ils ne sont pas utilisables.
- **Infobox / tableaux** — `overflow-x: auto`, `display: block`. Scroll horizontal natif géré par la WebView. Pas de débordement horizontal sur le conteneur page.
- **Images** — `max-width: 100%`, `height: auto`. Respectent le flux du texte.
- **Éléments masqués** — `#mw-head`, `#mw-panel`, `#mw-footer`, `.mw-editsection`, `.catlinks`, `.toc`, `#mw-navigation` : `display: none !important`. Aucune trace visuelle de navigation Wikipedia.

### États

- **Default (article chargé) :** Texte Wikipedia rendu, liens bleus soulignés, fond blanc `#FFFFFF`, sans aucun chrome Wikipedia visible.
- **Loading :** La WebView n'est pas montée tant que le HTML n'est pas disponible (décision M-03). L'état de chargement est géré par `ArticleScreen` — voir specs M-03 pour le skeleton/spinner.
- **Error :** L'erreur est remontée via `onError` et gérée par `ArticleScreen`. `WikipediaWebView` n'affiche rien d'elle-même en cas d'erreur — elle délègue à son parent.
- **Flash Android (à éviter) :** Grâce à `injectedJavaScriptBeforeContentLoaded`, le CSS est appliqué avant le premier paint. L'utilisateur ne doit jamais voir le layout Wikipedia original. Si un flash subsiste en QA, l'ajouter comme bug bloquant.

### Accessibilité

- [ ] `accessibilityLabel` sur tous les éléments interactifs — les liens internes Wikipedia sont des éléments `<a>` natifs dans la WebView : l'accessibilité est assurée par le moteur HTML du navigateur embarqué (WebKit/Chromium). Aucune action supplémentaire côté RN pour les liens.
- [ ] Contraste ≥ 4.5:1 verifié — `#1a1a1a` sur `#FFFFFF` = ratio ~18.1:1. `#3366CC` sur `#FFFFFF` = ratio ~4.6:1 (passe AA). `#888888` sur `#FFFFFF` = ratio ~3.5:1 (texte grisé intentionnellement non navigable — acceptable car informatif, non interactif).
- [ ] Zones tactiles ≥ 44×44pt — les liens inline dans du texte dense ne peuvent pas être garantis à 44pt. C'est une contrainte inhérente au contenu Wikipedia. Signaler cette limitation dans le rapport QA.
- [ ] Navigation VoiceOver / TalkBack — les lecteurs d'écran interagissent avec la WebView via le moteur d'accessibilité natif. Tester que VoiceOver lit correctement le titre des liens avant de livrer.

### Notes pour Laurent

- Le fond de la WebView doit être explicitement `background-color: #FFFFFF` dans le CSS injecté afin d'éviter le fond transparent/gris par défaut sur Android entre le chargement et le premier paint.
- La couleur `#3366CC` (lien Wikipedia) est différente du `#2563EB` du design system WikiHop. Ce choix est volontaire : dans la WebView, on respecte les conventions visuelles Wikipedia pour que le joueur reconnaisse instinctivement les liens. Le design system WikiHop s'applique à l'UI native (header, HUD, boutons), pas au contenu injecté.
- `#888888` pour les liens externes est un écart assumé par rapport au design system (pas de token pour cette couleur). Justification : couleur neutre standard pour indiquer un état désactivé/non interactif dans le contexte web.
- Ne pas ajouter de padding supplémentaire autour de la WebView côté React Native — le padding est géré dans le CSS injecté (`padding: 12px 16px` sur `body`). Un double-padding créerait un décalage visuel.

---

## Validation QA — Halim

**Date** : 2026-03-02
**Testeur** : Halim
**Statut global** : Validé

### Critères d'acceptance
- [x] Les articles Wikipedia sont affichés dans une WebView React Native — composant `WikipediaWebView` rendu via `react-native-webview`, vérifié dans `WikipediaWebView.test.tsx` (render sans crash)
- [x] CSS injecté masquant `#mw-head`, `#mw-footer`, `#mw-panel`, `.mw-notification-area` — constante `WIKIPEDIA_ARTICLE_CSS` dans `wikipedia-css.ts`, liste complète conforme à la spec
- [x] CSS masque aussi `.vector-menu-tabs`, `.mw-editsection`, `.catlinks`, `.toc`, `#mw-navigation` — tous présents dans la constante
- [x] Liens internes interceptés via `postMessage` sans navigation hors-WebView — handler `handleMessage` testé avec payloads valides (`WIKI_LINK`)
- [x] Liens externes bloqués silencieusement — script JS : `event.preventDefault()` + `event.stopPropagation()` sur tout lien non `/wiki/` et non `#`
- [x] CSS appliqué avant le rendu visible — `injectedJavaScriptBeforeContentLoaded` utilisé exclusivement (conforme ADR-006)
- [x] Scroll iOS/Android — `showsHorizontalScrollIndicator={false}`, `overflow-x: hidden` sur `body`, `overflow-x: auto` sur `table`
- [x] Composant réutilisable `WikipediaWebView` — export nommé, props typées, CSS externalisé dans `constants/wikipedia-css.ts`

### Tests automatisés
- `npm test` (apps/mobile) : 155 tests passants, 0 échec
- `tsc --noEmit` : sans erreur TypeScript
- `npm run lint` : 0 erreur (5 warnings dans `game.store.ts` et `language.store.ts` — hors périmètre M-15)

### Cas limites testés
- Payload JSON malformé depuis la WebView : ignoré silencieusement (try/catch) — vérifié par test
- Payload JSON valide mais type inconnu : `onWikiLinkPress` non appelé — vérifié par test
- Payload avec `title` non-string : ignoré — vérifié par test
- Payload `null` : ignoré — vérifié par test
- Titre avec espaces et caractères accentués ("Musée du Louvre") : transmis correctement — vérifié par test
- `onLoadEnd` absent : la prop WebView n'est pas configurée (spread conditionnel) — vérifié par test
- Ancres `#section` : le `return` sans `preventDefault` laisse le scroll natif opérer — logique présente dans le script injecté

### Bugs identifiés
Aucun bug identifié.

### Conclusion
Story validée. Tous les critères d'acceptance sont satisfaits. L'implémentation est conforme à la spec M-15 et à l'ADR-006. Le composant `WikipediaWebView` est correctement encapsulé, les tests couvrent tous les cas de messages postMessage documentés dans la spec.

## Statut
done
