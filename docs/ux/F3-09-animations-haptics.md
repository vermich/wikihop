# Spécifications visuelles — F3-09 — Animations et feedback haptique

**Auteur :** Benjamin — UX/UI Designer
**Date :** 2026-03-14
**Story liée :** F3-09
**Dépend de :** M-06 (VictoryScreen), F3-10 (SortBar dans HistoryScreen)
**Écrans concernés :** VictoryScreen (animation spring), HistoryScreen (haptique SortBar), tous (transition articles)

---

## Décisions de design

### F3-09-A — Animation spring du bloc stats dans VictoryScreen

**Paramètres proposés par Maxime :** `tension: 100, friction: 8`
**Paramètres actuels :** `friction: 5` (sans tension explicite — valeur par défaut React Native = 40)

**Validation : AJUSTEMENT recommandé.**

`tension: 100` avec `friction: 8` produit un ressort rigide à amortissement modéré. Sur device physique, la combinaison risque de générer un rebond perceptible de l'ordre de 2 à 3 oscillations avant stabilisation. Pour un écran de victoire dont l'objectif émotionnel est la satisfaction et la clarté, un rebond prolongé distrait de la lecture des stats.

**Paramètres retenus : `tension: 80, friction: 7`**

Justification :
- `tension: 80` : ressort légèrement souple, animation vivante sans rigidité cassante — mieux sur appareils bas de gamme (moins susceptible de paraître saccadée si le rendu est en retard d'une frame)
- `friction: 7` : amortissement modéré-élevé, 1 oscillation rapide puis stabilisation nette en ~250ms — reste sous la limite 300ms du critère d'acceptance
- Ce couple est visuellement proche du ressort iOS standard (UISpringTimingParameters approximatif), familier aux utilisateurs

**Durée estimée :** ~240ms de 0.8 à 1.0, stabilisation complète < 300ms. Conforme au critère "aucune animation > 300ms".

**Variante `reduceMotion` :** affichage instantané du bloc stats à scale 1.0, sans animation. Laurent doit lire `AccessibilityInfo.isReduceMotionEnabled()` au montage de VictoryScreen pour conditionner l'animation. Le bloc s'affiche immédiatement en opacité 1 et scale 1 si `reduceMotion` est actif.

---

### F3-09-B — Feedback haptique au montage de VictoryScreen

**Choix de Maxime :** `Haptics.notificationAsync(NotificationFeedbackType.Success)`

**Validation : CONFIRMÉ.**

`NotificationFeedbackType.Success` est le motif haptique le plus approprié pour la victoire. Il correspond au pattern "succès / confirmation" sur iOS (3 impulsions courtes ascendantes) et à un retour vibrant court sur Android. Ce choix est cohérent avec l'importance émotionnelle du moment. Il ne doit pas être déclenché si la transition vers VictoryScreen résulte d'un "Rejouer" (l'animation de victoire ne se rejoue pas sur une partie relancée depuis l'historique).

**Timing :** `Haptics.notificationAsync` est appelé après la résolution de la navigation, dans un `useEffect` au montage (dépendances `[]`). Il ne bloque pas l'animation spring — les deux sont déclenchés en parallèle au montage.

**Variante `reduceMotion` :** Le feedback haptique EST maintenu même si `reduceMotion` est actif. L'haptique est un sens distinct de la vision — la préférence "réduire les animations" ne s'applique pas aux retours haptiques. Seule la préférence "réduire le mouvement" au sens visuel est concernée.

---

### F3-09-C — Feedback haptique sur les chips SortBar

**Choix de Maxime :** `Haptics.selectionAsync()`
**Alternative évaluée :** `Haptics.impactAsync(ImpactFeedbackStyle.Light)`

**Validation : AJUSTEMENT — `impactAsync(ImpactFeedbackStyle.Light)` retenu.**

Justification du changement :
- `selectionAsync()` est conçu pour le défilement de roue (UIPickerView, scroll de liste). Son intensité est très faible — sur certains Android, elle est imperceptible.
- `impactAsync(ImpactFeedbackStyle.Light)` signale un "clic" discret, cohérent avec le tap sur une chip de filtre. Son intensité est légèrement supérieure à `selectionAsync` et se retrouve sur tous les appareils supportant expo-haptics.
- Le tap sur un chip de tri est une action de sélection directe (l'utilisateur tape un élément), non un scroll. `impactAsync(Light)` représente mieux cette sémantique.
- Sur iOS, `impactAsync(Light)` correspond à `UIImpactFeedbackGenerator(style: .light)` — retour "clic" similaire au tap sur un bouton de l'App Store ou dans les Settings.

**Condition de déclenchement :** L'haptique n'est déclenchée que si le chip tapé n'est PAS déjà le chip actif. Taper le chip déjà sélectionné ne déclenche aucun retour haptique (pas d'action réelle → pas de feedback).

---

### F3-09-D — Animation de transition inter-articles

La story mentionne "animation de transition entre les articles (slide ou fade)". Ce point est traité ici pour complétude, bien qu'il concerne React Navigation et non un composant spécifique.

**Choix retenu : transition native de la stack (défaut React Navigation).**

Justification :
- React Navigation v7 avec `@react-navigation/native-stack` utilise les transitions natives de l'OS (slide horizontal sur iOS, fade ou slide sur Android). Ces transitions sont fluides, < 300ms, et respectent automatiquement `reduceMotion` sur iOS 15+.
- Introduire une animation custom (fade manuel, slide custom) ajouterait de la complexité pour un résultat inférieur aux animations OS. La priorité "Could" de cette story ne justifie pas un investissement technique élevé.
- Aucune modification de la configuration React Navigation n'est nécessaire pour ce critère — la transition par défaut est satisfaisante.

**Variante `reduceMotion` :** React Navigation v7 lit `UIAccessibility.isReduceMotionEnabled` nativement sur iOS. Sur Android, passer `animationEnabled: !reduceMotion` dans les options de la Stack via un hook au niveau de la navigation si la bibliothèque ne le gère pas automatiquement. Laurent vérifie ce point en implémentation.

---

### F3-09-E — Animation de chargement cohérente

**Choix retenu : skeleton screens (pattern déjà établi) + `ActivityIndicator` couleur `#2563EB` en fallback.**

Ce pattern est déjà documenté dans les specs M-03 et M-15. Aucun changement. La cohérence est garantie par le respect des specs existantes. Aucun spinner supplémentaire ne doit être introduit.

---

## Récapitulatif des décisions

| Point | Décision Maxime | Décision Benjamin | Justification |
|-------|----------------|-------------------|---------------|
| Spring VictoryScreen | tension:100, friction:8 | **tension:80, friction:7** | Moins de rebond, plus stable, < 300ms |
| Haptique victoire | `notificationAsync(Success)` | **Confirmé** | Motif correct pour la victoire |
| Haptique SortBar | `selectionAsync()` | **`impactAsync(Light)`** | Plus perceptible, sémantique "clic" correcte |
| Transition inter-articles | slide ou fade | **Transition native RN (défaut)** | Fluide, OS-native, reduceMotion automatique |
| Animation chargement | — | **Skeleton existant** | Pattern déjà spécifié, aucun changement |

---

## Accessibilité

- [ ] `reduceMotion` vérifié via `AccessibilityInfo.isReduceMotionEnabled()` au montage de VictoryScreen — animation spring désactivée si true
- [ ] Haptique maintenue même si `reduceMotion` actif (haptique != animation visuelle)
- [ ] Haptique SortBar conditionnée : seulement si le chip tapé change le critère actif (pas de feedback sur retap du chip déjà sélectionné)
- [ ] Durée de l'animation spring VictoryScreen : < 300ms — conforme au critère d'acceptance
- [ ] Transitions inter-articles : natives OS, gestion `reduceMotion` vérifiée par Laurent pour Android

## Notes pour Laurent

- **VictoryScreen spring :** remplacer les paramètres `friction: 5` actuels par `tension: 80, friction: 7`. Vérifier que l'`Animated.spring` part bien de `scale: 0.8` (valeur initiale) vers `scale: 1.0`. Avant de lancer l'animation, lire `AccessibilityInfo.isReduceMotionEnabled()` — si true, passer directement la valeur à 1.0 sans animation (`Animated.setValue(1.0)`).
- **Haptique VictoryScreen :** `expo-haptics` est probablement déjà dans les dépendances (si F3-05 hard mode l'utilise). Vérifier avant d'ajouter une dépendance. Le `useEffect` de montage doit aussi gérer le cas "Rejouer depuis historique" si ce flux est possible sans passer par le montage complet du composant — sinon pas de précaution nécessaire.
- **Haptique SortBar :** dans le handler `onPress` du `SortChip`, avant l'appel `onChange(criteria)`, vérifier `if (criteria !== currentCriteria)` puis appeler `Haptics.impactAsync(ImpactFeedbackStyle.Light)`. Cette vérification évite le double feedback.
- **`ImpactFeedbackStyle` :** l'import est `import { ImpactFeedbackStyle } from 'expo-haptics'` — ne pas confondre avec les types de `NotificationFeedbackType`.
- **Transitions React Navigation :** aucune modification de configuration n'est demandée pour ce critère. Si Laurent constate que les transitions sont trop longues sur Android (> 300ms), utiliser `animation: 'slide_from_right'` avec `animationDuration: 250` dans les `screenOptions` du Stack Navigator.
- **`reduceMotion` Android :** vérifier dans `onReady` du NavigationContainer si `AccessibilityInfo.isReduceMotionEnabled()` retourne true et passer `animationEnabled: false` aux options si nécessaire.
