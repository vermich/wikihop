# Spécifications techniques — Vague D : F3-27, F3-28, F3-29, F3-30

**Destinataire :** Laurent (Frontend Dev)
**Date :** 2026-03-14
**Périmètre :** `apps/mobile/` uniquement

---

## Vue d'ensemble

| Story | Titre | Priorité | Fichiers principaux touchés |
|-------|-------|----------|-----------------------------|
| F3-27 | Fix retour arrière WebView | Must | `ArticleScreen.tsx` |
| F3-28 | Multijoueur — manches configurables | Should | `multiplayer.store.ts`, `MultiplayerSetupScreen.tsx`, `VictoryScreen.tsx`, `RootNavigator.tsx`, `multiplayer.utils.ts` + nouveau `MultiplayerRoundTransitionScreen.tsx` |
| F3-29 | Bouton Rejouer multijoueur | Should | `MultiplayerResultScreen.tsx`, `multiplayer.store.ts` |
| F3-30 | Fix isolation historique multijoueur | Must | `game.store.ts`, `packages/shared/src/types/index.ts` |

**Convention de branche :** `feat/laurent-vague-d`

---

## F3-27 — Fix retour arrière WebView (Must)

### Contexte

Story : `docs/stories/F3-27-fix-back-navigation-webview.md`

F3-22 a remplacé `webViewRef.current?.goBack()` par `navigation.goBack()` dans `ArticleScreen.tsx`. Cette approche était valide si la navigation inter-articles utilisait `navigation.push` (multi-écrans empilés). Mais l'architecture actuelle est **single-screen** : il n'y a qu'une seule instance de `ArticleScreen` dans le stack, et toute la navigation Wikipedia se passe à l'intérieur de la WebView via `onNavigationStateChange`. Appuyer sur "← Retour" dépile donc l'écran Game entier et retourne à Home — c'est le bug.

**Cause racine :** `webViewRef` et `webViewCanGoBack` supprimés dans F3-22. `navigation.canGoBack()` retourne `false` sur le premier écran du stack, ou `true` s'il y a un écran précédent dans le stack natif (ex. Home), ce qui ne correspond pas à l'état interne de la WebView.

### Périmètre

**In scope :** `apps/mobile/src/screens/ArticleScreen.tsx` uniquement.

**Out of scope :** `WikipediaWebView.tsx` — les props `webViewRef` et `onNavigationStateChange` existent déjà, aucune modification requise.

### Modifications dans `ArticleScreen.tsx`

#### 1. Imports à ajouter

```typescript
import React, {
  useCallback,
  useEffect,
  useRef,   // ← ajouter
  useState,
} from 'react';
import type { RefObject } from 'react'; // ← ajouter si non présent
import { WebView } from 'react-native-webview'; // ← ajouter pour le type du ref
```

#### 2. Nouveaux états et refs

Ajouter dans le corps du composant `ArticleScreen`, après les déclarations de store :

```typescript
// Ref vers la WebView native — permet goBack() depuis le BackHandler et le bouton header
const webViewRef = useRef<WebView>(null);

// Suit canGoBack de la WebView (remplace navigation.canGoBack() pour le retour intra-partie)
const [webViewCanGoBack, setWebViewCanGoBack] = useState(false);

// Flag interne : distingue un retour arrière (goBack) d'un saut forward
// true pendant le cycle : goBack() appelé → handlePageChangeSync reçu
const isBackNavigation = useRef(false);
```

#### 3. Callback `onNavigationStateChange` pour la WebView

Ajouter ce callback :

```typescript
const handleNavStateChange = useCallback(
  (navState: { canGoBack: boolean; url: string }): void => {
    setWebViewCanGoBack(navState.canGoBack);
  },
  [],
);
```

#### 4. Modifier `handlePageChangeSync`

La logique actuelle appelle `handlePageChange` inconditionnellement. Il faut intercepter les retours arrière :

```typescript
const handlePageChangeSync = useCallback(
  (newTitle: string): void => {
    // Si c'est un retour arrière, on met seulement à jour le titre affiché
    // et on reset le flag — on NE compte PAS de saut, on N'appelle PAS addJump
    if (isBackNavigation.current) {
      isBackNavigation.current = false;
      setCurrentTitle(newTitle);
      return;
    }
    // Forward navigation : comportement inchangé
    void handlePageChange(newTitle);
  },
  [handlePageChange],
);
```

#### 5. Modifier le bouton "← Retour" dans le rendu

Remplacer la condition `navigation.canGoBack()` par `webViewCanGoBack` :

```typescript
// AVANT (F3-22 — bugué) :
{navigation.canGoBack() ? (
  <TouchableOpacity onPress={() => { navigation.goBack(); }}>
    ...
  </TouchableOpacity>
) : (
  <View style={styles.backButtonPlaceholder} />
)}

// APRÈS (F3-27) :
{webViewCanGoBack ? (
  <TouchableOpacity
    style={styles.backButton}
    onPress={() => {
      isBackNavigation.current = true;
      webViewRef.current?.goBack();
    }}
    accessibilityLabel="Retour à l'article précédent"
    accessibilityRole="button"
  >
    <Text style={styles.backButtonText}>{'← Retour'}</Text>
  </TouchableOpacity>
) : (
  <View style={styles.backButtonPlaceholder} />
)}
```

