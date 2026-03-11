# Spécification technique — F3-10 : Tri multi-critères dans l'historique

## 1. Contexte

Story : `docs/stories/phase-3/🔄-F3-10-history-sort.md`
Dépend de : F3-02 (HistoryScreen + useGameHistory + ScoreStorage — tous complétés et mergés)
Destinataire : Frontend Dev (Laurent)
Branche cible : `feat/laurent-history-sort`

## 2. Périmètre

**Dans le scope :**
- Ajout d'un sélecteur de tri dans `HistoryScreen`
- Fonction pure `sortRecords` (TDD strict)
- Persistance du critère actif dans AsyncStorage
- Hook `useHistorySort` encapsulant la logique de persistance + tri

**Hors scope :**
- Aucun nouvel écran
- Aucune modification de ScoreStorage ou de `useGameHistory`
- Aucune modification de `HistoryItem`

## 3. Architecture proposée

### 3.1 Fichiers à créer / modifier

```
apps/mobile/src/
├── utils/
│   └── history-sort.utils.ts          ← CRÉER (TDD — tests d'abord)
├── hooks/
│   └── useHistorySort.ts              ← CRÉER
└── screens/
    └── HistoryScreen.tsx              ← MODIFIER (ajout sélecteur + tri)
```

Tests associés :
```
apps/mobile/src/
└── __tests__/
    ├── utils/
    │   └── history-sort.utils.test.ts ← CRÉER EN PREMIER (TDD)
    └── hooks/
        └── useHistorySort.test.ts     ← CRÉER
```

### 3.2 Type `SortCriterion`

À définir dans `history-sort.utils.ts` (pas dans `@wikihop/shared` — usage purement mobile) :

```typescript
export type SortCriterion =
  | 'date_desc'
  | 'date_asc'
  | 'duration_asc'
  | 'duration_desc'
  | 'jumps_asc'
  | 'jumps_desc';

export const DEFAULT_SORT_CRITERION: SortCriterion = 'date_desc';

export const SORT_CRITERION_LABELS: Record<SortCriterion, string> = {
  date_desc:     'Date (plus récent)',
  date_asc:      'Date (plus ancien)',
  duration_asc:  'Durée (plus courte)',
  duration_desc: 'Durée (plus longue)',
  jumps_asc:     'Sauts (moins)',
  jumps_desc:    'Sauts (plus)',
};
```

### 3.3 Clé AsyncStorage

```
@wikihop/history_sort_criterion
```

Valeur stockée : la string littérale du `SortCriterion` (pas de JSON wrapper — string brute, même pattern que `@wikihop/daily_completion_date` de F3-16).

### 3.4 Fonction pure `sortRecords`

Signature exacte :
```typescript
export function sortRecords(
  records: ReadonlyArray<GameRecord>,
  criterion: SortCriterion,
): ReadonlyArray<GameRecord>
```

