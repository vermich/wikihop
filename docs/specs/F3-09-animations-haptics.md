# Spec technique — F3-09 : Animations et feedback haptique

## Contexte

Story : docs/stories/phase-3/F3-09.
Enrichir l'expérience utilisateur avec des animations ciblées et des retours haptiques sur les moments clés du jeu.

**Nécessite une validation UX/UI de Benjamin** pour les animations de VictoryScreen (voir section dédiée).

## Périmètre

**Dans scope :**
1. Feedback haptique victoire dans VictoryScreen (au montage)
2. Animation d'entrée de VictoryScreen — `Animated.spring` sur la carte de victoire (déjà partiellement implémentée, à vérifier et enrichir si nécessaire)
3. Feedback haptique au tap sur une chip SortBar dans HistoryScreen

**Hors scope :**
- Transitions entre articles (gérées par native-stack React Navigation)
- Skeleton loading animations (déjà implémentées dans HomeScreen)
- Animations GameHUD (timer, compteur de sauts)
- Toute animation dans ArticleScreen ou HomeScreen
- `react-native-reanimated` (non installé — hors stack)

## Contraintes stack

- Expo SDK 52, managed workflow
- `expo-haptics` : disponible nativement dans Expo SDK 52, aucune installation supplémentaire
- Animations : `Animated` de React Native (déjà utilisé dans VictoryScreen et HomeScreen)
- Zéro nouvelle dépendance externe

## Demande UX/UI à Benjamin

Avant que Laurent commence, Benjamin doit confirmer :
1. **Animation d'entrée VictoryScreen** : l'animation scale spring (0.8 → 1.0) est déjà implémentée dans VictoryScreen (`scaleAnim`, `Animated.spring`, `friction: 5`). Benjamin doit confirmer si ce comportement est satisfaisant ou s'il faut l'ajuster (durée, rebond, valeur initiale).
2. **Haptique sur chip SortBar** : un retour `Haptics.selectionAsync()` à chaque changement de critère de tri — confirmer que c'est le bon niveau d'intensité (pas de `impactAsync` plus fort).

## Fichiers à modifier

- `apps/mobile/src/screens/VictoryScreen.tsx` — ajout haptique victoire
- `apps/mobile/src/screens/HistoryScreen.tsx` — ajout haptique chip SortBar

## 1. Haptique victoire — VictoryScreen

### Analyse de l'existant

VictoryScreen dispose déjà d'une animation spring sur `scaleAnim` (lignes 143-159). L'animation est correctement protégée par `AccessibilityInfo.isReduceMotionEnabled()`.

Il manque uniquement le feedback haptique de victoire.

### Implémentation

Ajouter un `useEffect` au montage pour déclencher le haptique victoire :

```typescript
import * as Haptics from 'expo-haptics';

// Dans VictoryScreen, après les useEffect existants :
useEffect(() => {
  // Feedback haptique victoire — déclenché une seule fois au montage
  // Best-effort : une erreur haptique (device sans retour haptique) ne doit pas crasher
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {
    // Silencieux — certains appareils n'ont pas de retour haptique
  });
  // deps [] intentionnels — déclenchement unique au montage
}, []);
```

**Positionnement dans le fichier :** ajouter après le `useEffect` de l'animation spring (actuellement lignes 144-159) et avant le `useEffect` de calcul des stats (ligne 186).

**Note sur l'ordre des `useEffect`** : les `useEffect` avec `deps: []` s'exécutent tous au montage dans l'ordre de leur déclaration. L'haptique doit se déclencher en même temps que l'animation — l'ordre relatif est donc non critique.

### Protect reduce-motion

L'haptique est indépendant de `reduce motion` — le retour tactile n'est pas une animation visuelle. Ne pas le conditionner à `isReduceMotionEnabled()`. C'est conforme à la sémantique iOS/Android : reduce motion désactive les animations visuelles, pas les retours haptiques.

## 2. Animation d'entrée VictoryScreen — vérification

L'animation `Animated.spring` est déjà en place (vérifiée ligne 153) :

```typescript
Animated.spring(scaleAnim, {
  toValue: 1,
  useNativeDriver: true,
  friction: 5,
}).start();
```

**Paramètres actuels :** `friction: 5`, `tension` non défini (valeur par défaut React Native = 40).

La spec demande `tension: 100, friction: 8`. Mettre à jour les paramètres :

```typescript
Animated.spring(scaleAnim, {
  toValue: 1,
  useNativeDriver: true,
  tension: 100,
  friction: 8,
}).start();
```

**Valeur initiale :** `scaleAnim` est initialisé à `0.8` (ligne 143) — conforme à la spec.

