# Spécification technique — F3-08 : Statistiques personnelles

## 1. Contexte

Story : `docs/stories/phase-3/🔄-F3-08-personal-stats.md`
Dépend de : F3-02 (ScoreStorage — complété et mergé)
Destinataire : Frontend Dev (Laurent)
Branche cible : `feat/laurent-personal-stats`

**Point critique sur la lib graphique** : `react-native-svg` et toute lib de graphiques (Victory Native, react-native-gifted-charts, etc.) sont **absentes** de `apps/mobile/package.json`. Ajouter une dépendance non validée par le Tech Lead est hors protocole. La décision d'architecture est la suivante : le graphique des 7 dernières parties est réalisé en **pur React Native** (View, StyleSheet) sans aucune lib externe. Un graphique à barres vertical en `View` suffit pour ce cas d'usage — 7 barres de hauteur proportionnelle, labels sous chaque barre. Cette approche est cohérente avec le principe d'éco-conception (zéro dépendance non justifiée) et évite les problèmes de compatibilité Expo managed workflow.

## 2. Périmètre

**Dans le scope :**
- Nouveau screen `StatsScreen`
- Ajout de la route `Stats` dans `RootStackParamList`
- Bouton d'accès depuis `HistoryScreen` (header ou bouton dédié)
- Fonction pure `computeStats` (TDD strict)
- Fonction pure `computeChartData` (TDD strict)
- Composant `MiniBarChart` (graphique pur React Native)

**Hors scope :**
- Tout envoi de données au serveur — données 100% locales
- Statistiques par langue, par difficulté, ou par type de partie (défi quotidien vs normale)
- Lib graphique externe (`react-native-svg`, Victory Native, etc.) — non autorisée sans ADR

## 3. Architecture proposée

### 3.1 Fichiers à créer / modifier

```
apps/mobile/src/
├── utils/
│   └── stats.utils.ts                 ← CRÉER (TDD — tests d'abord)
├── components/
│   └── stats/
│       └── MiniBarChart.tsx           ← CRÉER (composant graphique pur RN)
├── screens/
│   └── StatsScreen.tsx                ← CRÉER
├── navigation/
│   └── RootNavigator.tsx              ← MODIFIER (ajout route Stats)
└── screens/
    └── HistoryScreen.tsx              ← MODIFIER (ajout point d'entrée Stats)
```

Tests associés :
```
apps/mobile/src/
└── __tests__/
    ├── utils/
    │   └── stats.utils.test.ts        ← CRÉER EN PREMIER (TDD)
    └── components/
        └── stats/
            └── MiniBarChart.test.tsx  ← CRÉER (alongside)
```

### 3.2 Modification de `RootStackParamList`

Dans `apps/mobile/src/navigation/RootNavigator.tsx` :

```typescript
/**
 * Route Stats : statistiques personnelles (F3-08).
 * Accessible depuis HistoryScreen.
 */
Stats: undefined;
```

Ajouter le `Stack.Screen` :
```tsx
<Stack.Screen
  name="Stats"
  component={StatsScreen}
  options={{ headerShown: false }}
/>
```

### 3.3 Types internes (dans `stats.utils.ts`)

```typescript
import type { GameRecord } from '@wikihop/shared';

/** Métriques globales calculées depuis l'historique */
export interface PersonalStats {
  /** Nombre total de parties dans l'historique (won + abandoned) */
  totalGames: number;
  /** Taux de victoire en pourcentage entier (0-100), 0 si aucune partie */
  winRatePercent: number;
  /** Moyenne de sauts sur les parties gagnées, arrondie à 1 décimale. null si aucune victoire. */
  avgJumpsWon: number | null;
  /** Durée en ms de la meilleure partie gagnée (durationMs minimum). null si aucune victoire. */
  bestTimeMs: number | null;
}

/** Point de données pour le graphique — une partie */
export interface ChartDataPoint {
  /** Nombre de sauts de la partie */
  jumps: number;
  /** Statut de la partie */
  status: 'won' | 'abandoned';
  /** Label court sous la barre (ex: "10/03") */
  label: string;
}
```

### 3.4 Fonction pure `computeStats`

Signature exacte :
```typescript
export function computeStats(records: ReadonlyArray<GameRecord>): PersonalStats
```

Comportement :
- `totalGames` : `records.length`
- `winRatePercent` : `Math.round((won / total) * 100)`, 0 si `total === 0`
- `avgJumpsWon` : moyenne de `jumps` sur les records `status === 'won'`, arrondie à 1 décimale via `Math.round(sum * 10) / 10`. `null` si aucune victoire.
- `bestTimeMs` : `Math.min(...wonRecords.map(r => r.durationMs))`. `null` si aucune victoire.

### 3.5 Fonction pure `computeChartData`

