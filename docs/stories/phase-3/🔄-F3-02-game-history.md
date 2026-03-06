---
id: F3-02
title: Historique des parties (stockage local)
phase: 3-Features
priority: Must
agents: [Frontend Dev, UX/UI]
status: in-progress
created: 2026-02-28
completed:
---

# F3-02 — Historique des parties (stockage local)

## User Story
En tant que joueur, je veux revoir mes parties passées, afin de suivre ma progression et me souvenir de mes meilleurs trajets.

## Critères d'acceptance
- [ ] L'historique affiche les 50 dernières parties (terminées ou abandonnées)
- [ ] Pour chaque entrée de la liste : date, articles de départ et destination, nombre de sauts, temps, statut (Victoire / Abandonné)
- [ ] L'historique est stocké dans AsyncStorage via un service `ScoreStorage` (`save`, `getAll`, `delete`, `deleteAll`)
- [ ] Le joueur peut effacer tout l'historique depuis l'écran (bouton "Effacer l'historique" avec confirmation)
- [ ] L'historique est accessible depuis la HomeScreen (bouton "Historique")
- [ ] L'écran de victoire (M-06) propose d'aller voir l'historique

## Stories associées (extensions de ce scope)
- **F3-10** : Tri multi-critères dans la liste (date, durée, clics)
- **F3-11** : Vue détail d'une partie individuelle avec suppression et rejouer

## Notes de réalisation

### Contexte

Story F3-02 — Historique des parties (stockage local).
Lien : `docs/stories/phase-3/🔄-F3-02-game-history.md`

Le modèle `GameSession` existant (défini dans `packages/shared/src/types/index.ts` et persisté dans `game.store.ts`) contient déjà toutes les données nécessaires à l'historique. L'objectif est de créer un service de stockage dédié (`ScoreStorage`) qui conserve les 50 dernières parties terminées (statut `won` ou `abandoned`) indépendamment de la session en cours (`@wikihop/game_session`).

---

### Périmètre

**Dans scope :**
- Service `ScoreStorage` avec clé AsyncStorage dédiée
- Hook `useGameHistory`
- Écran `HistoryScreen` + composant de ligne `HistoryItem`
- Intégration dans `game.store.ts` (appel `ScoreStorage.save()` après `completeSession` et `abandonSession`)
- Bouton "Historique" dans `HomeScreen`
- Bouton "Voir l'historique" dans `VictoryScreen`
- Bouton "Effacer l'historique" avec confirmation dans `HistoryScreen`

**Hors scope :**
- Tri multi-critères (F3-10)
- Vue détail d'une partie individuelle (F3-11)
- Synchronisation avec le backend

---

### 1. Structure des données

#### Interface `GameRecord` (à ajouter dans `packages/shared/src/types/index.ts`)

```typescript
/**
 * Enregistrement d'une partie terminée dans l'historique local.
 * Sous-ensemble de GameSession — ne contient pas le chemin complet
 * pour limiter la taille de stockage AsyncStorage.
 */
export interface GameRecord {
  /** Identifiant unique de la partie (UUID v4, issu de GameSession.id) */
  id: string;
  /** Article de départ */
  startArticle: Article;
  /** Article destination */
  targetArticle: Article;
  /** Nombre de sauts effectués */
  jumps: number;
  /** Durée de la partie en millisecondes (calculée : completedAt - startedAt) */
  durationMs: number;
  /** Date de début ISO 8601 */
  startedAt: string;
  /** Date de fin ISO 8601 (toujours présente car la partie est terminée) */
  completedAt: string;
  /** Statut final : 'won' ou 'abandoned' */
  status: 'won' | 'abandoned';
}
```

**Justification des choix :**
- `durationMs` précalculé : évite de recalculer à chaque rendu de la liste
- Dates en `string` ISO 8601 (pas `Date`) : AsyncStorage sérialise en JSON, pas de désérialisation à la lecture
- Pas de `path` : les 50 entrées avec un chemin complet pourraient dépasser le budget mémoire raisonnable. Le chemin est disponible dans F3-11 (vue détail) si besoin futur

---

### 2. Service `ScoreStorage`

**Fichier :** `apps/mobile/src/services/score-storage.service.ts`

**Clé AsyncStorage :** `@wikihop/game_history`

