---
id: M-01
title: Écran d'accueil — affichage départ et destination
phase: 2-MVP
priority: Must
agents: [Frontend Dev, UX/UI, Backend Dev]
status: done
created: 2026-02-28
completed: 2026-03-02
---

# M-01 — Écran d'accueil — affichage départ et destination

## User Story
En tant que joueur, je veux voir clairement les articles de départ et de destination au lancement d'une partie, afin de comprendre immédiatement mon objectif.

## Critères d'acceptance
- [x] L'écran affiche le titre de l'article de départ et de l'article destination
- [x] Un extrait (résumé Wikipedia) de chaque article est affiché
- [x] Un bouton "Jouer" démarre la partie
- [x] Un bouton "Nouvelles articles" tire une nouvelle paire aléatoire
- [x] Le chargement d'une paire affiche un indicateur visuel (spinner)
- [x] En cas d'erreur de chargement, un message clair est affiché avec un bouton de retry
- [x] Le design est conforme aux maquettes UX/UI validées

## Notes de réalisation

### Contexte Wave 4

M-01 remplace intégralement le placeholder Phase 1 (`HomeScreen.tsx` — actuellement un écran "Coming soon"). C'est le point d'entrée du jeu : l'écran charge une paire d'articles depuis le backend, l'affiche à l'utilisateur, puis démarre la session et navigue vers `ArticleScreen` au tap sur "Jouer".

M-01 doit être livré **avant** M-06 (VictoryScreen), car M-06 nécessite la route `Victory` dans le navigateur qui est spécifiée ici. En revanche, M-01 peut être développé en parallèle de M-06 si le navigateur est étendu en premier.

---

### Localisation des fichiers

```
apps/mobile/src/screens/HomeScreen.tsx          ← remplacement total du placeholder
apps/mobile/src/hooks/useRandomPair.ts           ← nouveau hook (fetch + état)
apps/mobile/src/navigation/RootNavigator.tsx     ← ajout route Victory
```

---

### Extension du navigateur — nouvelle route `Victory`

Avant tout développement de M-01 et M-06, le navigateur doit être étendu avec la route `Victory`. Modifier `RootNavigator.tsx` :

```typescript
// Ajout dans RootStackParamList
export type RootStackParamList = {
  Home: undefined;
  Game: { articleTitle: string };
  /**
   * Route Victory : écran de résultat après une partie gagnée.
   * La session complétée est lue depuis useGameStore (currentSession).
   * Aucun paramètre de navigation — les données viennent du store.
   */
  Victory: undefined;
};
```

Ajouter le `Stack.Screen` correspondant dans `RootNavigator.tsx` :

```typescript
<Stack.Screen
  name="Victory"
  component={VictoryScreen}
  options={{ headerShown: false }}
/>
```

`headerShown: false` est obligatoire — VictoryScreen gère son propre header (SafeAreaView).

---

### Hook `useRandomPair`

Ce hook encapsule l'appel au backend et l'état de chargement. Il doit être dans un fichier dédié, pas inline dans le composant.

**Interface attendue :**

```typescript
// apps/mobile/src/hooks/useRandomPair.ts

type RandomPairState =
  | { status: 'loading' }
  | { status: 'success'; start: ArticleSummary; target: ArticleSummary }
  | { status: 'error'; message: string };

interface UseRandomPairReturn {
  state: RandomPairState;
  /** Recharge une nouvelle paire depuis le backend */
  refresh: () => void;
}

export function useRandomPair(): UseRandomPairReturn;
```

**Comportement attendu :**

