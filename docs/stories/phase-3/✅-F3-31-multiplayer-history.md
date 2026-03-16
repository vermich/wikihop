---
id: F3-31
title: Historique des parties multijoueur
phase: 3-Features
priority: Could
agents: [Tech Lead, UX/UI, Frontend Dev]
status: done
created: 2026-03-14
completed: 2026-03-16
depends_on: [F3-12, F3-30]
---

# F3-31 — Historique des parties multijoueur

## User Story
En tant que groupe de joueurs, je veux consulter l'historique de nos sessions multijoueur passées, afin de suivre nos performances au fil du temps.

## Critères d'acceptance
- [x] Un écran dédié `MultiplayerHistoryScreen` affiche les sessions multijoueur passées
- [x] Chaque session affiche : date, joueurs, nombre de manches, gagnant
- [x] Les données sont persistées localement (AsyncStorage)
- [x] Accessible depuis `HomeScreen` ou `MultiplayerSetupScreen`
- [x] `tsc --noEmit` passe sans erreur
- [x] `npm run lint` passe sans erreur

## Notes de réalisation

### Contexte technique

Story F3-31. Dépend de F3-12 (mode multijoueur hot-seat) et F3-30 (sessions multijoueur non enregistrées dans l'historique solo). Le store `useMultiplayerStore` ne persiste rien — la session est éphémère. Cette story ajoute une couche de persistance dédiée pour les sessions multijoueur, indépendante de `score-storage.service.ts`.

### Périmètre

**Dans scope :**
- Type `MultiplayerGameRecord` dans `packages/shared/src/types/index.ts`
- Service `multiplayer-score-storage.service.ts` (lecture/écriture AsyncStorage)
- Utilitaires purs dans `multiplayer-history.utils.ts` (TDD strict)
- Écran `MultiplayerHistoryScreen` (liste des sessions)
- Route `MultiplayerHistory` dans `RootNavigator.tsx`
- Point d'entrée : bouton dans `MultiplayerSetupScreen`
- Déclenchement de la sauvegarde depuis `MultiplayerResultScreen`

**Hors scope en Phase 3 :**
- Écran de détail d'une session (tap sur un item = no-op)
- Suppression d'entrées
- Synchronisation entre appareils

---

### 1. Modèle de données — `packages/shared/src/types/index.ts`

Ajouter après la section "Historique des parties" (après `GameRecord`) :

```typescript
// ─────────────────────────────────────────────
// Historique des parties multijoueur
// ─────────────────────────────────────────────

/**
 * Enregistrement d'une session multijoueur terminée.
 * Stocké dans AsyncStorage — les dates sont en string ISO 8601
 * (pas Date) pour éviter toute désérialisation.
 *
 * Story : F3-31
 */
export interface MultiplayerGameRecord {
  /** Identifiant unique de la session (UUID v4) */
  id: string;
  /** Date de début de session — ISO 8601 string */
  date: string;
  /** Noms des joueurs dans l'ordre de leur index */
  playerNames: string[];
  /** Nombre total de manches jouées */
  roundCount: number;
  /**
   * Historique des résultats par manche.
   * roundHistory[roundIndex][playerIndex] = résultat du joueur.
   * Contient TOUTES les manches, y compris la dernière.
   */
  roundHistory: MultiplayerRoundResult[][];
  /**
   * Nom du gagnant global (calculé à partir de rankPlayersGlobal).
   * null si égalité parfaite (wins/jumps/durée identiques pour plusieurs joueurs).
   */
  winner: string | null;
}
```

**Attention :** `MultiplayerRoundResult` est défini dans `apps/mobile/src/store/multiplayer.store.ts`, pas dans `@wikihop/shared`. Pour éviter une dépendance circulaire, re-déclarer le type inline dans `@wikihop/shared` ou l'importer depuis le store côté mobile uniquement. La solution retenue : définir `MultiplayerRoundResult` également dans `@wikihop/shared` et l'importer depuis le store (le store peut réexporter depuis shared). Voir ci-dessous.

**Ajout dans `packages/shared/src/types/index.ts` :**

```typescript
/**
 * Résultat d'un joueur pour une manche donnée — F3-31.
 * Dupliqué depuis multiplayer.store.ts pour éviter une dépendance
 * packages/shared → apps/mobile. Le store importe ce type depuis shared.
 */
export interface MultiplayerRoundResult {
  jumps: number | null;
  durationMs: number | null;
  won: boolean;
}
```

Ensuite, dans `apps/mobile/src/store/multiplayer.store.ts`, remplacer la déclaration locale de `MultiplayerRoundResult` par un import depuis `@wikihop/shared` :

```typescript
// Avant (à supprimer) :
export interface MultiplayerRoundResult { ... }

// Après (à ajouter en tête des imports) :
export type { MultiplayerRoundResult } from '@wikihop/shared';
```

**Point de vigilance :** l'export `type { MultiplayerRoundResult }` depuis le store doit être maintenu pour ne pas casser les imports existants dans `MultiplayerResultScreen` et `multiplayer.utils.ts`.

---

### 2. Service de persistance — `apps/mobile/src/services/multiplayer-score-storage.service.ts`

Pattern identique à `score-storage.service.ts`. Créer le fichier avec les exports nommés suivants :

```typescript
const MULTIPLAYER_HISTORY_KEY = '@wikihop/multiplayer_history';
const MAX_ENTRIES = 20;

// Lecture interne (peut lever — fonctions publiques catchent)
async function readAll(): Promise<MultiplayerGameRecord[]>

// API publique
export async function save(record: MultiplayerGameRecord): Promise<void>
export async function loadAll(): Promise<ReadonlyArray<MultiplayerGameRecord>>
```

**Contrat détaillé :**

- `save(record)` : insère en tête, tronque à 20 entrées, log les erreurs AsyncStorage sans les propager.
- `loadAll()` : retourne les entrées du plus récent au plus ancien (tête = plus récent, identique à l'ordre d'insertion), retourne `[]` en cas d'erreur ou d'absence de données. Guard sur `Array.isArray(parsed)` obligatoire (données corrompues).
- Aucune fonction `delete` en Phase 3.
- Les erreurs AsyncStorage sont loguées avec `console.error('[MultiplayerScoreStorage] ...')` et ne bloquent pas l'appelant.

**Clé AsyncStorage :** `@wikihop/multiplayer_history` — à documenter dans ADR-005 (ajout Phase 3).

---

### 3. Utilitaires purs — `apps/mobile/src/utils/multiplayer-history.utils.ts`

Nouveau fichier. **TDD strict : les tests doivent être committés AVANT l'implémentation.**

#### 3.1 `buildMultiplayerRecord`

```typescript
/**
 * Construit un MultiplayerGameRecord depuis les données du store.
 *
 * ATTENTION — roundHistory partiel :
 * Dans le store, startNextRound() flush la manche courante dans roundHistory
 * AVANT de passer à la suivante. La dernière manche n'est jamais flushée
 * (les joueurs restent dans players[]).
 * L'appelant (MultiplayerResultScreen) doit donc passer le roundHistory complet
 * en construisant manuellement le snapshot de la dernière manche depuis players[].
 * Voir §4 pour la construction côté MultiplayerResultScreen.
 *
 * @param id           - UUID v4 généré par l'appelant (import { randomUUID } from 'expo-crypto' ou uuid)
 * @param date         - Date de début de session (new Date().toISOString())
 * @param playerNames  - Noms dans l'ordre d'index
 * @param roundCount   - Nombre de manches configurées
 * @param roundHistory - Toutes les manches, y compris la dernière (voir note ci-dessus)
 * @returns MultiplayerGameRecord prêt pour la persistance
 */
export function buildMultiplayerRecord(
  id: string,
  date: string,
  playerNames: string[],
  roundCount: number,
  roundHistory: MultiplayerRoundResult[][],
): MultiplayerGameRecord
```

Implémentation attendue : appelle `getMultiplayerWinner(roundHistory, playerNames)` et construit l'objet record.

#### 3.2 `getMultiplayerWinner`

```typescript
/**
 * Calcule le gagnant global d'une session multijoueur.
 * Réutilise rankPlayersGlobal (multiplayer.utils.ts) pour les stats agrégées.
 *
 * Retourne null si :
 *   - roundHistory est vide
 *   - playerNames est vide
 *   - égalité parfaite entre les joueurs de tête
 *     (wins, totalJumps, totalDurationMs identiques)
 *
 * @param roundHistory - Tableau de toutes les manches (complet)
 * @param playerNames  - Noms dans l'ordre d'index
 */
export function getMultiplayerWinner(
  roundHistory: MultiplayerRoundResult[][],
  playerNames: string[],
): string | null
```

Implémentation attendue :
1. Appeler `rankPlayersGlobal(roundHistory, playerNames)`.
2. Si tableau vide ou premier élément absent → retourner `null`.
3. Si deux premiers joueurs ont `wins`, `totalJumps` et `totalDurationMs` identiques → retourner `null`.
4. Sinon retourner `ranked[0].name`.

#### 3.3 `formatMultiplayerDate`

```typescript
/**
 * Formate une date ISO 8601 string en "DD/MM/YYYY".
 * @param isoDate - Date ISO 8601 (string, stockée dans MultiplayerGameRecord.date)
 */
export function formatMultiplayerDate(isoDate: string): string
```

Implémentation attendue : `new Date(isoDate)` puis extraction `getDate()`, `getMonth() + 1`, `getFullYear()`, avec padding `padStart(2, '0')`.

**Cas à tester (TDD) :**

Pour `getMultiplayerWinner` :
- Cas 1 : un joueur gagne toutes les manches → retourne son nom
- Cas 2 : égalité parfaite (wins/jumps/durée identiques) → retourne `null`
- Cas 3 : égalité en wins, départage par jumps → retourne le joueur avec moins de jumps
- Cas 4 : égalité wins + jumps, départage par durée → retourne le joueur plus rapide
- Cas 5 : roundHistory vide → retourne `null`
- Cas 6 : playerNames vide → retourne `null`

Pour `formatMultiplayerDate` :
- Cas 1 : `'2026-03-05T14:30:00.000Z'` → `'05/03/2026'`
- Cas 2 : `'2026-12-31T00:00:00.000Z'` → `'31/12/2026'` (attention UTC vs local — voir note)
- Note : utiliser `new Date(isoDate)` avec les méthodes locales `getDate/getMonth/getFullYear`. Documenter dans le test que le résultat dépend du fuseau horaire de l'appareil, ce qui est le comportement attendu (affichage local).

Pour `buildMultiplayerRecord` :
- Cas 1 : 2 joueurs, 2 manches, gagnant identifiable → record avec winner non null
- Cas 2 : égalité → winner null
- Cas 3 : roundHistory vide → winner null, roundHistory vide dans le record

---

### 4. Déclenchement de la sauvegarde — `MultiplayerResultScreen.tsx`

La sauvegarde doit être déclenchée **au montage de `MultiplayerResultScreen`**, une seule fois. La dernière manche n'est pas dans `roundHistory` du store : il faut la reconstituer depuis `players`.

**Modification à apporter dans `MultiplayerResultScreen` :**

```typescript
// Imports à ajouter
import { randomUUID } from 'expo-crypto'; // ou génération UUID alternative
import * as MultiplayerScoreStorage from '../services/multiplayer-score-storage.service';
import { buildMultiplayerRecord } from '../utils/multiplayer-history.utils';
import type { MultiplayerRoundResult } from '@wikihop/shared';

// Dans le composant, après la lecture du store :
const sessionSavedRef = useRef(false);

useEffect(() => {
  if (sessionSavedRef.current) return;
  sessionSavedRef.current = true;

  // Construire le snapshot de la dernière manche depuis players[]
  // (startNextRound ne flush pas la dernière manche dans roundHistory)
  const lastRoundSnapshot: MultiplayerRoundResult[] = players.map((p) => ({
    jumps: p.jumps,
    durationMs: p.durationMs,
    won: p.won,
  }));

  const completeRoundHistory = [...roundHistory, lastRoundSnapshot];

  const record = buildMultiplayerRecord(
    randomUUID(),
    new Date().toISOString(),
    playerNames,
    roundCount,
    completeRoundHistory,
  );

  void MultiplayerScoreStorage.save(record);
}, []);
// deps vide intentionnel : sauvegarde unique au montage — documenter avec commentaire
```

**Point de vigilance :** `sessionSavedRef` évite une double sauvegarde si le composant se remonte (rare mais possible). Le `useEffect` avec deps vides est justifié ici — documenter explicitement.

---

### 5. Écran `MultiplayerHistoryScreen` — `apps/mobile/src/screens/MultiplayerHistoryScreen.tsx`

**Layout :**

```
[SafeAreaView top+bottom]
├── Header 64pt : bouton "←" gauche + titre "Historique multijoueur" centré
└── FlatList (ou ScrollView)
    ├── [Vide] : View centrée avec texte "Aucune partie multijoueur pour l'instant"
    └── [Données] : MultiplayerHistoryItem par session, du plus récent au plus ancien
```

**Comportement de chargement :**
- `useFocusEffect` + `useCallback` pour recharger les données à chaque fois que l'écran devient actif (pattern identique à `HistoryScreen`).
- État local : `records: ReadonlyArray<MultiplayerGameRecord>` initialisé à `[]`, `isLoading: boolean`.
- Appel à `MultiplayerScoreStorage.loadAll()` dans le `useFocusEffect`.

**Composant `MultiplayerHistoryItem` (interne) :**

Props :
```typescript
interface MultiplayerHistoryItemProps {
  record: MultiplayerGameRecord;
}
```

Rendu d'une ligne d'historique :
- Ligne 1 (primaire) : `formatMultiplayerDate(record.date)` — ex. "05/03/2026"
- Ligne 2 : joueurs séparés par " vs " — `record.playerNames.join(' vs ')`
- Ligne 3 : nombre de manches — `${record.roundCount} manche${record.roundCount > 1 ? 's' : ''}`
- Ligne 4 : gagnant — `record.winner !== null ? `Gagnant : ${record.winner}` : 'Égalité'`
- `accessible={true}` avec `accessibilityLabel` composé des 4 lignes
- Non interactif en Phase 3 : pas de `onPress`, pas de `TouchableOpacity`

**État vide :**
```typescript
// Si records.length === 0 et !isLoading :
<View style={styles.emptyContainer}>
  <Text style={styles.emptyText}>{'Aucune partie multijoueur pour l\'instant'}</Text>
</View>
```

**Conventions :**
- Export nommé `MultiplayerHistoryScreen`
- `StyleSheet.create()` en bas du fichier
- Zéro `any`, TypeScript strict
- `FlatList` préféré à `ScrollView` pour la liste (performances sur longues listes)

---

### 6. Navigation — `RootNavigator.tsx`

**Ajout dans `RootStackParamList` :**

```typescript
/**
 * Route MultiplayerHistory : historique des sessions multijoueur (F3-31).
 * Accessible depuis MultiplayerSetupScreen.
 */
MultiplayerHistory: undefined;
```

**Ajout dans le Stack.Navigator :**

```tsx
<Stack.Screen
  name="MultiplayerHistory"
  component={MultiplayerHistoryScreen}
  options={{ headerShown: false }}
/>
```

**Point d'entrée — `MultiplayerSetupScreen` :**

Ajouter un bouton texte secondaire sous le bouton "Commencer", dans la `bottomZone` ou en bas du `ScrollView` (cohérent avec le pattern `secondaryTextButton` de `HomeScreen`) :

```tsx
<TouchableOpacity
  style={styles.historyButton}
  onPress={() => { navigation.navigate('MultiplayerHistory'); }}
  accessibilityLabel="Voir l'historique des parties multijoueur"
  accessibilityRole="button"
>
  <Text style={styles.historyButtonText}>{'Historique multijoueur'}</Text>
</TouchableOpacity>
```

Style suggéré : texte secondaire `#64748B`, hauteur 44pt, alignement centré — identique à `secondaryTextButton` dans `HomeScreen`. À placer dans la `bottomZone` de `MultiplayerSetupScreen`, sous le bouton "Commencer" existant.

**Décision architecture — HomeScreen vs MultiplayerSetupScreen :**
Le point d'entrée est `MultiplayerSetupScreen` et non `HomeScreen`. Raison : l'historique multijoueur est contextuel à la configuration d'une session ; les joueurs qui veulent consulter leurs résultats passés arrivent naturellement sur cet écran. Cela évite également d'allonger la liste de boutons secondaires de `HomeScreen` qui est déjà chargée.

---

### 7. TDD — Fonctions pures et tests à écrire en premier

**TDD strict (tests avant implémentation) :**

| Fonction | Fichier test |
|----------|-------------|
| `getMultiplayerWinner` | `__tests__/utils/multiplayer-history.utils.test.ts` |
| `formatMultiplayerDate` | `__tests__/utils/multiplayer-history.utils.test.ts` |
| `buildMultiplayerRecord` | `__tests__/utils/multiplayer-history.utils.test.ts` |

**Tests alongside (écrits en même temps que le code) :**

| Module | Fichier test |
|--------|-------------|
| `MultiplayerScoreStorage` | `__tests__/services/multiplayer-score-storage.service.test.ts` |
| `MultiplayerHistoryScreen` | `__tests__/screens/MultiplayerHistoryScreen.test.tsx` |

**Cas de test service `MultiplayerScoreStorage` :**
- `save` + `loadAll` : sauvegarder 1 record, vérifier qu'il est retourné
- Limite 20 entrées : sauvegarder 21 records, vérifier que seuls les 20 plus récents sont retournés
- `loadAll` sur storage vide : retourner `[]`
- `loadAll` sur données corrompues (mocked AsyncStorage retournant `"not-an-array"`) : retourner `[]`

**Cas de test `MultiplayerHistoryScreen` :**
- Liste vide : affiche le message "Aucune partie multijoueur pour l'instant"
- Liste avec 2 items : affiche les 2 items avec les bonnes informations (date, joueurs, gagnant)
- Gagnant null : affiche "Égalité"

---

### 8. Critères de qualité

La PR sera approuvée si et seulement si :
- `tsc --noEmit` passe sans erreur
- `npm run lint` passe sans erreur
- Commit TDD visible avant le commit d'implémentation des fonctions pures
- Coverage ≥ 70% sur les modules modifiés
- Cas d'erreur testés pour le service (données corrompues, limite 20 entrées)
- `MultiplayerRoundResult` n'est plus déclaré deux fois — le store l'importe depuis `@wikihop/shared`

### 9. Points de vigilance

1. **Dernière manche non flushée** : `roundHistory` du store ne contient pas la dernière manche. La sauvegarde doit construire `completeRoundHistory = [...roundHistory, lastRoundSnapshot]` en reconstruisant le snapshot depuis `players[]`. Ne pas sauvegarder `roundHistory` brut du store.

2. **Double sauvegarde** : utiliser `sessionSavedRef` dans `MultiplayerResultScreen` pour garantir l'unicité de la sauvegarde au montage. Le Rejouer (`handleReplay`) appelle `restartSession()` qui remet `roundHistory` à `[]` — une nouvelle session commencera et créera un nouveau record au prochain `MultiplayerResultScreen`.

3. **`noUncheckedIndexedAccess`** : dans `getMultiplayerWinner`, l'accès à `ranked[0]` et `ranked[1]` retourne `T | undefined` — guard explicite obligatoire.

4. **`exactOptionalPropertyTypes`** : `MultiplayerGameRecord` n'a pas de champs optionnels — pas de contrainte particulière. Mais si Laurent ajoute des champs optionnels, respecter la convention (`prop?: string` n'accepte pas `{ prop: undefined }`).

