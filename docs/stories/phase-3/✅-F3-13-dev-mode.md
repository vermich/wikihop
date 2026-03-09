---
id: F3-13
title: Mode développeur — toggle affichage de l'article cible
phase: 3-Features
priority: Could
agents: [Frontend Dev]
status: in-progress
created: 2026-03-01
completed:
---

# F3-13 — Mode développeur — toggle affichage de l'article cible

## User Story
En tant que développeur ou testeur de l'application, je veux pouvoir activer un mode développeur depuis l'écran d'accueil, afin de voir l'article cible en permanence pendant le jeu et tester des parcours spécifiques plus facilement.

## Critères d'acceptance
- [ ] Un toggle "Mode développeur" est accessible depuis la HomeScreen (discret, non proéminent pour les utilisateurs normaux)
- [ ] Quand le mode développeur est activé, un indicateur visuel persistant apparaît pendant le jeu (ex : bandeau ou badge) affichant le titre de l'article cible
- [ ] L'état du mode développeur (activé/désactivé) est mémorisé en AsyncStorage et restauré au prochain lancement
- [ ] Le mode développeur n'affecte pas les règles du jeu ni le calcul du score
- [ ] En mode développeur, un indicateur visible dans la HomeScreen signale que le mode est actif (ex : libellé coloré sous le toggle)
- [ ] Le toggle est désactivé par défaut à l'installation

## Notes de réalisation

**Note préliminaire du Tech Lead (2026-03-08) :** Les critères d'acceptance de la story spécifient une persistance AsyncStorage. Cette décision est retenue dans les specs ci-dessous car la story fait foi. La persistance garantit que le mode dev survit aux redémarrages de l'app en phase de test — ce qui est le besoin réel des testeurs.

---

### Spécifications techniques — Maxime (Tech Lead) — 2026-03-08

**Story concernée :** F3-13 — Mode développeur
**Fichiers à modifier :**
- `apps/mobile/src/store/game.store.ts` (ajout du slice devMode)
- `apps/mobile/src/screens/HomeScreen.tsx` (toggle discret)
- `apps/mobile/src/screens/ArticleScreen.tsx` (bandeau cible)

---

#### 1. Périmètre

**Dans scope :**
- Champ `isDevMode: boolean` dans `game.store.ts`
- Action `toggleDevMode(): Promise<void>`
- Hydratation depuis AsyncStorage au démarrage
- Toggle dans HomeScreen conditionné par `__DEV__`
- Bandeau dans ArticleScreen conditionné par `__DEV__ && isDevMode`

**Hors scope :**
- Store séparé pour le mode dev (intégré dans `game.store.ts`)
- UX complexe (tap long, menu caché) — toggle inline discret suffit pour Phase 3
- Modification des règles de jeu ou du calcul du score

---

#### 2. Ajout dans game.store.ts

**Clé AsyncStorage dédiée :**
```typescript
const DEV_MODE_STORAGE_KEY = '@wikihop/dev_mode';
```

**Extension de l'interface `GameSessionSlice` :**
```typescript
// ── État mode développeur ────────────────────────────────────────────────────
/** Actif uniquement pendant les sessions de développement/test. */
isDevMode: boolean;

// ── Actions mode développeur ─────────────────────────────────────────────────
/**
 * Bascule le mode développeur et persiste l'état dans AsyncStorage.
 * Ne fait rien si __DEV__ est false (build de production).
 */
toggleDevMode: () => Promise<void>;
```

**Valeur initiale :**
```typescript
isDevMode: false,
```

**Implémentation de toggleDevMode :**
```typescript
toggleDevMode: async (): Promise<void> => {
  // Guard production : ne jamais activer en build release
  if (!__DEV__) return;

  const next = !get().isDevMode;
  set({ isDevMode: next });

  try {
    await AsyncStorage.setItem(DEV_MODE_STORAGE_KEY, JSON.stringify(next));
  } catch (e: unknown) {
    console.error('[game.store] Erreur persistance dev_mode :', e);
  }
},
```

**Hydratation dans `hydrate()` :** Ajouter la lecture de `DEV_MODE_STORAGE_KEY` dans la fonction `hydrate` existante, **avant** le `set({ isHydrated: true })` final :

```typescript
// Lecture du mode dev (best-effort — ne bloque pas l'hydratation)
try {
  const rawDevMode = await AsyncStorage.getItem(DEV_MODE_STORAGE_KEY);
  if (rawDevMode !== null) {
    const parsed = JSON.parse(rawDevMode) as boolean;
    if (__DEV__ && parsed === true) {
      set({ isDevMode: true });
    }
  }
} catch {
  // Ignoré silencieusement — le mode dev n'est pas critique
}
```

**Point de vigilance :** Le guard `__DEV__ && parsed === true` garantit que même si une valeur `true` se trouve en AsyncStorage sur un build de production (résidu de dev), elle est ignorée.

