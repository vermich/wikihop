---
id: M-03
title: Récupération et affichage du contenu d'un article Wikipedia
phase: 2-MVP
priority: Must
agents: [Frontend Dev, Backend Dev]
status: in-progress
created: 2026-02-28
completed:
---

# M-03 — Récupération et affichage du contenu d'un article Wikipedia

## User Story
En tant que joueur, je veux lire le contenu d'un article Wikipedia dans l'application, afin de trouver les liens vers l'article destination.

## Critères d'acceptance
- [ ] Le contenu de l'article est affiché (texte + liens internes cliquables)
- [ ] Les liens vers des catégories, portails, pages d'aide et pages spéciales sont filtrés et non affichés comme liens navigables
- [ ] Les liens internes Wikipedia sont visuellement distingués du texte (couleur, soulignement)
- [ ] L'article est scrollable verticalement
- [ ] Le titre de l'article en cours est affiché en haut de l'écran
- [ ] Le chargement d'un article affiche un indicateur visuel
- [ ] En cas d'article inexistant ou d'erreur API, un message est affiché

## Notes de réalisation

### Prérequis

M-15 (`WikipediaWebView`) doit être livré avant de commencer M-03. `ArticleScreen` consomme `WikipediaWebView` — ne pas développer en parallèle.

### Localisation des fichiers

```
apps/mobile/src/screens/ArticleScreen.tsx
apps/mobile/src/hooks/useArticleContent.ts
apps/mobile/src/navigation/RootNavigator.tsx   (modification — ajout route Game)
```

### Extension du navigateur — nouvelle route `Game`

`RootNavigator.tsx` doit être modifié pour ajouter la route `Game` :

```typescript
// apps/mobile/src/navigation/RootNavigator.tsx

export type RootStackParamList = {
  Home: undefined;
  Game: {
    /** Titre de l'article à afficher. Non encodé (ex: "Tour Eiffel"). */
    articleTitle: string;
  };
};
```

La navigation vers `Game` se fait via `navigation.push('Game', { articleTitle })` depuis HomeScreen (démarrage de partie) et depuis `ArticleScreen` lui-même lors des sauts (M-04).

### Hook useArticleContent

Toute la logique de fetch est encapsulée dans un hook dédié. L'écran `ArticleScreen` ne contient pas de logique de fetch.

```typescript
// apps/mobile/src/hooks/useArticleContent.ts

import type { Language } from '@wikihop/shared';

export type ArticleContentState =
  | { status: 'loading' }
  | { status: 'success'; html: string }
  | { status: 'not_found'; title: string }
  | { status: 'error'; message: string };

export interface UseArticleContentResult {
  state: ArticleContentState;
  /** Permet de relancer le fetch après une erreur (bouton "Réessayer") */
  retry: () => void;
}

/**
 * Récupère le HTML d'un article Wikipedia via getArticleContent().
 *
 * - Lance le fetch au montage et à chaque changement de title ou lang.
 * - Expose un état discriminé (loading / success / not_found / error).
 * - `retry()` force un nouveau fetch sans changer title/lang.
 *
 * @param title - Titre de l'article (non encodé)
 * @param lang  - Langue de l'article
 */
export function useArticleContent(
  title: string,
  lang: Language,
): UseArticleContentResult;
```

**Implémentation attendue** : utiliser `useEffect` + `useCallback` + un compteur `retryCount` dans le state local pour déclencher le retry. L'AbortController de `getArticleContent` gère déjà le timeout — ne pas ajouter de timeout supplémentaire dans le hook.

Gérer le cleanup de l'effet : si le composant est démonté pendant le fetch, ignorer le résultat (pattern `let cancelled = false` dans le useEffect).

### Interface ArticleScreen

```typescript
// apps/mobile/src/screens/ArticleScreen.tsx

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type ArticleScreenProps = NativeStackScreenProps<RootStackParamList, 'Game'>;

export function ArticleScreen({ route, navigation }: ArticleScreenProps): React.JSX.Element;
```

### Structure de l'écran

L'écran est organisé en trois zones verticales :