5. **Import `randomUUID`** : utiliser `expo-crypto` (déjà installé dans le projet) plutôt qu'une implémentation maison. Vérifier que l'import est `import { randomUUID } from 'expo-crypto'`.

6. **`useFocusEffect` dans `MultiplayerHistoryScreen`** : importer depuis `@react-navigation/native`, wraper le callback dans `useCallback`. Pattern identique à `HistoryScreen` — s'y référer.

## Validation QA — Halim

**Date** : 2026-03-16
**Testeur** : Halim
**Statut global** : Validé

### Critères d'acceptance
- [x] `MultiplayerHistoryScreen` — FlatList, état vide, header "Historique multijoueur" — OK
- [x] Chaque session affiche date (DD/MM/YYYY), joueurs ("A vs B"), manches, gagnant / "Égalité" — OK
- [x] Persistance AsyncStorage via `multiplayer-score-storage.service.ts` — clé `@wikihop/multiplayer_history`, max 20 entrées, insert en tête — OK
- [x] Point d'entrée : bouton "Historique multijoueur" dans `MultiplayerSetupScreen` → `navigation.navigate('MultiplayerHistory')` — OK
- [x] `tsc --noEmit` — sans erreur — OK
- [x] `npm run lint` — 0 erreur (19 warnings no-console non bloquants) — OK

