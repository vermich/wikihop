---
id: M-06
title: Détection de victoire et écran de résultat
phase: 2-MVP
priority: Must
agents: [Frontend Dev, UX/UI]
status: done
created: 2026-02-28
completed: 2026-03-02
---

# M-06 — Détection de victoire et écran de résultat

## User Story
En tant que joueur, je veux être notifié immédiatement quand j'atteins la destination et voir mon score final, afin de ressentir la satisfaction d'avoir réussi.

## Critères d'acceptance
- [x] Quand le joueur navigue vers l'article destination, la victoire est détectée automatiquement
- [x] L'écran de victoire affiche : nombre de sauts, temps total, article de départ, article destination
- [x] Le chemin complet parcouru est affiché sous forme de liste ordonnée d'articles cliquables (chaque article ouvre la page Wikipedia dans une WebView externe)
- [x] Un bouton "Lire [titre de l'article cible]" ouvre l'article destination complet dans une WebView
- [x] Un bouton "Rejouer" lance une nouvelle partie avec la même paire d'articles (timer et compteur remis à zéro), sans retourner à l'accueil
- [x] Un bouton "Nouvelle partie" tire une nouvelle paire aléatoire et retourne à l'accueil
- [x] Un bouton "Retour" retourne à l'écran d'accueil sans démarrer de partie
- [x] L'animation de victoire est satisfaisante sans être excessive

## Notes de réalisation

### Contexte Wave 4

M-06 est le point de sortie du jeu. La Wave 3 a implémenté dans `ArticleScreen.handleLinkPress` un `Alert.alert` fallback de victoire (commentaire `// Phase 2 : Alert fallback`). La Wave 4 doit :

1. Ajouter la route `Victory` dans `RootNavigator.tsx` (fait en M-01 — prérequis)
2. Créer `VictoryScreen.tsx`
3. Remplacer le bloc `Alert.alert` fallback dans `ArticleScreen` par `navigation.navigate('Victory')`

M-06 peut être développé en parallèle de M-01 à condition que la route `Victory` soit ajoutée au navigateur en premier (modif commune spécifiée dans M-01).

---

### Localisation des fichiers

```
apps/mobile/src/screens/VictoryScreen.tsx         ← nouveau fichier
apps/mobile/src/screens/ArticleScreen.tsx          ← modification — remplacement fallback Alert
apps/mobile/src/navigation/RootNavigator.tsx       ← modification — déjà faite dans M-01
```

---

### Modification `ArticleScreen.tsx` — remplacement du fallback

Dans `handleLinkPress`, remplacer le bloc Alert de victoire actuel :

```typescript
// AVANT (fallback Phase 2 à supprimer) :
Alert.alert(
  'Bravo !',
  `Vous avez trouvé "${article.title}" en ${jumps + 1} saut${jumps + 1 <= 1 ? '' : 's'} !`,
  [{ text: 'OK' }],
);
return;

// APRES (Wave 4) :
navigation.navigate('Victory');
return;
```

Le `completeSession()` reste appelé **avant** `navigation.navigate('Victory')` — l'ordre est invariant. `VictoryScreen` lit la session complétée depuis le store (où `status === 'won'` et `completedAt` est défini).

**Point de vigilance :** `navigation.navigate('Victory')` (pas `push`) — on veut remplacer le stack courant de jeu. Après victoire, le bouton retour natif ne doit pas ramener sur l'article de destination mais sur Home. Ceci est géré par la logique de navigation dans VictoryScreen (voir ci-dessous).

---

### Composant `VictoryScreen`

**Props :** `NativeStackScreenProps<RootStackParamList, 'Victory'>`.

**Source des données :** exclusivement `useGameStore((state) => state.currentSession)`. Aucun paramètre de route. La session doit avoir `status === 'won'` quand l'écran se monte.

**Guard d'entrée :** si `currentSession === null` ou `currentSession.status !== 'won'` au montage (cas improbable mais défensif), rediriger immédiatement vers `Home` :

