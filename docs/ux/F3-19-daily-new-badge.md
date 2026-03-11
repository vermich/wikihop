# Spécifications visuelles — F3-19 — Badge "NEW" sur le défi quotidien

**Auteur :** Benjamin — UX/UI Designer
**Date :** 2026-03-11
**Story liée :** F3-19
**Dépend de :** F3-16 (indicateur complétion), F3-17 (désactivation après complétion)
**Écran concerné :** HomeScreen — bouton "Défi du jour"

---

## Décisions de design préalables

Ces décisions sont documentées ici avant les specs pour que Laurent comprenne le raisonnement. Elles ne sont pas à remettre en question dans l'implémentation.

### Position du badge : coin supérieur droit, position absolute

Trois options ont été évaluées :

**Option A — inline à droite du texte "Défi du jour"**
Écartée. Perturbe le centrage existant (`alignItems: center, justifyContent: center`). Le texte principal perdrait sa position centrale à 52pt de hauteur, ce qui casse la hiérarchie visuelle établie en F3-16.

**Option B — au-dessus du bouton**
Écartée. Augmenterait la hauteur perçue du bloc, empiéterait sur le `marginTop: 12` qui sépare le bouton "Jouer" du bouton "Défi du jour", et nécessiterait une View wrapper supplémentaire dans `buttonsContainer`.

**Option C retenue — position absolute, coin supérieur droit, débordant hors du bouton**
Le badge est un `View` en `position: absolute`, `top: -8`, `right: -8`. Il déborde de 8pt au-dessus et 8pt à droite du bouton. Le `TouchableOpacity` existant est déjà un contexte de positionnement (`position: 'relative'` implicite dans React Native). Aucune View wrapper supplémentaire nécessaire. La zone tactile du bouton n'est pas affectée.

### Couleur du badge : fond `#2563EB`, texte `#FFFFFF`

| Option | Fond | Texte | Contraste | Conforme WCAG AA |
|--------|------|-------|-----------|-----------------|
| A | `#FFFFFF` | `#D97706` | 2.94:1 | Non (seuil 4.5:1) |
| B | `#FFFFFF` | `#2563EB` | 4.6:1 | Oui — mais bleu sur fond blanc sur fond ambre = confusion avec les liens |
| C | `#1E293B` | `#FFFFFF` | 16.1:1 | Oui — mais visuellement neutre, ne signale pas la nouveauté |
| **D retenu** | **`#2563EB`** | **`#FFFFFF`** | **4.6:1** | **Oui** |

Justification de l'option D :
- `#2563EB` est le token Primary du design system, déjà utilisé sur le bouton "Jouer". Son usage sur le badge crée une cohérence sémantique : "quelque chose à faire maintenant".
- Le contraste bleu froid sur fond ambre chaud `#D97706` maximise la distinction perceptuelle — le badge est immédiatement lu comme un élément distinct du bouton.
- Aucun nouveau token introduit — `#2563EB` existe déjà dans HomeScreen.
- `#FFFFFF` sur `#2563EB` = 4.6:1, conforme WCAG AA pour texte normal (seuil 4.5:1) et texte large (seuil 3:1).

### Texte du badge : "NEW"

Alternatives écartées :
- "Nouveau" — 7 caractères, risque de débordement sur petits écrans à 10px Bold dans un badge contraint.
- "★" ou "!" — caractères Unicode, VoiceOver les lit comme "étoile" ou "point d'exclamation" sans signifier la nouveauté. Non pertinent sans texte complémentaire.
- Point coloré seul — information transmise uniquement par la couleur, non conforme WCAG 1.4.1.

"NEW" retenu : 3 caractères, universel dans le contexte mobile, cohérent avec les labels DÉPART/DESTINATION déjà en majuscules sur les ArticleCard.

---

## Écran : HomeScreen — Bouton "Défi du jour" avec badge "NEW"

### Objectif

Signaler visuellement au joueur qu'un nouveau défi quotidien est disponible et n'a pas encore été réalisé aujourd'hui.

### Layout (ASCII)

**Vue isolée du bouton avec badge (état non-complété, défi disponible)**

```
┌─────────────────────────────────────────────┐
│                                             │   marginTop: 12pt (depuis playButton)
│  ┌───────────────────────────────────────┐  │
│  │                                       │╔═══╗
│  │           Défi du jour                │║NEW║  ← top: -8pt, right: -8pt
│  │                                       │╚═══╝    fond: #2563EB
│  └───────────────────────────────────────┘         texte: #FFFFFF 10px Bold
│     height: 52pt — backgroundColor: #D97706        borderRadius: 10pt
│     borderRadius: 12pt                             borderWidth: 1.5 borderColor: #FFFFFF
└─────────────────────────────────────────────┘
```

