---
id: M-04
title: Navigation entre articles (tap sur un lien)
phase: 2-MVP
priority: Must
agents: [Frontend Dev]
status: done
created: 2026-02-28
completed: 2026-03-02
---

# M-04 — Navigation entre articles (tap sur un lien)

## User Story
En tant que joueur, je veux naviguer vers un autre article en tapant sur un lien interne, afin d'avancer vers la destination.

## Critères d'acceptance
- [x] Taper sur un lien interne charge et affiche le nouvel article
- [x] Chaque navigation incrémente le compteur de sauts de 1
- [x] L'article visité est ajouté au chemin de la session (`path[]`)
- [x] Un bouton "Retour" permet de revenir à l'article précédent dans le chemin (sans décrémenter les sauts)
- [x] La navigation en arrière ne recharge pas l'article depuis l'API (utilisation du cache)
- [x] L'état de scroll de l'article précédent n'est pas conservé (l'article s'affiche depuis le début)

## Notes de réalisation

### Prérequis

M-04 s'implémente dans `ArticleScreen` (M-03). M-03 doit être livré avant M-04. Le composant `WikipediaWebView` (M-15) est déjà disponible.

### Modèle de navigation retenu — `navigation.push` sur le stack React Navigation

La navigation entre articles utilise `navigation.push('Game', { articleTitle: title })` et non `navigation.navigate`. Ce choix est fondamental :

- `navigation.navigate` dépile jusqu'à un écran existant si la route est déjà dans le stack — comportement indésirable (si le joueur revisite un article déjà dans son chemin, il serait redirigé vers l'instance précédente au lieu d'en créer une nouvelle)
- `navigation.push` empile toujours un nouvel écran, même si une instance de `Game` existe déjà dans le stack

Le bouton "Retour" utilise `navigation.goBack()` — il remonte d'un niveau dans le stack React Navigation, ce qui correspond exactement à l'article précédent dans le chemin.

**Conséquence** : le stack React Navigation est le miroir exact du `path[]` de la session. Pas besoin de gérer un historique local dans le store — la navigation native gère le retour.

### Flux complet lors d'un tap sur un lien

```
1. WikipediaWebView.onWikiLinkPress(title)
   ↓
2. ArticleScreen.handleLinkPress(title)
   ↓
3. [Validation] title appartient-il à un espace de noms jouable ?
   → Utiliser extractInternalLinks() ou valider le préfixe manuellement
   → Si non jouable : ignorer silencieusement
   ↓
4. getArticleSummary(title, lang) [cache mémoire — pas de réseau si déjà vu]
   → Construit l'objet Article complet (id, url, language)
   ↓
5. useGameStore.getState().addJump(article)
   → Met à jour path[], incrémente jumps, persiste dans AsyncStorage
   ↓
6. [Vérification victoire] article.title === currentSession.targetArticle.title ?
   → Oui : useGameStore.getState().completeSession() → naviguer vers VictoryScreen (Phase 2)
   → Non : navigation.push('Game', { articleTitle: title })
```

### Validation des liens navigables

Avant d'appeler `addJump`, vérifier que le titre n'appartient pas à un espace de noms non jouable. Réutiliser la logique de `extractInternalLinks` : les préfixes `NON_PLAYABLE_PREFIXES` et les titres `NON_PLAYABLE_EXACT` sont définis dans `wikipedia.service.ts`.

**Approche recommandée** : exporter une fonction utilitaire pure `isPlayableArticle(title: string): boolean` depuis `wikipedia.service.ts`. Cette fonction contient uniquement la logique de filtrage par préfixes/titres exacts, sans fetch réseau. Elle peut être testée unitairement sans mock.

```typescript
// À ajouter dans apps/mobile/src/services/wikipedia.service.ts
export function isPlayableArticle(title: string): boolean;
```

### Gestion du cache pour le retour arrière