```
┌─────────────────────────────────────┐
│  [Header]  Titre article   [Retour] │  ← barre fixe (SafeAreaView)
├─────────────────────────────────────┤
│  [HUD]  Sauts: 3    ⏱ 01:24        │  ← composant GameHUD (M-05)
├─────────────────────────────────────┤
│                                     │
│       WikipediaWebView / loader     │  ← flex: 1, scrollable
│       / écran d'erreur              │
│                                     │
└─────────────────────────────────────┘
```

Le header affiche le titre de l'article courant (issu de `route.params.articleTitle`). Il n'utilise pas le header natif React Navigation (`headerShown: false` dans les options de la route `Game`) — le header est géré manuellement pour un contrôle total du rendu.

### Comportements d'état

**Chargement** : afficher un `ActivityIndicator` centré. La WebView n'est pas encore montée (pas de rendu `WikipediaWebView` avec html vide — attendre le succès).

**Succès** : rendre `<WikipediaWebView html={html} article={currentArticle} onWikiLinkPress={handleLinkPress} />`.

**Article inexistant (404)** : afficher un message "Article introuvable" avec le titre concerné. Pas de bouton Réessayer (le 404 est définitif).

**Erreur réseau** : afficher un message d'erreur générique avec un bouton "Réessayer" qui appelle `retry()` du hook.

### Interactions avec le store

`ArticleScreen` lit `currentSession` depuis `useGameStore` pour :
- Déterminer l'article cible (`currentSession.targetArticle`) afin d'afficher une indication visuelle si le lien tapé correspond à la cible (optionnel Wave 3, sinon Wave 4)
- Passer l'`Article` complet à `WikipediaWebView` (nécessite `id`, `title`, `url`, `language`)

**Construction de l'objet Article** : `route.params` ne contient que `articleTitle` (string). Pour obtenir l'objet `Article` complet (avec `id`, `url`), appeler `getArticleSummary(title, lang)` au montage — ce résumé est mis en cache par le service (clé `${lang}:${title}`), donc pas de double appel réseau si le résumé a déjà été récupéré lors de la sélection d'article.

Séquence au montage :
1. Appeler `getArticleSummary(title, lang)` pour construire l'objet `Article`
2. Appeler `getArticleContent(title, lang)` pour le HTML
3. Ces deux appels peuvent être lancés en parallèle via `Promise.all`

### Filtrage des liens non navigables

Le filtrage des liens (catégories, portails, pages spéciales) est géré par `extractInternalLinks()` du service Wikipedia. Cependant, dans M-03, ce filtrage n'est pas appliqué au niveau du HTML affiché — le CSS masque visuellement les catégories (`#mw-panel`, `.catlinks`), et le JS injecté (M-15) bloque la navigation. Le filtrage complet par `extractInternalLinks` est utilisé en M-04 pour valider les sauts.

### Points de vigilance

1. **`headerShown: false`** : obligatoire sur la route `Game` pour contrôler le header manuellement. Sans cela, React Navigation affiche son propre header par-dessus le custom header.
2. **Construction Article depuis titre** : ne jamais construire un objet `Article` avec des champs synthétiques (`id: '', url: ''`). Toujours appeler `getArticleSummary` pour obtenir les champs réels.
3. **Annulation du fetch au démontage** : le pattern `let cancelled = false` dans le useEffect est obligatoire pour éviter un `setState` sur un composant démonté lors des navigations rapides.
4. **`noUncheckedIndexedAccess`** : `route.params` est correctement typé par React Navigation — pas d'accès direct à un index de tableau dans cet écran.
5. **`SafeAreaView`** : le header fixe doit utiliser `SafeAreaView` (ou les insets de `useSafeAreaInsets()`) pour ne pas passer sous la Dynamic Island sur iOS.

---

## Spécifications visuelles — Benjamin (UX/UI)

## Écran : ArticleScreen

### Objectif
Permettre au joueur de lire un article Wikipedia et d'y repérer les liens pour naviguer vers l'article destination.

### Layout (ASCII)