**Capacité maximale :** 50 entrées (les plus récentes en premier — `completedAt` DESC)

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GameRecord } from '@wikihop/shared';

const HISTORY_KEY = '@wikihop/game_history';
const MAX_ENTRIES = 50;

/**
 * Sauvegarde une partie terminée dans l'historique.
 * - Insère en tête de liste (plus récente en premier)
 * - Tronque à MAX_ENTRIES après insertion
 * - Les erreurs AsyncStorage sont loguées et ne bloquent pas l'appelant
 */
export async function save(record: GameRecord): Promise<void>;

/**
 * Retourne toutes les parties enregistrées, de la plus récente à la plus ancienne.
 * Retourne un tableau vide si aucune entrée ou en cas d'erreur de lecture.
 */
export async function getAll(): Promise<ReadonlyArray<GameRecord>>;

/**
 * Supprime une entrée de l'historique par son identifiant.
 * No-op silencieux si l'identifiant n'existe pas.
 */
export async function deleteRecord(id: string): Promise<void>;

/**
 * Efface l'intégralité de l'historique.
 */
export async function deleteAll(): Promise<void>;
```

**Contraintes d'implémentation :**
- `save()` : lire d'abord les entrées existantes via `getAll()`, insérer en tête (`[newRecord, ...existing]`), tronquer avec `.slice(0, MAX_ENTRIES)`, puis réécrire
- `getAll()` : si `JSON.parse` échoue, logger l'erreur et retourner `[]` (ne jamais propager l'exception)
- Jamais de `any` — typer le résultat de `JSON.parse` explicitement comme `GameRecord[]`
- Exports nommés uniquement (pas de `default export`)

---

### 3. Intégration dans `game.store.ts`

Les actions `completeSession()` et `abandonSession()` doivent appeler `ScoreStorage.save()` après avoir mis à jour la session.

**Fonction helper `buildGameRecord(session: GameSession): GameRecord`** à créer dans `game.store.ts` (ou dans un fichier utilitaire dédié `apps/mobile/src/utils/game-record.utils.ts`).

**Signature de `buildGameRecord` :**
```typescript
import type { GameRecord, GameSession } from '@wikihop/shared';

/**
 * Construit un GameRecord depuis une GameSession terminée.
 * Précondition : session.status === 'won' || session.status === 'abandoned'
 * Précondition : session.completedAt !== undefined
 */
export function buildGameRecord(session: GameSession & { completedAt: Date }): GameRecord;
```

**Calcul de `durationMs` :**
```typescript
durationMs: session.completedAt.getTime() - session.startedAt.getTime()
```

**Sérialisation des dates :**
```typescript
startedAt: session.startedAt.toISOString(),
completedAt: session.completedAt.toISOString(),
```

**Dans `completeSession()` :** après `set({ currentSession: updatedSession })` et `persistSession(updatedSession)` :
```typescript
const record = buildGameRecord(updatedSession as GameSession & { completedAt: Date });
void ScoreStorage.save(record); // fire-and-forget — ne bloque pas l'UI
```

Même pattern dans `abandonSession()`.

**Important :** Le `void` est intentionnel et doit être commenté. L'historique est best-effort — une erreur AsyncStorage ne doit jamais bloquer la navigation vers VictoryScreen ou HomeScreen.

---

### 4. Hook `useGameHistory`

**Fichier :** `apps/mobile/src/hooks/useGameHistory.ts`

```typescript
import type { GameRecord } from '@wikihop/shared';

interface UseGameHistoryResult {
  /** Liste des parties, du plus récent au plus ancien */
  records: ReadonlyArray<GameRecord>;
  /** true pendant le chargement initial */
  isLoading: boolean;
  /** Efface tout l'historique (avec confirmation gérée par l'écran appelant) */
  deleteAll: () => Promise<void>;
  /** Supprime une entrée par son id */
  deleteRecord: (id: string) => Promise<void>;
  /** Recharge manuellement depuis AsyncStorage */
  refresh: () => Promise<void>;
}