### Tests automatisés
- `npm test` (workspace apps/mobile) : 659 tests passants, 40 suites, 0 échec
- Suites F3-31 : 30 tests passants (3 suites)
  - `multiplayer-history.utils.test.ts` : 12 tests
  - `multiplayer-score-storage.service.test.ts` : 10 tests
  - `MultiplayerHistoryScreen.test.tsx` : 8 tests
- `tsc --noEmit` : sans erreur
- `npm run lint` : 0 erreur

### TDD vérifié
- Commit tests `4f7902e` (`test(mobile): TDD F3-31 — multiplayer-history.utils`) daté du 2026-03-15
- Commit implémentation `97266df` (shared types) → `370a8ad` (utils) → `01a6e85` (service) → `3397ee5` (ResultScreen) → `19fd19f` (HistoryScreen) — tous postérieurs au commit TDD
- TDD strict confirmé pour les 3 fonctions pures : `getMultiplayerWinner`, `formatMultiplayerDate`, `buildMultiplayerRecord`

### Points vérifiés
- `MultiplayerRoundResult` défini dans `@wikihop/shared` (L153-157), re-exporté depuis `multiplayer.store.ts` (`export type { MultiplayerRoundResult } from '@wikihop/shared'`) — pas de double déclaration
- Guard double-save via `sessionSavedRef` dans `MultiplayerResultScreen` (L254-282) — sauvegarde unique au montage
- Dernière manche non flushée : `completeRoundHistory = [...roundHistory, lastRoundSnapshot]` construit correctement depuis `players[]` (L263-269)
- `noUncheckedIndexedAccess` : accès `ranked[0]` et `ranked[1]` avec guards explicites dans `getMultiplayerWinner` (L71-76)
- `useFocusEffect` + `useCallback` avec flag `cancelled` dans `MultiplayerHistoryScreen` — pattern identique à `HistoryScreen`
- UUID généré via `generateUUID()` (pattern interne Math.random — note : non `expo-crypto` comme spécifié, mais conforme au pattern du projet pour Hermes)
- Clé AsyncStorage : `@wikihop/multiplayer_history` — conforme à la spec

### Note sur randomUUID
La spec demandait `import { randomUUID } from 'expo-crypto'`. L'implémentation utilise une fonction `generateUUID()` locale (pattern `Math.random` — identique à `game.store.ts`). Justification documentée dans le code : `crypto.randomUUID()` non disponible sur Hermes. Non bloquant — même pattern que le store de jeu existant.

### Conclusion
Story F3-31 validée. Aucun bug identifié. Pas de gate device physique requis (ne touche pas WebView/flux Home→Game→Victory).

## Statut
pending → in-progress → done
