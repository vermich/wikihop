# Spécifications visuelles — F3-41 — Bouton de partage VictoryScreen : icône dans l'encadré stats

**Auteur :** Benjamin (UX/UI)
**Date :** 2026-03-20
**Story :** docs/stories/phase-3/F3-41-victory-share-icon-button.md

---

## Écran : VictoryScreen — Bloc statistiques avec icône de partage

### Objectif
Le joueur peut partager son résultat depuis l'encadré de statistiques via une icône standard mobile, sans quitter visuellement la lecture de ses stats.

### Contexte de la modification

**Avant F3-41 :** Le bouton "Partager" était un lien texte `#2563EB` positionné en bas de la zone sticky, sous les boutons principaux.

**Après F3-41 :** L'icône de partage est intégrée dans le coin supérieur droit du bloc stats (`statsBlock`). Le lien texte dans la zone sticky est supprimé. Le comportement (`Share.share`) est inchangé.

---

### Layout (ASCII) — Bloc statsBlock modifié

```
┌─────────────────────────────────────────────────────┐
│  [Badge Défi du jour — si applicable]               │
│  [Badge Mode difficile — si applicable]             │
│                                              [↑ 44] │  ← Icône partage, coin sup. droit
│  ✓  Félicitations !                                 │
│                                                     │
│     ┌────────────┬────┬────────────┐               │
│     │    5       │    │   1 m 23 s │               │
│     │   sauts    │    │   durée    │               │
│     └────────────┴────┴────────────┘               │
│                                                     │
│     Paris  →  Tokyo           (ellipsisMiddle)      │
└─────────────────────────────────────────────────────┘
```

**Détail position icône :**

```
┌─────────────────────────────────────────────────────┐
│                                          ┌────────┐ │
│  [badges éventuels — dessous l'icône]    │  [↑]   │ │
│                                          │ share  │ │
│                                          └────────┘ │
│  ✓  Félicitations !                                 │
│  ...                                                │
└─────────────────────────────────────────────────────┘
```

L'icône est positionnée en `position: 'absolute'`, `top: 12`, `right: 12` à l'intérieur du `statsBlock`. Elle ne perturbe pas le flux des badges ni du contenu.

---

### Composants

- **ShareIconButton** — `TouchableOpacity` contenant l'icône Ionicons "share-social-outline" (iOS) / "share-social-outline" (Android).
  - Taille icône : 22pt
  - Couleur icône : `#2563EB`
  - Zone tactile effective : `minWidth: 44, minHeight: 44` — atteinte via `padding: 11` autour de l'icône
  - Position : `position: 'absolute'`, `top: 12`, `right: 12` dans le `statsBlock`
  - `accessibilityLabel` : voir section Accessibilité
  - `accessibilityRole="button"`
  - État pressé : opacité activeOpacity `0.7` (standard TouchableOpacity)

- **Icône recommandée — Ionicons**
  - Nom : `share-social-outline`
  - Disponible dans `@expo/vector-icons` (déjà dans le projet)
  - Taille : `22`
  - Couleur : `#2563EB`
  - Alternative si `share-social-outline` pose un problème de rendu : `share-outline`

- **Zone sticky (suppression)** — Le composant `shareButton` et son `Text` sont supprimés de la zone sticky. La zone sticky ne contient plus que : readButton + primaryButtonsRow (Nouvelle partie / Rejouer).

---

### États

- **Default :** Icône visible dans le coin du statsBlock. L'encadré stats reste identique par ailleurs.
- **Loading :** Non applicable — VictoryScreen n'a pas d'état loading du bloc stats. Le guard redirige si `stats === null`.
- **Error :** Non applicable — même raison.
- **Empty :** Non applicable.
- **Pressé :** `activeOpacity: 0.7` sur le `TouchableOpacity`. L'icône assombrit légèrement. Le Share sheet natif s'ouvre.

---

### Layout zone sticky — après suppression du bouton texte Partager

```
┌─────────────────────────────────────────────────────┐  [FIXED - Zone sticky]
│  ┌─────────────────────────────────────────────┐   │
│  │  Lire [titre cible]            (outline 48) │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌──────────────────────┐  ┌──────────────────┐   │
│  │   Nouvelle partie    │  │    Rejouer        │   │
│  │   (bleu plein  52)   │  │   (outline 52)    │   │
│  └──────────────────────┘  └──────────────────┘   │
│                                                     │
│            [— pas de bouton Partager ici —]         │
└─────────────────────────────────────────────────────┘
```

La suppression du bouton texte réduit la hauteur de la zone sticky de 44pt. Cela libère de l'espace écran — positif pour les petits appareils (iPhone SE).

---

### Accessibilité

- [ ] `accessibilityLabel` explicite sur l'icône de partage : `"Partager mon résultat"` (chaîne i18n à créer : `victory.share_icon_a11y`)
- [ ] `accessibilityRole="button"` sur le `TouchableOpacity`
- [ ] Pas d'`accessibilityState` nécessaire — bouton toujours actif sur VictoryScreen
- [ ] Contraste icône `#2563EB` sur fond `#FFFFFF` du statsBlock : 4.6:1 — conforme WCAG AA
- [ ] Zone tactile effective 44×44pt vérifiée : icône 22pt + padding 11pt de chaque côté = 44pt
- [ ] Ordre de lecture VoiceOver : le `ShareIconButton` est positionné en `position: absolute`. VoiceOver iOS lit les éléments dans l'ordre du DOM. Placer le JSX du ShareIconButton **après** le dernier badge et **avant** la `congratsRow` pour que VoiceOver le lise en 3e position dans le bloc (après les badges, avant "Félicitations !"). Vérifier sur device.
- [ ] Aucune information transmise par la couleur seule — l'icône est une icône standard universellement reconnue
- [ ] Animations : aucune animation propre au ShareIconButton. La spring du statsBlock existante s'applique à l'ensemble — aucune action supplémentaire requise.
- [ ] `reduceMotion` : géré par l'existant sur le statsBlock — pas d'impact spécifique à cette icône

---

### Notes pour Laurent

1. **Bibliothèque icône :** Utiliser `import { Ionicons } from '@expo/vector-icons'`. Vérifier que la dépendance est déjà présente (`apps/mobile/package.json`). Si non, la signaler au Tech Lead avant d'ajouter une dépendance.

2. **Position absolute dans un Animated.View :** Le `statsBlock` est un `Animated.View`. La `position: 'absolute'` du `ShareIconButton` fonctionne normalement à l'intérieur d'un `Animated.View` — pas de gotcha connu.

3. **Suppression du `shareButton` dans la zone sticky :** Supprimer le `TouchableOpacity` style `shareButton` et son `Text` style `shareButtonText` dans le JSX de `stickyButtons`. Supprimer les styles correspondants dans `StyleSheet.create`. Conserver le handler `handleShare` (utilisé par l'icône dans le bloc stats).

4. **Icône sur Android :** `share-social-outline` de Ionicons est rendu correctement sur Android. Tester visuellement que l'icône est bien celle attendue (flèche sortant d'une boîte).

5. **Padding de la zone tactile :** Ne pas fixer `width: 44, height: 44` sur le `TouchableOpacity` car cela risque de clipper les badges qui sont eux aussi en position relative dans le parent. Préférer `padding: 11` sur le `TouchableOpacity` pour atteindre 44pt sans affecter le clip du conteneur parent.

6. **Ordre JSX dans le statsBlock :** Pour l'ordre de lecture VoiceOver, placer le `ShareIconButton` (position absolute) après les badges dans le JSX. VoiceOver iOS respecte l'ordre du DOM pour les éléments en position absolute qui sont enfants du même parent.
