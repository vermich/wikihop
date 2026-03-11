# Spécifications visuelles — F3-08 — StatsScreen (Statistiques personnelles)

**Auteur :** Benjamin — UX/UI Designer
**Date :** 2026-03-11
**Story liée :** F3-08
**Dépend de :** F3-02 (GameRecord, ScoreStorage), F3-10 (non bloquant)
**Écrans concernés :** StatsScreen (nouvel écran), HistoryScreen (point d'accès)

---

## Décisions de design préalables

### Point d'accès : icône dans le header de HistoryScreen

La story F3-08 ne précise pas où StatsScreen est accessible depuis. Trois options ont été évaluées.

**Option A — Bouton dans la HomeScreen**
Écarté. La HomeScreen est déjà chargée (Jouer, Défi du jour, Nouveaux articles, Mode difficile, Historique, Soutenir Wikipedia, À propos). Les stats sont une fonctionnalité secondaire de consultation. Les y ajouter dégraderait la hiérarchie d'actions.

**Option B — Tab dédié dans une BottomTabNavigation**
Écarté. WikiHop n'a pas de navigation à onglets — architecture à pile (Stack Navigator). Introduire une BottomTabNavigation uniquement pour les stats serait une décision d'architecture, pas de design. Hors périmètre Benjamin.

**Option C retenue — Icône dans le header de HistoryScreen**
L'historique est la source des stats. Il est naturel de passer des parties listées aux statistiques agrégées depuis le même écran. Un bouton icône "📊" dans le coin droit du header de HistoryScreen est un pattern établi (iOS Settings, Fitbit). Il ne perturbe pas le layout existant et préserve le titre "Historique" centré.

Spécification du bouton d'accès dans HistoryScreen : icône graphique dans le header, coin supérieur droit, zone tactile 44×44pt, `accessibilityLabel="Voir mes statistiques"`, `accessibilityRole="button"`. L'icône utilisée est le caractère Unicode "⊞" ou, mieux, une icône de bibliothèque — voir note Laurent.

### Graphique des 7 dernières parties : barres verticales simples

Deux options graphiques ont été évaluées.

**Option A — Graphique en ligne (sparkline)**
Écarté. Une ligne avec 7 points sur mobile (375pt) produit des segments très courts et difficiles à lire. La variation de valeur (sauts) est mieux rendue par des hauteurs de barres que par une courbe.

**Option B retenue — Barres verticales**
Un graphique à barres verticales avec 7 colonnes. Chaque barre représente une partie, de la plus ancienne (gauche) à la plus récente (droite). La hauteur d'une barre est proportionnelle au nombre de sauts. La couleur de la barre signale le statut : `#16A34A` pour une victoire, `#94A3B8` pour un abandon. Un label numérique au-dessus de chaque barre indique la valeur exacte (nombre de sauts).

Ce graphique est réalisable en React Native pur (View + flexDirection row) sans librairie externe. Les barres sont des View avec `height` calculé proportionnellement à la valeur max. Aucune dépendance npm supplémentaire n'est nécessaire.

### Métriques affichées : 4 blocs chiffrés + graphique

Les métriques calculées depuis `ScoreStorage.getAll()` sont :
1. **Parties jouées** : `records.length`
2. **Taux de victoire** : `records.filter(r => r.status === 'won').length / records.length * 100`, arrondi à l'unité, affiché en `%`
3. **Moyenne de sauts** : `records.reduce((acc, r) => acc + r.jumps, 0) / records.length`, arrondi à l'unité. Calculé sur toutes les parties (victoires + abandons) pour ne pas biaiser.
4. **Meilleur temps** : `Math.min(...records.filter(r => r.status === 'won').map(r => r.durationMs))`, formaté avec `formatDuration`. Calculé uniquement sur les victoires (un abandon n'est pas un "meilleur temps"). Affiché "—" si aucune victoire.

Ces métriques correspondent exactement aux critères d'acceptance de F3-08.

---

## Écran : StatsScreen

### Objectif

Permettre au joueur de visualiser ses statistiques globales calculées depuis son historique local.

### Layout (ASCII)

```
┌─────────────────────────────────────┐  [FIXED - SafeAreaView top]
│  ←   Mes statistiques              │  Header 64pt
├─────────────────────────────────────┤  Bordure #E2E8F0 1pt
│                                     │  [SCROLL - ScrollView]
│  ┌───────────────────────────────┐  │  paddingTop: 20pt
│  │  PARTIES JOUÉES               │  │
│  │       42                      │  │  Bloc stat — pleine largeur
│  └───────────────────────────────┘  │
│                                     │  gap: 1pt (bordure entre blocs)
│  ┌──────────────────┐ ┌──────────┐  │
│  │  TAUX VICTOIRE   │ │  MOY.    │  │  Deux blocs côte à côte
│  │       73 %       │ │  SAUTS   │  │  flex: 1 chacun
│  └──────────────────┘ │    8     │  │  gap: 1pt entre eux
│                       └──────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  MEILLEUR TEMPS               │  │  Bloc pleine largeur
│  │       1 min 42 s              │  │
│  └───────────────────────────────┘  │
│                                     │  marginTop: 24pt
│  ──────────────────────────────     │  Séparateur #E2E8F0 1pt
│                                     │
│  7 DERNIÈRES PARTIES                │  Titre section — Caption Bold 13px
│                                     │  uppercase, #64748B
│  ┌───────────────────────────────┐  │
│  │  [Graphique barres 7 parties] │  │  Hauteur 140pt fixe
│  │                               │  │
│  │   ▌  ▌  ▌  ▌  ▌  ▌  ▌        │  │
│  │   ▌  ▌  ▌  ▌  ▌  ▌  ▌        │  │
│  │   ▌  ▌  ▌  ▌  ▌  ▌  ▌        │  │
│  │  15  9  12  7   8   5  3      │  │  Labels sauts
│  │  (axe X : date abrégée)       │  │
│  └───────────────────────────────┘  │
│                                     │
│  [padding bottom 32pt]              │
└─────────────────────────────────────┘
```

**Zoom sur les blocs métriques**

```
Bloc pleine largeur (Parties jouées, Meilleur temps) :
┌───────────────────────────────────────────────────────┐
│  PARTIES JOUÉES                                       │  label Caption Bold 13px #64748B
│                                                       │  uppercase, letterSpacing: 0.8
│            42                                         │  valeur Bold 36px #1E293B
│                                                       │  paddingVertical: 20pt
└───────────────────────────────────────────────────────┘
  paddingHorizontal: 16pt — fond #FFFFFF — bordure #E2E8F0 1pt bas

Bloc demi-largeur (Taux victoire, Moy. sauts) :
┌──────────────────────────┐ ┌──────────────────────────┐
│  TAUX DE VICTOIRE        │ │  MOYENNE SAUTS           │
│                          │ │                          │
│         73 %             │ │          8               │
│                          │ │                          │
└──────────────────────────┘ └──────────────────────────┘
  flex: 1                      flex: 1
  paddingHorizontal: 16pt      bordure gauche #E2E8F0 1pt
  paddingVertical: 20pt
```

**Zoom sur le graphique à barres**

```
┌────────────────────────────────────────────────────────┐  hauteur 140pt fixe
│                                                        │  paddingHorizontal: 16pt
│        12                                              │  labels sauts au-dessus
│    15       9       7    8                             │
│                              5       3                 │  Bold 11px #1E293B
│  ┌──┐  ┌──┐  ┌──┐  ┌──┐  ┌──┐  ┌──┐  ┌──┐           │
│  │  │  │  │  │  │  │  │  │  │  │  │  │  │           │  barres proportionnelles
│  │  │  │  │  │  │  │  │  │  │  │  │  │  │           │  victoire: #16A34A
│  │  │  │  │  │  │  │  │  │  │  │  │  │  │           │  abandon: #94A3B8
│  └──┘  └──┘  └──┘  └──┘  └──┘  └──┘  └──┘           │  width: 28pt chacune
│  6/03  7/03  8/03  9/03 10/03 11/03 12/03             │  labels dates
│                                                        │  Regular 10px #94A3B8
└────────────────────────────────────────────────────────┘
```

Hauteur d'une barre = `(valeur / valeurMax) * maxHauteurBarre` où `maxHauteurBarre` = hauteur totale graphique (140pt) - hauteur label supérieur (18pt) - hauteur label inférieur (16pt) = 106pt. Si toutes les valeurs sont identiques, toutes les barres sont à hauteur max. Si `valeurMax === 0` (partie jouée sans aucun saut), toutes les barres s'affichent à hauteur minimale de 4pt.

### Composants

- **Header** — Identique au pattern header existant. Hauteur 64pt, fond `#FFFFFF`, bordure bas `#E2E8F0` 1pt. Bouton retour "←" à gauche (44×44pt, `accessibilityLabel="Retour à l'historique"`). Titre "Mes statistiques" centré Bold 24px `#1E293B`, `accessibilityRole="header"`.

- **GrilleMetriques** — View `flexDirection: 'column'`, contient : ligne 1 (BlocStat pleine largeur "Parties jouées"), ligne 2 (`flexDirection: 'row'` : BlocStat demi-largeur "Taux victoire" + BlocStat demi-largeur "Moy. sauts"), ligne 3 (BlocStat pleine largeur "Meilleur temps"). Les blocs sont séparés par des bordures `#E2E8F0` 1pt (pas de margins, les bordures sont intégrées aux blocs). Le bloc demi-largeur droit a une `borderLeftWidth: 1` `#E2E8F0` pour séparer les deux colonnes. La grille elle-même a une `borderWidth: 1` `borderColor: '#E2E8F0'` `borderRadius: 12pt` et un `overflow: 'hidden'` pour que les coins arrondis s'appliquent aux blocs enfants. `marginHorizontal: 16pt`.

- **BlocStat** — View. `paddingHorizontal: 16pt`, `paddingVertical: 20pt`. Label : Text Caption Bold 13px `#64748B`, uppercase, `letterSpacing: 0.8`, `marginBottom: 8pt`. Valeur : Text Bold 36px `#1E293B` (pleine largeur) ou Bold 28px `#1E293B` (demi-largeur — réduit pour éviter le débordement sur petits écrans). Alignement : label `textAlign: 'left'`, valeur `textAlign: 'center'`.

- **SectionGraphique** — View, `marginTop: 24pt`, `paddingHorizontal: 16pt`.

- **TitreSection** — Text Caption Bold 13px `#64748B`, uppercase, `letterSpacing: 0.8`, `marginBottom: 16pt`.

- **GraphiqueBarres** — View `flexDirection: 'row'`, `alignItems: 'flex-end'`, hauteur 140pt fixe, `justifyContent: 'space-between'`. Contient 7 `BarreItem` (ou moins si l'historique a moins de 7 parties). L'espace entre barres est géré par `justifyContent: 'space-between'`.

- **BarreItem** — View `flexDirection: 'column'`, `alignItems: 'center'`, `width: 28pt`. Contient : Text label sauts (Bold 11px `#1E293B`, `marginBottom: 4pt`), View barre (`width: 24pt`, `height` calculé, `borderRadius: 3pt`, fond `#16A34A` si victoire ou `#94A3B8` si abandon, `minHeight: 4pt`), Text label date (Regular 10px `#94A3B8`, `marginTop: 4pt`).

- **Légende** — View `flexDirection: 'row'`, `gap: 16pt`, `marginTop: 12pt`, `justifyContent: 'center'`. Deux items : carré 10×10pt `#16A34A` + Text "Victoire" Regular 12px `#64748B`, carré 10×10pt `#94A3B8` + Text "Abandonné" Regular 12px `#64748B`. Renseigne le code couleur du graphique textuellement.

### États

- **Default :** Toutes les métriques calculées et affichées. Graphique des 7 dernières parties.

- **Loading :** Skeleton pendant le calcul (chargement AsyncStorage). Skeleton blocs métriques : 4 rectangles `#F1F5F9` aux dimensions des blocs métriques. Skeleton graphique : 7 rectangles `#F1F5F9` de hauteur aléatoire entre 40 et 100pt. Animation pulse si `reduceMotion` inactif (opacité 0.6 ↔ 1.0, durée 1.2s).

- **Error :** Sans objet — `ScoreStorage.getAll()` retourne `[]` en cas d'erreur. L'état vide s'affiche à la place.

- **Empty (aucune partie jouée) :**
  - Blocs métriques : valeurs affichées comme "—" (tiret em, U+2014) pour toutes les métriques numériques. Taux victoire : "—". Meilleur temps : "—". Ces valeurs "—" signalent visuellement l'absence de données sans casser le layout.
  - Graphique : remplacé par un message centré dans la zone du graphique : Text Regular 14px `#64748B` "Jouez votre première partie pour voir votre progression ici."

- **Moins de 7 parties :** Le graphique n'affiche que les N parties disponibles (N < 7), sans espaces vides. `justifyContent: 'flex-end'` pour aligner les barres à droite si N < 7 — les parties les plus récentes sont toujours visibles.

### Accessibilité

- [ ] `accessibilityRole="header"` sur le titre "Mes statistiques"
- [ ] `accessibilityLabel="Retour à l'historique"` et `accessibilityRole="button"` sur le bouton retour
- [ ] Chaque `BlocStat` : `accessible={true}`, `accessibilityLabel` complet. Exemples : `"Parties jouées : 42"`, `"Taux de victoire : 73 pourcent"`, `"Moyenne de sauts : 8 sauts par partie"`, `"Meilleur temps : 1 minute et 42 secondes"`. Les valeurs "—" se lisent `"Non disponible"`.
- [ ] Label et valeur dans chaque BlocStat : `accessible={false}` — l'information est portée par le label du conteneur
- [ ] `accessibilityRole="none"` sur `BlocStat` (pas un bouton, pas un lien) — le role "none" indique un élément groupé non interactif
- [ ] Graphique `GraphiqueBarres` : `accessible={true}`, `accessibilityLabel` synthétisant les données. Format : `"Graphique des 7 dernières parties. Parties de gauche à droite : [liste des parties avec date, sauts et statut]."` Exemple : `"Graphique des 7 dernières parties. 6 mars : 15 sauts, victoire. 7 mars : 9 sauts, victoire. ..."`. Les `BarreItem` individuels sont `accessible={false}` — toute l'information est dans le label du conteneur.
- [ ] Légende : `accessibilityLabel="Légende : barre verte = Victoire, barre grise = Abandonné"` sur le conteneur View. Ses enfants `accessible={false}`.
- [ ] Aucune information transmise uniquement par la couleur dans le graphique : le statut est textuellement dans l'accessibilityLabel du graphique. La légende textuelle renforce la distinction couleur.
- [ ] Contraste label métriques `#64748B` sur `#FFFFFF` : 4.6:1 — conforme WCAG AA
- [ ] Contraste valeur métriques `#1E293B` sur `#FFFFFF` : 16.1:1 — conforme
- [ ] Contraste label barre sauts `#1E293B` sur `#FFFFFF` : 16.1:1 — conforme
- [ ] Contraste label date barre `#94A3B8` sur `#FFFFFF` : 2.9:1 — INSUFFISANT pour texte normal (seuil 4.5:1). Ce label est purement décoratif et toutes ses informations sont dans l'accessibilityLabel du graphique. Marquer le Text date comme `accessible={false}` et le rendre `aria-hidden`. Le contraste insuffisant est acceptable car le texte n'est pas le seul vecteur de l'information (règle WCAG 1.4.3 : le contraste s'applique aux textes porteurs d'information non disponible autrement).
- [ ] Zones tactiles : bouton retour 44×44pt — le reste de l'écran est non interactif
- [ ] Ordre de lecture VoiceOver : Header (bouton retour → titre) → BlocStat Parties jouées → BlocStat Taux victoire → BlocStat Moy. sauts → BlocStat Meilleur temps → TitreSection "7 dernières parties" → GraphiqueBarres (annonce complète) → Légende
- [ ] Skeleton loading : `accessibilityElementsHidden={true}` sur les blocs skeleton, `AccessibilityInfo.announceForAccessibility("Chargement de vos statistiques")` au montage si `isLoading`
- [ ] Animation skeleton pulse : respecte `AccessibilityInfo.isReduceMotionEnabled()` — skeleton statique si `reduceMotion` actif

### Notes pour Laurent

- **Point d'entrée dans HistoryScreen** : ajouter un bouton icône dans le coin droit du header de HistoryScreen. Le header existant a le titre en `position: 'absolute', left: 0, right: 0` et le bouton retour en `position: 'absolute', left: 16`. Ajouter le bouton stats en `position: 'absolute', right: 16`, zone tactile 44×44pt. Pour l'icône, utiliser un caractère Unicode si @expo/vector-icons n'est pas déjà dans le projet, ou l'icône `bar-chart-2` de Feather si disponible. Ne pas introduire une nouvelle dépendance icon uniquement pour cet écran.

- **Navigation** : `navigation.navigate('Stats')` depuis HistoryScreen. Ajouter `Stats: undefined` dans `RootStackParamList`.

- **Calcul des métriques** : les 4 métriques sont des fonctions pures soumises à TDD strict. Fichier recommandé : `apps/mobile/src/utils/stats.utils.ts`. Fonctions à définir : `computeTotalGames(records)`, `computeWinRate(records)`, `computeAverageJumps(records)`, `computeBestTime(records)`. Chacune retourne un `number | null` (null = pas de données). Le formatage est séparé du calcul.

- **Graphique sans librairie** : le graphique est réalisable avec des View React Native. La hauteur de chaque barre est calculée comme `Math.round((sauts / maxSauts) * MAX_BAR_HEIGHT)`. `MAX_BAR_HEIGHT` = 106pt (voir ci-dessus). Aucune librairie de graphiques (Victory Native, react-native-chart-kit) n'est nécessaire ni souhaitée pour ce niveau de complexité.

- **Label date dans le graphique** : format court `"J/MM"` (ex. `"6/03"`), calculé depuis `record.completedAt` via une nouvelle fonction `formatShortDate(isoString): string` dans `stats.utils.ts`. Ce format est compatible avec l'espace disponible (28pt par barre).

- **Cas "meilleur temps" sur partie abandonnée** : `computeBestTime` filtre les records avec `status === 'won'` avant de calculer le min. Si aucune victoire, retourne `null`, affiché "—".

- **Arrondi du taux de victoire** : `Math.round(winRate)`, pas `Math.floor`. Si l'historique est vide, retourner `null`.

- **Ordre des parties dans le graphique** : les 7 parties les plus récentes (par `completedAt` DESC), inversées pour affichage gauche→droite chronologique. Donc : `records.slice(0, 7).reverse()`.

- **Grille métriques avec bordures** : l'approche `borderWidth` + `overflow: 'hidden'` sur le conteneur peut poser des problèmes sur Android avec les coins arrondis. Alternative si besoin : utiliser `borderRadius` uniquement sur les 4 coins du conteneur et des bordures internes séparées (View de 1pt hauteur/largeur comme séparateurs). Tester sur Android avant de valider l'approche.