```typescript
useEffect(() => {
  if (currentSession === null || currentSession.status !== 'won') {
    navigation.replace('Home');
  }
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

`navigation.replace` est préférable à `navigate` ici — il évite d'empiler un Home sur un Victory incohérent.

---

### Calcul du temps affiché

Le temps écoulé est calculé depuis `currentSession.startedAt` et `currentSession.completedAt` (les deux sont des `Date` après désérialisation). Ne jamais utiliser `Date.now()` dans VictoryScreen — la session est déjà terminée.

```typescript
function computeElapsedSeconds(startedAt: Date, completedAt: Date): number {
  return Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000);
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0
    ? `${String(m)} min ${String(s).padStart(2, '0')} s`
    : `${String(s)} s`;
}
```

`completedAt` est `Date | undefined` sur le type `GameSession`. Utiliser un guard explicite avant d'appeler `computeElapsedSeconds` — ne pas utiliser `!` (non-null assertion interdite).

---

### Structure du layout

```
<SafeAreaView edges={['top', 'bottom']}>
  ├── Header : titre "Victoire !" (pas de bouton retour natif — headerShown: false)
  ├── Zone résultats :
  │   ├── Nombre de sauts : "{n} saut(s)"
  │   ├── Temps total : formaté via formatElapsed()
  │   ├── Article de départ (titre)
  │   └── Article de destination (titre)
  ├── Chemin parcouru (ScrollView) :
  │   └── Liste ordonnée d'articles (path[0] → path[n])
  │       Chaque item = titre + lien "Voir sur Wikipedia" (Linking.openURL)
  └── Boutons d'action (sticky en bas ou dans la zone de scroll)
      ├── "Lire [titre cible]"     → Linking.openURL(currentSession.targetArticle.url)
      ├── "Rejouer"                → relance avec la même paire (voir ci-dessous)
      ├── "Nouvelle partie"        → navigue vers Home + clearSession()
      └── "Retour"                 → navigue vers Home sans reset de session
```

---

### Interface TypeScript interne

```typescript
// VictoryScreen.tsx — types internes

/** Résumé des stats affichées — calculé une seule fois depuis currentSession */
interface VictoryStats {
  jumps: number;
  elapsedSeconds: number;
  startTitle: string;
  targetTitle: string;
  path: ReadonlyArray<{ title: string; url: string }>;
}
```

Calculer `VictoryStats` dans un `useMemo` pour éviter les recalculs inutiles.

---

### Liens Wikipedia dans le chemin parcouru

Chaque article du chemin parcouru est cliquable et ouvre l'URL Wikipedia dans le navigateur externe via `Linking.openURL`. Les articles du chemin sont des `Article` — ils possèdent un champ `url`.

```typescript
import { Linking } from 'react-native';

// Dans le rendu de chaque item de chemin :
<TouchableOpacity
  onPress={() => { void Linking.openURL(article.url); }}
  accessibilityLabel={`Voir l'article ${article.title} sur Wikipedia`}
  accessibilityRole="link"
>
  <Text>{article.title}</Text>
</TouchableOpacity>
```

Le bouton "Lire [titre cible]" utilise le même mécanisme avec `currentSession.targetArticle.url`.

---

### Action "Rejouer" — même paire, session remise à zéro

"Rejouer" relance une partie avec les mêmes `startArticle` et `targetArticle`, sans repasser par HomeScreen.

```typescript
const handleReplay = useCallback(async (): Promise<void> => {
  if (currentSession === null) return;

  // Capturer les articles avant clearSession (qui met currentSession à null)
  const startArticle: Article = {
    id: currentSession.startArticle.id,
    title: currentSession.startArticle.title,
    url: currentSession.startArticle.url,
    language: currentSession.startArticle.language,
  };
  const targetArticle: Article = {
    id: currentSession.targetArticle.id,
    title: currentSession.targetArticle.title,
    url: currentSession.targetArticle.url,
    language: currentSession.targetArticle.language,
  };

  // Effacer l'ancienne session puis démarrer la nouvelle
  await clearSession();
  await startSession(startArticle, targetArticle);

  // Remplacer Victory par Game dans le stack (pas de push — évite d'empiler)
  navigation.replace('Game', { articleTitle: startArticle.title });
}, [currentSession, clearSession, startSession, navigation]);
```

`navigation.replace` est obligatoire ici pour que le retour arrière depuis le jeu ramène sur `Home` et non sur `Victory`.

---

### Action "Nouvelle partie"

```typescript
const handleNewGame = useCallback((): void => {
  void clearSession();
  // navigate (pas replace) vers Home — Home recharge une nouvelle paire
  navigation.navigate('Home');
}, [clearSession, navigation]);
```

Après `clearSession()`, `HomeScreen` se remonte avec `currentSession === null` — la paire précédente reste affichée jusqu'à ce que l'utilisateur tape "Nouveaux articles" (comportement défini dans M-01).

---

### Action "Retour"

```typescript
const handleBack = useCallback((): void => {
  // Ne pas clearSession — la session reste en mémoire (status: 'won')
  // navigate vers Home : l'écran de détection de session résiduelle dans M-01
  // ne se déclenche que pour status 'in_progress', donc aucun dialog ne s'affiche
  navigation.navigate('Home');
}, [navigation]);
```

---

### Animation de victoire

En Phase 2 : une animation simple via `Animated.spring` sur le score (scale de 0.8 à 1.0) au montage de l'écran. Pas de confettis ni de lottie en Phase 2 — cela est réservé à Phase 3.

```typescript
const scaleAnim = useRef(new Animated.Value(0.8)).current;

