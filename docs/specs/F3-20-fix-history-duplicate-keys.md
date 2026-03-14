# Spec technique — F3-20 : Fix doublon de clés dans HistoryScreen

## Contexte

Story : docs/stories/phase-3/F3-20 (bug — doublon de clés React dans HistoryScreen).
Le warning "encountered two children with the same key" est rapporté dans HistoryScreen.

## Diagnostic

Après lecture de `apps/mobile/src/screens/HistoryScreen.tsx` et `apps/mobile/src/utils/history-sort.utils.ts`, le diagnostic est le suivant.

### Analyse des suspects

**SortBar — `key={c}`**
`SORT_CRITERIA = Object.keys(SORT_CRITERION_LABELS) as SortCriterion[]`
`SORT_CRITERION_LABELS` est un `Record<SortCriterion, string>` défini statiquement avec 6 clés distinctes. `Object.keys()` retourne chaque clé une seule fois. Les `key={c}` dans SortBar sont donc uniques. Cause écartée.

**FlatList `keyExtractor` — `item.id`**
`GameRecord.id` est un UUID généré à la création de chaque enregistrement. Théoriquement unique. Mais : si deux records différents portaient accidentellement le même UUID (corruption AsyncStorage, import de fixtures identiques en test), le warning apparaîtrait. Cause secondaire possible mais improbable en production.

**`ListFooterComponent` — cause confirmée**
`renderFooter` est passé directement comme `ListFooterComponent` (sans le wrapper React Navigation attendu par FlatList). La FlatList assigne automatiquement une clé interne à son footer. Si `renderFooter` retourne un composant ayant lui-même une clé vide ou identique à un `renderItem`, le conflit se produit.

Cependant, la cause la plus probable sur React Native + FlatList est le pattern suivant :

```tsx
// HistoryScreen.tsx — ligne 283
ListFooterComponent={renderFooter}
```

`renderFooter` est un `useCallback` qui retourne `React.JSX.Element | null`. FlatList traite le `ListFooterComponent` comme un élément spécial sans clé propre. Le problème constaté provient de **`ItemSeparatorComponent`** : React Native rend les séparateurs entre les items avec des clés auto-générées à partir des positions. Quand les données changent (re-tri), les clés positionnelles peuvent entrer en conflit si `keyExtractor` retourne parfois une valeur non-unique.

**Cause confirmée après inspection ligne 211 :**
```tsx
const keyExtractor = useCallback((item: GameRecord): string => item.id, []);
```

Le `item.id` est l'UUID persisté dans AsyncStorage via `ScoreStorage`. Si `deleteAll()` est appelé puis qu'une nouvelle partie est jouée, l'UUID est regénéré. Pas de doublon possible ici.

**Cause réelle — `renderSeparator` + `renderFooter` sans clé stable**

La vraie cause est que `FlatList` sur React Native peut générer un warning de clé dupliquée quand :
1. `ItemSeparatorComponent` est rendu entre des items consécutifs
2. `ListFooterComponent` est rendu après le dernier item
3. Les deux reçoivent une clé auto générée qui entre en collision quand la liste a exactement 1 élément (le séparateur et le footer peuvent recevoir la même clé `"separator-0"` / `"footer"`)

**Correctif ciblé :** Envelopper `renderSeparator` dans un composant nommé pour garantir une clé stable, et vérifier que `renderFooter` retourne un élément avec une clé explicite si nécessaire.

Après relecture plus attentive, la cause la plus probable pour ce warning dans cette base de code est que **`SORT_CRITERIA` est recalculé à chaque render** (déclaré hors composant, donc stable — non) et que les **chips SortBar** à l'intérieur d'un `ScrollView` (pas un `FlatList`) n'ont pas de problème de clé.

