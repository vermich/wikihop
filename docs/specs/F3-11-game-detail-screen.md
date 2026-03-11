# Spécification technique — F3-11 : Vue détail d'une partie

## 1. Contexte

Story : `docs/stories/phase-3/🔄-F3-11-game-detail-screen.md`
Dépend de : F3-02 (ScoreStorage, useGameHistory, HistoryItem — tous complétés)
Destinataire : Frontend Dev (Laurent)
Branche cible : `feat/laurent-game-detail-screen`

**Note critique sur le parcours complet** : `GameRecord` (défini dans `packages/shared/src/types/index.ts`) ne stocke **pas** le chemin complet des articles visités (`path: Article[]` existe dans `GameSession` mais **pas** dans `GameRecord`). Le critère d'acceptance "parcours complet affiché" ne peut donc pas être satisfait tel quel depuis l'historique. Décision d'architecture : afficher uniquement les informations disponibles dans `GameRecord` (départ, destination, jumps, durée, statut, date). La section "parcours" sera omise ou remplacée par une note "Détail du parcours non disponible". Si le PM souhaite afficher le chemin complet, il devra modifier `GameRecord` dans `@wikihop/shared` et migrer les données existantes — cela relève d'une nouvelle story. **Ne pas modifier `GameRecord` dans cette story.**

## 2. Périmètre

**Dans le scope :**
- Nouveau screen `GameDetailScreen`
- Ajout de la route `GameDetail` dans `RootStackParamList`
- Modification de `HistoryItem` pour passer `onPress` depuis `HistoryScreen`
- Bouton "Rejouer cette partie" (appel à `startSession` du game store)
- Bouton "Supprimer" (appel à `deleteRecord` de `useGameHistory`)
- Ouverture d'un article Wikipedia via la route `ArticleViewer` existante

**Hors scope :**
- Affichage du chemin complet des articles visités (données absentes de `GameRecord`)
- Modification de `GameRecord` ou `ScoreStorage`
- Modification du game store au-delà de l'appel à `startSession`

## 3. Architecture proposée

### 3.1 Fichiers à créer / modifier

```
apps/mobile/src/
├── screens/
│   └── GameDetailScreen.tsx          ← CRÉER
├── navigation/
│   └── RootNavigator.tsx             ← MODIFIER (ajout route GameDetail)
└── screens/
    └── HistoryScreen.tsx             ← MODIFIER (passer onPress à HistoryItem)
```

Tests associés :
```
apps/mobile/src/
└── __tests__/
    └── screens/
        └── GameDetailScreen.test.tsx ← CRÉER (tests alongside)
```

### 3.2 Modification de `RootStackParamList`

Dans `apps/mobile/src/navigation/RootNavigator.tsx`, ajouter la route :

```typescript
/**
 * Route GameDetail : vue détail d'une partie (F3-11).
 * recordId : UUID de la partie, utilisé pour retrouver le GameRecord
 * depuis ScoreStorage au montage de l'écran.
 */
GameDetail: {
  recordId: string;
};
```

Ajouter le `Stack.Screen` correspondant dans `RootNavigator` :
```tsx
<Stack.Screen
  name="GameDetail"
  component={GameDetailScreen}
  options={{ headerShown: false }}
/>
```

Importer `GameDetailScreen` depuis `../screens/GameDetailScreen`.

### 3.3 Stratégie de récupération du `GameRecord`

Le `GameDetailScreen` reçoit `{ recordId: string }` en paramètre de navigation. Il charge le record au montage via `ScoreStorage.getAll()` puis filtre par `id`. Ce pattern évite de passer un objet entier en paramètre de navigation (sérialisation JSON React Navigation, risques de données périmées si le record est supprimé depuis un autre écran).

```typescript
// Dans GameDetailScreen, au montage :
const [record, setRecord] = useState<GameRecord | null>(null);
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  void (async () => {
    const all = await ScoreStorage.getAll();
    const found = all.find((r) => r.id === recordId) ?? null;
    setRecord(found);
    setIsLoading(false);
  })();
}, [recordId]);
```

Si `record === null` après chargement (id introuvable — suppression concurrente) : afficher un message "Partie introuvable" avec un bouton "Retour" uniquement.

### 3.4 Interface du composant `GameDetailScreen`

```typescript
type GameDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'GameDetail'>;

export function GameDetailScreen({ navigation, route }: GameDetailScreenProps): React.JSX.Element
```

### 3.5 Layout de l'écran

```
SafeAreaView (top + bottom)
├── Header fixe
│   ├── ← Retour (bouton gauche)
│   └── "Détail de la partie" (titre centré)
├── headerSeparator (1px)
└── ScrollView (flex: 1)
    ├── Section infos générales
    │   ├── Statut badge (Victoire / Abandonné)
    │   ├── Date et heure (formatRecordDate + heure)
    │   ├── Durée totale (formatDuration)
    │   └── Nombre de sauts
    ├── Section trajet
    │   ├── Départ : [titre article] (TouchableOpacity → ArticleViewer)
    │   └── Destination : [titre article] (TouchableOpacity → ArticleViewer)
    ├── Bouton "Rejouer cette partie"
    └── Bouton "Supprimer cette partie" (rouge destructif)
```

**Pas de FlatList** — le contenu est court et fixe, un `ScrollView` suffit.

### 3.6 Comportement des boutons

**Bouton "Retour"** (header gauche) :
```typescript
onPress={() => { navigation.goBack(); }}
```

**TouchableOpacity article départ / destination** (ouvre dans ArticleViewer) :
```typescript
navigation.navigate('ArticleViewer', {
  url: record.startArticle.url,
  title: record.startArticle.title,
});
```

