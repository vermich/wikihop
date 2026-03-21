# Spec technique — F3-48 : Fix bouton retour absent sur les premiers sauts

## 1. Contexte

Story : `docs/stories/phase-3/🔄-F3-48-fix-back-button-missing-first-jumps.md`

Fixes précédents de navigation : F3-22, F3-27, F3-34.

Le bouton retour dans le header d'`ArticleScreen` est conditionné sur `stackSize > 1` (ligne 262 du fichier). `stackSize` est un `useState` initialisé à `1` et mis à jour dans `handlePageChangeSync` via `setStackSize(articleStack.current.length)` lorsqu'un saut forward est détecté.

**Symptôme** : sur les premiers sauts, le bouton retour n'apparaît pas. La cause probable est une désynchronisation entre le moment où `stackSize` est mis à jour et le moment où le rendu reflète ce changement.

**Analyse approfondie de `ArticleScreen.tsx`** :

`handlePageChangeSync` (lignes 163–182) est passé en prop `onPageChange` à `WikipediaWebView`. Le callback est déclenché depuis la WebView via `postMessage`. La chaîne est :

1. Utilisateur tape un lien dans la WebView
2. `injectedJavaScriptBeforeContentLoaded` intercepte la navigation → `postMessage`
3. `onMessage` de la WebView appelle `onPageChange(newTitle)`
4. `handlePageChangeSync` s'exécute : `setCurrentTitle`, `articleStack.current.push`, `setStackSize`

Ces trois setState React sont dans le même appel synchrone — React les batch en un seul re-render (React 18+). `stackSize` devrait donc passer à 2 immédiatement au premier saut.

**Hypothèse principale** : le `useCallback` de `handlePageChangeSync` dépend de `[handlePageChange]`. `handlePageChange` dépend de `[lang, addJump, completeSession, targetArticle, navigation]`. Si l'une de ces dépendances change entre le montage et le premier saut (ex: `targetArticle` rechargé depuis le store, `lang` hydraté asynchrone), `handlePageChange` est recréé, `handlePageChangeSync` est recréé — et si la WebView a capturé l'ancienne référence via `onPageChange`, elle appelle l'ancienne version du callback qui ne met pas à jour `stackSize` correctement.

**Hypothèse secondaire** : `WikipediaWebView` mémoïse `onPageChange` via une ref interne, et si cette ref n'est pas mise à jour quand `handlePageChangeSync` change, le callback appelé est l'ancienne version (closure stale) — qui n'a pas encore le `articleStack` mis à jour.

## 2. Périmètre

**Dans scope :**
- `apps/mobile/src/screens/ArticleScreen.tsx`
- `apps/mobile/src/components/game/WikipediaWebView.tsx` (lecture uniquement pour comprendre le passage de callback)

**Hors scope :**
- `GameHUD`, `RootNavigator`
- Logique de victoire (`completeSession`)
- BackHandler Android (déjà corrigé en F3-34, ne pas toucher)

## 3. Diagramme d'état des stacks

### Stack de navigation React Navigation (natif)

```
[Home] → [Game/ArticleScreen]
         ^
         Une seule instance — pas de push() d'ArticleScreen
         (F3-34 : architecture single-screen WebView)
```

### Stack applicatif interne (articleStack ref + stackSize state)

```
État initial au montage :
  articleStack.current = [articleTitle]   (param route)
  stackSize = 1
  → bouton retour : ABSENT

Après saut 1 (premier lien tapé) :
  articleStack.current = [articleTitle, newTitle1]
  stackSize = 2
  → bouton retour : DOIT APPARAÎTRE ← bug ici

Après saut N :
  articleStack.current = [articleTitle, ..., newTitleN]
  stackSize = N+1
  → bouton retour : visible

Après retour arrière depuis saut N :
  articleStack.current = [articleTitle, ..., newTitle(N-1)]
  stackSize = N
  → bouton retour : visible si N > 1, absent si N = 1
```

### Stack historique WebView (interne, non contrôlé)

```
La WebView maintient son propre historique interne.
ArticleScreen ne s'appuie PAS sur ce stack (depuis F3-34).
webViewSource change uniquement lors d'un retour arrière (handleGoBack).
```

## 4. Comportement attendu par affordance de retour

| Affordance | Condition | Comportement attendu |
|------------|-----------|---------------------|
| Bouton header "← Retour" | `stackSize > 1` | Visible. Tap → `handleGoBack()` → pop stack → article précédent |
| Bouton header "← Retour" | `stackSize === 1` | Absent. `backButtonPlaceholder` affiché à la place |
| Geste swipe iOS (retour natif) | Toujours | Doit déclencher `handleGoBack()` si `stackSize > 1`, sinon `handleAbandon()`. **Attention** : par défaut, le geste swipe iOS du stack natif navigue dans le stack React Navigation (revient sur Home) — pas dans le stack applicatif. Voir section 8. |
| Bouton hardware Android | `stackSize > 1` | `handleGoBack()` |
| Bouton hardware Android | `stackSize === 1` | `handleAbandon()` |