#### 6. Modifier le BackHandler Android

```typescript
// AVANT (F3-22 — bugué) :
if (navigation.canGoBack()) {
  navigation.goBack();
  return true;
}
handleAbandon();
return true;

// APRÈS (F3-27) :
if (webViewCanGoBack) {
  isBackNavigation.current = true;
  webViewRef.current?.goBack();
  return true;
}
handleAbandon();
return true;
```

Le `useEffect` du BackHandler a `webViewCanGoBack` dans ses dépendances (en plus de `isFocused`, `handleAbandon`).

#### 7. Passer les props à `WikipediaWebView`

```typescript
<WikipediaWebView
  currentTitle={currentTitle}
  lang={lang}
  onPageChange={handlePageChangeSync}
  onError={(error) => { setWebViewError(error); }}
  webViewRef={webViewRef}
  onNavigationStateChange={handleNavStateChange}
/>
```

**Note `exactOptionalPropertyTypes` :** `webViewRef` et `onNavigationStateChange` sont des props optionnelles (`?`) dans `WikipediaWebViewProps`. Pour passer des valeurs non-undefined, il suffit de les écrire directement sans spread conditionnel — les valeurs sont définies, pas `undefined`.

### Suppression du commentaire de bloc obsolète

Mettre à jour le commentaire en tête du fichier : remplacer la mention `F3-22` par `F3-27`, corriger la description de l'architecture (single-screen WebView, goBack interne).

### TDD — pas de fonction pure isolable

La logique de F3-27 est entièrement dans la gestion d'état et d'effets du composant. Il n'y a pas de fonction pure à tester en TDD strict. Les tests d'intégration composant (si présents) sont bienvenus mais non bloquants.

### Critères de validation en PR review

- [ ] `webViewRef`, `webViewCanGoBack`, `isBackNavigation` présents
- [ ] Bouton "← Retour" conditionné sur `webViewCanGoBack` (pas `navigation.canGoBack()`)
- [ ] BackHandler utilise `webViewRef.current?.goBack()` quand `webViewCanGoBack` est vrai
- [ ] `handlePageChangeSync` : retour arrière → reset flag + `setCurrentTitle` seulement, PAS `handlePageChange`
- [ ] `webViewRef` et `onNavigationStateChange` passés à `WikipediaWebView`
- [ ] Aucun `navigation.canGoBack()` ou `navigation.goBack()` pour la navigation intra-partie

### Gate device physique (règle CLAUDE.md)

Cette PR touche la navigation et le flux Home→Game. La description de la PR doit mentionner explicitement que le chemin complet Home → article de départ → navigation inter-articles → retour arrière → VictoryScreen a été joué sur device physique, ou indiquer que l'accès device n'est pas disponible.

---

## F3-28 — Multijoueur — manches configurables (Should)

### Contexte

Story : `docs/stories/F3-28-multiplayer-rounds.md`

Permettre aux joueurs de choisir entre 1 et 5 manches avant de lancer. Chaque manche utilise une paire d'articles différente. Le classement final agrège les résultats sur l'ensemble des manches.

### Périmètre

**In scope :**
- `multiplayer.store.ts` — nouveaux types + nouvelles actions
- `MultiplayerSetupScreen.tsx` — sélecteur de manches
- `VictoryScreen.tsx` — `handleNextTurn` mis à jour
- `RootNavigator.tsx` — nouvelle route `MultiplayerRoundTransition`
- Nouveau fichier : `apps/mobile/src/screens/MultiplayerRoundTransitionScreen.tsx`
- `multiplayer.utils.ts` — nouvelle fonction pure `rankPlayersGlobal`

**Out of scope :** `MultiplayerResultScreen.tsx` pour cette story (affichage multi-manches = F3-29). Le classement "récap par manche" est optionnel, seul le classement global final est requis.

### 1. Types — `multiplayer.store.ts`

Ajouter l'interface `MultiplayerRoundResult` et étendre `MultiplayerState` :

```typescript
/**
 * Résultat d'un joueur pour une manche donnée.
 * null = joueur qui n'a pas encore joué (ne devrait pas arriver en pratique).
 */
export interface MultiplayerRoundResult {
  jumps: number | null;
  durationMs: number | null;
  won: boolean;
}

// Extension de MultiplayerState (remplacer l'interface existante) :
export interface MultiplayerState {
  players: MultiplayerPlayer[];
  currentPlayerIndex: number;
  startArticle: Article | null;
  targetArticle: Article | null;
  isSessionActive: boolean;
  /** Nombre total de manches configurées (1-5). Défaut : 1. */
  roundCount: number;
  /** Manche courante, commence à 1. */
  currentRound: number;
  /**
   * Historique des résultats par manche.
   * roundHistory[roundIndex][playerIndex] = résultat du joueur pour cette manche.
   * Rempli par startNextRound() à chaque transition de manche.
   */
  roundHistory: MultiplayerRoundResult[][];
}
```

### 2. Actions — `multiplayer.store.ts`