```
┌─────────────────────────────────────┐  [FIXED - SafeAreaView iOS/Android]
│ ←  Tour Eiffel                      │  Header : hauteur 52pt
├─────────────────────────────────────┤
│ 3 sauts  ⏱ 01:24  → Cible : Louvre │  GameHUD : hauteur 40pt
├─────────────────────────────────────┤
│                                     │  [SCROLL - flex:1]
│   [Contenu Wikipedia — WebView]     │
│                                     │
│   ...texte, liens, images...        │
│                                     │
└─────────────────────────────────────┘
```

**Proportion indicative sur iPhone 14 (844pt de hauteur) :**
- Safe area top : ~59pt (Dynamic Island)
- Header : 52pt
- GameHUD : 40pt
- WebView : ~693pt (le reste, flex:1)
- Safe area bottom : ~34pt (home indicator) — absorbé par SafeAreaView

### Composants

- **Header** — Hauteur 52pt, fond `#FFFFFF`, bordure inférieure 1pt `#E2E8F0` (gris très léger pour séparer visuellement sans alourdir). Deux éléments horizontaux :
  - **Bouton retour** (gauche) — Chevron `←` + libellé "Retour" ou icône seule si titre long. Touche 44×44pt minimum. Couleur `#2563EB`. `accessibilityLabel="Retour à l'article précédent"`. Absent si c'est le premier article de la session (pas de `goBack` possible depuis HomeScreen).
  - **Titre de l'article courant** (centre ou gauche après le bouton) — Bold 17px (titre de navigation natif iOS), `#1E293B`, une seule ligne, ellipsis si trop long. `numberOfLines={1}`.
- **GameHUD** — Voir specs M-05 pour le détail. Hauteur fixe 40pt, fond `#F8FAFC` (gris très clair pour distinguer du header et du contenu), bordure inférieure 1pt `#E2E8F0`.
- **WikipediaWebView** — flex:1, occupe tout l'espace restant. Voir specs M-15 pour le rendu interne. Fond blanc `#FFFFFF`.

### États

- **Default (article chargé) :**
  ```
  ┌─────────────────────────────────────┐
  │ ←  Tour Eiffel                      │  fond blanc, titre Bold 17px
  ├─────────────────────────────────────┤
  │ 3 sauts  ⏱ 01:24  → Louvre         │  fond #F8FAFC
  ├─────────────────────────────────────┤
  │                                     │
  │  [Contenu article Wikipedia]        │
  │  Texte 16px, liens bleus            │
  │                                     │
  └─────────────────────────────────────┘
  ```

- **Loading (article en cours de chargement) :**
  ```
  ┌─────────────────────────────────────┐
  │ ←  Tour Eiffel                      │
  ├─────────────────────────────────────┤
  │ 3 sauts  ⏱ 01:24  → Louvre         │
  ├─────────────────────────────────────┤
  │                                     │
  │         ████████████████░░░         │  Skeleton ligne 1
  │         ██████████████░░░░░░        │  Skeleton ligne 2
  │         ████████░░░░░░░░░░░░        │  Skeleton ligne 3
  │                                     │
  │         ████████████████████        │  Skeleton bloc
  │         ██████████░░░░░░░░░░        │
  │                                     │
  └─────────────────────────────────────┘
  ```
  Skeleton préféré au spinner. Blocs de hauteur 16pt, coins arrondis 4pt, couleur `#E2E8F0` animée en shimmer de gauche à droite (boucle de 1.2s). 3 lignes de texte simulées + 1 bloc simulant une image. Largeurs variables (100%, 80%, 60%) pour imiter la densité du texte. Si l'implémentation du shimmer est jugée trop coûteuse par Laurent, un `ActivityIndicator` centré de couleur `#2563EB` est acceptable comme fallback.

