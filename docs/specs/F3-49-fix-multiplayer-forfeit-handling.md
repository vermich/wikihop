# Spec technique — F3-49 : Fix abandon multijoueur — gestion du forfeit

## 1. Contexte

Story : `docs/stories/phase-3/🔄-F3-49-fix-multiplayer-forfeit-handling.md`

Stories multijoueur existantes : F3-12, F3-28, F3-29, F3-30, F3-31, F3-32, F3-33, F3-36.

**Symptôme** : quand un joueur abandonne sa manche en mode multijoueur (via le bouton d'abandon dans `ArticleScreen`), le jeu passe au joueur suivant comme si la manche était terminée normalement. Le résultat de la manche abandonnée est enregistré comme une défaite (`won: false`) mais `jumps` et `durationMs` sont à 0 — ce qui peut le faire apparaître comme le "meilleur résultat" dans le classement.

**Cause identifiée** : dans `VictoryScreen.handleNextTurn` (lignes 226–292), la logique est appelée aussi bien après une victoire que potentiellement après un abandon. Plus précisément, dans `ArticleScreen.handleAbandon`, après `abandonSession()`, le code navigue vers `Home` — mais en mode multijoueur, ce comportement écrase le flux normal multijoueur. Le code ne distingue pas "abandon en solo" vs "abandon en multijoueur".

**Comportement attendu** :
- Un joueur qui abandonne sa manche reçoit le statut `forfeit` — distinct de `won: false`
- Son résultat est enregistré dans le store (`recordTurnResult`) avant de passer au joueur suivant
- Le flux multijoueur continue normalement (joueur suivant, ou fin de manche si dernier joueur)
- Dans `MultiplayerResultScreen`, les manches `forfeit` ne comptent pas comme victoires
- Dans le classement, un forfeit est moins bon qu'une défaite normale (on a essayé mais n'a pas atteint la cible)

## 2. Périmètre

**Dans scope :**
- `apps/mobile/src/store/multiplayer.store.ts` — ajout du statut `forfeit` et de l'action `recordForfeit`
- `apps/mobile/src/screens/ArticleScreen.tsx` — `handleAbandon` distingue solo vs multijoueur
- `apps/mobile/src/screens/MultiplayerResultScreen.tsx` — affichage des manches forfeit
- `packages/shared/src/types/index.ts` — `MultiplayerRoundResult` enrichi avec `forfeit`

**Hors scope :**
- Backend — aucune modification nécessaire (multijoueur local hot-seat, pas de sync serveur)
- `VictoryScreen.handleNextTurn` — ne change pas (invoqué uniquement après victoire)
- Logique de ranking dans `MultiplayerResultScreen` (ranking solo dans une manche) — uniquement l'affichage du statut forfeit

## 3. Modifications packages/shared

### `MultiplayerRoundResult`

```typescript
// AVANT
export interface MultiplayerRoundResult {
  jumps: number | null;
  durationMs: number | null;
  won: boolean;
}

// APRÈS
export interface MultiplayerRoundResult {
  jumps: number | null;
  durationMs: number | null;
  won: boolean;
  /** Indique que le joueur a abandonné sa manche — distinct d'une défaite normale. F3-49. */
  forfeit?: boolean;
}
```

Note : `forfeit` est optionnel pour la rétrocompatibilité avec les enregistrements existants.

## 4. Modifications multiplayer.store.ts

### Type `MultiplayerPlayer`

```typescript
export type MultiplayerPlayerStatus = 'waiting' | 'playing' | 'done' | 'forfeit';

export interface MultiplayerPlayer {
  name: string;
  status: MultiplayerPlayerStatus;
  jumps: number | null;
  durationMs: number | null;
  won: boolean;
  /** F3-49 : indique que ce joueur a abandonné sa manche courante */
  forfeit?: boolean;
}
```

### Nouvelle action `recordForfeit`

```typescript
interface MultiplayerActions {
  // ... actions existantes ...

  /**
   * Enregistre un abandon pour le joueur à l'index donné.
   * Le joueur est marqué status: 'forfeit', won: false, jumps: null, durationMs: null.
   * F3-49.
   */
  recordForfeit(index: number): void;
}
```

Implémentation dans le store :

```typescript
recordForfeit: (index) => {
  set((state) => {
    const updated = [...state.players];
    const player = updated[index];
    if (player === undefined) return state;
    updated[index] = {
      ...player,
      status: 'forfeit' as MultiplayerPlayerStatus,
      jumps: null,
      durationMs: null,
      won: false,
      forfeit: true,
    };
    return { players: updated };
  });
},
```

## 5. Modifications ArticleScreen.tsx

`handleAbandon` doit bifurquer selon le mode de jeu :

