# Spec technique — F3-22 : Fix retour arrière dans la partie

## Contexte

Story : docs/stories/phase-3/F3-22.

**Root cause du bug :** Wikipedia mobile charge des redirects internes dans la WebView avant d'afficher l'article final. Exemple de séquence réelle :
1. WebView charge `m.wikipedia.org/wiki/Tour_Eiffel`
2. Redirect interne vers `m.wikipedia.org/wiki/Tour%20Eiffel` (canonicalisation URL)
3. L'URL finale s'affiche

Durant cette séquence, `onNavigationStateChange` se déclenche, `canGoBack` passe à `true`, et `webViewCanGoBack` est mis à `true` dans le state.

Résultat : le premier appui sur le bouton "← Retour" appelle `webViewRef.current.goBack()`, qui navigue dans l'historique interne WebView (scroll top, même page visuellement). L'utilisateur doit appuyer deux fois pour revenir à l'article précédent. De plus, chaque `webViewRef.goBack()` déclenche `onNavigationStateChange` → `onPageChange` → `addJump` → +1 saut comptabilisé à tort.

**Solution choisie :** Remplacer `webViewRef.current.goBack()` par `navigation.goBack()` dans le header et dans le BackHandler. La navigation entre articles utilise `navigation.push('Game', ...)` — chaque article est un écran distinct dans le stack React Navigation. Reculer = revenir à l'écran précédent dans le stack, ce qui est exactement le comportement attendu.

## Périmètre

**Dans scope :**
- Modifier le bouton "← Retour" dans le header pour utiliser `navigation.goBack()`
- Modifier le BackHandler Android pour utiliser `navigation.goBack()`
- Supprimer le state `webViewCanGoBack` s'il n'a plus d'usage
- Simplifier `onNavigationStateChange` si `webViewCanGoBack` est supprimé
- Rendre le bouton "← Retour" conditionnel à `navigation.canGoBack()` au lieu de `webViewCanGoBack`

**Hors scope :**
- Modification de `handlePageChange` ou `addJump`
- Modification de `onPageChange` dans WikipediaWebView
- Modification du flux de victoire
- Modification de l'abandon de partie

**Règle métier invariante :** Le retour arrière NE compte PAS comme un saut. `addJump` ne doit pas être appelé lors d'un retour. Avec la solution proposée, `navigation.goBack()` dépile l'écran React Navigation sans déclencher `onNavigationStateChange` sur la WebView de l'écran précédent — donc pas de saut comptabilisé. Cette invariante est automatiquement respectée.

## Fichiers à modifier

- `apps/mobile/src/screens/ArticleScreen.tsx` — modifications ciblées

## Architecture actuelle vs architecture cible

### État actuel (ArticleScreen)

```typescript
// State à supprimer :
const [webViewCanGoBack, setWebViewCanGoBack] = useState(false);

// Handler à simplifier ou supprimer :
const handleNavigationStateChange = useCallback(
  (navState: { canGoBack: boolean; url: string }): void => {
    setWebViewCanGoBack(navState.canGoBack);  // ← seule utilisation de webViewCanGoBack
  },
  [],
);

// BackHandler — à modifier :
if (webViewCanGoBack && webViewRef.current !== null) {
  webViewRef.current.goBack();  // ← REMPLACER
  return true;
}

// Bouton header — conditionnel à webViewCanGoBack :
{webViewCanGoBack ? (
  <TouchableOpacity onPress={() => { webViewRef.current.goBack(); }}>
    ...
  </TouchableOpacity>
) : (
  <View style={styles.backButtonPlaceholder} />
)}
```

### État cible

```typescript
// webViewCanGoBack supprimé — plus aucun usage

// handleNavigationStateChange — simplifié ou supprimé
// Note : WikipediaWebView accepte onNavigationStateChange en prop.
// Vérifier si WikipediaWebView utilise cette prop en interne ou si elle
// peut être supprimée. Si WikipediaWebView la requiert comme prop obligatoire,
// passer un callback no-op : () => { /* no-op */ }

// BackHandler — logique mise à jour :
const subscription = BackHandler.addEventListener(
  'hardwareBackPress',
  () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return true;
    }
    // Premier écran du stack (article de départ) → proposer abandon
    handleAbandon();
    return true;
  },
);

// Bouton header — conditionnel à navigation.canGoBack() :
{navigation.canGoBack() ? (
  <TouchableOpacity
    style={styles.backButton}
    onPress={() => { navigation.goBack(); }}
    accessibilityLabel="Retour à l'article précédent"
    accessibilityRole="button"
  >
    <Text style={styles.backButtonText}>{'← Retour'}</Text>
  </TouchableOpacity>
) : (
  <View style={styles.backButtonPlaceholder} />
)}
```