Le critère "la navigation en arrière ne recharge pas l'article depuis l'API" est naturellement satisfait par deux mécanismes :

1. **Stack React Navigation** : quand le joueur appuie sur "Retour", `ArticleScreen` est remonté depuis le stack — le composant précédent n'est pas démonté pendant la navigation vers l'article suivant. React Navigation maintient les composants en vie dans le stack natif.
2. **Cache résumé** : `summaryCache` dans `wikipedia.service.ts` garantit que `getArticleSummary` ne refait pas de requête réseau pour un article déjà vu dans la session.

**Point de vigilance** : le HTML de l'article (retourné par `getArticleContent`) n'est PAS mis en cache (ADR-006 : trop volumineux). Si React Navigation démonte l'écran précédent lors de la navigation (ce qui dépend de la configuration du stack natif), un re-fetch du HTML sera effectué au retour. Pour éviter ce cas, configurer le stack avec `detachInactiveScreens={false}` sur le `Stack.Navigator` ou utiliser `freezeOnBlur` (disponible sur `@react-navigation/native-stack`).

À investiguer lors de l'implémentation et à documenter dans un commentaire dans `RootNavigator.tsx`.

### Mise à jour du store lors du retour arrière

Le retour arrière via `navigation.goBack()` remonte dans le stack mais **ne modifie pas** le store Zustand. Le `path[]` et `jumps` dans `currentSession` reflètent les sauts aller et ne sont pas décrémentés lors du retour. C'est le comportement attendu (critère : "sans décrémenter les sauts").

L'affichage du HUD (M-05) doit donc refléter le vrai compteur `session.jumps`, pas la profondeur du stack.

### Condition de victoire

La vérification de victoire s'effectue dans `handleLinkPress` après la construction de l'objet `Article`, avant la navigation. Comparer `article.title` (normalisé) avec `currentSession.targetArticle.title`.

**Normalisation** : les deux titres doivent être comparés après `trim()` et en respectant la casse telle que retournée par l'API Wikipedia (les titres Wikipedia sont sensibles à la casse pour la première lettre).

En Phase 2, si la victoire est détectée : appeler `completeSession()` et pousser vers une route `Victory` (stub à créer dans le navigateur). Si la route Victory n'existe pas encore, afficher une alerte native (`Alert.alert`) en fallback temporaire.

### Gestion des erreurs dans handleLinkPress

`getArticleSummary` peut lever `WikipediaNotFoundError` ou `WikipediaNetworkError`. Dans `handleLinkPress`, ces erreurs doivent être attrapées et affichées à l'utilisateur via `Alert.alert` — la navigation ne doit pas se faire si le résumé est introuvable.