useEffect(() => {
  Animated.spring(scaleAnim, {
    toValue: 1,
    useNativeDriver: true,
    friction: 5,
  }).start();
}, [scaleAnim]);
```

Appliquer l'animation sur le conteneur des stats (`Animated.View`).

---

### Flux de navigation complet Wave 4

```
HomeScreen
  └── [Jouer] startSession() → navigate('Game', { articleTitle: start.title })
        ArticleScreen (stack : Home → Game → Game → ...)
          └── [tap lien = target] completeSession() → navigate('Victory')
                VictoryScreen
                  ├── [Rejouer]       clearSession() + startSession() → replace('Game', ...)
                  │     ArticleScreen (stack : Home → Game)
                  ├── [Nouvelle partie] clearSession() → navigate('Home')
                  │     HomeScreen (même instance, reprend le focus)
                  └── [Retour]        navigate('Home')
                        HomeScreen (même instance, reprend le focus)
```

**Point critique :** après `navigate('Victory')` depuis `ArticleScreen`, le stack natif contient `[Home, Game, Game, ..., Victory]`. Les boutons "Nouvelle partie" et "Retour" utilisent `navigate('Home')` qui remet le focus sur l'instance `Home` existante sans empiler — le stack revient à `[Home]` visuellement.

---

### Critères de qualité (code review)

- [x] Guard d'entrée `status !== 'won'` → `navigation.replace('Home')` au montage
- [x] `completedAt` : guard explicite avant appel `computeElapsedSeconds` — pas de `!`
- [x] `noUncheckedIndexedAccess` : accès aux éléments de `path` défensifs
- [x] `handleReplay` : articles capturés avant `clearSession()` — pas d'accès à `currentSession` après
- [x] `navigation.replace` dans Rejouer (pas `push` ni `navigate`)
- [x] `navigation.navigate` dans Nouvelle partie et Retour (pas `replace`)
- [x] Liens Wikipedia : `Linking.openURL` — `void` devant l'appel (Promise non awaitable dans JSX)
- [x] `VictoryStats` calculé en `useMemo`
- [x] Zéro `any`
- [x] Export nommé `VictoryScreen`
- [x] `StyleSheet.create()` en bas du fichier
- [x] Tests : `formatElapsed()` et `computeElapsedSeconds()` (fonctions pures exportées séparément ou testées via le composant)

## Spécifications visuelles — Benjamin (UX/UI)

## Écran : VictoryScreen

### Objectif
Le joueur ressent la satisfaction de sa victoire, consulte ses stats et le chemin parcouru, puis choisit sa prochaine action (rejouer, nouvelle partie, lire l'article, ou retourner à l'accueil).

### Layout (ASCII)

**Vue complète — état default :**

```
┌─────────────────────────────────────┐  [FIXED - SafeAreaView top]
│                                     │
│           Victoire !                │  Titre centré, Bold 24px, #16A34A
│                                     │
├─────────────────────────────────────┤  Séparateur #E2E8F0, 1pt
│                                     │  [SCROLL - flex:1]
│                                     │
│  ┌─────────────────────────────┐    │  [Animated.View - scale spring]
│  │                             │    │
│  │   ✓   Félicitations !       │    │  Icône + message, Bold 18px, #16A34A
│  │                             │    │
│  │  ┌──────────┬────────────┐  │    │
│  │  │  5 sauts │   02:34    │  │    │  Stats côte à côte
│  │  │  Bold 28 │  Bold 28   │  │    │  (voir détail ci-dessous)
│  │  │  sauts   │  mm:ss     │  │    │
│  │  └──────────┴────────────┘  │    │
│  │                             │    │
│  │  Tour Eiffel  →  Louvre     │    │  Départ → Destination, 14px
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  ─────  Chemin parcouru  ─────      │  Titre section, Caption 13px, #64748B
│                                     │
│  1. Tour Eiffel              ↗      │  Article cliquable, 44pt hauteur min
│  2. Paris                    ↗      │
│  3. France                   ↗      │
│  4. Art                      ↗      │
│  5. Louvre                   ↗      │  Dernier = article destination
│                                     │
│  ─────────────────────────────      │  Séparateur #E2E8F0
│                                     │
│  ┌─────────────────────────────┐    │
│  │   Lire "Louvre"             │    │  Bouton secondaire avec icône ↗
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘  [FIXED - SafeAreaView bottom]
│  ┌───────────┐  ┌───────────┐       │
│  │  Rejouer  │  │  Nouvelle │       │  2 boutons côte à côte, 52pt hauteur
│  └───────────┘  │   partie  │       │
│                 └───────────┘       │
│           Retour                    │  Texte-bouton, 44pt hauteur
└─────────────────────────────────────┘
```

**Détail du bloc stats (zone animée) :**

```
┌───────────────────────────────────────┐
│                                       │
│    ✓   Félicitations !                │  Caption 13px, Bold, #16A34A
│                                       │
│  ┌─────────────────┬───────────────┐  │
│  │                 │               │  │
│  │      5          │    02:34      │  │  Chiffres Bold 32px, #1E293B
│  │    sauts        │    mm:ss      │  │  Labels Caption 11px, #64748B
│  │                 │               │  │
│  └─────────────────┴───────────────┘  │  Séparateur vertical #E2E8F0
│                                       │
│  Tour Eiffel   →   Leonardo da Vinci  │  Regular 14px, #64748B
│  (départ)              (destination)  │
│                                       │
└───────────────────────────────────────┘
  Fond #FFFFFF, bordure #E2E8F0 1pt, coins arrondis 16pt
  Ombrage : shadowOpacity: 0.08, shadowRadius: 8, elevation: 3
  L'ensemble est animé en scale spring (0.8 → 1.0) au montage