### Vérification des usages de `webViewRef`

`webViewRef` reste nécessaire pour être passé en prop à `WikipediaWebView` (la WebView en a besoin pour ses propres opérations internes). Ne pas supprimer `webViewRef` — supprimer uniquement les appels `webViewRef.current.goBack()` dans le header et le BackHandler.

### Vérification de `onNavigationStateChange`

`WikipediaWebView` (ligne 236 de WikipediaWebView.tsx) déclare :
```typescript
onNavigationStateChange?: (navState: { canGoBack: boolean; url: string }) => void;
```

La prop est **optionnelle**. Supprimer `onNavigationStateChange={handleNavigationStateChange}` de l'appel à `<WikipediaWebView>` dans ArticleScreen, et supprimer entièrement `handleNavigationStateChange`. Aucun no-op nécessaire.

## Dépendances dans `useEffect` du BackHandler

L'effet BackHandler actuel a `[isFocused, webViewCanGoBack, navigation, handleAbandon]` en deps. Après la modification :

```typescript
useEffect(() => {
  if (!isFocused) return;

  const subscription = BackHandler.addEventListener(
    'hardwareBackPress',
    () => {
      if (navigation.canGoBack()) {
        navigation.goBack();
        return true;
      }
      handleAbandon();
      return true;
    },
  );

  return () => { subscription.remove(); };
}, [isFocused, navigation, handleAbandon]);
// webViewCanGoBack retiré des deps
```

Note : `navigation.canGoBack()` est appelé à l'intérieur du handler, pas en dep. C'est correct — la valeur est lue au moment de l'appui, pas au moment du mount de l'effet.

## TDD — pas de TDD strict sur ce composant

ArticleScreen est un composant UI avec des effets natifs (BackHandler, WebView). Tests alongside si des tests existent pour ce composant. Aucun test unitaire nouveau n'est requis pour ce fix — la validation est comportementale (device physique obligatoire).

## Critères de qualité (PR review)

- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur
- [ ] `webViewCanGoBack` state supprimé — zéro code mort
- [ ] `handleNavigationStateChange` supprimé ou remplacé par no-op (selon la signature de WikipediaWebView)
- [ ] `webViewRef.current.goBack()` n'apparaît plus dans ArticleScreen
- [ ] Le bouton "← Retour" est conditionnel à `navigation.canGoBack()` (pas `webViewCanGoBack`)
- [ ] Le BackHandler utilise `navigation.goBack()` et `navigation.canGoBack()`
- [ ] **Gate device physique coché dans la description de la PR** — chemin complet Home → article → navigation inter-articles → VictoryScreen joué sur device physique
- [ ] Aucun saut comptabilisé lors d'un retour arrière (comportement vérifié manuellement)

## Points de vigilance

1. **`navigation.canGoBack()` au premier article** : quand l'utilisateur est sur l'article de départ (premier `push('Game', ...)`), `navigation.canGoBack()` retourne `true` car Home est dans le stack. Le retour arrière depuis l'article de départ ramènerait sur Home sans déclencher l'abandon. C'est un comportement acceptable (Home est la base) — mais si l'équipe souhaite forcer l'abandon depuis le premier article, il faut une heuristique supplémentaire (ex: comparer le depth du stack). **Pour cette story, adopter le comportement simple : `navigation.canGoBack()` → `navigation.goBack()` sans condition supplémentaire.** Si le PO décide que le premier appui doit déclencher l'abandon même depuis le premier article, une story distincte sera créée.

2. **Gate device physique obligatoire** : cette PR modifie la navigation inter-articles, critère du gate de sécurité établi en rétro Phase 2. Laurent doit confirmer dans la description de sa PR qu'il a testé le chemin complet sur device physique. Halim coche ce critère avant validation QA. Maxime ne peut pas approuver sans cette confirmation.

3. **`isNavigating` ref** : selon la note 17 de MEMORY.md, un flag `isNavigating` (useRef) est en place dans ArticleScreen pour éviter les taps multiples. Ce flag ne concerne pas la navigation arrière — ne pas le modifier.

4. **Comportement Android specifique** : sur Android, le BackHandler intercepte le bouton physique "back". Avec la modification, le premier appui sur "back" navigue vers l'article précédent (screen React Navigation). Si l'utilisateur est sur le premier article, il revient sur Home. Ce comportement est cohérent avec les conventions Android.