Signature exacte :
```typescript
export function computeChartData(records: ReadonlyArray<GameRecord>): ReadonlyArray<ChartDataPoint>
```

Comportement :
- Prend les **7 dernières parties** (`records.slice(0, 7)`) — les records sont déjà triés du plus récent au plus ancien dans ScoreStorage
- Inverse l'ordre pour que la barre la plus ancienne soit à gauche (`slice(0, 7).reverse()`)
- Pour chaque record, construit un `ChartDataPoint` :
  - `jumps` : `record.jumps`
  - `status` : `record.status`
  - `label` : extrait JJ/MM depuis `record.completedAt` — `new Date(record.completedAt)` puis `DD/MM` avec padding
- Si `records.length < 7` : retourne autant de points que de records disponibles (pas de padding avec des zéros)
- Si `records.length === 0` : retourne `[]`

### 3.6 Composant `MiniBarChart`

```typescript
interface MiniBarChartProps {
  /** Données des 7 dernières parties (ordonnées ancienne → récente) */
  data: ReadonlyArray<ChartDataPoint>;
  /** Hauteur maximale du composant graphique (barres incluses) — défaut : 120 */
  maxHeight?: number;
}

export function MiniBarChart({ data, maxHeight = 120 }: MiniBarChartProps): React.JSX.Element
```

Comportement de rendu :
- Si `data.length === 0` : afficher `<Text>Aucune partie à afficher</Text>` centré
- Calculer `maxJumps = Math.max(...data.map(d => d.jumps))` — valeur de référence pour la hauteur des barres
- Si `maxJumps === 0` : toutes les barres à hauteur minimale (4px)
- Chaque barre :
  - Hauteur : `Math.max(4, Math.round((point.jumps / maxJumps) * maxHeight))`
  - Couleur fond : `#16A34A` si `status === 'won'`, `#94A3B8` si `status === 'abandoned'`
  - Largeur : calculée pour tenir dans l'écran — `(screenWidth - 64) / data.length` avec un maximum de 36px
  - Label sous la barre : `point.label` (JJ/MM), fontSize 10, color `#64748B`
- Les barres sont alignées en bas (`alignItems: 'flex-end'` dans le conteneur de barres)
- Accessibilité : le composant entier reçoit `accessibilityLabel` généré depuis les données (ex: "Graphique des 7 dernières parties")

### 3.7 Layout de `StatsScreen`

```
SafeAreaView (top + bottom)
├── Header fixe
│   ├── ← Retour
│   └── "Mes statistiques" (titre centré)
├── headerSeparator (1px)
└── ScrollView (flex: 1)
    ├── Section métriques (4 tuiles en grille 2×2)
    │   ├── "Parties jouées" — totalGames
    │   ├── "Taux de victoire" — winRatePercent%
    │   ├── "Moy. sauts (victoires)" — avgJumpsWon ?? "—"
    │   └── "Meilleur temps" — bestTimeMs via formatDuration ?? "—"
    ├── Section graphique
    │   ├── Titre "7 dernières parties"
    │   └── MiniBarChart (data=chartData)
    └── Note "Légende : Victoire / Abandonné" (2 pastilles colorées)
```

Grille 2×2 des métriques : `flexDirection: 'row', flexWrap: 'wrap'` — chaque tuile à `width: '50%'` avec padding interne.

Si `records.length === 0` : remplacer le contenu ScrollView par le message "Aucune statistique disponible. Jouez votre première partie !" + bouton "Jouer" qui navigue vers `Home`.

### 3.8 Chargement des données dans `StatsScreen`

`StatsScreen` charge les données directement depuis `ScoreStorage.getAll()` au montage (même pattern que `GameDetailScreen`). Il n'instancie pas `useGameHistory`.

```typescript
const [records, setRecords] = useState<ReadonlyArray<GameRecord>>([]);
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  void (async () => {
    const data = await ScoreStorage.getAll();
    setRecords(data);
    setIsLoading(false);
  })();
}, []);

const stats = useMemo(() => computeStats(records), [records]);
const chartData = useMemo(() => computeChartData(records), [records]);
```

### 3.9 Point d'entrée depuis `HistoryScreen`

Ajouter un bouton "Voir mes stats" dans le header de `HistoryScreen`, à droite (position `absolute right: 16`).

```typescript
// Dans le header de HistoryScreen, à droite du titre centré :
<TouchableOpacity
  style={styles.statsButton}
  onPress={() => { navigation.navigate('Stats'); }}
  accessibilityLabel="Voir mes statistiques"
  accessibilityRole="button"
>
  <Text style={styles.statsButtonText}>{'Stats'}</Text>
</TouchableOpacity>
```

Style `statsButton` : `position: 'absolute', right: 16, width: 44, height: 44, alignItems: 'center', justifyContent: 'center'`.