```

**Zone boutons fixes (sticky bottom) :**

```
┌─────────────────────────────────────┐  [FIXED - sticky bottom]
│  ┌─────────────────┐ ┌───────────┐  │
│  │    Rejouer      │ │ Nouvelle  │  │  Chacun flex:1, hauteur 52pt
│  └─────────────────┘ │  partie  │  │
│                      └───────────┘  │
│                                     │
│              Retour                 │  Hauteur 44pt, centré
│                                     │
└─────────────────────────────────────┘  Fond #FFFFFF, bordure top #E2E8F0 1pt
```

---

### Composants

**Header :**
- Titre "Victoire !" — Bold 24px, `#16A34A` (vert victoire). Centré. Padding vertical 20pt.
- Pas de bouton retour natif (`headerShown: false` — VictoryScreen gère son propre header).
- Séparateur bas `#E2E8F0`, 1pt.
- `accessibilityRole="header"` sur le titre.

**Bloc stats (Animated.View) :**
- Conteneur : fond `#FFFFFF`, bordure 1pt `#E2E8F0`, coins arrondis 16pt, ombrage léger (`shadowOpacity: 0.08, shadowRadius: 8, elevation: 3`). Margin horizontale 16pt.
- Animation spring au montage : scale `0.8 → 1.0`, `friction: 5`, `useNativeDriver: true`. S'applique sur le conteneur entier.
- Icône de validation : caractère `✓` ou Feather `check-circle`. Taille 20pt. Couleur `#16A34A`. À gauche du libellé "Félicitations !".
- Libellé "Félicitations !" — Bold 13px, `#16A34A`. Centré ou aligné à gauche avec l'icône.
- **Zone stats côte à côte** — `flexDirection: 'row'`, séparateur vertical 1pt `#E2E8F0` entre les deux cellules.
  - Cellule gauche : valeur sauts Bold 32px `#1E293B`, label "saut(s)" Caption 11px `#64748B`. Pluriel respecté.
  - Cellule droite : temps formaté Bold 32px `#1E293B`, label "durée" Caption 11px `#64748B`.
  - Chaque cellule : padding 16pt, `alignItems: 'center'`.
- Ligne départ → destination : Regular 14px, `#64748B`. Format : "[titre départ]  →  [titre destination]". `numberOfLines={1}`, `ellipsizeMode="middle"` si les deux titres ensemble dépassent la largeur. Centré.

**Titre section "Chemin parcouru" :**
- Caption 13px, Bold, `#64748B`, lettres capitales (`textTransform: 'uppercase'`, `letterSpacing: 1`).
- Flanqué de deux lignes horizontales fines `#E2E8F0` (style tirets ou trait continu). Margin verticale 16pt.