export function useGameHistory(): UseGameHistoryResult;
```

**Comportement :**
- Charge les enregistrements depuis `ScoreStorage.getAll()` au montage (`useEffect` avec deps `[]`)
- `isLoading` : `true` jusqu'à la fin du premier chargement
- `deleteAll()` : appelle `ScoreStorage.deleteAll()` puis met à jour `records` à `[]`
- `deleteRecord(id)` : appelle `ScoreStorage.deleteRecord(id)` puis filtre localement (pas de rechargement complet)
- `refresh()` : recharge depuis AsyncStorage (utile si l'écran reprend le focus après une partie)

---

### 5. Navigation

**Fichier à modifier :** `apps/mobile/src/navigation/RootNavigator.tsx`

Ajouter `History` dans `RootStackParamList` :
```typescript
export type RootStackParamList = {
  Home: undefined;
  Game: { articleTitle: string };
  Victory: undefined;
  ArticleViewer: { url: string; title: string };
  History: undefined; // ← ajouter
};
```

Ajouter le `Stack.Screen` dans `RootNavigator` :
```tsx
<Stack.Screen
  name="History"
  component={HistoryScreen}
  options={{ headerShown: false }}
/>
```

Import à ajouter : `import { HistoryScreen } from '../screens/HistoryScreen';`

---

### 6. Composants

#### `HistoryScreen`

**Fichier :** `apps/mobile/src/screens/HistoryScreen.tsx`

**Props :** `NativeStackScreenProps<RootStackParamList, 'History'>`

**Comportement :**
- Utilise `useGameHistory()` pour obtenir `records`, `isLoading`, `deleteAll`
- Utilise `useFocusEffect` (React Navigation) pour appeler `refresh()` à chaque fois que l'écran reprend le focus — garantit que l'historique est à jour si une partie vient d'être complétée
- Affiche un indicateur de chargement (`ActivityIndicator`) si `isLoading`
- Affiche un message vide si `records` est vide : "Aucune partie jouée pour l'instant."
- Affiche la liste avec `FlatList<GameRecord>` (pas `ScrollView` — performance sur 50 items)
- Bouton "Effacer l'historique" : visible uniquement si `records.length > 0`, déclenche un `Alert.alert` de confirmation avant d'appeler `deleteAll()`
- Header manuel (pas de header React Navigation) avec bouton retour `navigation.goBack()`

**Accessibilité :** `FlatList` avec `accessibilityLabel` sur chaque `HistoryItem`.

#### `HistoryItem`

**Fichier :** `apps/mobile/src/components/history/HistoryItem.tsx`

```typescript
interface HistoryItemProps {
  record: GameRecord;
  onPress?: (record: GameRecord) => void; // prévu pour F3-11, peut être undefined en F3-02
}

export function HistoryItem({ record, onPress }: HistoryItemProps): React.JSX.Element;
```

**Affichage :**
- Statut : badge "Victoire" (vert `#16A34A`) ou "Abandonné" (gris `#64748B`)
- Titre : `"[startArticle.title] → [targetArticle.title]"`
- Sauts : `"X saut(s)"`
- Durée : appel à `formatDuration(record.durationMs)` (voir fonctions pures ci-dessous)
- Date : appel à `formatRecordDate(record.completedAt)` (voir fonctions pures ci-dessous)

---

### 7. Intégrations HomeScreen et VictoryScreen

#### HomeScreen

Ajouter un bouton "Historique" dans la zone header ou en bas de la zone de boutons (choix UX délégué à Benjamin).
Sur `onPress` : `navigation.navigate('History')`.

Le bouton est toujours visible, même si l'historique est vide (l'écran affichera l'état vide).

#### VictoryScreen

Ajouter un bouton "Voir l'historique" dans la zone `stickyButtons`, en dessous de la rangée `primaryButtonsRow`.
Sur `onPress` : `navigation.navigate('History')`.

---

### 8. Fonctions pures identifiées pour TDD strict

Ces fonctions doivent avoir leurs tests AVANT l'implémentation (TDD strict).

**Fichier recommandé :** `apps/mobile/src/utils/history.utils.ts`