Modifier/ajouter dans l'interface `MultiplayerActions` :

```typescript
interface MultiplayerActions {
  /** Initialise une session avec les noms de joueurs, la paire, et le nombre de manches. */
  setupSession(
    players: string[],
    start: Article,
    target: Article,
    roundCount?: number,      // défaut : 1
  ): void;

  recordTurnResult(index: number, jumps: number, durationMs: number, won: boolean): void;
  advanceToNextPlayer(): void;

  /**
   * Transition vers la manche suivante.
   * - Sauvegarde les résultats des joueurs de la manche courante dans roundHistory
   * - Remet les joueurs en état 'waiting' avec jumps/durationMs/won à zéro
   * - Remet currentPlayerIndex à 0
   * - Incrémente currentRound
   * - Met à jour startArticle et targetArticle pour la nouvelle manche
   */
  startNextRound(start: Article, target: Article): void;

  /**
   * Repart depuis le début avec une nouvelle paire et les mêmes joueurs.
   * Utilisé par F3-29 (bouton Rejouer).
   * - Reset players[].status à 'waiting', jumps/durationMs à null, won à false
   * - currentRound = 1
   * - roundHistory = []
   * - currentPlayerIndex = 0
   * - Met à jour startArticle et targetArticle
   */
  restartSession(start: Article, target: Article): void;

  resetSession(): void;
}
```

#### Implémentation de `setupSession` (mise à jour)

```typescript
setupSession: (playerNames, start, target, roundCount = 1) => {
  set({
    players: playerNames.map((name) => ({
      name,
      status: 'waiting',
      jumps: null,
      durationMs: null,
      won: false,
    })),
    currentPlayerIndex: 0,
    startArticle: start,
    targetArticle: target,
    isSessionActive: true,
    roundCount,
    currentRound: 1,
    roundHistory: [],
  });
},
```

#### Implémentation de `startNextRound`

```typescript
startNextRound: (start, target) => {
  set((state) => {
    // Construire le snapshot de la manche courante
    const roundSnapshot: MultiplayerRoundResult[] = state.players.map((p) => ({
      jumps: p.jumps,
      durationMs: p.durationMs,
      won: p.won,
    }));

    return {
      roundHistory: [...state.roundHistory, roundSnapshot],
      players: state.players.map((p) => ({
        ...p,
        status: 'waiting' as MultiplayerPlayerStatus,
        jumps: null,
        durationMs: null,
        won: false,
      })),
      currentPlayerIndex: 0,
      currentRound: state.currentRound + 1,
      startArticle: start,
      targetArticle: target,
    };
  });
},
```

#### Implémentation de `restartSession`

```typescript
restartSession: (start, target) => {
  set((state) => ({
    players: state.players.map((p) => ({
      ...p,
      status: 'waiting' as MultiplayerPlayerStatus,
      jumps: null,
      durationMs: null,
      won: false,
    })),
    currentPlayerIndex: 0,
    currentRound: 1,
    roundHistory: [],
    startArticle: start,
    targetArticle: target,
  }));
},
```

#### `initialState` mis à jour

```typescript
const initialState: MultiplayerState = {
  players: [],
  currentPlayerIndex: 0,
  startArticle: null,
  targetArticle: null,
  isSessionActive: false,
  roundCount: 1,
  currentRound: 1,
  roundHistory: [],
};
```

### 3. MultiplayerSetupScreen — sélecteur de manches

Ajouter un état local `roundCount` (number, défaut 1) et un composant de stepper.

#### Nouvel état

```typescript
const [roundCount, setRoundCount] = useState(1);
```

#### UI du stepper — insérer dans le ScrollView, après la liste des joueurs et avant le bloc paire

```
[─────────────────────────────────]
  MANCHES
  [−]   2   [+]
[─────────────────────────────────]
```

Structure de rendu :

```typescript
<Text style={styles.sectionLabel}>{'MANCHES'}</Text>
<View style={styles.stepperRow}>
  <TouchableOpacity
    style={[styles.stepperButton, roundCount <= 1 && styles.stepperButtonDisabled]}
    onPress={() => { setRoundCount((prev) => Math.max(1, prev - 1)); }}
    disabled={roundCount <= 1}
    accessibilityLabel="Diminuer le nombre de manches"
    accessibilityRole="button"
    accessibilityState={{ disabled: roundCount <= 1 }}
  >
    <Text style={styles.stepperButtonText}>{'−'}</Text>
  </TouchableOpacity>
  <Text style={styles.stepperValue} accessibilityLabel={`${String(roundCount)} manche${roundCount > 1 ? 's' : ''}`}>
    {String(roundCount)}
  </Text>
  <TouchableOpacity
    style={[styles.stepperButton, roundCount >= 5 && styles.stepperButtonDisabled]}
    onPress={() => { setRoundCount((prev) => Math.min(5, prev + 1)); }}
    disabled={roundCount >= 5}
    accessibilityLabel="Augmenter le nombre de manches"
    accessibilityRole="button"
    accessibilityState={{ disabled: roundCount >= 5 }}
  >
    <Text style={styles.stepperButtonText}>{'+'}</Text>
  </TouchableOpacity>
</View>
```