**Bouton "Rejouer cette partie"** :
1. Appeler `clearSession()` depuis `useGameStore` (invariant — voir point vigilance #21 MEMORY)
2. Appeler `startSession(record.startArticle, record.targetArticle)` depuis `useGameStore`
3. `navigation.navigate('Game', { articleTitle: record.startArticle.title })`

Note : `startSession` attend deux `Article`. `GameRecord` stocke `startArticle: Article` et `targetArticle: Article` — les types sont compatibles directement.

**Bouton "Supprimer cette partie"** :
```typescript
Alert.alert(
  'Supprimer cette partie',
  'Cette action est irréversible.',
  [
    { text: 'Annuler', style: 'cancel' },
    {
      text: 'Supprimer',
      style: 'destructive',
      onPress: () => {
        void (async () => {
          await ScoreStorage.deleteRecord(record.id);
          navigation.goBack();
        })();
      },
    },
  ],
);
```

La suppression est faite directement via `ScoreStorage.deleteRecord` (pas via `useGameHistory.deleteRecord`) car `GameDetailScreen` n'instancie pas `useGameHistory`. `useGameHistory` dans `HistoryScreen` se rechargera au `useFocusEffect` lors du retour.

### 3.7 Modification de `HistoryScreen`

Modifier `renderItem` pour passer `onPress` à `HistoryItem` :

```typescript
const handleItemPress = useCallback((record: GameRecord): void => {
  navigation.navigate('GameDetail', { recordId: record.id });
}, [navigation]);

const renderItem = useCallback(({ item }: { item: GameRecord }): React.JSX.Element => (
  <HistoryItem record={item} onPress={handleItemPress} />
), [handleItemPress]);
```

`HistoryItem` avait déjà prévu ce cas (`onPress?: (record: GameRecord) => void`) — aucun changement de signature nécessaire.

### 3.8 Formatage de la date/heure dans `GameDetailScreen`

Utiliser `formatRecordDate` existant depuis `utils/history.utils.ts` — cette fonction retourne déjà la date ET l'heure au format `"JJ/MM/AAAA à HH:MM"`. Aucune fonction utilitaire supplémentaire n'est nécessaire.

```typescript
import { formatDuration, formatRecordDate } from '../utils/history.utils';
// ...
const dateLabel = formatRecordDate(record.completedAt); // "06/03/2026 à 14:30"
const durationLabel = formatDuration(record.durationMs); // "2 min 05 s"
```

## 4. TDD — fonctions pures et hooks à tester en premier

Il n'y a pas de fonction pure nouvelle dans cette story — la logique est principalement dans les handlers de `GameDetailScreen`. Les tests sont donc de type "alongside" (écrits en même temps que le code).

Tests obligatoires pour `GameDetailScreen.test.tsx` :

| Cas | Description |
|-----|-------------|
| Chargement | Affiche un `ActivityIndicator` pendant `isLoading` |
| Record trouvé | Affiche le titre départ, titre destination, statut, sauts |
| Record non trouvé | Affiche "Partie introuvable" et bouton Retour |
| Bouton Retour | Appelle `navigation.goBack()` |
| Bouton Rejouer | Appelle `clearSession`, `startSession`, `navigation.navigate('Game', ...)` |
| Bouton Supprimer | Ouvre une Alert de confirmation |
| Confirmation suppression | Appelle `ScoreStorage.deleteRecord` puis `navigation.goBack()` |
| Tap article départ | Appelle `navigation.navigate('ArticleViewer', { url, title })` |

## 5. Critères de qualité (code review)

- [ ] `GameDetail` ajouté dans `RootStackParamList` avec type `{ recordId: string }`
- [ ] `GameDetailScreen` importé et enregistré dans `RootNavigator`
- [ ] `HistoryItem.onPress` branché dans `HistoryScreen` via `handleItemPress`
- [ ] Cas `record === null` géré après chargement (id introuvable)
- [ ] Suppression appelle `ScoreStorage.deleteRecord` directement (pas de dépendance à `useGameHistory`)
- [ ] `clearSession()` appelé avant `startSession()` dans le handler Rejouer
- [ ] `navigation.navigate` (pas `replace`) pour aller sur Game depuis GameDetail — le retour vers GameDetail doit rester dans le stack
- [ ] Zéro `any`
- [ ] `tsc --noEmit` passe
- [ ] `npm run lint` passe

## 6. Points de vigilance

- **`GameRecord` ne contient pas `path`** : ne pas tenter d'afficher le chemin des articles. Si ce critère est contesté en QA, escalader au PM — c'est une décision de périmètre, pas un bug.
- **`record.completedAt` est une string ISO 8601** dans `GameRecord` (pas un `Date`) — ne pas oublier `new Date(record.completedAt)` avant tout formatage horaire.
- **Gate device physique** : cette story modifie `HistoryScreen` (navigation) et touche le flux History → GameDetail → Game. La règle de gate device physique s'applique — Laurent doit confirmer dans la PR description qu'il a testé le chemin complet sur device physique.
- **Back gesture Android** : `navigation.goBack()` dans le header doit se comporter de la même façon que le geste de retour natif Android. Pas de surcharge nécessaire avec `native-stack`.
- **Concurrence** : si l'utilisateur supprime une entrée depuis `HistoryScreen` pendant qu'il est sur `GameDetailScreen` (impossible avec une navigation modale, mais en théorie possible si l'écran reste monté), le record peut être introuvable au rechargement. Déjà couvert par le guard `record === null`.