**Vue du badge — zoom dimensions**

```
  ╔═══════════════╗
  ║     NEW       ║   minWidth: 32pt
  ╚═══════════════╝   hauteur effective: ~20pt (paddingV 2pt × 2 + fontSize 10pt × lineHeight ~1.3)
                      paddingHorizontal: 6pt
                      paddingVertical: 2pt
                      borderRadius: 10pt (valeur supérieure au demi-hauteur — garantit le pill)
                      borderWidth: 1.5pt borderColor: #FFFFFF (halo blanc)
```

**Vue complète dans buttonsContainer (contexte HomeScreen success)**

```
┌─────────────────────────────────┐  [SCROLL]
│  paddingHorizontal: 16pt        │
│                                 │
│  ┌─────────────────────────┐   │
│  │  DÉPART                 │   │  ArticleCard
│  │  [thumbnail] Titre      │   │
│  │            Extrait...   │   │
│  └─────────────────────────┘   │
│             ↓                   │  marginVertical: 12pt, #2563EB
│  ┌─────────────────────────┐   │
│  │  DESTINATION            │   │  ArticleCard
│  │  [thumbnail] Titre      │   │
│  │            Extrait...   │   │
│  └─────────────────────────┘   │
│                                 │  marginTop: 24pt (buttonsContainer)
│  ┌─────────────────────────┐   │
│  │         Jouer           │   │  height: 52pt — #2563EB — Bold 18px
│  └─────────────────────────┘   │
│                             ╔═══╗  marginTop: 12pt
│  ┌─────────────────────────┐║NEW║  badge déborde hors du bouton
│  │      Défi du jour       │╚═══╝  height: 52pt — #D97706 — Bold 18px
│  └─────────────────────────┘   │
│                                 │
│      Nouveaux articles  ↺       │  height: 44pt
│  Mode difficile  [   Switch  ]  │  minHeight: 44pt
│         Historique              │  height: 44pt
│      Soutenir Wikipedia         │  height: 44pt
│          À propos               │  height: 44pt
│                                 │
└─────────────────────────────────┘
```

**Vue des quatre états du bouton "Défi du jour" (comparaison)**

```
État 1 : loading / error — badge absent
┌───────────────────────────────┐
│         Défi du jour          │  backgroundColor: #E2E8F0
│       [texte: #94A3B8]        │  disabled={true}
└───────────────────────────────┘

État 2 : success, non complété — badge présent  ← F3-19
┌───────────────────────────────┐ ╔═══╗
│         Défi du jour          │ ║NEW║  backgroundColor: #D97706
│       [texte: #FFFFFF]        │ ╚═══╝  disabled={false}
└───────────────────────────────┘

État 3 : success, complété (F3-16) — badge absent
┌───────────────────────────────┐
│  ✓   Défi du jour complété    │  backgroundColor: #92400E
│       [texte: #FFFFFF]        │  disabled={false} → disabled={true} après F3-17
└───────────────────────────────┘

État 4 : success, complété, désactivé (F3-17) — badge absent
┌───────────────────────────────┐
│  ✓   Défi du jour complété    │  backgroundColor: #92400E
│       [texte: #FFFFFF]        │  disabled={true} — opacité réduite par RN
└───────────────────────────────┘
```

### Composants

**BadgeNew — View, position absolute**
- `position: 'absolute'`, `top: -8`, `right: -8`
- `backgroundColor: '#2563EB'`
- `borderRadius: 10` — valeur supérieure au demi-hauteur effective (~10pt), garantit une pill parfaite quelle que soit la taille de rendu
- `paddingHorizontal: 6`, `paddingVertical: 2`
- `minWidth: 32` — garantit la lisibilité sur iPhone SE (320pt logiques)
- `alignItems: 'center'`, `justifyContent: 'center'`
- `borderWidth: 1.5`, `borderColor: '#FFFFFF'` — halo blanc entre le badge et le fond ambre du bouton ; renforce la séparation visuelle et la lisibilité du bord du badge
- `zIndex: 1` — s'affiche au-dessus du contenu du bouton si superposition
- `accessible={false}` — élément décoratif, information portée par `accessibilityLabel` du `TouchableOpacity` parent

**Texte "NEW" — Text dans BadgeNew**
- `fontSize: 10`
- `fontWeight: 'bold'`
- `color: '#FFFFFF'`
- `letterSpacing: 0.5` — améliore la lisibilité à petite taille
- `accessible={false}` — élément décoratif