Styles suggérés (à ajouter dans `StyleSheet.create`) :

```typescript
stepperRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: 4,
  marginBottom: 16,
},
stepperButton: {
  width: 44,
  height: 44,
  backgroundColor: '#F1F5F9',
  borderRadius: 8,
  alignItems: 'center',
  justifyContent: 'center',
},
stepperButtonDisabled: {
  opacity: 0.4,
},
stepperButtonText: {
  fontSize: 22,
  fontWeight: 'bold',
  color: '#1E293B',
},
stepperValue: {
  fontSize: 24,
  fontWeight: 'bold',
  color: '#1E293B',
  minWidth: 48,
  textAlign: 'center',
},
```

#### Passer `roundCount` à `setupSession`

Dans `handleStart`, modifier l'appel :

```typescript
// AVANT :
setupSession(names, startArticle, targetArticle);

// APRÈS :
setupSession(names, startArticle, targetArticle, roundCount);
```

### 4. Nouvelle route `MultiplayerRoundTransition`

#### `RootNavigator.tsx` — ajouter dans `RootStackParamList`

```typescript
/**
 * Route MultiplayerRoundTransition : transition entre deux manches (F3-28).
 * Charge une nouvelle paire d'articles et déclenche startNextRound.
 * gestureEnabled: false — empêche tout retour accidentel.
 */
MultiplayerRoundTransition: undefined;
```

#### Enregistrement dans le `Stack.Navigator`

```typescript
import { MultiplayerRoundTransitionScreen } from '../screens/MultiplayerRoundTransitionScreen';

// Dans Stack.Navigator :
<Stack.Screen
  name="MultiplayerRoundTransition"
  component={MultiplayerRoundTransitionScreen}
  options={{ headerShown: false, gestureEnabled: false }}
/>
```

### 5. `MultiplayerRoundTransitionScreen.tsx` — nouveau fichier

Ce fichier est à créer dans `apps/mobile/src/screens/`.

**Responsabilité :** charger une nouvelle paire d'articles, appeler `startNextRound`, démarrer la session de jeu pour le premier joueur de la nouvelle manche, puis naviguer vers `PassPhone`.

```
apps/mobile/src/screens/MultiplayerRoundTransitionScreen.tsx
```

**Interface :** pas de params de navigation (`MultiplayerRoundTransition: undefined`).

**Structure :**

```typescript
export function MultiplayerRoundTransitionScreen({ navigation }: ...): React.JSX.Element {
  const { state: pairState } = useRandomPair('normal');

  const currentRound = useMultiplayerStore((s) => s.currentRound);
  const roundCount = useMultiplayerStore((s) => s.roundCount);
  const players = useMultiplayerStore((s) => s.players);
  const startNextRound = useMultiplayerStore((s) => s.startNextRound);
  const clearSession = useGameStore((s) => s.clearSession);
  const startSession = useGameStore((s) => s.startSession);

  // Déclencher la transition dès que la paire est chargée
  useEffect(() => {
    if (pairState.status !== 'success') return;

    const startArticle: Article = { ... }; // construction explicite champ par champ
    const targetArticle: Article = { ... };

    // Ordre strict :
    // 1. Transition de manche dans le store multijoueur
    startNextRound(startArticle, targetArticle);
    // 2. Démarrer la session de jeu solo pour le joueur 1 de la nouvelle manche
    void (async () => {
      await clearSession();
      await startSession(startArticle, targetArticle, { isMultiplayer: true });
      const firstPlayer = players[0];
      navigation.replace('PassPhone', {
        playerName: firstPlayer?.name ?? '',
      });
    })();
  }, [pairState.status]);  // dépendances complètes à ajuster selon lint
```

**Affichage pendant le chargement :**

```
[SafeAreaView]
  [ActivityIndicator]
  [Text] "Chargement de la manche {currentRound}/{roundCount}..."
```

**Gestion d'erreur :** si `pairState.status === 'error'`, afficher un message et un bouton "Retour aux résultats" qui navigue vers `MultiplayerResult`.

**Note `navigation.replace` :** utiliser `replace` (pas `navigate`) pour que PassPhone remplace l'écran de transition dans le stack — on ne veut pas pouvoir revenir sur l'écran de chargement.

### 6. `VictoryScreen.tsx` — `handleNextTurn` mis à jour

Ajouter les sélecteurs manquants et modifier la logique de fin de manche :

```typescript
// Sélecteurs à ajouter
const roundCount = useMultiplayerStore((state) => state.roundCount);
const currentRound = useMultiplayerStore((state) => state.currentRound);
```

Logique mise à jour dans `handleNextTurn` (après `advanceToNextPlayer()` et avant le `clearSession()`) :

