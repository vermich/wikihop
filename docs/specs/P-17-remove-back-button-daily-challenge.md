# Spec technique — P-17 : Supprimer le bouton retour pendant le défi quotidien

## Contexte

Story : correctif UX Phase 4 Lot 1.

Pendant un défi quotidien, le bouton `← Retour` dans le header de `ArticleScreen`
permet à l'utilisateur de revenir à un article précédent. Ce comportement casse
l'intégrité du défi : le joueur peut reculer pour choisir un meilleur chemin, ce qui
n'est pas cohérent avec la nature "une seule tentative" du défi quotidien.

De plus, sur Android, le bouton hardware back se comporte comme en mode solo (retour
silencieux) alors qu'en mode défi, un retour accidentel devrait être confirmé.

## Périmètre

**Dans scope :**
- Masquer le bouton `← Retour` dans le header quand `isDailyChallenge === true`
- Intercepter le hardware back Android en mode défi et afficher une alerte de confirmation
- Ajouter les 4 nouvelles clés i18n dans les 8 fichiers de locale
- Tests alongside sur les deux branches (`isDailyChallenge true/false`)

**Hors scope :**
- Bouton "Abandonner" (en-tête droit) — comportement inchangé (alerte existante)
- Mode multijoueur — inchangé
- `handleGoBack` et `handleAbandon` — non modifiés
- `VictoryScreen`, `HomeScreen` — inchangés

## Diagramme d'état navigation

```
=== Stacks pendant ArticleScreen ===

Stack natif React Navigation :
  [Home] → [Game/ArticleScreen]   ← headerShown: false sur la route Game

Stack applicatif WikiHop (ref articleStack) :
  [articleTitle]                  ← stackSize = 1 (article initial)
  [articleTitle, article2]        ← stackSize = 2 (après 1 saut)
  [articleTitle, A2, A3…]         ← stackSize = N

=== Affordances de retour ===

1. Bouton retour header (← Retour)
   - Mode solo    : visible si stackSize > 1 → handleGoBack()
   - Mode défi    : JAMAIS visible (même si stackSize > 1) → placeholder

2. Hardware back Android (BackHandler)
   - Mode solo    : stackSize > 1 → handleGoBack() | stackSize = 1 → handleAbandon()
   - Mode défi    : TOUJOURS → handleDailyQuit() [alerte de confirmation]

3. Bouton Abandonner (header droit — inchangé dans les deux modes)
   - Tous modes   : handleAbandon() → alerte abandon existante

=== Interactions connues ===
- handleAbandon()     : alerte "Abandonner la partie ?" existante — INCHANGÉE
- handleGoBack()      : pop articleStack + rechargement WebView — INCHANGÉ
- handleDailyQuit()   : NOUVELLE alerte spécifique défi — délègue à handleAbandon()
                        sur confirmation "Quitter"
- isDailyChallenge    : sélecteur calculé depuis currentSession.isDailyChallenge
                        (game.store — booléen, false par défaut si session absente)
```

## Architecture des modifications

### Fichier : `apps/mobile/src/screens/ArticleScreen.tsx`

#### 1. Nouveau sélecteur store

Ajouter après les autres sélecteurs `useGameStore` (ligne ~103) :

```typescript
const isDailyChallenge = useGameStore(
  (state) => state.currentSession?.isDailyChallenge === true,
);
```

Utiliser `=== true` (pas `?? false`) pour satisfaire `exactOptionalPropertyTypes` :
`isDailyChallenge` est `boolean | undefined` dans `GameSession` — la comparaison stricte
garantit que `undefined` est traité comme `false` sans spread ni cast.

#### 2. Nouvelle fonction `handleDailyQuit`

Ajouter après `handleAbandon` et avant `handleGoBack` :

```typescript
const handleDailyQuit = useCallback((): void => {
  Alert.alert(
    t('article_screen.daily_quit_title'),
    t('article_screen.daily_quit_message'),
    [
      { text: t('article_screen.daily_quit_cancel'), style: 'cancel' },
      {
        text: t('article_screen.daily_quit_confirm'),
        style: 'destructive',
        onPress: () => { handleAbandon(); },
      },
    ],
  );
}, [t, handleAbandon]);
```