- **Error réseau :**
  ```
  ┌─────────────────────────────────────┐
  │ ←  Tour Eiffel                      │
  ├─────────────────────────────────────┤
  │ 3 sauts  ⏱ 01:24  → Louvre         │
  ├─────────────────────────────────────┤
  │                                     │
  │                                     │
  │   Impossible de charger             │
  │   cet article.                      │
  │                                     │
  │   Vérifiez votre connexion          │
  │   internet.                         │
  │                                     │
  │   ┌──────────────────────────┐      │
  │   │        Réessayer         │      │  Bouton primaire
  │   └──────────────────────────┘      │
  │                                     │
  └─────────────────────────────────────┘
  ```
  Texte erreur : "Impossible de charger cet article." — Regular 16px, `#1E293B`, centré. Sous-texte : "Vérifiez votre connexion internet." — Regular 13px, `#64748B` (gris moyen). Bouton "Réessayer" : hauteur 48pt, fond `#2563EB`, texte blanc Bold 16px, coins arrondis 8pt, largeur `80%` de l'écran, centré.

- **Erreur 404 (article introuvable) :**
  ```
  ┌─────────────────────────────────────┐
  │ ←  [Titre]                          │
  ├─────────────────────────────────────┤
  │ ...HUD...                           │
  ├─────────────────────────────────────┤
  │                                     │
  │   Article introuvable               │
  │                                     │
  │   "Nom de l'article" n'existe       │
  │   pas sur Wikipedia.                │
  │                                     │
  │   (pas de bouton Réessayer)         │
  │                                     │
  └─────────────────────────────────────┘
  ```
  Texte : "Article introuvable" — Bold 18px, `#1E293B`. Sous-texte : `"[titre]"` en italique + " n'existe pas sur Wikipedia." — Regular 14px, `#64748B`. Pas de bouton Réessayer (erreur définitive). Le joueur peut uniquement revenir en arrière via le bouton retour.

- **Empty (pas d'article en session) :** Cas non attendu en production — `ArticleScreen` est toujours atteint avec un `articleTitle` via les params de route. Si ce cas survient, afficher le même état erreur réseau avec le message "Session introuvable".

### Accessibilité

- [ ] `accessibilityLabel` sur le bouton retour : `"Retour à l'article précédent"`
- [ ] `accessibilityLabel` sur le bouton "Réessayer" : `"Réessayer de charger l'article"`
- [ ] Contraste ≥ 4.5:1 — titre `#1E293B` sur `#FFFFFF` : ratio ~15.8:1. Bouton blanc sur `#2563EB` : ratio ~5.9:1. Texte erreur `#64748B` sur `#FFFFFF` : ratio ~4.6:1 (passe AA juste).
- [ ] Zones tactiles ≥ 44×44pt — bouton retour 44×44pt, bouton Réessayer 48pt de hauteur (largeur 80%).
- [ ] Navigation VoiceOver / TalkBack — s'assurer que le header annonce le titre de l'article comme région de navigation (`accessibilityRole="header"`).
- [ ] Le skeleton loading ne doit pas être annoncé par VoiceOver comme contenu. Utiliser `accessibilityElementsHidden={true}` sur le conteneur skeleton pendant le chargement, et annoncer l'article via `AccessibilityInfo.announceForAccessibility` une fois chargé.

### Notes pour Laurent

- `headerShown: false` est obligatoire sur la route `Game` (confirmé par le Tech Lead). Le header est entièrement custom.
- Le header utilise `SafeAreaView` avec les edges `['top']` uniquement — le bas est géré par le contenu scrollable. Utiliser `useSafeAreaInsets()` si plus de contrôle fin est nécessaire.
- La bordure inférieure du header (`#E2E8F0`, 1pt) peut être rendue avec `borderBottomWidth: 1` + `borderBottomColor`. Pas de shadow — trop lourd visuellement pour cette app de lecture.
- Le titre dans le header tronqué avec `numberOfLines={1}` + `ellipsizeMode="tail"`. Sur les titres très courts, aligner à gauche (après le bouton retour) pour éviter un centrage flottant.
- Le bouton retour ne doit pas apparaître si l'ArticleScreen est le premier écran de la stack (article de départ). Vérifier avec `navigation.canGoBack()` au montage.
- Le skeleton shimmer peut être implémenté avec `Animated.loop` + `Animated.timing` sur une opacité entre 0.4 et 1.0, ou avec `react-native-reanimated` si déjà dans le projet. Ne pas introduire une nouvelle dépendance juste pour le skeleton — utiliser l'`Animated` natif en priorité.

---

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