```typescript
// Dans ArticleScreen
const isMultiplayerActive = useMultiplayerStore((state) => state.isSessionActive);
const currentPlayerIndex = useMultiplayerStore((state) => state.currentPlayerIndex);
const multiplayerPlayers = useMultiplayerStore((state) => state.players);
const recordForfeit = useMultiplayerStore((state) => state.recordForfeit);
const advanceToNextPlayer = useMultiplayerStore((state) => state.advanceToNextPlayer);
const roundCount = useMultiplayerStore((state) => state.roundCount);
const currentRound = useMultiplayerStore((state) => state.currentRound);

const handleAbandon = useCallback((): void => {
  Alert.alert(
    t('article_screen.abandon_title'),
    t('article_screen.abandon_message'),
    [
      { text: t('article_screen.abandon_cancel'), style: 'cancel' },
      {
        text: t('article_screen.abandon_confirm'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await abandonSession();

            if (isMultiplayerActive) {
              // Mode multijoueur : forfeit + passage au joueur suivant
              recordForfeit(currentPlayerIndex);
              advanceToNextPlayer();

              const nextIndex = currentPlayerIndex + 1;
              const allPlayersThisRoundDone = nextIndex >= multiplayerPlayers.length;

              await clearSession();

              if (allPlayersThisRoundDone) {
                if (currentRound < roundCount) {
                  navigation.navigate('MultiplayerRoundTransition');
                } else {
                  navigation.navigate('MultiplayerResult');
                }
                return;
              }

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
            } else {
              // Mode solo : comportement existant
              navigation.navigate('Home');
            }
          })();
        },
      },
    ],
  );
}, [
  abandonSession,
  isMultiplayerActive,
  currentPlayerIndex,
  multiplayerPlayers,
  recordForfeit,
  advanceToNextPlayer,
  clearSession,
  startSession,
  navigation,
  currentRound,
  roundCount,
  t,
]);
```

**Attention** : `ArticleScreen` importe déjà `abandonSession` depuis `useGameStore`. Il faut également importer `clearSession` et `startSession` (déjà présents dans le store mais peut-être pas encore sélectionnés dans ce composant — vérifier).

## 6. Modifications MultiplayerResultScreen.tsx

Lire `MultiplayerResultScreen.tsx` avant d'implémenter. Ajouter l'affichage du statut forfeit dans les résultats par manche. La logique de classement global (`rankPlayersGlobal` ou équivalent) doit considérer un forfeit comme moins bon que toute défaite :

**Règle de classement proposée** (ordre de priorité pour classer un tour) :
1. Victoire (won: true) : classé par jumps asc, puis durationMs asc
2. Défaite (won: false, forfeit absent ou false) : classé après les victoires
3. Forfeit (forfeit: true) : classé en dernier

Cette règle s'applique **par manche**. Pour le classement global multi-manches, le nombre de victoires prime.

**Affichage** : dans la liste des résultats par manche et dans le tableau final, afficher un indicateur visuel distinct pour les manches forfeit (ex : label "Abandonné" ou "—" à la place du score).

## 7. TDD — fonctions pures et hooks à tester

### Fonctions pures à tester en TDD (tests avant implémentation)

**`recordForfeit` (store action)** — tester via le store :
```typescript
// Cas 1 : recordForfeit sur un joueur existant → statut = 'forfeit', forfeit = true, won = false
// Cas 2 : recordForfeit sur un index inexistant → état inchangé
// Cas 3 : après recordForfeit, advanceToNextPlayer fonctionne normalement
```

**Fonction de classement (si extraite en pur)** :
```typescript
// Cas 1 : victoire < défaite dans le classement (victoire = meilleur)
// Cas 2 : défaite < forfeit dans le classement (défaite = meilleur qu'abandon)
// Cas 3 : deux victoires — tri par jumps asc
// Cas 4 : deux joueurs forfeit — égalité
```

## 8. Critères de qualité (PR review)

- [ ] `MultiplayerRoundResult.forfeit` optionnel — ne casse pas les données existantes
- [ ] `MultiplayerPlayerStatus` inclut `'forfeit'`
- [ ] `handleAbandon` en mode multijoueur : flux identique à `handleNextTurn` (VictoryScreen) mais avec `recordForfeit` au lieu de `recordTurnResult`
- [ ] Aucune régression sur le flux solo (abandon → Home)
- [ ] `MultiplayerResultScreen` : les manches forfeit ne comptent pas comme victoires
- [ ] Tests de `recordForfeit` écrits avant l'implémentation (TDD)
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur

## 9. Points de vigilance

- Le flux multijoueur dans `handleAbandon` doit être **identique au flux de `handleNextTurn` dans VictoryScreen** sauf sur deux points : (a) `recordForfeit` au lieu de `recordTurnResult`, (b) pas de `startSession` avant `recordForfeit` (la session est déjà en cours). Factoriser si possible pour éviter la duplication — mais ne pas refactoriser `VictoryScreen` dans ce commit (hors scope).
- `clearSession()` doit être appelé **après** `recordForfeit + advanceToNextPlayer` — même ordre que dans `handleNextTurn`.
- Le guard `nextPlayer === undefined` est obligatoire (`noUncheckedIndexedAccess`).
- Accès direct au store `useMultiplayerStore.getState()` dans le callback — pattern validé (identique à `handleNextTurn`).
- Ce fix **requiert une validation sur device physique** (gate CLAUDE.md) car il touche le store de jeu et le flux Home→Game→Victory.