**Point de vigilance :** `handleDailyQuit` dépend de `handleAbandon` (qui contient la
logique d'abandon complète, y compris le mode multijoueur). Ne pas dupliquer la logique
d'abandon — déléguer systématiquement à `handleAbandon()`.

#### 3. BackHandler Android — modification du useEffect

Remplacer le handler existant (lignes ~341–357) :

**Avant :**
```typescript
const subscription = BackHandler.addEventListener(
  'hardwareBackPress',
  () => {
    if (stackSize > 1) {
      handleGoBack();
      return true;
    }
    handleAbandon();
    return true;
  },
);
```

**Après :**
```typescript
const subscription = BackHandler.addEventListener(
  'hardwareBackPress',
  () => {
    if (isDailyChallenge) {
      // Mode défi : confirmation requise — pas de retour silencieux
      handleDailyQuit();
      return true;
    }
    if (stackSize > 1) {
      handleGoBack();
      return true;
    }
    // Stack initial (article de départ) → proposer abandon
    handleAbandon();
    return true;
  },
);
```

Mettre à jour le tableau de dépendances du `useEffect` :

```typescript
// Avant :
}, [isFocused, stackSize, handleGoBack, handleAbandon]);

// Après :
}, [isFocused, stackSize, isDailyChallenge, handleGoBack, handleAbandon, handleDailyQuit]);
```

#### 4. Bouton retour header — modification de la condition

Remplacer la condition ternaire dans le JSX (lignes ~367–378) :

**Avant :**
```typescript
{stackSize > 1 ? (
  <TouchableOpacity
    style={styles.backButton}
    onPress={handleGoBack}
    accessibilityLabel="Retour à l'article précédent"
    accessibilityRole="button"
  >
    <Text style={styles.backButtonText}>{t('article_screen.back_button')}</Text>
  </TouchableOpacity>
) : (
  <View style={styles.backButtonPlaceholder} />
)}
```

**Après :**
```typescript
{stackSize > 1 && !isDailyChallenge ? (
  <TouchableOpacity
    style={styles.backButton}
    onPress={handleGoBack}
    accessibilityLabel="Retour à l'article précédent"
    accessibilityRole="button"
  >
    <Text style={styles.backButtonText}>{t('article_screen.back_button')}</Text>
  </TouchableOpacity>
) : (
  <View style={styles.backButtonPlaceholder} />
)}
```

**Note :** Le placeholder est rendu dans les deux cas négatifs (stackSize = 1 OU mode défi),
ce qui maintient l'alignement du header (titre centré, bouton abandon à droite).

#### 5. Mettre à jour le commentaire de la section header

Remplacer le commentaire JSX `{/* F3-34 : bouton retour conditionné sur stackSize > 1 */}`
par `{/* P-17 : bouton retour masqué si stackSize <= 1 ou mode défi quotidien */}`.

#### 6. Mettre à jour le commentaire de la section `BackHandler`

Ajouter une ligne dans le commentaire du `useEffect` BackHandler :
`// P-17 : mode défi → handleDailyQuit() (confirmation) au lieu de handleGoBack/handleAbandon`

### Fichiers i18n : 8 locales

Ajouter les 4 clés suivantes dans la section `"article_screen"` de chaque fichier de
locale dans `apps/mobile/src/i18n/locales/`.

#### `fr.json`
```json
"daily_quit_title": "Quitter le défi ?",
"daily_quit_message": "Si vous quittez maintenant, votre tentative quotidienne sera consommée.",
"daily_quit_cancel": "Continuer le défi",
"daily_quit_confirm": "Quitter"
```

#### `en.json`
```json
"daily_quit_title": "Quit the challenge?",
"daily_quit_message": "If you quit now, your daily attempt will be used up.",
"daily_quit_cancel": "Continue challenge",
"daily_quit_confirm": "Quit"
```

#### `es.json`
```json
"daily_quit_title": "¿Salir del desafío?",
"daily_quit_message": "Si sales ahora, tu intento diario será consumido.",
"daily_quit_cancel": "Continuar el desafío",
"daily_quit_confirm": "Salir"
```

#### `de.json`
```json
"daily_quit_title": "Challenge verlassen?",
"daily_quit_message": "Wenn du jetzt verlässt, wird dein täglicher Versuch verbraucht.",
"daily_quit_cancel": "Challenge fortsetzen",
"daily_quit_confirm": "Verlassen"
```

#### `pt.json`
```json
"daily_quit_title": "Sair do desafio?",
"daily_quit_message": "Se sair agora, a sua tentativa diária será consumida.",
"daily_quit_cancel": "Continuar o desafio",
"daily_quit_confirm": "Sair"
```

#### `it.json`
```json
"daily_quit_title": "Abbandonare la sfida?",
"daily_quit_message": "Se esci ora, il tuo tentativo giornaliero sarà consumato.",
"daily_quit_cancel": "Continua la sfida",
"daily_quit_confirm": "Esci"
```

#### `nl.json`
```json
"daily_quit_title": "Uitdaging verlaten?",
"daily_quit_message": "Als je nu verlaat, wordt je dagelijkse poging verbruikt.",
"daily_quit_cancel": "Doorgaan met uitdaging",
"daily_quit_confirm": "Verlaten"
```

#### `pl.json`
```json
"daily_quit_title": "Wyjść z wyzwania?",
"daily_quit_message": "Jeśli wyjdziesz teraz, twoja dzienna próba zostanie zużyta.",
"daily_quit_cancel": "Kontynuuj wyzwanie",
"daily_quit_confirm": "Wyjdź"
```

**Ordre d'insertion :** Ajouter les 4 clés après `"retry_button"` dans la section
`article_screen`, avant la fermeture de l'objet. Maintenir la cohérence de formatage
(2 espaces d'indentation, virgule après chaque entrée sauf la dernière du bloc).

## TDD — Fonctions pures et hooks à tester

`handleDailyQuit` n'est pas une fonction pure (elle appelle `Alert.alert`), donc pas de
TDD strict. Tests alongside pour le composant.

## Tests à écrire (tests alongside)

### Fichier : `apps/mobile/src/__tests__/ArticleScreen.test.tsx`

Ajouter dans le fichier de tests existant de `ArticleScreen` :

**Describe : "Bouton retour header — mode défi quotidien"**

**Cas 1 — Mode solo, stackSize > 1 : bouton visible**
- Monter `ArticleScreen` avec `isDailyChallenge: false` (ou `undefined`) et stack = 2
- Vérifier que le `TouchableOpacity` avec `accessibilityLabel="Retour à l'article précédent"` est rendu

**Cas 2 — Mode défi, stackSize > 1 : bouton masqué**
- Monter `ArticleScreen` avec `isDailyChallenge: true` et stack = 2
- Vérifier que le `TouchableOpacity` avec `accessibilityLabel="Retour à l'article précédent"` n'est PAS rendu
- Vérifier que le `View` placeholder est présent (alignement maintenu)

**Cas 3 — Mode solo, stackSize = 1 : placeholder (comportement existant, non régressé)**
- Monter avec `isDailyChallenge: false` et stack = 1
- Vérifier que le `TouchableOpacity` retour n'est pas rendu

**Describe : "BackHandler Android — mode défi quotidien"**

**Cas 4 — Mode défi : hardware back déclenche l'alerte `daily_quit_title`**
- Simuler `BackHandler.addEventListener` (mock existant dans le projet)
- Déclencher l'event `hardwareBackPress` avec `isDailyChallenge: true`
- Vérifier que `Alert.alert` est appelé avec le titre `'article_screen.daily_quit_title'`
- Vérifier que `handleGoBack` n'est PAS appelé

**Cas 5 — Mode solo, stackSize > 1 : hardware back appelle handleGoBack (non régressé)**
- Déclencher `hardwareBackPress` avec `isDailyChallenge: false`, `stackSize > 1`
- Vérifier que `handleGoBack` est appelé, pas `Alert.alert daily_quit`

**Note :** Les tests doivent mocker `useGameStore` pour exposer `isDailyChallenge`.
Utiliser le pattern de mock store existant dans les autres tests de l'écran.

## Points de vigilance

1. **Ordre des conditions BackHandler** : la vérification `isDailyChallenge` doit être
   **en premier** dans le handler, avant `stackSize > 1`. En mode défi avec stackSize > 1,
   on veut l'alerte (pas un retour silencieux).

2. **`handleDailyQuit` dans le tableau de dépendances** : `useCallback` avec `[t, handleAbandon]`.
   Ne pas omettre `handleAbandon` — il change si le mode multijoueur change.

3. **`isDailyChallenge` dans le tableau de dépendances du useEffect BackHandler** : sans cette
   dépendance, le handler capture la valeur stale de `isDailyChallenge` au premier rendu.

4. **Placeholder conservé** : ne pas supprimer le `View placeholder` — il assure le centrage
   du titre et l'alignement du bouton Abandonner (flexDirection row, 3 enfants).

5. **`currentSession?.isDailyChallenge === true`** : ne pas utiliser `?? false` qui crée un
   spread implicite interdit par `exactOptionalPropertyTypes`. La comparaison `=== true`
   est le pattern correct (voir point de vigilance #10 en mémoire).

6. **Gate device physique (CLAUDE.md)** : cette story touche la navigation et le flux de jeu.
   La story ne peut pas passer en `done` sans validation sur device physique par le Client.

## Critères de validation

- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur
- [ ] Bouton `← Retour` masqué en mode défi (même si `stackSize > 1`)
- [ ] Placeholder présent dans tous les cas où le bouton est masqué
- [ ] Hardware back Android en mode défi → alerte `daily_quit_title` (pas de retour silencieux)
- [ ] Hardware back Android en mode solo → comportement existant inchangé
- [ ] Bouton Abandonner (header droit) inchangé dans les deux modes
- [ ] 4 clés i18n ajoutées dans les 8 fichiers de locale
- [ ] `isDailyChallenge` et `handleDailyQuit` dans le tableau de dépendances du `useEffect` BackHandler
- [ ] Tests alongside couvrant les 5 cas listés ci-dessus
- [ ] Aucune régression sur le mode multijoueur
- [ ] Validation sur device physique par le Client (gate CLAUDE.md)