```typescript
const nextIndex = currentPlayerIndex + 1;
const allPlayersThisRoundDone = nextIndex >= multiplayerPlayers.length;

await clearSession();

if (allPlayersThisRoundDone) {
  // Tous les joueurs ont joué cette manche
  if (currentRound < roundCount) {
    // Pas la dernière manche → transition vers la manche suivante
    navigation.navigate('MultiplayerRoundTransition');
    return;
  } else {
    // Dernière manche → résultats finaux
    navigation.navigate('MultiplayerResult');
    return;
  }
}

// Pas la fin de la manche : joueur suivant
const nextPlayer = multiplayerPlayers[nextIndex];
if (nextPlayer === undefined) {
  navigation.navigate('MultiplayerResult');
  return;
}

const startArticle = useMultiplayerStore.getState().startArticle;
const targetArticle = useMultiplayerStore.getState().targetArticle;

if (startArticle === null || targetArticle === null) {
  navigation.navigate('MultiplayerResult');
  return;
}

await startSession(startArticle, targetArticle, { isMultiplayer: true });
navigation.navigate('PassPhone', { playerName: nextPlayer.name });
```

**Point de vigilance :** `recordTurnResult` et `advanceToNextPlayer` doivent être appelés AVANT de lire `currentRound` (qui n'a pas encore changé — il change dans `startNextRound`, pas dans `advanceToNextPlayer`). La logique `currentRound < roundCount` est donc correcte à ce stade.

### 7. `multiplayer.utils.ts` — `rankPlayersGlobal`

**TDD strict : écrire les tests AVANT l'implémentation.**

Cette fonction est pure et doit être testée avant le code dans `apps/mobile/src/__tests__/utils/multiplayer.utils.test.ts`.

```typescript
/**
 * Calcule le classement global sur l'ensemble des manches.
 *
 * Critères de classement (par priorité) :
 *   1. Nombre de victoires (desc) — un joueur qui gagne plus de manches est mieux classé
 *   2. Total de sauts sur les manches gagnées (asc) — moins de sauts = meilleur
 *   3. Durée totale sur les manches gagnées (asc) — plus rapide = meilleur
 *   4. En cas d'égalité totale : ordre d'arrivée conservé (tri stable)
 *
 * @param roundHistory - Tableau des manches, chaque manche = tableau de résultats par joueur
 * @param playerNames  - Noms des joueurs dans l'ordre de leur index
 * @returns Tableau de classement trié, du premier au dernier
 */
export function rankPlayersGlobal(
  roundHistory: MultiplayerRoundResult[][],
  playerNames: string[],
): Array<{
  name: string;
  wins: number;
  totalJumps: number;
  totalDurationMs: number;
}> {
  // Calculer les stats agrégées de chaque joueur
  const stats = playerNames.map((name, playerIndex) => {
    let wins = 0;
    let totalJumps = 0;
    let totalDurationMs = 0;

    for (const round of roundHistory) {
      const result = round[playerIndex];
      if (result === undefined) continue;
      if (result.won) {
        wins += 1;
        totalJumps += result.jumps ?? 0;
        totalDurationMs += result.durationMs ?? 0;
      }
    }

    return { name, wins, totalJumps, totalDurationMs };
  });

  // Tri stable
  return [...stats].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (a.totalJumps !== b.totalJumps) return a.totalJumps - b.totalJumps;
    return a.totalDurationMs - b.totalDurationMs;
  });
}
```

#### Cas de test attendus (TDD)

Fichier : `apps/mobile/src/__tests__/utils/multiplayer.utils.test.ts`

```
describe('rankPlayersGlobal')

cas 1 — classement par victoires
  2 joueurs, joueur A gagne manche 1 et 2, joueur B gagne manche 2 seulement
  → A en premier

cas 2 — égalité victoires, tri par sauts
  2 joueurs, 2 victoires chacun, A a totalJumps=8, B a totalJumps=5
  → B en premier

cas 3 — égalité victoires + sauts, tri par durée
  2 joueurs, 2 victoires chacun, mêmes sauts, A totalDurationMs=12000, B=9000
  → B en premier

cas 4 — aucune victoire
  2 joueurs, aucun n'a gagné → résultat = tous wins=0, ordre préservé

cas 5 — 3 joueurs, 2 manches
  vérifier l'agrégation correcte sur 2 manches

cas 6 — roundHistory vide
  → retourne les joueurs dans l'ordre avec wins=0, totalJumps=0, totalDurationMs=0

cas 7 — résultat avec jumps null (won=false) ne contribue pas aux stats
```

### TDD récap — F3-28

**TDD strict avant implémentation :**
- `rankPlayersGlobal` dans `multiplayer.utils.ts`

**Tests alongside (écrits en même temps que le code) :**
- `startNextRound`, `restartSession` dans le store (logique d'état, pas fonction pure isolable)
- `MultiplayerRoundTransitionScreen` — composant avec chargement asynchrone

---

## F3-29 — Bouton Rejouer multijoueur (Should)

### Contexte

Story : `docs/stories/F3-29-multiplayer-replay.md`

Ajouter un bouton "Rejouer" dans `MultiplayerResultScreen` pour relancer une session multijoueur avec les mêmes joueurs mais une nouvelle paire d'articles (et remise à zéro des manches).

### Périmètre

**In scope :**
- `MultiplayerResultScreen.tsx` — ajout du bouton Rejouer + chargement de paire en arrière-plan
- `multiplayer.store.ts` — action `restartSession` (déjà définie dans F3-28)

**Out of scope :** Toute modification de `RootNavigator` ou de `MultiplayerRoundTransitionScreen` — on ne passe pas par cet écran pour le Rejouer (la paire est chargée directement dans `MultiplayerResultScreen`).

**Dépendance :** F3-28 doit être mergé avant F3-29 (action `restartSession` nécessaire).

### Modifications dans `MultiplayerResultScreen.tsx`

#### 1. Charger une paire en arrière-plan

Ajouter l'import et le hook au montage de l'écran :

```typescript
import { useRandomPair } from '../hooks/useRandomPair';
import type { Article } from '@wikihop/shared';
import { useGameStore } from '../store/game.store';

// Dans le composant :
const { state: pairState } = useRandomPair('normal');
const restartSession = useMultiplayerStore((s) => s.restartSession);
const clearSession = useGameStore((s) => s.clearSession);
const startSession = useGameStore((s) => s.startSession);
```

#### 2. Handler `handleReplay`

```typescript
const handleReplay = useCallback(async (): Promise<void> => {
  if (pairState.status !== 'success') return;

  // Construction explicite Article — pas de spread
  const startArticle: Article = {
    id: pairState.start.id,
    title: pairState.start.title,
    url: pairState.start.url,
    language: pairState.start.language,
  };
  const targetArticle: Article = {
    id: pairState.target.id,
    title: pairState.target.title,
    url: pairState.target.url,
    language: pairState.target.language,
  };

  // Réinitialiser le store multijoueur avec la nouvelle paire
  restartSession(startArticle, targetArticle);

  // Démarrer la session de jeu pour le joueur 1
  await clearSession();
  await startSession(startArticle, targetArticle, { isMultiplayer: true });

  const firstPlayer = players[0];
  // navigate vers PassPhone (pas replace — on veut que Home soit toujours en bas du stack)
  navigation.navigate('PassPhone', { playerName: firstPlayer?.name ?? '' });
}, [pairState, players, restartSession, clearSession, startSession, navigation]);
```

#### 3. Bouton "Rejouer" dans `bottomZone`

Remplacer la zone bouton actuelle (1 bouton) par une zone à 2 boutons côte à côte :

```typescript
// AVANT :
<View style={styles.bottomZone}>
  <TouchableOpacity style={styles.homeButton} onPress={handleHome} ...>
    <Text>Retour à l'accueil</Text>
  </TouchableOpacity>
</View>

// APRÈS :
<View style={styles.bottomZone}>
  <View style={styles.bottomButtons}>
    <TouchableOpacity
      style={[styles.replayButton, pairState.status !== 'success' && styles.replayButtonDisabled]}
      onPress={() => { void handleReplay(); }}
      disabled={pairState.status !== 'success'}
      accessibilityLabel="Rejouer avec les mêmes joueurs"
      accessibilityRole="button"
      accessibilityState={{ disabled: pairState.status !== 'success' }}
    >
      <Text style={[styles.replayButtonText, pairState.status !== 'success' && styles.replayButtonTextDisabled]}>
        {'Rejouer'}
      </Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={styles.homeButton}
      onPress={handleHome}
      accessibilityLabel="Retour à l'accueil"
      accessibilityRole="button"
    >
      <Text style={styles.homeButtonText}>{"Retour à l'accueil"}</Text>
    </TouchableOpacity>
  </View>
</View>
```

Nouveaux styles à ajouter :

```typescript
bottomButtons: {
  flexDirection: 'row',
  gap: 12,
},
replayButton: {
  flex: 1,
  height: 52,
  borderWidth: 2,
  borderColor: '#2563EB',
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
},
replayButtonDisabled: {
  borderColor: '#CBD5E1',
},
replayButtonText: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#2563EB',
},
replayButtonTextDisabled: {
  color: '#94A3B8',
},
// Modifier homeButton pour flex: 1
homeButton: {
  flex: 1,
  height: 52,
  backgroundColor: '#2563EB',
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
},
```

**Note :** Le bouton "Rejouer" est désactivé (`pairState.status !== 'success'`) pendant le chargement de la paire. Cela évite d'avoir à gérer un état de chargement explicite — la paire se charge silencieusement au montage, le bouton s'active quand c'est prêt.

### TDD — F3-29

Pas de fonction pure nouvelle à tester en TDD strict. La logique de `handleReplay` est dans le composant et dépend de `useRandomPair`. Tests alongside si couverture store.

---

## F3-30 — Fix isolation historique multijoueur (Must)

### Contexte

Story : `docs/stories/F3-30-fix-multiplayer-history-isolation.md`

Toutes les sessions, y compris les sessions multijoueur, sont actuellement sauvegardées dans l'historique solo via `ScoreStorage.save()`. Ce comportement pollue l'historique solo de l'utilisateur avec des parties qu'il n'a pas jouées en solo.

**Cause racine :** `completeSession()` et `abandonSession()` dans `game.store.ts` appellent `ScoreStorage.save(record)` sans vérifier si la session est une session multijoueur.

### Périmètre

**In scope :**
- `packages/shared/src/types/index.ts` — ajout `isMultiplayer?: boolean` à `GameSession`
- `apps/mobile/src/store/game.store.ts` — propagation du champ + guard dans `completeSession`/`abandonSession`

**Out of scope :**
- `GameRecord` et `buildGameRecord` — `isMultiplayer` reste dans `GameSession` uniquement, pas dans le record historique
- `ScoreStorage` — aucune modification
- `MultiplayerResultScreen`, `MultiplayerRoundTransitionScreen` — ces screens appellent `startSession` avec `{ isMultiplayer: true }` (voir F3-28), aucun changement supplémentaire

### 1. `packages/shared/src/types/index.ts`

Ajouter un champ à `GameSession` :

```typescript
export interface GameSession {
  // ... champs existants inchangés ...

  /** Difficulté de la partie (F3-05). Absent = 'normal' pour rétrocompatibilité. */
  difficulty?: GameDifficulty;

  /**
   * Indique si la session fait partie d'une session multijoueur hot-seat (F3-30).
   * Absent = false pour les sessions solo.
   * Les sessions multijoueur ne sont PAS enregistrées dans l'historique solo.
   */
  isMultiplayer?: boolean;
}
```

### 2. `apps/mobile/src/store/game.store.ts`

#### 2a. Signature `startSession` — ajout de `isMultiplayer`

```typescript
startSession: (
  startArticle: Article,
  targetArticle: Article,
  options?: {
    isDailyChallenge?: boolean;
    dailyChallengeDate?: string;
    difficulty?: GameDifficulty;
    isMultiplayer?: boolean;    // ← nouveau champ F3-30
  },
): Promise<void>
```

#### 2b. Implémentation de `startSession` — propagation du champ

La session est construite avec un spread conditionnel pour `isMultiplayer` (conforme à `exactOptionalPropertyTypes` — ne jamais écrire `isMultiplayer: undefined`).

Structure actuelle :

```typescript
const session: GameSession =
  options?.isDailyChallenge === true && options.dailyChallengeDate !== undefined
    ? { ...baseSession, isDailyChallenge: true, dailyChallengeDate: options.dailyChallengeDate }
    : baseSession;
```

Structure mise à jour — ajouter le spread conditionnel `isMultiplayer` dans les deux branches (ou factoriser) :

```typescript
// Option recommandée — factoriser les champs optionnels
const optionalFields = {
  ...(options?.isDailyChallenge === true && options.dailyChallengeDate !== undefined
    ? { isDailyChallenge: true as const, dailyChallengeDate: options.dailyChallengeDate }
    : {}),
  ...(options?.isMultiplayer === true ? { isMultiplayer: true as const } : {}),
};

const session: GameSession = { ...baseSession, ...optionalFields };
```

**Point `exactOptionalPropertyTypes` :** `isMultiplayer: true as const` (pas `isMultiplayer: true`) n'est pas nécessaire techniquement, mais la cohérence avec `isDailyChallenge: true as const` est bienvenue. L'essentiel est de ne jamais écrire `isMultiplayer: undefined`.

#### 2c. Guard dans `completeSession`

```typescript
// AVANT :
const record = buildGameRecord(updatedSession);
if (record !== null) {
  void ScoreStorage.save(record);
}

// APRÈS :
const record = buildGameRecord(updatedSession);
if (record !== null && updatedSession.isMultiplayer !== true) {
  void ScoreStorage.save(record);
}
```

#### 2d. Guard dans `abandonSession` — même modification

```typescript
const record = buildGameRecord(updatedSession);
if (record !== null && updatedSession.isMultiplayer !== true) {
  void ScoreStorage.save(record);
}
```

#### 2e. `hydrate()` — désérialisation

La méthode `hydrate()` parse le JSON AsyncStorage. Ajouter `isMultiplayer?: boolean` au type `parsed` et propager dans `optionalFields` :

```typescript
// Dans le cast JSON.parse :
const parsed = JSON.parse(raw) as {
  // ... champs existants ...
  difficulty?: GameDifficulty;
  isMultiplayer?: boolean;  // ← ajouter
};

// Dans optionalFields :
const optionalFields = {
  difficulty: parsed.difficulty ?? ('normal' as GameDifficulty),
  ...(parsed.isDailyChallenge === true ? { isDailyChallenge: true as const } : {}),
  ...(parsed.dailyChallengeDate !== undefined ? { dailyChallengeDate: parsed.dailyChallengeDate } : {}),
  ...(parsed.isMultiplayer === true ? { isMultiplayer: true as const } : {}),  // ← ajouter
};
```

Note : les sessions multijoueur ne sont pas censées survivre à une réhydratation (session éphémère), mais la cohérence du parsing est importante pour éviter des comportements inattendus si l'app est mise en arrière-plan pendant une partie multi.

### 3. Appels `startSession` avec `{ isMultiplayer: true }`

Vérifier que **tous** les points d'appel de `startSession` dans le flux multijoueur passent bien `{ isMultiplayer: true }` :

| Fichier | Appel | À modifier ? |
|---------|-------|--------------|
| `MultiplayerSetupScreen.tsx` | `startSession(startArticle, targetArticle)` | **Oui** → `startSession(startArticle, targetArticle, { isMultiplayer: true })` |
| `VictoryScreen.tsx` — `handleNextTurn` | `startSession(startArticle, targetArticle)` | **Oui** → `startSession(startArticle, targetArticle, { isMultiplayer: true })` |
| `MultiplayerRoundTransitionScreen.tsx` (F3-28) | déjà dans la spec F3-28 avec `{ isMultiplayer: true }` | OK |
| `MultiplayerResultScreen.tsx` — `handleReplay` (F3-29) | déjà dans la spec F3-29 avec `{ isMultiplayer: true }` | OK |

### TDD — F3-30

**TDD strict :** la logique du guard `isMultiplayer !== true` dans `completeSession`/`abandonSession` est dans le store Zustand, pas dans une fonction pure. Tester via le store directement est recommandé mais non strict-TDD (store = effets de bord AsyncStorage).

**Cas de test recommandés (alongside) :**

```
describe('game.store — completeSession')

cas 1 — session solo → ScoreStorage.save appelé
  startSession sans isMultiplayer → completeSession → vérifier que save est appelé

cas 2 — session multijoueur → ScoreStorage.save NON appelé
  startSession avec { isMultiplayer: true } → completeSession → vérifier que save n'est pas appelé

describe('game.store — abandonSession')

cas 3 — session solo → ScoreStorage.save appelé
cas 4 — session multijoueur → ScoreStorage.save NON appelé
```

---

## Critères de qualité communs (PR review checklist)

### TypeScript
- [ ] Zéro `any` non justifié
- [ ] Types explicites sur tous les retours de fonctions publiques
- [ ] `exactOptionalPropertyTypes` respecté (pas de `prop: undefined` sur les champs optionnels)
- [ ] `noUncheckedIndexedAccess` respecté (accès `arr[0]` = `T | undefined`, guard obligatoire)
- [ ] `tsc --noEmit` passe sans erreur

### Structure
- [ ] Exports nommés (pas de `default export` sauf `App.tsx`)
- [ ] Zéro code mort : toute variable/ref/import déclaré mais non utilisé est bloquant
- [ ] Pas de `console.log` laissés (le `console.log` de `WikipediaWebView.tsx` ligne 294 est à supprimer dans F3-27)
- [ ] Séparation des responsabilités : pas de logique métier dans les composants UI

### Tests
- [ ] TDD : `rankPlayersGlobal` testée avant implémentation (F3-28)
- [ ] Coverage ≥ 70% sur les modules modifiés
- [ ] Cas d'erreur testés

### Git
- [ ] Branche `feat/laurent-vague-d` → PR vers `develop`
- [ ] Commits Conventional : `feat(mobile):`, `fix(mobile):`, `test(mobile):`
- [ ] TDD : commit des tests avant le commit d'implémentation pour `rankPlayersGlobal`

### Gate device physique
- [ ] F3-27 : chemin complet Home→Game→navigation→retour arrière testé sur device physique (ou mention explicite si non disponible)
- [ ] F3-28 : flux multijoueur multi-manches testé sur device physique

---

## Points de vigilance

1. **`isBackNavigation.current` en F3-27 :** ce flag doit être remis à `false` dans `handlePageChangeSync` MÊME en cas de retour arrière. Si la WebView ne déclenche pas `onPageChange` après un `goBack()` (navigateur Wikipedia sans article précédent lisible), le flag resterait à `true` et le prochain saut forward ne serait pas compté. À surveiller en test device.

2. **Ordre des appels en F3-28 `startNextRound` vs `advanceToNextPlayer` :** `startNextRound` fait un snapshot des `players` courantes et les remet à zéro. Il faut que `recordTurnResult` et `advanceToNextPlayer` aient été appelés **avant** `startNextRound` pour que le snapshot de la manche soit complet. L'ordre dans `handleNextTurn` (VictoryScreen) est : `recordTurnResult → advanceToNextPlayer → [si allPlayersThisRoundDone] → navigate MultiplayerRoundTransition` — le snapshot est fait dans `MultiplayerRoundTransitionScreen` via `startNextRound`, après que tous les joueurs ont joué. Cet ordre est correct.

3. **`Math.max` sur tableau vide (F3-28) :** si `rankPlayersGlobal` est appelée avec `roundHistory = []`, les `wins`, `totalJumps`, `totalDurationMs` seront tous à 0. Pas de `Math.max` problématique dans cette fonction, mais à garder en tête pour tout usage futur.

4. **Construction explicite `Article` :** ne jamais spreader `pairState.start` vers un `Article` — construire explicitement `{ id, title, url, language }` champ par champ. `pairState.start` est un `ArticleSummary` qui contient des champs supplémentaires (`extract`, `thumbnailUrl`) non présents dans `Article`.

5. **`navigation.replace` vs `navigation.navigate` dans `MultiplayerRoundTransitionScreen` :** utiliser `replace('PassPhone', ...)` pour que la transition disparaisse du stack et ne soit pas accessible par retour arrière.

6. **F3-30 et hydrate() :** les sessions multijoueur en cours lors d'une mise en arrière-plan seront réhydratées avec `isMultiplayer: true`. Cela signifie que `completeSession` après réhydratation ne sauvegardera pas non plus dans l'historique — comportement cohérent et souhaité.