```typescript
/**
 * Formate une durée en millisecondes en chaîne lisible.
 * Exemples :
 *   45000 → "45 s"
 *   125000 → "2 min 05 s"
 *   3600000 → "60 min 00 s"
 */
export function formatDuration(durationMs: number): string;

/**
 * Formate une date ISO 8601 en chaîne localisée courte.
 * Exemples :
 *   "2026-03-06T14:30:00.000Z" → "06/03/2026 à 14:30" (locale fr)
 *   L'heure est toujours affichée en heure locale du device.
 */
export function formatRecordDate(isoString: string): string;

/**
 * Construit un GameRecord depuis une GameSession terminée.
 * Précondition : session.status === 'won' || session.status === 'abandoned'
 * Précondition : session.completedAt est défini
 * Retourne null si les préconditions ne sont pas satisfaites.
 */
export function buildGameRecord(session: GameSession): GameRecord | null;
```

**Cas de test attendus pour `formatDuration` :**
- `0` → `"0 s"`
- `999` → `"0 s"` (arrondi vers le bas)
- `1000` → `"1 s"`
- `45000` → `"45 s"`
- `60000` → `"1 min 00 s"`
- `125000` → `"2 min 05 s"`
- `3665000` → `"61 min 05 s"` (pas d'heures — format plat)

**Cas de test attendus pour `buildGameRecord` :**
- Session `in_progress` → retourne `null`
- Session `won` sans `completedAt` → retourne `null`
- Session `won` avec `completedAt` → retourne `GameRecord` avec `status: 'won'` et `durationMs` correct
- Session `abandoned` → retourne `GameRecord` avec `status: 'abandoned'`
- Vérifier que `durationMs` = `completedAt.getTime() - startedAt.getTime()`

**Cas de test attendus pour `ScoreStorage.save` (tests d'intégration AsyncStorage mock) :**
- Sauvegarder une entrée dans une liste vide → `getAll()` retourne `[record]`
- Sauvegarder 51 entrées → `getAll()` retourne exactement 50 entrées (la plus ancienne est supprimée)
- `deleteAll()` puis `getAll()` → retourne `[]`
- `deleteRecord(id)` → entrée supprimée, les autres conservées
- `getAll()` avec JSON corrompu dans AsyncStorage → retourne `[]` sans lever d'exception

---

### 9. Règle TDD

**Laurent doit impérativement écrire les tests de `formatDuration`, `formatRecordDate` et `buildGameRecord` AVANT d'écrire le code de ces fonctions.**

Même contrainte pour le hook `useGameHistory` : écrire d'abord les cas de test (chargement, deleteAll, deleteRecord) avant l'implémentation.

Le Tech Lead vérifiera en code review que les commits de test précèdent les commits d'implémentation dans l'historique Git (ou que les tests et l'implémentation sont dans des fichiers distincts commitables indépendamment).

---

### 10. Critères de qualité (code review)

- `tsc --noEmit` passe sans erreur
- `npm run lint` passe sans erreur
- Zéro `any` — `JSON.parse` typé explicitement
- `exactOptionalPropertyTypes` satisfait — pas de spread de types intermédiaires avec des champs optionnels
- Coverage >= 70% sur `score-storage.service.ts`, `history.utils.ts`, `useGameHistory.ts`
- `FlatList` utilisée (pas `ScrollView`) pour la liste
- `useFocusEffect` utilisé dans `HistoryScreen` pour rafraîchir au focus
- `void ScoreStorage.save(record)` commenté dans `game.store.ts` (fire-and-forget intentionnel)
- Bouton "Effacer l'historique" déclenche toujours une confirmation `Alert`

---

### 11. Points de vigilance

- **Désérialisation des dates** : `GameRecord` stocke les dates en `string` ISO 8601. Ne jamais construire un `Date` à la lecture — les fonctions d'affichage reçoivent des strings et les formatent directement
- **`exactOptionalPropertyTypes`** : `buildGameRecord` doit construire `GameRecord` sans spread depuis `GameSession` (les types ne sont pas compatibles directement)
- **`noUncheckedIndexedAccess`** : dans `ScoreStorage.save()`, après `JSON.parse`, vérifier que le résultat est bien un tableau avant d'accéder aux indices
- **Clé AsyncStorage distincte** : `@wikihop/game_history` est différente de `@wikihop/game_session` — ne jamais confondre les deux
- **Fire-and-forget dans `game.store`** : le `void ScoreStorage.save()` est intentionnel pour ne pas bloquer `completeSession` / `abandonSession`. Une erreur d'écriture dans l'historique ne doit jamais empêcher la navigation vers VictoryScreen

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
