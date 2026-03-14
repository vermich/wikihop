# Spec technique — F3-12 : Multijoueur local hot-seat

## Contexte

Story : docs/stories/phase-3/F3-12.
Permettre à plusieurs joueurs de s'affronter en mode "hot-seat" (passage du téléphone) sur le même appareil. Chaque joueur joue la même paire d'articles à la suite, puis un classement final est affiché.

**Nécessite une spec UX/UI de Benjamin** avant implémentation (3 nouveaux écrans).

## Périmètre

**Dans scope :**
- Nouveau store Zustand `useMultiplayerStore` (en mémoire, zéro persistance)
- 3 nouveaux écrans : `MultiplayerSetupScreen`, `PassPhoneScreen`, `MultiplayerResultScreen`
- 3 nouvelles routes dans `RootStackParamList` et `RootNavigator`
- Modification de `VictoryScreen` pour détecter le mode multijoueur
- Modification de `HomeScreen` pour ajouter le bouton "Multijoueur"

**Hors scope :**
- Multijoueur en réseau
- Persistance AsyncStorage du store multijoueur
- Modification de `useGameStore` ou du flux mono-joueur
- Modification de `ScoreStorage` (les parties multijoueur ne sont pas dans l'historique)

## Architecture générale

```
apps/mobile/src/
├── store/
│   ├── game.store.ts          (inchangé)
│   ├── language.store.ts      (inchangé)
│   └── multiplayer.store.ts   (NOUVEAU)
├── screens/
│   ├── MultiplayerSetupScreen.tsx   (NOUVEAU)
│   ├── PassPhoneScreen.tsx          (NOUVEAU)
│   ├── MultiplayerResultScreen.tsx  (NOUVEAU)
│   ├── HomeScreen.tsx               (MODIFIÉ — bouton Multijoueur)
│   └── VictoryScreen.tsx            (MODIFIÉ — détection mode multijoueur)
└── navigation/
    └── RootNavigator.tsx            (MODIFIÉ — 3 nouvelles routes)
```

## Store Zustand — `useMultiplayerStore`

### Fichier

`apps/mobile/src/store/multiplayer.store.ts`

### Types

```typescript
// Dans multiplayer.store.ts (ou dans packages/shared si réutilisé — non requis ici)

export type MultiplayerPlayerStatus = 'waiting' | 'playing' | 'done';

export interface MultiplayerPlayer {
  name: string;
  status: MultiplayerPlayerStatus;
  jumps: number | null;        // null si pas encore joué ou abandonné
  durationMs: number | null;   // null si pas encore joué ou abandonné
  won: boolean;                // false si abandonné
}

export interface MultiplayerState {
  players: MultiplayerPlayer[];
  currentPlayerIndex: number;
  startArticle: Article | null;
  targetArticle: Article | null;
  isSessionActive: boolean;
}

export interface MultiplayerActions {
  setupSession(players: string[], start: Article, target: Article): void;
  recordTurnResult(index: number, jumps: number, durationMs: number, won: boolean): void;
  advanceToNextPlayer(): void;
  resetSession(): void;
}
```

### État initial

```typescript
const initialState: MultiplayerState = {
  players: [],
  currentPlayerIndex: 0,
  startArticle: null,
  targetArticle: null,
  isSessionActive: false,
};
```

### Implémentation du store

```typescript
import { create } from 'zustand';
import type { Article } from '@wikihop/shared';

export const useMultiplayerStore = create<MultiplayerState & MultiplayerActions>((set) => ({
  ...initialState,

  setupSession: (playerNames, start, target) => {
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
    });
  },

  recordTurnResult: (index, jumps, durationMs, won) => {
    set((state) => {
      const updated = [...state.players];
      // noUncheckedIndexedAccess : guard obligatoire
      const player = updated[index];
      if (player === undefined) return state;
      updated[index] = { ...player, status: 'done', jumps, durationMs, won };
      return { players: updated };
    });
  },

  advanceToNextPlayer: () => {
    set((state) => ({ currentPlayerIndex: state.currentPlayerIndex + 1 }));
  },

  resetSession: () => {
    set(initialState);
  },
}));
```

**Contraintes :**
- Zéro `AsyncStorage` dans ce store
- Zéro `persist` middleware
- Pas d'import de `zustand/middleware/persist`

## Routes — RootStackParamList

Ajouter dans `apps/mobile/src/navigation/RootNavigator.tsx` :

```typescript
export type RootStackParamList = {
  // ... routes existantes ...

  /**
   * Route MultiplayerSetup : configuration d'une session multijoueur (F3-12).
   * Saisie des noms de joueurs, chargement de la paire d'articles.
   */
  MultiplayerSetup: undefined;

  /**
   * Route PassPhone : écran interstitiel entre deux tours (F3-12).
   * Affiche "Passe le téléphone à [playerName]".
   */
  PassPhone: { playerName: string };

  /**
   * Route MultiplayerResult : classement final de la session multijoueur (F3-12).
   * Les données sont lues depuis useMultiplayerStore.
   */
  MultiplayerResult: undefined;
};
```

Ajouter les 3 `Stack.Screen` correspondants dans `RootNavigator` avec `headerShown: false`.

## Écrans

### 1. MultiplayerSetupScreen

**Fichier :** `apps/mobile/src/screens/MultiplayerSetupScreen.tsx`

**Rôle :** saisie des noms, validation, chargement de la paire, lancement de la session.

**Données requises :**
- Noms des joueurs (2 à 6, obligatoires, non vides, uniques recommandé)
- Paire d'articles : chargée via `useRandomPair(isDifficultyHard ? 'hard' : 'normal')` (hook existant)
- Pas de toggle mode difficile dans cette story (scope réduit — partir en mode normal)

**Logique :**
1. L'écran affiche un header "Multijoueur", une zone de saisie des noms, les boutons +Joueur/-Joueur, et un bouton "Commencer"
2. Validation avant "Commencer" :
   - Minimum 2 joueurs
   - Tous les noms non vides (trim)
   - Maximum 6 joueurs
3. Au tap "Commencer" :
   - Si `state.status !== 'success'` (articles pas encore chargés) : désactiver le bouton
   - `multiplayerStore.setupSession(playerNames, startArticle, targetArticle)`
   - `await gameStore.clearSession()`
   - `await gameStore.startSession(startArticle, targetArticle)` pour le premier joueur
   - `navigation.navigate('PassPhone', { playerName: players[0].name })`

**Props de navigation :**
```typescript
type MultiplayerSetupScreenProps = NativeStackScreenProps<RootStackParamList, 'MultiplayerSetup'>;
```

**TDD — fonctions pures à tester en TDD strict :**

```typescript
// Fonction pure à extraire dans un fichier utils :
// apps/mobile/src/utils/multiplayer.utils.ts

/**
 * Valide les noms de joueurs saisis.
 * Retourne une liste d'erreurs (vide = valide).
 */
export function validatePlayerNames(names: string[]): string[] {
  const errors: string[] = [];
  if (names.length < 2) errors.push('Minimum 2 joueurs requis.');
  if (names.length > 6) errors.push('Maximum 6 joueurs autorisés.');
  names.forEach((name, i) => {
    if (name.trim().length === 0) {
      errors.push(`Le nom du joueur ${String(i + 1)} est requis.`);
    }
  });
  return errors;
}
```

Cas de test TDD pour `validatePlayerNames` :
- `[]` → `['Minimum 2 joueurs requis.']`
- `['Alice']` → `['Minimum 2 joueurs requis.']`
- `['Alice', 'Bob']` → `[]` (valide)
- `['Alice', '']` → `['Le nom du joueur 2 est requis.']`
- `['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank']` → `[]` (6 joueurs, valide)
- 7 noms → `['Maximum 6 joueurs autorisés.']`
- `['  ', 'Bob']` → `['Le nom du joueur 1 est requis.']` (trim vide)

Fichier test : `apps/mobile/src/utils/__tests__/multiplayer.utils.test.ts` — à écrire AVANT l'implémentation.

### 2. PassPhoneScreen

**Fichier :** `apps/mobile/src/screens/PassPhoneScreen.tsx`

**Rôle :** écran interstitiel. Masque le contenu précédent, demande de passer le téléphone au joueur suivant.

**Paramètre de route :** `{ playerName: string }`

**Layout :**
- Fond plein (pas de transparence — empêche de voir l'écran précédent)
- Titre : "À toi de jouer !"
- Sous-titre : "Passe le téléphone à [playerName]"
- Bouton "Prêt !" (CTA principal)

**Logique au tap "Prêt !" :**
```typescript
const startArticleTitle = multiplayerStore.startArticle?.title ?? '';
navigation.navigate('Game', { articleTitle: startArticleTitle });
```

**Aucune logique métier** dans cet écran — pas de TDD.

### 3. MultiplayerResultScreen

**Fichier :** `apps/mobile/src/screens/MultiplayerResultScreen.tsx`

**Rôle :** classement final de la session. Affiche les scores triés.

**Règle de tri du classement :**
```
1. Victoires avant abandons
2. À égalité (deux victoires) : moins de sauts d'abord
3. À égalité sur les sauts : moins de temps d'abord
4. Abandons : en bas, ordre d'arrivée
```

**TDD — fonctions pures à tester en TDD strict :**

```typescript
// Dans apps/mobile/src/utils/multiplayer.utils.ts (même fichier que validatePlayerNames)

/**
 * Trie les joueurs multijoueur selon le classement (victoires > sauts > durée > abandons).
 * Retourne un nouveau tableau (pas de mutation).
 */
export function rankPlayers(players: MultiplayerPlayer[]): MultiplayerPlayer[] {
  return [...players].sort((a, b) => {
    // Victoires avant abandons
    if (a.won && !b.won) return -1;
    if (!a.won && b.won) return 1;
    // Les deux ont gagné : moins de sauts d'abord
    if (a.won && b.won) {
      const jumpsA = a.jumps ?? Infinity;
      const jumpsB = b.jumps ?? Infinity;
      if (jumpsA !== jumpsB) return jumpsA - jumpsB;
      // Égalité sauts : moins de temps d'abord
      const durA = a.durationMs ?? Infinity;
      const durB = b.durationMs ?? Infinity;
      return durA - durB;
    }
    // Les deux ont abandonné : ordre d'arrivée (stable sort)
    return 0;
  });
}
```

Cas de test TDD pour `rankPlayers` :
- Un gagnant, un abandonné → gagnant en premier
- Deux gagnants, sauts différents → moins de sauts en premier
- Deux gagnants, mêmes sauts, durées différentes → moins de temps en premier
- Deux abandons → ordre d'arrivée conservé (ordre du tableau en entrée)
- Tableau vide → `[]`

Fichier test : `apps/mobile/src/utils/__tests__/multiplayer.utils.test.ts` (même fichier).

**Layout de MultiplayerResultScreen :**
- Header "Résultats"
- Liste des joueurs triée par `rankPlayers()`
- Pour chaque joueur : rang, nom, statut (Victoire vert / Abandonné gris), sauts, durée
- Bouton "Retour à l'accueil" : `multiplayerStore.resetSession()` + `navigation.navigate('Home')`

## Modification VictoryScreen

**Fichier :** `apps/mobile/src/screens/VictoryScreen.tsx`

### Détection du mode multijoueur

```typescript
import { useMultiplayerStore } from '../store/multiplayer.store';

// Dans VictoryScreen :
const isMultiplayerActive = useMultiplayerStore((state) => state.isSessionActive);
const currentPlayerIndex = useMultiplayerStore((state) => state.currentPlayerIndex);
const multiplayerPlayers = useMultiplayerStore((state) => state.players);
const recordTurnResult = useMultiplayerStore((state) => state.recordTurnResult);
const advanceToNextPlayer = useMultiplayerStore((state) => state.advanceToNextPlayer);
```

### Bouton "Tour suivant"

Quand `isMultiplayerActive === true`, remplacer le bouton "Rejouer" par "Tour suivant →", et masquer "Voir l'historique".

```typescript
// Handler bouton "Tour suivant" :
const handleNextTurn = useCallback(async (): Promise<void> => {
  if (currentSession === null) return;

  // Enregistrement du résultat du tour courant
  const durationMs = currentSession.completedAt !== undefined
    ? currentSession.completedAt.getTime() - currentSession.startedAt.getTime()
    : 0;

  recordTurnResult(
    currentPlayerIndex,
    currentSession.jumps,
    durationMs,
    currentSession.status === 'won',
  );

  advanceToNextPlayer();

  const nextIndex = currentPlayerIndex + 1;
  const allDone = nextIndex >= multiplayerPlayers.length;

  await clearSession();

  if (allDone) {
    // Tous les joueurs ont joué → classement
    navigation.navigate('MultiplayerResult');
  } else {
    // Préparer la partie du joueur suivant
    const nextPlayer = multiplayerPlayers[nextIndex];
    if (nextPlayer === undefined) {
      // Defensive guard — noUncheckedIndexedAccess
      navigation.navigate('MultiplayerResult');
      return;
    }

    const startArticle = useMultiplayerStore.getState().startArticle;
    const targetArticle = useMultiplayerStore.getState().targetArticle;

    if (startArticle === null || targetArticle === null) {
      navigation.navigate('MultiplayerResult');
      return;
    }

    await startSession(startArticle, targetArticle);
    navigation.navigate('PassPhone', { playerName: nextPlayer.name });
  }
}, [currentSession, currentPlayerIndex, multiplayerPlayers, recordTurnResult, advanceToNextPlayer, clearSession, startSession, navigation]);
```

**Note sur `useMultiplayerStore.getState()`** : appelé en dehors du cycle React pour éviter une dépendance cyclique dans les deps du `useCallback`. Pattern Zustand accepté hors du rendu.

### Zone boutons sticky — logique conditionnelle

```tsx
{/* Zone boutons sticky */}
<View style={styles.stickyButtons}>
  <View style={styles.primaryButtonsRow}>
    <TouchableOpacity
      style={[styles.primaryButton, styles.newGameButton,
        (isDaily || isMultiplayerActive) && styles.newGameButtonFull]}
      onPress={isMultiplayerActive ? () => { void handleNextTurn(); } : handleNewGame}
      accessibilityLabel={isMultiplayerActive ? "Tour du joueur suivant" : "Démarrer une nouvelle partie"}
      accessibilityRole="button"
    >
      <Text style={styles.newGameButtonText}>
        {isMultiplayerActive ? 'Tour suivant →' : 'Nouvelle partie'}
      </Text>
    </TouchableOpacity>
    {!isDaily && !isMultiplayerActive && (
      <TouchableOpacity style={[styles.primaryButton, styles.replayButton]} ...>
        <Text>Rejouer</Text>
      </TouchableOpacity>
    )}
  </View>
  <TouchableOpacity style={styles.shareButton} ...>Partager</TouchableOpacity>
  {!isMultiplayerActive && (
    <TouchableOpacity style={styles.historyButton} ...>Voir l'historique</TouchableOpacity>
  )}
</View>
```

## Modification HomeScreen

Ajouter un bouton "Multijoueur" dans `buttonsContainer`, entre le bouton "Défi du jour" et le bouton "Nouveaux articles" :

```tsx
<TouchableOpacity
  style={styles.multiplayerButton}
  onPress={() => { navigation.navigate('MultiplayerSetup'); }}
  accessibilityLabel="Jouer en multijoueur local"
  accessibilityRole="button"
>
  <Text style={styles.multiplayerButtonText}>{'Multijoueur'}</Text>
</TouchableOpacity>
```

**Style (à créer dans HomeScreen StyleSheet) :**
```typescript
multiplayerButton: {
  height: 52,
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#2563EB',
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: 12,
},
multiplayerButtonText: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#2563EB',
},
```

**Ce style est indicatif** — Benjamin valide le design dans sa spec UX/UI.

## TDD — récapitulatif

| Fonction pure | Fichier | Type TDD |
|---------------|---------|----------|
| `validatePlayerNames(names)` | `utils/multiplayer.utils.ts` | **Strict — tests AVANT implémentation** |
| `rankPlayers(players)` | `utils/multiplayer.utils.ts` | **Strict — tests AVANT implémentation** |
| `MultiplayerSetupScreen`, `PassPhoneScreen`, `MultiplayerResultScreen` | screens/ | Alongside |
| `useMultiplayerStore` | store/ | Alongside |
| Modification VictoryScreen | screens/ | Alongside |
| Modification HomeScreen | screens/ | Alongside |

Fichier test TDD : `apps/mobile/src/utils/__tests__/multiplayer.utils.test.ts` — commit du test AVANT le commit de l'implémentation.

## Critères de qualité (PR review)

- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur
- [ ] `useMultiplayerStore` : zéro `AsyncStorage`, zéro `persist`, état en mémoire uniquement
- [ ] `validatePlayerNames` et `rankPlayers` : tests TDD committés avant l'implémentation
- [ ] Coverage ≥ 70% sur `multiplayer.utils.ts` et `multiplayer.store.ts`
- [ ] Flux mono-joueur inchangé (zéro régression sur Home → Game → Victory mono)
- [ ] `noUncheckedIndexedAccess` : tous les accès `players[index]` gardés par `=== undefined`
- [ ] Zéro `any`
- [ ] 3 nouvelles routes déclarées dans `RootStackParamList` et `RootNavigator`
- [ ] Spec UX/UI de Benjamin validée avant merge
- [ ] **Gate device physique** : le flux complet multijoueur (Setup → PassPhone → Game → Victory → Tour suivant → Résultats) a été testé sur device physique (cette story touche navigation + store de jeu)

## Points de vigilance

1. **`multiplayerPlayers[nextIndex]`** : accès indexé — `noUncheckedIndexedAccess` est actif. Guard obligatoire avant usage (`if (nextPlayer === undefined)`).

2. **`clearSession()` avant `startSession()`** : invariant établi (MEMORY.md point 21). Dans `handleNextTurn`, `clearSession()` doit précéder `startSession()` pour le joueur suivant.

3. **`navigation.navigate('PassPhone', ...)` depuis VictoryScreen** : VictoryScreen est dans le stack au-dessus de Game. Après `clearSession()`, le stack contient `[Home, PassPhone?, Game×N, Victory]`. Utiliser `navigation.navigate` (pas `replace`) depuis Victory vers PassPhone pour que le stack se comporte correctement.

4. **`ScoreStorage` non appelé pour les parties multijoueur** : `clearSession()` sauvegarde normalement en AsyncStorage via le store. Vérifier dans `game.store.ts` si `clearSession` déclenche une écriture dans `ScoreStorage`. Si oui, les parties multijoueur apparaîtront dans l'historique — comportement à clarifier avec le PO. Par défaut, laisser le comportement existant de `game.store.ts` sans modification.

5. **`useMultiplayerStore.getState()` dans `handleNextTurn`** : accès direct au store Zustand hors du cycle React. Pattern accepté pour les accès one-shot dans les handlers. Ne pas utiliser pour des valeurs affichées dans le rendu (utiliser les sélecteurs React à la place).

6. **Limite 6 joueurs** : la validation est dans `validatePlayerNames`. Le composant `MultiplayerSetupScreen` doit désactiver le bouton "+Joueur" quand `players.length >= 6`.