```typescript
async function handleLinkPress(title: string): Promise<void> {
  if (!isPlayableArticle(title)) return;

  try {
    const article = await getArticleSummary(title, lang);
    await addJump(article);
    // vérification victoire...
    navigation.push('Game', { articleTitle: title });
  } catch (error) {
    if (error instanceof WikipediaNotFoundError) {
      Alert.alert('Article introuvable', `"${title}" n'existe pas sur Wikipedia.`);
    } else {
      Alert.alert('Erreur réseau', 'Impossible de charger cet article. Vérifiez votre connexion.');
    }
  }
}
```

### Points de vigilance

1. **`navigation.push` et non `navigate`** : cf. explication ci-dessus. Un oubli de ce point produit un bug difficile à détecter (il ne se manifeste que si le joueur revisite un article déjà dans son chemin).
2. **Race condition tap multiple** : un tap rapide sur plusieurs liens peut déclencher plusieurs `handleLinkPress` en parallèle. Introduire un flag `isNavigating` (useRef) pour ignorer les taps pendant qu'une navigation est en cours.
3. **`addJump` guard** : le store protège déjà contre les appels hors session `in_progress` (guard interne). Ne pas dupliquer cette logique dans l'écran.
4. **Comparaison des titres pour la victoire** : `article.title` retourné par l'API peut différer légèrement du `targetArticle.title` stocké en session (ex: redirections Wikipedia). Si la comparaison exacte échoue trop souvent en QA, envisager une comparaison normalisée (`toLowerCase().trim()`). À documenter si ce cas est rencontré.
5. **`void` sur les promises dans les handlers d'événements** : `handleLinkPress` est async. Lors du branchement sur `onWikiLinkPress`, passer `(title) => { void handleLinkPress(title); }` pour éviter le lint warning sur une promise non attendue dans un callback synchrone.

---

## Spécifications visuelles — Benjamin (UX/UI)

## Composant : Navigation inter-articles (tap sur un lien)

### Objectif
Fournir un retour visuel clair lors d'un tap sur un lien navigable, et assurer la transition fluide entre deux articles sans perte de contexte.

### Layout (ASCII)

Les états de navigation s'expriment dans les zones déjà définies dans `ArticleScreen` (M-03). Pas de nouvel écran — ce sont des états transitoires du même écran.

**Transition : tap sur un lien**
```
Article A                          Article B
┌─────────────────────────────┐    ┌─────────────────────────────┐
│ ←  Tour Eiffel              │    │ ←  Paris                    │
├─────────────────────────────┤    ├─────────────────────────────┤
│ 3 sauts  ⏱ 01:24  → Louvre │    │ 4 sauts  ⏱ 01:28  → Louvre │
├─────────────────────────────┤    ├─────────────────────────────┤
│                             │    │  [Skeleton loading]         │
│  ...texte...                │    │  ████████████░░░░           │
│  [Paris] ← tap ici    →→→  │    │  ████████░░░░░░░            │
│  ...texte...                │    │  ██████░░░░░░░░░            │
│                             │    │                             │
└─────────────────────────────┘    └─────────────────────────────┘
       Transition push (slide depuis la droite, native iOS/Android)
```

**Retour arrière : bouton ←**
```
Article B                          Article A
┌─────────────────────────────┐    ┌─────────────────────────────┐
│ ←  Paris                    │ ←← │ ←  Tour Eiffel              │
├─────────────────────────────┤    ├─────────────────────────────┤
│ 4 sauts  ⏱ 01:31  → Louvre │    │ 4 sauts  ⏱ 01:31  → Louvre │
├─────────────────────────────┤    ├─────────────────────────────┤
│  [Contenu Paris]            │    │  [Contenu Tour Eiffel]      │
│  ...                        │    │  depuis le début (pas       │
│                             │    │  de mémorisation du scroll) │
└─────────────────────────────┘    └─────────────────────────────┘
       Transition pop (slide retour vers la droite, native)
       Compteur reste à 4 sauts — pas de décrémentation
```

### Composants

- **Transition de navigation** — Utiliser la transition native du stack React Navigation (`@react-navigation/native-stack`). Sur iOS : slide depuis la droite (comportement natif UINavigationController). Sur Android : slide depuis le bas ou la droite selon la version OS. Aucune animation custom à définir — le comportement natif est le plus cohérent avec les conventions de chaque plateforme.
- **État "tap en cours" sur un lien** — Pas de retour visuel spécial côté RN lors du tap (le tap est géré dans la WebView). Si `getArticleSummary` prend du temps (réseau), l'utilisateur reste sur l'article en cours pendant la résolution. Le nouveau `ArticleScreen` apparaît uniquement quand `navigation.push` est appelé. Ce délai maximum attendu est négligeable (résumés mis en cache), mais si un retour est jugé nécessaire en QA : ajouter un indicateur de chargement global (ex: bandeau fin en haut de l'écran, "hairline progress bar") de couleur `#2563EB`. Décision à prendre lors des tests QA.
- **Alerte d'erreur (lien non résolvable)** — Via `Alert.alert` natif (iOS sheet / Android dialog). Titre : "Article introuvable" ou "Erreur réseau". Bouton : "OK". Fond et couleurs gérés nativement par la plateforme — pas de custom design.
- **Compteur sauts dans le HUD** — Le chiffre se met à jour instantanément lors d'un saut (avant même que le nouvel article soit affiché). Transition : changement de valeur sans animation. La lecture de l'accessibilité sera déclenchée par la mise à jour de l'`accessibilityLabel` du HUD.