**Bouton "Défi du jour" — TouchableOpacity existant (modification)**
- Structure JSX inchangée, sauf ajout conditionnel du `BadgeNew` en dernier enfant
- Condition d'affichage du badge : `dailyChallengeState.status === 'success' && !isDailyCompleted`
- Cette condition correspond exactement à l'inverse de `isDailyButtonCompleted` (déjà calculé dans HomeScreen)
- `accessibilityLabel` mis à jour — voir section Accessibilité

### États

**Default — défi disponible, non complété (`isDailyCompleted === false`, `status === 'success'`) :**
- Bouton : fond `#D97706`, texte "Défi du jour" 18px Bold `#FFFFFF`, `borderRadius: 12`
- Badge "NEW" : visible, coin supérieur droit, fond `#2563EB`, texte blanc
- `disabled={false}`
- `accessibilityLabel` : "Nouveau défi du jour disponible — jouer le défi quotidien"

**Loading — défi en chargement (`dailyChallengeState.status === 'loading'`) :**
- Bouton : fond `#E2E8F0`, texte "Défi du jour" `#94A3B8`
- Badge : absent — condition `status === 'success'` non satisfaite
- `disabled={true}` (paire d'articles et/ou défi en chargement)
- Skeleton appliqué aux ArticleCard, pas au bouton défi (comportement hérité, non modifié par F3-19)

**Error — chargement du défi échoué (`dailyChallengeState.status === 'error'`) :**
- Identique au Loading visuellement
- Badge : absent
- `disabled={true}`
- Pas de message d'erreur spécifique sur le bouton défi — comportement hérité de F3-01

**Complété — défi réalisé aujourd'hui (`isDailyCompleted === true`, `status === 'success'`) :**
- Bouton : fond `#92400E`, icône ✓ + texte "Défi du jour complété" 16px Bold `#FFFFFF`
- Badge : absent — `isDailyCompleted === true` exclut l'affichage
- `disabled={true}` après F3-17
- `accessibilityLabel` : "Défi du jour déjà complété aujourd'hui" (F3-17)

**Empty :** sans objet. Le badge est lié à un état positif (défi disponible). Il n'existe pas d'état "vide" pour ce composant.

### Accessibilité

- [x] `accessibilityLabel` explicite sur le `TouchableOpacity` quand badge visible : `"Nouveau défi du jour disponible — jouer le défi quotidien"` — le mot "Nouveau" porte l'information du badge textuelle, "jouer" décrit l'action
- [x] `accessibilityRole="button"` sur le `TouchableOpacity` — inchangé depuis F3-16
- [x] `accessibilityState={{ disabled: false }}` quand badge visible — inchangé
- [x] Badge `View` : `accessible={false}` — purement décoratif, information transmise par le label parent
- [x] Texte "NEW" (`Text`) : `accessible={false}` — même justification
- [x] Aucune information transmise uniquement par la couleur : le texte "NEW" est lisible, et le mot "Nouveau" dans le label VoiceOver redondifie l'information
- [x] Contraste badge : `#FFFFFF` sur `#2563EB` = 4.6:1 — conforme WCAG AA 1.4.3 texte normal (10px Bold en dessous du seuil grand texte 18px, seuil 4.5:1 applicable)
- [x] Contraste texte bouton : `#FFFFFF` sur `#D97706` = 2.94:1 — écart hérité de F3-16 pré-existant, documenté dans `docs/ux/F3-16-daily-completion-indicator.md`, non introduit par F3-19
- [x] Zone tactile : height 52pt > 44pt minimum — conforme Apple HIG + Material Design
- [x] Le badge (`position: absolute`) ne réduit pas la zone tactile du `TouchableOpacity` parent — la zone tactile est définie par le style du bouton lui-même, pas par ses enfants
- [x] Ordre de lecture VoiceOver/TalkBack : le `TouchableOpacity` est l'unique élément `accessible`. Ses enfants (`Text` texte principal, `View` badge, `Text` "NEW") sont tous `accessible={false}`. VoiceOver lit le `accessibilityLabel` du parent en une seule annonce, sans fragmentation.
- [x] Pas d'animation sur le badge — le badge apparaît et disparaît de façon instantanée au re-render. `reduceMotion` sans objet.
- [x] `accessibilityLabel` dynamique selon l'état — voir tableau ci-dessous

**Tableau complet des `accessibilityLabel` et `accessibilityState` selon état**

| État | Badge visible | `accessibilityLabel` | `disabled` |
|------|:-------------:|---------------------|:----------:|
| loading / error | Non | `"Défi du jour — chargement en cours"` | `true` |
| success, non complété | **Oui** | `"Nouveau défi du jour disponible — jouer le défi quotidien"` | `false` |
| success, complété (avant F3-17) | Non | `"Défi du jour complété — rejouer"` | `false` |
| success, complété (après F3-17) | Non | `"Défi du jour déjà complété aujourd'hui"` | `true` |

Note comportementale : le badge reste visible toute la journée tant que `isDailyCompleted === false`, y compris si le joueur a démarré une partie sans la terminer. Le badge ne disparaît qu'au retour sur HomeScreen après une victoire sur un défi quotidien — instant où `useDailyCompletionStatus` via `useFocusEffect` détecte la complétion et provoque le re-render.

### Notes pour Laurent

**1. Structure JSX — badge enfant direct du TouchableOpacity**

Le badge est le dernier enfant du `TouchableOpacity` existant, rendu conditionnellement. La condition d'affichage est `dailyChallengeState.status === 'success' && !isDailyCompleted`. Cette condition est l'exact inverse de `isDailyButtonCompleted` (déjà calculé en ligne 371 de HomeScreen) — utiliser ces deux variables existantes pour dériver `showDailyBadge` sans dupliquer la logique.

Le badge doit être ajouté dans les deux blocs JSX du `TouchableOpacity` défi : celui du `renderContent()` loading (ligne 411) et celui du `renderContent()` success (ligne 537). Dans le bloc loading, `showDailyBadge` sera toujours `false` (car `status !== 'success'`), donc le badge ne sera jamais rendu — mais la condition doit quand même être écrite pour cohérence et robustesse.

**2. `accessibilityLabel` dynamique — variable centralisée**

La variable `dailyButtonLabel` est déjà calculée avant `renderContent()` (lignes 382–386 de HomeScreen). Ajouter la branche `showDailyBadge` à cette logique ternaire existante. Le label mis à jour est lu automatiquement dans les deux branches de `renderContent()` sans duplication. Nouvelle valeur quand badge visible : `"Nouveau défi du jour disponible — jouer le défi quotidien"`.

**3. overflow sur Android — point de vigilance**

Sur iOS, `overflow: 'visible'` est le comportement par défaut sur les Views. Sur Android, les Views avec `elevation` peuvent tronquer les enfants dépassant leurs limites. Si le badge de -8pt est coupé sur Android, ajouter `overflow: 'visible'` sur les styles `dailyButton` et `dailyButtonCompleted` uniquement — pas sur `dailyButtonDisabled` (le badge n'y apparaît jamais).

**4. zIndex sur Android**

Le badge à `zIndex: 1` devrait suffire. Si le bouton "Jouer" au-dessus dans le DOM (sans `elevation` déclarée dans `playButton`) masque le badge sur Android, monter l'`elevation` du badge à 3 — cohérent avec les cards de HomeScreen (`elevation: 2`).

**5. Hauteur effective du badge et minWidth**

Le badge n'a pas de hauteur déclarée explicitement — elle découle de `paddingVertical: 2` + `fontSize: 10` × lineHeight (~1.3) ≈ 17pt. Ce comportement est intentionnel : la hauteur s'adapte au système de police de l'OS. Sur iPhone SE (320pt logiques), le bouton fait ~288pt utiles (320 - 2 × 16 marges). Le badge de 32pt minimum à `right: -8` sort de 8pt hors du `scrollContent` (paddingHorizontal 16pt) — ce dépassement est acceptable car il reste dans la SafeAreaView et ne touche pas le bord physique de l'écran.

**6. Interaction avec F3-17 — aucune coordination supplémentaire**

Les conditions `isDailyCompleted === false` (badge) et `isDailyCompleted === true` (disabled F3-17) sont mutuellement exclusives. Il n'existe aucun état où badge et `disabled={true}` coexistent. F3-19 n'a aucune dépendance d'implémentation sur F3-17 au-delà du partage de la variable `isDailyCompleted`.

```
isDailyCompleted === false  →  badge visible  +  disabled={false}
isDailyCompleted === true   →  badge absent   +  disabled={true}   (F3-17)
status !== 'success'        →  badge absent   +  disabled={true}
```

**7. Valeurs de style complètes à ajouter au StyleSheet**

Style `dailyBadge` (View badge) — nouvelles propriétés à ajouter au `StyleSheet.create` existant :
- `position: 'absolute'`
- `top: -8`
- `right: -8`
- `backgroundColor: '#2563EB'`
- `borderRadius: 10`
- `paddingHorizontal: 6`
- `paddingVertical: 2`
- `minWidth: 32`
- `alignItems: 'center'`
- `justifyContent: 'center'`
- `borderWidth: 1.5`
- `borderColor: '#FFFFFF'`
- `zIndex: 1`

Style `dailyBadgeText` (Text dans le badge) — nouvelles propriétés à ajouter :
- `fontSize: 10`
- `fontWeight: 'bold'`
- `color: '#FFFFFF'`
- `letterSpacing: 0.5`