**Liste du chemin parcouru :**
- Chaque item : hauteur minimum 44pt (touchable), `flexDirection: 'row'`, padding vertical 10pt, padding horizontal 16pt.
- Numéro ordinal : Regular 14px, `#64748B`, `minWidth: 24pt`, `textAlign: 'right'`. Marge droite 12pt.
- Titre article : Regular 16px, `#1E293B`, `flex: 1`. `numberOfLines={1}`.
- Icône lien externe `↗` ou Feather `external-link` : 16pt, `#2563EB`. Marge gauche 8pt.
- Séparateur entre les items : `#F1F5F9` (gris très clair), 1pt, indenté (pas de bord à bord).
- Le dernier article (destination atteinte) : titre en Bold 16px `#16A34A` pour le mettre en valeur.
- `accessibilityLabel="Voir l'article [titre] sur Wikipedia"`, `accessibilityRole="link"`.

**Bouton "Lire [titre cible]" :**
- Bouton secondaire (outline) : hauteur 48pt, largeur 100% - 32pt (margin 16pt chaque côté).
- Fond transparent, bordure 1pt `#2563EB`, texte "Lire [titre cible]" Regular 16px `#2563EB`.
- Icône `↗` Feather `external-link` 16pt `#2563EB` à droite du texte.
- Titre tronqué à 20 caractères + "..." si trop long (pour éviter le débordement).
- Coins arrondis 8pt. Margin top 16pt, margin bottom 24pt.
- État pressed : fond `#EFF6FF` (bleu très clair).
- `accessibilityLabel="Lire l'article [titre complet] sur Wikipedia"`, `accessibilityRole="button"`.

**Bouton "Rejouer" :**
- Fond `#2563EB`, texte "Rejouer" Bold 16px `#FFFFFF`. Hauteur 52pt, `flex: 1`. Coins arrondis 12pt. Margin droite 8pt.
- État pressed : fond `#1D4ED8`.
- `accessibilityLabel="Rejouer avec les mêmes articles"`, `accessibilityRole="button"`.

**Bouton "Nouvelle partie" :**
- Fond `#FFFFFF`, texte "Nouvelle partie" Bold 16px `#2563EB`. Bordure 1pt `#2563EB`. Hauteur 52pt, `flex: 1`. Coins arrondis 12pt. Margin gauche 8pt.
- État pressed : fond `#EFF6FF`.
- `accessibilityLabel="Démarrer une nouvelle partie"`, `accessibilityRole="button"`.

**Bouton "Retour" :**
- Texte seul "Retour" Regular 16px `#64748B`. Hauteur 44pt, centré. Pas de fond ni de bordure.
- État pressed : `#1E293B`.
- `accessibilityLabel="Retourner à l'accueil"`, `accessibilityRole="button"`.

**Zone boutons sticky :**
- Fond `#FFFFFF`, bordure top `#E2E8F0` 1pt. Padding horizontal 16pt. Padding top 12pt.
- Incluse dans la `SafeAreaView` (`edges={['bottom']}`) pour absorber le home indicator.
- Les deux boutons principaux (Rejouer + Nouvelle partie) sont sur la même ligne avec `flexDirection: 'row'`.
- Bouton Retour centré en dessous, margin top 8pt, margin bottom 4pt.

---

### États

**Default :**
Layout complet décrit ci-dessus. Animation spring au montage du bloc stats.

**Loading :**
Non applicable — `VictoryScreen` se monte uniquement quand la session est `won` (données déjà disponibles dans le store). Pas d'état loading à designer. Le guard d'entrée (`status !== 'won'` → redirect Home) gère le seul cas dégradé.

**Error (session corrompue) :**
Géré par le guard technique (redirect vers Home). Pas d'état erreur visuel à afficher — l'utilisateur atterrit sur Home. Aucun design spécifique requis.

**Empty :**
Non applicable — même logique que l'état error.

---

### Accessibilité