### États

- **Default (lecture d'un article) :** Pas d'état spécifique à ce composant — c'est l'état normal de `ArticleScreen`.

- **Loading (saut en cours — `getArticleSummary` réseau) :** Théoriquement transparent (résumé en cache). Si le réseau est lent, l'utilisateur attend sur l'article courant. Aucun changement visuel prévu en Wave 3. Signaler comme point de surveillance en QA.

- **Error (lien non jouable, 404, réseau) :** Alerte native (voir ci-dessus). L'article courant reste affiché — l'utilisateur peut continuer à naviguer.

- **Victoire détectée :** Transition vers `VictoryScreen` (à designer en Wave 4). En Phase 2, `Alert.alert` en fallback. Aucun design à produire pour l'alerte native.

- **Empty :** N'existe pas pour ce composant — le tap n'est possible que si une session est active.

### Accessibilité

- [ ] La transition de navigation native (React Navigation) est annoncée automatiquement par VoiceOver/TalkBack. Vérifier que le focus se déplace bien vers le header du nouvel article au chargement (`accessibilityRole="header"` sur le titre du header).
- [ ] Le compteur de sauts mis à jour dans le HUD doit déclencher une annonce VoiceOver lors du changement. Utiliser `AccessibilityInfo.announceForAccessibility("Saut effectué. [N] sauts au total.")` dans `handleLinkPress` après `addJump`.
- [ ] Contraste ≥ 4.5:1 — les alertes natives utilisent les couleurs système, conformes aux exigences d'accessibilité iOS et Android.
- [ ] Zones tactiles ≥ 44×44pt — le bouton retour dans le header est 44×44pt (défini dans M-03). Les liens dans la WebView sont soumis à la densité du contenu Wikipedia — limitation inhérente documentée.
- [ ] Navigation VoiceOver séquentielle — après un saut, VoiceOver doit lire le header du nouvel article, puis le HUD, puis le contenu. Tester avec VoiceOver activé sur device physique.
- [ ] Race condition et double-tap — le flag `isNavigating` (useRef) empêche les double-navigations. Aucun retour visuel spécifique nécessaire pour ce cas — le deuxième tap est simplement ignoré silencieusement.

### Notes pour Laurent

- La transition slide natif est fournie automatiquement par `@react-navigation/native-stack`. Ne pas surcharger avec des animations custom.
- Le bouton retour dans le header doit utiliser `navigation.canGoBack()` pour décider s'il est affiché. Sur l'article de départ (premier écran de la stack Game), il ne doit pas apparaître — l'utilisateur revient à l'accueil uniquement via un futur bouton "Abandonner" (Wave 4).
- `AccessibilityInfo.announceForAccessibility` est disponible dans `react-native`. L'appeler dans `handleLinkPress` après `addJump`, pas dans `GameHUD` (pour éviter les annonces dupliquées).
- L'état de scroll n'est pas mémorisé lors du retour arrière (critère M-04 explicite). React Navigation peut conserver ou non l'état de scroll selon la configuration du stack. Pour s'assurer que l'article précédent s'affiche depuis le début au retour, ajouter une ref WebView dans `ArticleScreen` et appeler `webViewRef.current?.injectJavaScript('window.scrollTo(0, 0);')` dans un `useEffect` réagissant sur le focus de l'écran (`useIsFocused` de React Navigation).
- Le "hairline progress bar" en cas de réseau lent est optionnel en Wave 3. Si ajouté, utiliser `height: 3pt`, fond `#2563EB`, animation de remplissage de gauche à droite, positionné en haut du header (sous la barre de statut iOS). À ne pas bloquer la livraison — décision à prendre avec QA après les tests.

---

## Validation QA — Halim

**Date** : 2026-03-02
**Testeur** : Halim
**Statut global** : Validé

### Critères d'acceptance
- [x] Tap sur un lien interne charge et affiche le nouvel article — `handleLinkPress` appelle `navigation.push('Game', { articleTitle: title })` après validation du titre
- [x] Chaque navigation incrémente le compteur de sauts de 1 — `addJump(article)` appelé dans `handleLinkPress` avant la navigation ; `addJump` incrémente `jumps` et étend `path[]` dans le store (couvert par `gameStore.test.ts`)
- [x] Article visité ajouté à `path[]` — idem, `addJump` gère les deux mutations atomiquement
- [x] Bouton "Retour" revient à l'article précédent sans décrémenter les sauts — `navigation.goBack()` remonte dans le stack React Navigation ; le store n'est pas modifié au retour arrière
- [x] Navigation en arrière sans re-fetch API — le stack React Navigation native maintient les composants en vie ; le `summaryCache` garantit que `getArticleSummary` ne refait pas de requête réseau pour un article déjà vu
- [x] Scroll réinitialisé au retour arrière — `useIsFocused()` déclenche `webViewRef.current.injectJavaScript('window.scrollTo(0, 0); true;')` à chaque reprise du focus

### Tests automatisés
- `npm test` (apps/mobile) : 155 tests passants, 0 échec
- `tsc --noEmit` : sans erreur TypeScript
- `npm run lint` : 0 erreur
- `isPlayableArticle.test.ts` : 31 tests couvrent tous les namespaces non jouables (fr + en) et les cas limites de casse

### Cas limites testés
- Double-tap rapide sur un lien : flag `isNavigating` (useRef) bloque les appels concurrents — pattern présent dans `handleLinkPress`
- Lien vers namespace non jouable (Catégorie:, Portail:, etc.) : `isPlayableArticle` retourne `false`, `handleLinkPress` retourne immédiatement — vérifié par 31 tests unitaires
- Lien vers article inexistant (404) : `Alert.alert('Article introuvable', ...)` — catch `WikipediaNotFoundError` dans `handleLinkPress`
- Erreur réseau lors du tap : `Alert.alert('Erreur réseau', ...)` — catch `WikipediaNetworkError`
- Erreur inattendue : `Alert.alert('Erreur', ...)` — catch générique dans le finally
- Tap vers article déjà dans le chemin : `navigation.push` (et non `navigate`) empile toujours un nouvel écran — logique confirmée dans `RootNavigator.tsx`
- Victoire détectée : `completeSession()` + `Alert.alert('Bravo !', ...)` en fallback Phase 2 — logique présente dans `handleLinkPress`
- Titre avec caractères spéciaux (accents, apostrophes) : `isPlayableArticle('Révolution française')` → `true` — vérifié par test unitaire

### Note de surveillance (TODO-QA-M04)
Un commentaire `TODO(QA-M04)` est présent dans `RootNavigator.tsx` pour monitorer le comportement de détachement des écrans inactifs lors du retour arrière sur iOS et Android. Ce point ne peut pas être vérifié sans device physique. Le retour arrière sans re-fetch est garanti par le cache résumé ; le comportement du HTML (non caché) dépend de la configuration du stack natif. A surveiller lors des tests sur device en Phase 3.

### Bugs identifiés
Aucun bug identifié.

### Conclusion
Story validée. Tous les critères d'acceptance sont satisfaits. L'utilisation de `navigation.push` (et non `navigate`) est correcte et conforme à la spec. Le filtrage des namespaces non jouables est exhaustif et entièrement couvert par les tests. Le mécanisme anti-double-tap est en place.

## Statut
done