## 4. TDD — fonctions pures à tester en premier

### 4.1 `computeStats` — TDD strict (tests avant code)

Fichier : `apps/mobile/src/__tests__/utils/stats.utils.test.ts`

Cas obligatoires :

| Cas | Input | Attendu |
|-----|-------|---------|
| Tableau vide | `[]` | `{ totalGames: 0, winRatePercent: 0, avgJumpsWon: null, bestTimeMs: null }` |
| 1 victoire | 1 record `won`, 5 jumps, 60000ms | `totalGames: 1, winRatePercent: 100, avgJumpsWon: 5, bestTimeMs: 60000` |
| 1 abandon | 1 record `abandoned` | `totalGames: 1, winRatePercent: 0, avgJumpsWon: null, bestTimeMs: null` |
| Mix 3 victoires 1 abandon | 4 records | `totalGames: 4, winRatePercent: 75, ...` |
| Arrondi winRate | 1 victoire sur 3 | `winRatePercent: 33` (Math.round(33.33)) |
| avgJumpsWon arrondi | victoires avec 4, 5, 6 sauts | `avgJumpsWon: 5.0` |
| avgJumpsWon arrondi décimale | victoires avec 4, 5 sauts | `avgJumpsWon: 4.5` |
| bestTimeMs | victoires avec 30000, 60000, 45000ms | `bestTimeMs: 30000` |
| Victoires uniquement | 5 records `won` | `winRatePercent: 100` |

### 4.2 `computeChartData` — TDD strict

| Cas | Input | Attendu |
|-----|-------|---------|
| Tableau vide | `[]` | `[]` |
| Moins de 7 parties | 3 records | 3 points, ordonnés ancienne → récente |
| Exactement 7 parties | 7 records | 7 points |
| Plus de 7 parties | 10 records | 7 points (les 7 plus récents uniquement) |
| Label format | record avec `completedAt: "2026-03-10T..."` | `label: "10/03"` |
| Label padding jour | `completedAt: "2026-03-01T..."` | `label: "01/03"` |
| Status conservé | record `abandoned` | `ChartDataPoint.status === 'abandoned'` |

## 5. Critères de qualité (code review)

- [ ] `Stats` ajouté dans `RootStackParamList` avec `undefined`
- [ ] `StatsScreen` importé et enregistré dans `RootNavigator`
- [ ] `computeStats` et `computeChartData` sont des fonctions pures exportées depuis `stats.utils.ts`
- [ ] `useMemo` utilisé dans `StatsScreen` pour `stats` et `chartData`
- [ ] Cas tableau vide géré dans `StatsScreen` (message dédié, pas de crash)
- [ ] `MiniBarChart` ne crashe pas sur `data.length === 0`
- [ ] `maxJumps === 0` géré dans `MiniBarChart` (hauteur minimale 4px)
- [ ] Aucune lib graphique externe ajoutée dans `package.json`
- [ ] `formatDuration` importé depuis `history.utils.ts` (pas de duplication)
- [ ] Bouton "Stats" ajouté dans `HistoryScreen` header
- [ ] Zéro `any`
- [ ] `tsc --noEmit` passe
- [ ] `npm run lint` passe
- [ ] Coverage ≥ 70% sur `stats.utils.ts`
- [ ] Tests TDD committés **avant** le code d'implémentation (vérification historique Git)

## 6. Points de vigilance

- **`noUncheckedIndexedAccess`** : `records[0]` retourne `GameRecord | undefined`. Utiliser `records.length > 0` avant tout accès indexé direct, ou préférer `.map()` / `.reduce()` / `.filter()`.
- **`Math.max` sur tableau vide** : `Math.max(...[])` retourne `-Infinity`. Toujours vérifier `data.length > 0` avant d'appeler `Math.max` dans `MiniBarChart`.
- **Largeur des barres** : utiliser `useWindowDimensions()` de React Native pour obtenir `screenWidth` dynamiquement (pas de valeur hardcodée — évite les problèmes sur tablette ou mode split).
- **`avgJumpsWon` arrondi** : `Math.round(sum / count * 10) / 10` pour une décimale correcte. Attention aux flottants JavaScript (ex: `4.5000000001`).
- **Ordre des records dans ScoreStorage** : `getAll()` retourne les records du plus récent au plus ancien (insertion en tête dans `save()`). `computeChartData` doit `slice(0, 7)` puis `.reverse()` pour obtenir l'ordre chronologique (ancienne → récente) dans le graphique.
- **`null` dans les métriques** : les valeurs `avgJumpsWon` et `bestTimeMs` peuvent être `null`. L'affichage dans `StatsScreen` doit utiliser `?? '—'` (fallback chaîne tiret long) — jamais de `!` non-null assertion.