---

#### 3. Toggle dans HomeScreen

Le toggle doit être **entièrement invisible en production**. La condition `__DEV__` est évaluée au compile time par Metro — le code est tree-shaked en build release.

**Position dans HomeScreen :** En bas du `ScrollView`, après les boutons secondaires existants, dans les deux états `loading` et `success` de `renderContent()`. Pas de style proéminent.

**Sélecteur store :**
```typescript
const isDevMode = useGameStore((s) => s.isDevMode);
const toggleDevMode = useGameStore((s) => s.toggleDevMode);
```

**JSX conditionnel :**
```typescript
{__DEV__ && (
  <View style={styles.devModeRow}>
    <Text style={styles.devModeLabel}>{'Mode dev'}</Text>
    <Switch
      value={isDevMode}
      onValueChange={() => { void toggleDevMode(); }}
      accessibilityLabel={isDevMode ? 'Mode développeur activé' : 'Mode développeur désactivé'}
      trackColor={{ false: '#CBD5E1', true: '#2563EB' }}
    />
  </View>
)}
{__DEV__ && isDevMode && (
  <Text style={styles.devModeActive}>{'MODE DEV ACTIF'}</Text>
)}
```

**Styles à ajouter dans HomeScreen (section StyleSheet) :**
```typescript
devModeRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 16,
  paddingVertical: 8,
  marginTop: 8,
  borderTopWidth: 1,
  borderTopColor: '#F1F5F9',
},
devModeLabel: {
  fontSize: 13,
  color: '#94A3B8',
},
devModeActive: {
  fontSize: 11,
  color: '#DC2626',
  textAlign: 'center',
  fontWeight: 'bold',
  letterSpacing: 1,
  marginBottom: 4,
},
```

**Import à ajouter dans HomeScreen :**
```typescript
import { Switch } from 'react-native';
```

---

#### 4. Bandeau dans ArticleScreen

Dans `ArticleScreen.tsx`, ajouter un bandeau discret sous le header custom, visible uniquement quand `__DEV__ && isDevMode === true`.

**Sélecteurs :**
```typescript
const isDevMode = useGameStore((s) => s.isDevMode);
const currentSession = useGameStore((s) => s.currentSession);
```

**JSX conditionnel (à placer immédiatement après le header custom, avant la WebView) :**
```typescript
{__DEV__ && isDevMode && currentSession !== null && (
  <View style={styles.devBanner}>
    <Text style={styles.devBannerText} numberOfLines={1}>
      {`CIBLE : ${currentSession.targetArticle.title}`}
    </Text>
  </View>
)}
```

**Styles à ajouter dans ArticleScreen :**
```typescript
devBanner: {
  backgroundColor: '#FEF9C3',   // jaune pâle
  borderBottomWidth: 1,
  borderBottomColor: '#FDE047',
  paddingHorizontal: 16,
  paddingVertical: 6,
},
devBannerText: {
  fontSize: 12,
  color: '#92400E',
  fontWeight: 'bold',
  letterSpacing: 0.5,
},
```

---

#### 5. Pas de TDD strict requis

La logique est triviale (`!get().isDevMode`). L'unique test utile serait de vérifier que `toggleDevMode` ne fait rien quand `__DEV__ === false` — difficile à mocker dans l'environnement Jest (constante Metro). Tests optionnels mais non bloquants pour la PR.

---

#### 6. Critères de qualité (code review)

- [ ] `__DEV__` présent sur CHAQUE condition d'affichage du toggle et du bandeau — aucun chemin ne laisse du code dev accessible en production
- [ ] Guard `if (!__DEV__) return` dans `toggleDevMode` en première ligne
- [ ] Hydratation du mode dev dans `hydrate()` avec guard `__DEV__ && parsed === true`
- [ ] `Switch` importé depuis `react-native` (pas de lib tierce)
- [ ] Sélecteur `isDevMode` dans les composants concernés (pas de prop drilling)
- [ ] `tsc --noEmit` passe sans erreur

---

#### 7. Points de vigilance

- **`__DEV__` est une constante globale React Native** injectée par Metro — pas besoin d'import. Elle vaut `true` en mode Expo dev client / simulator, `false` en build EAS release.
- **Tree-shaking Metro :** Le code dans les blocs `{__DEV__ && ...}` est éliminé des bundles release par Metro. Pas de risque d'exposition de la feature en production à condition que la condition soit directement sur `__DEV__` (pas sur une variable intermédiaire qui cacherait la valeur).
- **`Switch` natif vs composant custom :** Utiliser `Switch` de `react-native` — composant natif accessible, pas de dépendance externe. Le style du `Switch` est limité à `trackColor` et `thumbColor`.
- **Comportement du bandeau si la session est null :** Le guard `currentSession !== null` dans ArticleScreen est obligatoire — l'ArticleScreen peut être montée brièvement sans session (cas edge du guard de navigation).

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