Comportement :
- Retourne un **nouveau tableau** (pas de mutation de l'entrée)
- `date_desc` : tri par `completedAt` string ISO 8601, décroissant — la comparaison lexicographique est suffisante car le format ISO 8601 est ordonnable
- `date_asc` : tri par `completedAt`, croissant
- `duration_asc` : tri par `durationMs`, croissant
- `duration_desc` : tri par `durationMs`, décroissant
- `jumps_asc` : tri par `jumps`, croissant
- `jumps_desc` : tri par `jumps`, décroissant
- En cas d'égalité sur le critère principal : tri secondaire par `completedAt` décroissant (parties les plus récentes en premier) pour garantir un ordre stable

### 3.5 Hook `useHistorySort`

```typescript
interface UseHistorySortResult {
  /** Critère de tri actif */
  criterion: SortCriterion;
  /** Change le critère et le persiste en AsyncStorage */
  setCriterion: (c: SortCriterion) => Promise<void>;
  /** true pendant la lecture initiale depuis AsyncStorage */
  isLoading: boolean;
}

export function useHistorySort(): UseHistorySortResult
```

Comportement :
- Au montage : lit `@wikihop/history_sort_criterion` depuis AsyncStorage
- Si la valeur lue est absente ou invalide (guard de type nécessaire) : utilise `DEFAULT_SORT_CRITERION`
- `setCriterion` : met à jour l'état local **puis** écrit en AsyncStorage (pas d'attente de la persistance pour l'affichage)
- `isLoading` passe à `false` une fois la lecture initiale terminée, même si la clé est absente

Guard de type à écrire dans `history-sort.utils.ts` :
```typescript
export function isSortCriterion(value: unknown): value is SortCriterion
```

### 3.6 Modifications de `HistoryScreen`

Le sélecteur de tri est placé **entre le séparateur de header et la FlatList**, sur une hauteur fixe de 52px. Il ne défile pas avec la liste.

Layout résultant :
```
SafeAreaView
├── Header (← Historique)
├── headerSeparator (1px)
├── SortBar (52px fixe — nouveau)     ← AJOUT
└── FlatList (flex: 1)
    └── ListFooterComponent (Effacer)
```

`HistoryScreen` applique `sortRecords(records, criterion)` pour obtenir les données passées à `FlatList`. Les `records` bruts proviennent de `useGameHistory` (inchangé). Le tri est calculé via `useMemo` pour éviter les recalculs inutiles :

```typescript
const sortedRecords = useMemo(
  () => sortRecords(records, criterion),
  [records, criterion],
);
```

**Composant `SortBar`** (inline dans `HistoryScreen.tsx` ou extrait dans `components/history/SortBar.tsx` au choix de Laurent) :
- Affiche le libellé du critère actif
- Ouvre un `ActionSheet` natif (via `Alert` multi-boutons) ou un `Modal` avec une liste de `TouchableOpacity` — au choix de Laurent selon ce qui est le plus maintenable
- Accessibilité : `accessibilityRole="button"`, `accessibilityLabel="Trier par : [libellé actif]"`
- Pendant `isLoading` de `useHistorySort` : afficher un placeholder non interactif

**Pas de Picker natif** (évite la dépendance `@react-native-picker/picker` — hors stack validé).

Pendant `isLoading` de `useHistorySort` : le sélecteur est rendu désactivé (pas de skeleton — le chargement AsyncStorage est quasi-instantané, < 50ms).

## 4. TDD — fonctions pures et hooks à tester en premier

### 4.1 `sortRecords` — TDD strict (tests avant code)

Fichier : `apps/mobile/src/__tests__/utils/history-sort.utils.test.ts`

Cas obligatoires :

| Cas | Description |
|-----|-------------|
| `date_desc` | Retourne les records du plus récent au plus ancien |
| `date_asc` | Retourne les records du plus ancien au plus récent |
| `duration_asc` | Tri par durationMs croissant |
| `duration_desc` | Tri par durationMs décroissant |
| `jumps_asc` | Tri par jumps croissant |
| `jumps_desc` | Tri par jumps décroissant |
| Tableau vide | Retourne un tableau vide sans erreur |
| Tableau à 1 élément | Retourne un tableau à 1 élément |
| Égalité sur critère | Tri secondaire par date décroissante appliqué |
| Immutabilité | L'entrée `records` n'est pas mutée |

### 4.2 `isSortCriterion` — TDD strict

| Cas | Valeur | Attendu |
|-----|--------|---------|
| Valeur valide | `'date_desc'` | `true` |
| Valeur valide | `'jumps_asc'` | `true` |
| Chaîne invalide | `'unknown'` | `false` |
| `null` | `null` | `false` |
| `undefined` | `undefined` | `false` |
| Nombre | `42` | `false` |

### 4.3 `useHistorySort` — tests avec mock AsyncStorage

Cas obligatoires :
- `isLoading` est `true` au montage, passe à `false` après la lecture
- Si AsyncStorage retourne `'duration_asc'` : `criterion === 'duration_asc'`
- Si AsyncStorage retourne `null` : `criterion === 'date_desc'`
- Si AsyncStorage retourne une valeur invalide : `criterion === 'date_desc'`
- `setCriterion('jumps_desc')` : met à jour `criterion` et appelle `AsyncStorage.setItem` avec la bonne clé et valeur

## 5. Critères de qualité (code review)

- [ ] `sortRecords` est une fonction pure exportée depuis `history-sort.utils.ts`
- [ ] `isSortCriterion` guard présent et utilisé dans `useHistorySort`
- [ ] `useMemo` utilisé dans `HistoryScreen` pour le tri — pas de recalcul à chaque render
- [ ] `useHistorySort` gère le cas de valeur invalide en AsyncStorage (pas de crash si la clé est corrompue)
- [ ] Aucune dépendance nouvelle dans `package.json`
- [ ] Zéro `any`
- [ ] `tsc --noEmit` passe
- [ ] `npm run lint` passe
- [ ] Coverage ≥ 70% sur `history-sort.utils.ts` et `useHistorySort.ts`
- [ ] Tests TDD commitée **avant** le code d'implémentation (vérification historique Git)

## 6. Points de vigilance

- **Comparaison ISO 8601** : les strings `completedAt` dans `GameRecord` sont en format ISO 8601 complet (ex : `"2026-03-10T14:32:00.000Z"`). La comparaison lexicographique est valide pour ce format. Ne pas parser en `Date` inutilement.
- **`noUncheckedIndexedAccess`** : tout accès à `records[0]` doit être gardé.
- **`exactOptionalPropertyTypes`** : ne pas spreader un `GameRecord` dans un objet avec des champs optionnels différents.
- **ActionSheet / Modal** : si Laurent choisit un `Modal`, il doit être fermable par le bouton Annuler ET par un tap sur l'overlay (accessibilité Android).
- **Ordre stable** : `.sort()` en JavaScript n'est pas garanti stable dans tous les moteurs. Implémenter le critère secondaire (date décroissante) plutôt que de supposer la stabilité.