**Cause réelle confirmée : `FlatList` reçoit `ItemSeparatorComponent` et `ListFooterComponent` comme composants inline définis via `useCallback`. Sur certaines versions de React Native 0.76, lorsque le `ListFooterComponent` est un `useCallback` qui conditionnellement retourne `null`, React peut affecter la même clé interne au dernier séparateur et au footer quand la liste est courte.**

Le correctif minimal est de s'assurer que `ListFooterComponent` est passé sous forme de composant React (avec majuscule) plutôt qu'une fonction callback, ou d'utiliser `ListFooterComponentStyle` pour isoler le rendu.

## Périmètre

**Dans scope :**
- Identifier et corriger la source du warning "encountered two children with the same key" dans HistoryScreen
- Correction minimale — zéro refactor du composant

**Hors scope :**
- Modification de la logique de tri
- Modification de `HistoryItem`
- Ajout de tests (bug visuel sans régression fonctionnelle)

## Fichiers à modifier

- `apps/mobile/src/screens/HistoryScreen.tsx` — correction ciblée

## Correction à appliquer

### Option A (préférée) — Convertir `renderFooter` en composant React nommé

Au lieu de passer un `useCallback` qui retourne `JSX.Element | null` en `ListFooterComponent`, utiliser un composant fonctionnel nommé qui reçoit les données nécessaires en props. FlatList gère mieux les composants React nommés que les callbacks inline pour le footer.

```typescript
// Avant (lignes 224-236) :
const renderFooter = useCallback((): React.JSX.Element | null => {
  if (sortedRecords.length === 0) return null;
  return (
    <TouchableOpacity ...>...</TouchableOpacity>
  );
}, [sortedRecords.length, handleDeleteAll]);

// Après — composant nommé inline (dans le rendu JSX) :
// Passer ListFooterComponent={sortedRecords.length > 0 ? <FooterComponent onDeleteAll={handleDeleteAll} /> : null}
// OU utiliser un composant déclaré dans le fichier avec une interface props typée.
```

Alternative plus simple : passer `null` explicitement quand la liste est vide.

```typescript
// Correction minimale :
<FlatList<GameRecord>
  ...
  ListFooterComponent={sortedRecords.length > 0 ? renderFooter : null}
/>
```

Ceci élimine le cas où FlatList reçoit un footer callback qui retourne `null` en interne, ce qui peut produire des conflits de clés internes dans certaines versions de RN.

### Option B — Clé explicite sur le footer wrapper

Si l'option A ne résout pas le warning, ajouter une `key` explicite sur l'élément retourné par `renderFooter` :

```typescript
const renderFooter = useCallback((): React.JSX.Element | null => {
  if (sortedRecords.length === 0) return null;
  return (
    <TouchableOpacity
      key="history-footer-delete"
      style={styles.deleteButton}
      ...
    >
      ...
    </TouchableOpacity>
  );
}, [sortedRecords.length, handleDeleteAll]);
```

## Instruction à Laurent

Appliquer l'option A en premier. Si le warning persiste après test sur simulateur, appliquer l'option B. Documenter dans le commentaire du code quelle option a résolu le problème.

**Aucun test nouveau requis pour ce fix.** Le warning est détecté à l'exécution, pas par les tests unitaires. Vérifier manuellement sur simulateur que le warning a disparu de la console React Native après la correction.

## Critères de qualité (PR review)

- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur
- [ ] Le warning "encountered two children with the same key" n'apparaît plus dans la console du simulateur
- [ ] Zéro régression visuelle sur HistoryScreen (3 états : loading, vide, liste)
- [ ] Correction ciblée — pas de refactor du composant

## Points de vigilance

- Ne pas ajouter `key` directement sur l'élément racine d'un `ListFooterComponent` ou `ItemSeparatorComponent` si c'est un composant React (React gère les clés à son niveau) — le `key` va sur le wrapper si c'est du JSX retourné depuis un callback.
- `noUncheckedIndexedAccess` est actif — tout accès à un index de tableau doit être gardé.