1. Au montage, déclenche immédiatement le fetch. Pendant le fetch : `status: 'loading'`.
2. En cas de succès (HTTP 200) : `status: 'success'` avec `start` et `target`.
3. En cas d'erreur (HTTP 503, timeout, réseau indisponible) : `status: 'error'` avec un `message` lisible par l'utilisateur en français.
4. `refresh()` repasse le state à `'loading'` et relance le fetch — utilisé par le bouton "Nouveaux articles".
5. Pattern annulation : `useEffect` avec `AbortController`. Le signal doit être passé au `fetch`. Si le composant est démonté pendant le fetch, ignorer la réponse (`let cancelled = false` + vérification avant `setState`).
6. L'URL du backend est construite avec la langue courante lue depuis `useLanguageStore` :
   ```
   GET http://localhost:3000/api/game/random-pair?lang=fr
   ```
   En production (EAS Build), l'URL de base sera injectée via une variable d'environnement — en Phase 2, `localhost:3000` est acceptable pour le développement local.

**Gestion du 503 :**

```typescript
if (response.status === 503) {
  setState({ status: 'error', message: 'Service temporairement indisponible. Réessayez dans quelques instants.' });
  return;
}
if (!response.ok) {
  setState({ status: 'error', message: 'Erreur lors du chargement. Vérifiez votre connexion.' });
  return;
}
```

**Type de la réponse backend :**

```typescript
// Correspond au RandomPairResponse de game.route.ts
interface RandomPairApiResponse {
  start: ArticleSummary;
  target: ArticleSummary;
}
```

`ArticleSummary` est importé depuis `@wikihop/shared`.

---

### Composant `HomeScreen`