**Protection reduce-motion :** déjà en place (lignes 147-151) — ne pas modifier.

## 3. Haptique SortBar — HistoryScreen

### Localisation

Dans `HistoryScreen.tsx`, le composant `SortBar` est défini lignes 120-151. Le handler `onSelect` est la prop `onSelect: (c: SortCriterion) => Promise<void>`.

Dans `HistoryScreen` (composant principal), l'onSelect correspond à `setCriterion` du hook `useHistorySort`.

### Implémentation

Ajouter l'import `expo-haptics` et modifier le handler dans `SortBar` :

```typescript
import * as Haptics from 'expo-haptics';

// Dans SortBar, modifier le onPress :
onPress={() => {
  void Haptics.selectionAsync().catch(() => {
    // Silencieux — certains appareils n'ont pas de retour haptique
  });
  void onSelect(c);
}}
```

Alternativement, si `Haptics` ne doit pas dépendre du composant SortBar (séparation des responsabilités), ajouter le haptique dans le `handleCriterionChange` dans `HistoryScreen` :

```typescript
// Dans HistoryScreen — wrapper autour de setCriterion :
const handleCriterionSelect = useCallback(async (c: SortCriterion): Promise<void> => {
  void Haptics.selectionAsync().catch(() => {
    // Silencieux
  });
  await setCriterion(c);
}, [setCriterion]);

// Passer handleCriterionSelect à SortBar au lieu de setCriterion directement
<SortBar activeCriterion={criterion} isLoading={sortLoading} onSelect={handleCriterionSelect} />
```

**Approche recommandée :** wrapper dans `HistoryScreen` (option 2). Raison : SortBar est un composant "dumb" — le feedback haptique est une décision de l'écran, pas du composant de tri.

**Note :** le haptique se déclenche même si l'utilisateur tape sur la chip déjà active (`isActive === true`). Le chip active a `disabled={isLoading}` mais pas de guard sur `isActive`. Si le PO souhaite n'avoir de retour haptique que lors d'un changement réel de critère, ajouter `if (c !== criterion)` avant le `Haptics.selectionAsync()`. Par défaut (sans instruction contraire), déclencher le haptique à chaque tap.

## TDD

VictoryScreen et HistoryScreen sont des composants UI — tests alongside. Le comportement de l'animation et des haptics n'est pas directement testable unitairement :
- `Animated.spring` : à mocker dans les tests si le composant en a besoin
- `expo-haptics` : à mocker avec `jest.mock('expo-haptics')` pour éviter les erreurs native module

**Aucun test TDD strict requis.** Si des tests existent pour VictoryScreen ou HistoryScreen, s'assurer que l'import `expo-haptics` est mocké correctement pour ne pas casser les tests existants.

### Setup mock expo-haptics

Dans le fichier de setup Jest (`jest.setup.js` ou dans chaque test file) :

```typescript
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));
```

## Critères de qualité (PR review)

- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur
- [ ] `expo-haptics` importé avec `import * as Haptics from 'expo-haptics'` (pas de destructuring — convention Expo)
- [ ] Toutes les promesses haptiques sont `.catch()`-ées silencieusement
- [ ] Animation spring mise à jour avec `tension: 100, friction: 8`
- [ ] Haptique VictoryScreen : `NotificationFeedbackType.Success` au montage
- [ ] Haptique SortBar : `selectionAsync()` à chaque tap sur une chip
- [ ] Zéro nouvelle dépendance dans `package.json`
- [ ] Spec UX/UI de Benjamin validée avant merge
- [ ] Tests existants non cassés (vérifier que `expo-haptics` est mocké si nécessaire)

## Points de vigilance

1. **`expo-haptics` sur simulateur iOS** : le retour haptique ne fonctionne pas sur simulateur iOS (absence de moteur haptique). Les tests manuels doivent être effectués sur device physique pour valider le comportement. Sur Android émulateur, le haptique peut fonctionner partiellement selon la version de l'émulateur.

2. **`void` sur les promesses haptiques** : `Haptics.notificationAsync()` et `Haptics.selectionAsync()` retournent des `Promise<void>`. Utiliser `void Haptics.xxx().catch(...)` pour satisfaire la règle ESLint `@typescript-eslint/no-floating-promises`.

3. **`useNativeDriver: true`** : déjà en place sur l'animation existante — ne pas le retirer. Obligatoire pour les performances d'animation (execution sur le thread natif).

4. **Paramètres spring** : `tension: 100` donne un ressort rigide (rebond rapide), `friction: 8` donne un amortissement modéré (quelques oscillations). Sur device physique, vérifier que l'animation n'est pas trop saccadée sur les appareils bas de gamme.