- [x] `accessibilityRole="header"` sur le titre "Victoire !"
- [x] Annonce VoiceOver au montage : `AccessibilityInfo.announceForAccessibility("Victoire ! [N] sauts en [mm:ss]. De [départ] à [destination].")`. Déclencher via `useEffect` au premier rendu.
- [x] Bloc stats : `accessibilityLabel="[N] saut(s) effectué(s) en [mm:ss]. De [départ] vers [destination]."` sur le conteneur Animated.View. Les sous-éléments (chiffres, labels) ont `accessible={false}` pour éviter la double lecture.
- [x] Liste chemin parcouru : chaque item `accessibilityLabel="[numéro]. [titre article]. Voir sur Wikipedia"`, `accessibilityRole="link"`.
- [x] Dernier item du chemin (destination) : `accessibilityLabel="[numéro]. [titre article], article de destination. Voir sur Wikipedia"`.
- [x] `accessibilityLabel="Lire l'article [titre complet] sur Wikipedia"` sur le bouton "Lire".
- [x] `accessibilityLabel="Rejouer avec les mêmes articles"` sur Rejouer.
- [x] `accessibilityLabel="Démarrer une nouvelle partie"` sur Nouvelle partie.
- [x] `accessibilityLabel="Retourner à l'accueil"` sur Retour.
- [x] Contraste : titre vert `#16A34A` sur `#FFFFFF` : ~4.6:1 (passe AA). Vérifier sur fond `#FFFFFF` uniquement — ne jamais mettre ce vert sur un fond coloré. Texte `#64748B` sur `#FFFFFF` : ~4.6:1. Texte blanc sur `#2563EB` : ~5.9:1.
- [x] Zones tactiles : tous les boutons ≥ 44pt de hauteur. Items de liste ≥ 44pt.
- [x] Navigation VoiceOver : ordre logique haut → bas. La zone sticky bottom est lue en dernier dans l'ordre naturel de la page.
- [x] L'animation spring n'active pas de mouvement excessif : `Animated.spring` scale 0.8→1.0 est dans le seuil acceptable. Si `prefers-reduced-motion` est actif sur l'appareil, React Native ne fournit pas d'API native pour le détecter — Laurent peut utiliser `AccessibilityInfo.isReduceMotionEnabled()` pour désactiver l'animation et afficher directement le scale à 1.0.

---

### Notes pour Laurent

- La zone sticky bottom (les 3 boutons) doit être hors du `ScrollView`. Structure recommandée : `SafeAreaView` > `[Header]` + `[ScrollView flex:1]` + `[zone boutons sticky]`. Ne pas mettre les boutons dans le ScrollView.
- Le ScrollView doit avoir `contentContainerStyle={{ paddingBottom: 16 }}` pour que le dernier élément du chemin ne soit pas masqué par la zone sticky.
- La liste des articles du chemin est dans le ScrollView — pas de `FlatList` pour cette liste (elle ne dépassera jamais quelques dizaines d'éléments en MVP). Un `View` avec `map()` suffit.
- L'animation spring s'applique sur le bloc stats entier via `Animated.View`. Pas besoin d'animer chaque chiffre séparément.
- Le titre cible dans le bouton "Lire [titre cible]" : tronquer à 20 caractères en JS avant de construire le libellé : `title.length > 20 ? title.slice(0, 20) + '…' : title`. L'`accessibilityLabel` utilise toujours le titre complet.
- Placeholder bouton partage (Phase 3) : la story mentionne un placeholder. Ne pas le désigner en Phase 2 — aucun élément visuel à ajouter pour l'instant. Le bouton sera inséré dans la zone sticky bottom lors de son implémentation Phase 3.
- Le vert victoire `#16A34A` est introduit dans cette story comme token sémantique spécifique à l'état de victoire. Il est valide sur fond blanc uniquement (contraste 4.6:1). Ne pas l'utiliser dans d'autres contextes sans décision design explicite.

---

## Validation QA — Halim

**Date** : 2026-03-02
**Testeur** : Halim
**Statut** : Validé

### Tests automatisés
- npm test (VictoryScreen, computeElapsedSeconds, formatElapsed) : 28 tests passants, 0 échec
- tsc --noEmit : sans erreur
- npm run lint : 0 erreur

### Observations
- Remplacement du fallback Alert.alert dans ArticleScreen.handleLinkPress : navigation.navigate('Victory') correctement en place.
- Guard d'entrée (status !== 'won' → replace('Home')) : vérifié en test.
- handleReplay : capture des articles AVANT clearSession — conforme à la spec, pas de race condition.
- navigation.replace dans Rejouer, navigation.navigate dans Nouvelle partie et Retour : conforme.
- clearSummaryCache() appelé dans handleNewGame : nettoyage correct du cache Wikipedia.
- AccessibilityInfo.isReduceMotionEnabled() : implémenté et testé.

## Statut
pending → in-progress → done