**Props :** `NativeStackScreenProps<RootStackParamList, 'Home'>` (même pattern qu'`ArticleScreen`).

**Structure du layout :**

```
<SafeAreaView edges={['top', 'bottom']}>
  ├── Header fixe : titre "WikiHop" centré
  ├── Zone centrale (flex:1, justifyContent:'center') :
  │   ├── [loading] ActivityIndicator
  │   ├── [error]   Message d'erreur + bouton "Réessayer"
  │   └── [success] Cartes départ + destination + boutons
  └── (pas de footer — les boutons sont dans la zone centrale)
</SafeAreaView>
```

**Rendu en état `success` :**

Deux cartes d'articles côte à côte ou en colonne (décision UX/UI — Benjamin). Chaque carte affiche :
- Label contextuel : "Départ" ou "Destination" (couleur distincte)
- Titre de l'article (bold)
- Extrait (`extract`) tronqué à 3 lignes (`numberOfLines={3}`)
- Image thumbnail si `thumbnailUrl` est présent (`Image` RN standard, `resizeMode='cover'`)

**Boutons :**

```typescript
// Bouton principal — démarre la partie
<TouchableOpacity
  onPress={handlePlay}
  accessibilityLabel="Jouer"
  accessibilityRole="button"
>
  <Text>Jouer</Text>
</TouchableOpacity>

// Bouton secondaire — tire une nouvelle paire
<TouchableOpacity
  onPress={refresh}
  accessibilityLabel="Tirer de nouveaux articles"
  accessibilityRole="button"
  disabled={state.status === 'loading'}
>
  <Text>Nouveaux articles</Text>
</TouchableOpacity>
```

**Handler `handlePlay` :**

```typescript
const handlePlay = useCallback(async (): Promise<void> => {
  if (state.status !== 'success') return;

  // Vérification de session résiduelle (voir Points de vigilance)
  await clearSession();

  // Convertir ArticleSummary → Article (on ne garde que les champs Article)
  const startArticle: Article = {
    id: state.start.id,
    title: state.start.title,
    url: state.start.url,
    language: state.start.language,
  };
  const targetArticle: Article = {
    id: state.target.id,
    title: state.target.title,
    url: state.target.url,
    language: state.target.language,
  };

  await startSession(startArticle, targetArticle);

  // Navigation vers le premier article — push impossible depuis Home (pas de stack précédent)
  // On utilise navigate ici car Home est la racine du stack
  navigation.navigate('Game', { articleTitle: startArticle.title });
}, [state, clearSession, startSession, navigation]);
```

**Imports du store nécessaires :**

```typescript
const startSession = useGameStore((state) => state.startSession);
const clearSession = useGameStore((state) => state.clearSession);
const isHydrated = useGameStore((state) => state.isHydrated);
```

---

### Gestion de la session résiduelle au démarrage

**Problème :** si l'application est tuée en pleine partie, AsyncStorage contient une session avec `status: 'in_progress'`. Quand l'app redémarre, `hydrate()` (appelée dans `App.tsx`) restaure cette session dans le store. Quand `HomeScreen` se monte, `currentSession` est non-null avec `status: 'in_progress'`.

**Comportement attendu :**

Au montage de `HomeScreen`, si une session `in_progress` est détectée **après** que `isHydrated === true`, présenter un dialog de choix :
- "Reprendre la partie" → naviguer vers `Game` avec `{ articleTitle: currentSession.path[currentSession.path.length - 1]?.title ?? currentSession.startArticle.title }`
- "Nouvelle partie" → `clearSession()` puis charger une nouvelle paire normalement

Ce dialog est déclenché **une seule fois** au montage (via `useEffect` conditionnel). Utiliser `Alert.alert` avec deux boutons (pas de composant modal custom en Phase 2).

**Implémentation suggérée :**

```typescript
const currentSession = useGameStore((state) => state.currentSession);
const isHydrated = useGameStore((state) => state.isHydrated);

useEffect(() => {
  if (!isHydrated) return;
  if (currentSession?.status !== 'in_progress') return;

  const lastTitle =
    currentSession.path[currentSession.path.length - 1]?.title
    ?? currentSession.startArticle.title;

  Alert.alert(
    'Partie en cours',
    `Tu as une partie en cours vers "${currentSession.targetArticle.title}". Veux-tu la reprendre ?`,
    [
      {
        text: 'Reprendre',
        onPress: () => { navigation.navigate('Game', { articleTitle: lastTitle }); },
      },
      {
        text: 'Nouvelle partie',
        style: 'destructive',
        onPress: () => { void clearSession(); },
      },
    ],
  );
}, [isHydrated]); // eslint-disable-line react-hooks/exhaustive-deps
// Intentionnellement limité à isHydrated pour ne déclencher qu'une fois
```

**Point de vigilance `noUncheckedIndexedAccess` :** `currentSession.path[currentSession.path.length - 1]` retourne `Article | undefined` — le `?.title ?? currentSession.startArticle.title` est obligatoire.

---

### Comportement au retour depuis VictoryScreen

Quand l'utilisateur tape "Nouvelle partie" depuis `VictoryScreen`, il est redirigé vers `Home` via `navigation.navigate('Home')`. À ce moment, `HomeScreen` est déjà monté dans le stack — il reprend le focus via `useIsFocused`. La paire précédente reste affichée jusqu'à ce que l'utilisateur tape "Nouveaux articles" ou que le composant lance un refresh automatique.

**Décision :** ne pas rafraîchir automatiquement la paire au retour sur Home. L'utilisateur décide explicitement. La paire affichée après retour de VictoryScreen peut être la même que la partie qui vient d'être jouée — c'est acceptable en Phase 2.

---

### Critères de qualité (code review)

- [x] `useRandomPair` dans un fichier dédié `hooks/useRandomPair.ts` (pas inline dans le composant)
- [x] `AbortController` avec `cancelled` flag dans `useEffect` — pas de `setState` après démontage
- [x] `handlePlay` : `clearSession()` appelé avant `startSession()` — pas de session orpheline
- [x] `isHydrated` vérifié avant toute logique de session résiduelle
- [x] `noUncheckedIndexedAccess` : `path[path.length - 1]` défensif
- [x] `ArticleSummary → Article` : construction explicite sans spread (les champs `extract` et `thumbnailUrl` ne font pas partie d'`Article`)
- [x] Zéro `any`
- [x] Export nommé `HomeScreen` (pas de default export)
- [x] `StyleSheet.create()` en bas du fichier
- [x] Tests : `useRandomPair` — cas succès, cas erreur réseau, cas 503, comportement `refresh()`

## Spécifications visuelles — Benjamin (UX/UI)

## Écran : HomeScreen

### Objectif
Le joueur voit immédiatement ses deux articles (départ et destination), comprend le défi, et peut lancer la partie ou en tirer une nouvelle.

### Layout (ASCII)

**État success — vue complète :**

```
┌─────────────────────────────────────┐  [FIXED - SafeAreaView top]
│                                     │
│           W i k i H o p             │  Titre centré, Bold 24px, #1E293B
│                                     │
│                    [ FR | EN ]      │  Sélecteur langue, en haut à droite
├─────────────────────────────────────┤  Séparateur #E2E8F0, 1pt
│                                     │  [SCROLL - flex:1]
│                                     │
│  ┌─────────────────────────────┐    │
│  │  DÉPART                     │    │  Label "DÉPART" — Caption 13px
│  │  ─────────────────────────  │    │
│  │  [thumbnail 80×80pt]        │    │  Image à gauche, texte à droite
│  │                             │    │
│  │  Titre article              │    │  Bold 18px, #1E293B, 2 lignes max
│  │  Extrait de l'article sur   │    │  Regular 14px, #64748B, 3 lignes max
│  │  trois lignes maximum...    │    │
│  └─────────────────────────────┘    │
│                                     │
│            ↓  vers                  │  Flèche indicative, #2563EB, 20px
│                                     │
│  ┌─────────────────────────────┐    │
│  │  DESTINATION                │    │  Label "DESTINATION" — Caption 13px
│  │  ─────────────────────────  │    │
│  │  [thumbnail 80×80pt]        │    │
│  │                             │    │
│  │  Titre article              │    │  Bold 18px, #1E293B, 2 lignes max
│  │  Extrait de l'article sur   │    │  Regular 14px, #64748B, 3 lignes max
│  │  trois lignes maximum...    │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │           Jouer             │    │  Bouton primaire, hauteur 52pt
│  └─────────────────────────────┘    │
│                                     │
│       Nouveaux articles    ↺        │  Bouton secondaire, hauteur 44pt
│                                     │
└─────────────────────────────────────┘  [FIXED - SafeAreaView bottom]
```

**Proportions indicatives sur iPhone 14 (844pt) :**
- SafeAreaView top : ~59pt
- Header WikiHop : 64pt (titre + marge verticale)
- Carte Départ : ~140pt (thumbnail + texte + padding)
- Flèche inter-carte : 36pt
- Carte Destination : ~140pt
- Bouton Jouer : 52pt + marges 16pt
- Bouton Nouveaux articles : 44pt + marge bas 24pt
- SafeAreaView bottom : ~34pt

---

### Composants

**Header :**
- Titre "WikiHop" — Bold 24px, `#1E293B`, centré horizontalement. Padding vertical 20pt (10pt haut, 10pt bas).
- Séparateur bas — `#E2E8F0`, 1pt. Pas de shadow (cohérence avec Game screen header).
- Hauteur totale du header : 64pt (titre + marges).

**Sélecteur de langue FR/EN :**
- Positionné dans le header, aligné à droite (16pt du bord). Même ligne que le titre, ou 8pt sous le titre — position exacte à la discrétion de Laurent selon le rendu natif.
- Deux options : "FR" et "EN" — Regular 13px. Option active : `#2563EB`, Bold. Option inactive : `#64748B`, Regular.
- Séparateur vertical "|" entre les deux options — `#E2E8F0`.
- Zone de tap de chaque option : minimum 44×44pt (padding horizontal au besoin).
- `accessibilityLabel="Langue française"` / `accessibilityLabel="Langue anglaise"`. Option active : `accessibilityState={{ selected: true }}`.

**ArticleCard (composant réutilisé pour départ et destination) :**
- Fond : `#FFFFFF`. Bordure : 1pt `#E2E8F0`. Coins arrondis : 12pt.
- Ombrage léger : `shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2`. C'est le seul écran où on utilise une légère élévation — justifié par la nature "carte à choisir" du contenu (pas en mode lecture).
- Padding interne : 16pt sur tous les côtés.
- Layout interne : ligne horizontale — thumbnail à gauche + bloc texte à droite.
- **Thumbnail** : 80×80pt, coins arrondis 8pt, `resizeMode="cover"`. Si `thumbnailUrl` absent : placeholder rectangulaire `#F1F5F9` (gris très clair) avec icône document centré `#CBD5E1` (24pt).
- **Label contextuel** ("DÉPART" ou "DESTINATION") : Caption 11px, Bold, `letter-spacing: 1pt` (toutes capitales via `textTransform: 'uppercase'`). Couleur distincte : DÉPART → `#64748B`, DESTINATION → `#2563EB`. Affiché au-dessus du titre. Séparateur horizontal fin `#E2E8F0` (1pt) entre le label et le titre.
- **Titre** : Bold 18px, `#1E293B`, `numberOfLines={2}`, `ellipsizeMode="tail"`. Marge haut : 4pt après le séparateur.
- **Extrait** : Regular 14px, `#64748B`, `numberOfLines={3}`, `ellipsizeMode="tail"`. Marge haut : 6pt.
- Le bloc texte (label + titre + extrait) prend `flex: 1`. Marge gauche du bloc : 12pt après le thumbnail.
- La carte n'est PAS interactive (pas de `onPress`) — elle est purement affichage. Toute l'action passe par les boutons Jouer et Nouveaux articles.

**Flèche inter-carte :**
- Caractère `↓` ou icône flèche vers le bas (Feather: `arrow-down`). Couleur `#2563EB`. Taille 20pt.
- Centré horizontalement. Marges : 12pt au-dessus et en dessous.
- Texte "vers" en Regular 11px `#64748B` à droite de la flèche (optionnel — si trop verbeux, la flèche seule suffit).
- Non interactive — `accessible={false}`.

**Bouton "Jouer" :**
- Hauteur 52pt, largeur 100% de la zone contenu (16pt margin horizontale de chaque côté).
- Fond `#2563EB`, texte "Jouer" Bold 18px blanc (`#FFFFFF`), centré.
- Coins arrondis 12pt.
- État pressed : fond `#1D4ED8` (bleu foncé — 1 ton plus sombre).
- État disabled (quand `state.status !== 'success'`) : fond `#E2E8F0`, texte `#94A3B8`. Non pressable.
- `accessibilityLabel="Jouer"`, `accessibilityRole="button"`, `accessibilityState={{ disabled: ... }}`.

**Bouton "Nouveaux articles" :**
- Hauteur 44pt, largeur auto (centré, padding horizontal 24pt).
- Fond transparent, texte "Nouveaux articles" Regular 16px `#2563EB`.
- Icône `↺` ou Feather `refresh-cw` à droite du texte, 16pt, `#2563EB`.
- État pressed : texte et icône `#1D4ED8`.
- État loading (disabled) : opacité 0.4. Icône en rotation animation (boucle de 0.8s) pendant le fetch.
- `accessibilityLabel="Tirer de nouveaux articles"`, `accessibilityRole="button"`.

---

### États

**Default (success) :**
```
┌─────────────────────────────────────┐
│           WikiHop           FR | EN │
├─────────────────────────────────────┤
│                                     │
│  ┌──────────────────────────────┐   │
│  │ DÉPART                       │   │
│  │ ─────────────────────────    │   │
│  │ [img]  Tour Eiffel           │   │
│  │        La tour Eiffel est    │   │
│  │        une tour de fer...    │   │
│  └──────────────────────────────┘   │
│                  ↓                  │
│  ┌──────────────────────────────┐   │
│  │ DESTINATION                  │   │
│  │ ─────────────────────────    │   │
│  │ [img]  Leonardo da Vinci     │   │
│  │        Peintre, sculpteur    │   │
│  │        et inventeur...       │   │
│  └──────────────────────────────┘   │
│                                     │
│  ┌──────────────────────────────┐   │
│  │            Jouer             │   │
│  └──────────────────────────────┘   │
│                                     │
│        Nouveaux articles  ↺         │
│                                     │
└─────────────────────────────────────┘
```

**Loading :**
```
┌─────────────────────────────────────┐
│           WikiHop           FR | EN │
├─────────────────────────────────────┤
│                                     │
│  ┌──────────────────────────────┐   │
│  │ ░░░░░░                       │   │  Label skeleton
│  │ ─────────────────────────    │   │
│  │ [░░░]  ░░░░░░░░░░░░░░░░     │   │  Titre skeleton
│  │        ░░░░░░░░░░░░░░░░░░   │   │  Extrait skeleton L1
│  │        ░░░░░░░░░░░          │   │  Extrait skeleton L2
│  └──────────────────────────────┘   │
│                  ↓                  │
│  ┌──────────────────────────────┐   │  Skeleton identique
│  │ ░░░░░░░░░░                   │   │
│  │ ─────────────────────────    │   │
│  │ [░░░]  ░░░░░░░░░░░░░░       │   │
│  │        ░░░░░░░░░░░░░░░░░░   │   │
│  │        ░░░░░░░░░            │   │
│  └──────────────────────────────┘   │
│                                     │
│  ┌──────────────────────────────┐   │  Bouton disabled
│  │            Jouer             │   │  Fond #E2E8F0, texte #94A3B8
│  └──────────────────────────────┘   │
│                                     │
│        Nouveaux articles  ↺  ·40%  │  Opacité 40%, icône en rotation
│                                     │
└─────────────────────────────────────┘
```

Skeleton : blocs `#E2E8F0` animés en shimmer (opacité 0.4 → 1.0 → 0.4, boucle 1.2s). Coins arrondis 4pt. Le placeholder thumbnail est un carré `#E2E8F0` de 80×80pt. Toute la zone skeleton a `accessibilityElementsHidden={true}`.

**Error :**
```
┌─────────────────────────────────────┐
│           WikiHop           FR | EN │
├─────────────────────────────────────┤
│                                     │
│                                     │
│                                     │
│                                     │
│       Impossible de charger         │  Regular 16px, #1E293B, centré
│       les articles.                 │
│                                     │
│       Vérifiez votre connexion      │  Regular 13px, #64748B, centré
│       internet.                     │
│                                     │
│  ┌──────────────────────────────┐   │
│  │          Réessayer           │   │  Bouton primaire, 48pt hauteur
│  └──────────────────────────────┘   │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

Bouton "Réessayer" : hauteur 48pt, largeur 80% de l'écran (centré), fond `#2563EB`, texte blanc Bold 16px, coins arrondis 8pt. `accessibilityLabel="Réessayer de charger les articles"`.

**Empty :**
Non applicable — `useRandomPair` est toujours en `loading` ou `success` ou `error`. Pas d'état vide à designer.

---

### Accessibilité

- [x] `accessibilityLabel="WikiHop, écran d'accueil"` sur le titre principal (`accessibilityRole="header"`)
- [x] `accessibilityLabel="Langue française, sélectionnée"` / `accessibilityLabel="Langue anglaise"` sur chaque option de langue. `accessibilityState={{ selected: true/false }}`.
- [x] Carte Départ : `accessibilityLabel="Article de départ : [titre]. [extrait tronqué à 100 caractères]"`. La carte entière est un élément accessible (`accessible={true}`) mais non interactif (`accessibilityRole="none"` ou `"text"`).
- [x] Carte Destination : même pattern, libellé "Article destination : [titre]. [extrait]".
- [x] `accessibilityLabel="Jouer"` sur le bouton Jouer. `accessibilityState={{ disabled: true }}` quand inactif.
- [x] `accessibilityLabel="Tirer de nouveaux articles"` sur le bouton Nouveaux articles.
- [x] Skeleton loading : `accessibilityElementsHidden={true}` sur toute la zone skeleton. Annoncer via `AccessibilityInfo.announceForAccessibility("Articles chargés. Départ : [titre]. Destination : [titre].")` au passage en état success.
- [x] Erreur : `AccessibilityInfo.announceForAccessibility("Erreur de chargement. [message].")` au passage en état error.
- [x] Contraste : `#1E293B` sur `#FFFFFF` : ~15.8:1. `#64748B` sur `#FFFFFF` : ~4.6:1 (passe AA). Texte blanc sur `#2563EB` : ~5.9:1. Label "DESTINATION" `#2563EB` sur `#FFFFFF` : ~5.9:1.
- [x] Zones tactiles : Bouton Jouer 52pt hauteur. Bouton Nouveaux articles 44pt hauteur. Options de langue 44×44pt minimum.
- [x] Navigation VoiceOver / TalkBack : ordre de lecture naturel haut → bas (Header → Langue → Carte Départ → Carte Destination → Jouer → Nouveaux articles).

---

### Notes pour Laurent

- Les deux `ArticleCard` ont la même structure visuelle — créer un composant `ArticleCard` réutilisable avec une prop `variant: 'start' | 'target'` qui détermine la couleur du label contextuel.
- Le thumbnail est optionnel : si `thumbnailUrl` est `null` ou `undefined`, afficher le placeholder `#F1F5F9` avec une icône document. Ne pas laisser un espace vide.
- La flèche inter-carte (`↓`) est purement décorative. `accessible={false}` pour l'exclure de la navigation VoiceOver.
- L'animation de rotation de l'icône `↺` pendant le loading peut être faite avec `Animated.loop(Animated.timing(..., { toValue: 1, duration: 800 }))` sur une valeur de rotation interpolée. Si l'implémentation est jugée trop complexe, supprimer l'animation — l'opacité 40% suffit à signaler l'état disabled.
- Le sélecteur de langue n'est pas un composant natif `Switch` — c'est deux `TouchableOpacity` côte à côte. Ne pas utiliser de composant picker natif (trop lourd visuellement).
- La zone centrale (flex:1) utilise `justifyContent: 'center'` pour centrer verticalement les cartes et les boutons dans l'état error. Dans l'état success, le contenu est naturellement plus haut — ne pas forcer le centrage vertical qui décalerait les cartes vers le milieu d'un écran haut.
- Marge horizontale globale de 16pt de chaque côté pour les cartes et les boutons.
- Distance entre les deux cartes (incluant la flèche) : 36pt au total (12pt + 12pt flèche + 12pt).
- Marge entre le bas de la carte Destination et le bouton Jouer : 24pt.
- Marge entre le bouton Jouer et le bouton Nouveaux articles : 12pt.

---

## Validation QA — Halim

**Date** : 2026-03-02
**Testeur** : Halim
**Statut** : Validé

### Tests automatisés
- npm test (useRandomPair, HomeScreen) : 25 tests passants, 0 échec
- tsc --noEmit : sans erreur
- npm run lint : 0 erreur (5 warnings no-console dans game.store.ts/language.store.ts, préexistants, hors scope Wave 4)

### Observations
- `fetchCount` ref (ligne 70 de useRandomPair.ts) : déclarée et incrémentée dans refresh() mais jamais lue directement — seul le state `trigger` pilote le re-fetch. Redondance non bloquante, signalée au Tech Lead pour nettoyage futur.
- Skeleton animé (shimmer) conforme aux specs Benjamin.
- Alert session résiduelle (isHydrated) : implémentation correcte, déclenchée une seule fois.
- ArticleSummary → Article : construction explicite sans spread, conforme aux specs.

## Statut
pending → in-progress → done