## 5. Interactions connues

| Composant / Store | Impact |
|------------------|--------|
| `WikipediaWebView` | Fournit le callback `onPageChange` — sa mémoïsation de la référence est critique |
| `useGameStore` (`addJump`, `completeSession`) | Dépendances de `handlePageChange` — toute recréation de ces sélecteurs invalide le useCallback |
| `useLanguageStore` (`lang`) | Dépendance de `handlePageChange` — si `lang` change au montage (hydratation), le callback est recréé |
| `BackHandler` (Android) | S'appuie sur `stackSize` — le bug l'affecte de la même façon |

## 6. Architecture proposée — correction

### Approche recommandée : stabiliser le callback via useRef

Le pattern le plus robuste est de stocker `handlePageChangeSync` dans une ref et de passer une fonction stable (qui lit la ref) à `WikipediaWebView`. Ceci évite tout problème de stale closure sans dépendre du comportement de mémoïsation de la WebView :

```typescript
// Dans ArticleScreen

// Ref qui pointe toujours vers la dernière version du callback
const handlePageChangeSyncRef = useRef<(title: string) => void>(handlePageChangeSync);

useEffect(() => {
  handlePageChangeSyncRef.current = handlePageChangeSync;
}, [handlePageChangeSync]);

// Fonction stable passée à WikipediaWebView — ne change jamais
const stableOnPageChange = useCallback((title: string): void => {
  handlePageChangeSyncRef.current(title);
}, []); // deps vides intentionnellement — on lit depuis la ref
```

Puis passer `stableOnPageChange` à `WikipediaWebView` au lieu de `handlePageChangeSync` directement.

**Pourquoi ce pattern ?** `WikipediaWebView` peut capturer la référence de `onPageChange` dans un `useRef` interne pour l'injecter dans le JS de la WebView. Si la prop change après le premier rendu, la WebView peut ne pas voir la mise à jour (dépend de l'implémentation). La fonction stable résout ce problème en garantissant que la WebView appelle toujours la même référence de fonction, qui délègue à jour à la dernière implémentation.

### Vérification préalable : lire WikipediaWebView.tsx

Avant d'implémenter, lire `apps/mobile/src/components/game/WikipediaWebView.tsx` pour vérifier :
1. Comment `onPageChange` est reçu et stocké (prop directe ou mémoïsé via ref ?)
2. Si une ref interne capture la prop au montage → confirmer que c'est bien la cause du bug

**Si WikipediaWebView passe déjà `onPageChange` via une ref interne** → le bug est ailleurs. Dans ce cas, vérifier si `stackSize` est correctement lu dans le rendu (pas de closure stale sur le JSX conditionnel).

### Vérification secondaire : closure sur le rendu JSX

```typescript
// Ligne 262 — potentielle stale closure si stackSize est capturé dans un contexte mémoïsé
{stackSize > 1 ? (
  <TouchableOpacity onPress={handleGoBack} ...>
```

`stackSize` est un `useState` — React re-rend le composant quand il change. Le rendu JSX lui-même ne devrait pas avoir de stale closure. Mais si `renderContent` ou un sous-composant mémoïsé capture `stackSize` via une prop, le problème peut survenir là.

## 7. TDD — fonctions pures et hooks à tester

Aucune nouvelle fonction pure extraite dans cette correction. Les tests à valider (sans TDD strict) :

**Tests unitaires existants à ne pas régresser** :
- Tests d'`ArticleScreen` (si présents) — vérifier que `stackSize` passe bien à 2 après le premier `handlePageChangeSync` appel avec `isBackNavigation.current = false`.

**Cas manuels à tester sur device** (gate device physique — CLAUDE.md) :
1. Premier saut : taper un lien → le bouton retour apparaît immédiatement
2. Deuxième saut : taper un lien → le bouton retour reste visible
3. Premier retour : taper retour → le bouton retour disparaît
4. Retour depuis article 3 → article 2 → article 1 : bouton visible jusqu'au retour sur l'article initial

## 8. Points de vigilance

- **Geste swipe iOS** : la route `Game` est dans le stack natif React Navigation sans `gestureEnabled: false`. Par défaut, le geste swipe iOS dépile la route `Game` depuis le stack natif (revient sur `Home`), pas dans le stack applicatif interne. Ce comportement est existant et non dans le périmètre de ce fix — ne pas y toucher.
- **Ne pas modifier BackHandler** : le BackHandler (lignes 230–252) s'appuie sur `stackSize` et `handleGoBack` correctement — la correction du callback stabilise également le BackHandler sans modification.
- **Aucun changement de la logique de victoire** : `handlePageChange` appelle `completeSession` — ce chemin ne doit pas être altéré.
- **F3-34 invariant** : `webViewSource` ne change QUE lors d'un retour arrière (`handleGoBack`). Ce principe ne doit pas être violé.
- Ce fix **requiert une validation sur device physique** (gate CLAUDE.md) car il touche la WebView, la navigation et le store de jeu.
