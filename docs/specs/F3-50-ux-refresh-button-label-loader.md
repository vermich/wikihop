# Spec technique — F3-50 : UX bouton "Changer articles" + loader dynamique

## 1. Contexte

Story : `docs/stories/phase-3/🔄-F3-50-ux-refresh-button-label-loader.md`

Le bouton de rechargement des articles se trouve dans la ligne basse (`bottomActionRow`) de `HomeScreen`. Il affiche actuellement une icône de rotation animée (`↺`) suivie du texte traduit via la clé `home.new_articles_button` (valeur FR : "Nouveaux articles").

**Modifications demandées** :
1. Renommer le libellé "Nouveaux articles" → "Changer articles" dans les 8 locales
2. Retirer l'icône de rotation statique/animée du rendu du bouton
3. Pendant `isLoading` : afficher un `ActivityIndicator` à la place du libellé texte
4. Désactiver le bouton (`disabled`) pendant le chargement (critère d'acceptance story)

**État actuel du bouton dans le rendu JSX** (présent dans les deux branches — `loading` et `success`) :

```typescript
<TouchableOpacity
  style={styles.bottomActionButton}
  onPress={refresh}
  disabled={isLoading}
  ...
>
  <Animated.Text style={{ transform: [{ rotate: rotateInterpolated }] }} accessible={false}>
    {'↺ '}
  </Animated.Text>
  <Text style={[styles.bottomActionButtonText, isLoading && styles.bottomActionButtonTextDisabled]} numberOfLines={2}>
    {t('home.new_articles_button')}
  </Text>
</TouchableOpacity>
```

L'`Animated.Text` avec la rotation et le `rotateAnim` associé (lignes 246–265) doivent être supprimés.

## 2. Périmètre

**Dans scope :**
- `apps/mobile/src/screens/HomeScreen.tsx`
- `apps/mobile/src/i18n/locales/*.json` (8 fichiers — FR, EN, ES, DE, PT, IT, NL, PL)

**Hors scope :**
- `useRandomPair` et la logique de `refresh` — inchangés
- Autres boutons du `bottomActionRow` — inchangés
- Tests de rendu du composant (pas de logique pure)

## 3. Architecture proposée

### 3.1 Mise à jour des fichiers i18n

Renommer la clé `home.new_articles_button` dans les 8 fichiers :

| Locale | Nouvelle valeur |
|--------|----------------|
| `fr.json` | `"Changer articles"` |
| `en.json` | `"Change articles"` |
| `es.json` | `"Cambiar artículos"` |
| `de.json` | `"Artikel wechseln"` |
| `pt.json` | `"Mudar artigos"` |
| `it.json` | `"Cambia articoli"` |
| `nl.json` | `"Artikelen wisselen"` |
| `pl.json` | `"Zmień artykuły"` |

**La clé reste `home.new_articles_button`** — seule la valeur change. Pas de renommage de clé (évite une erreur runtime si une clé manquante est tombée dans un cache).

### 3.2 Suppression de l'animation de rotation

Supprimer de `HomeScreen.tsx` :

1. `const rotateAnim = useRef(new Animated.Value(0)).current;` (ligne 215)
2. Le `useEffect` d'animation de rotation (lignes 246–265)
3. `const rotateInterpolated = rotateAnim.interpolate(...)` (ligne 392)
4. L'`Animated.Text` avec l'icône `↺` dans les deux occurrences du bouton (blocs `loading` et `success`)

**Vérification code mort** : après suppression, s'assurer qu'`Animated` n'est plus utilisé dans le fichier si `rotateAnim` était la seule utilisation. Sinon, `shimmerAnim` utilise encore `Animated` → conserver l'import.

### 3.3 Nouveau rendu du bouton

```typescript
// Import à ajouter : ActivityIndicator (depuis 'react-native')
import {
  // ...imports existants...
  ActivityIndicator,
} from 'react-native';

// Rendu du bouton "Changer articles"
<TouchableOpacity
  style={styles.bottomActionButton}
  onPress={refresh}
  disabled={isLoading}
  accessibilityLabel={t('home.refresh_a11y')}
  accessibilityRole="button"
  accessibilityState={{ disabled: isLoading }}
>
  {isLoading ? (
    <ActivityIndicator
      size="small"
      color="#2563EB"
      accessible={false}
    />
  ) : (
    <Text
      style={styles.bottomActionButtonText}
      numberOfLines={2}
    >
      {t('home.new_articles_button')}
    </Text>
  )}
</TouchableOpacity>
```

**Suppression de `styles.bottomActionButtonTextDisabled`** si uniquement utilisé pour ce bouton (vérifier les autres usages avant de supprimer — ne pas créer de code mort).

### 3.4 Gestion du double rendu (blocs loading / success)

Le bouton apparaît dans **deux** blocs de rendu dans `renderContent()` :
1. Bloc `loading` (SkeletonCards affiché)
2. Bloc `success` (ArticleCards affichés)

Les deux occurrences doivent être modifiées de manière identique.

## 4. TDD — fonctions pures et hooks à tester

Aucune nouvelle fonction pure ni hook. Les modifications sont purement de rendu et de traduction. Pas de nouveaux tests requis.

## 5. Critères de qualité (PR review)

- [ ] Clé `home.new_articles_button` mise à jour dans les 8 fichiers `*.json`
- [ ] `rotateAnim`, `rotateInterpolated`, l'`Animated.Text` `↺` et le `useEffect` d'animation rotation sont supprimés — zéro code mort résiduel
- [ ] `ActivityIndicator` visible pendant `isLoading === true` à la place du texte
- [ ] Texte visible pendant `isLoading === false`
- [ ] Bouton `disabled={isLoading}` — tap inactif pendant le chargement
- [ ] Les deux occurrences du bouton (blocs `loading` et `success`) sont modifiées de façon identique
- [ ] `Animated` toujours importé si `shimmerAnim` est encore utilisé — sinon supprimé
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur

## 6. Points de vigilance

- **Code mort** : `rotateAnim` est une `Animated.Value` définie avec `useRef`. Après suppression du `useEffect` et de `rotateInterpolated`, si `rotateAnim` lui-même n'est pas supprimé → code mort bloquant en review.
- **`bottomActionButtonTextDisabled`** : ce style était appliqué conditionnellement sur le texte (`isLoading && styles.bottomActionButtonTextDisabled`). Avec le nouveau pattern (ActivityIndicator vs Text), cette condition disparaît. Vérifier que ce style n'est pas utilisé ailleurs avant de le supprimer du `StyleSheet`.
- La clé `home.refresh_a11y` (accessibilityLabel du bouton) reste inchangée — elle est correcte.
- Le bouton dans le bloc `loading` a `disabled={true}` explicite (état initial). Avec le nouveau pattern, pendant le chargement des articles (`isLoading === true`) le bouton est aussi désactivé — comportement cohérent.
