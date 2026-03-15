# Specs UX — F3-35 : Badge "DIFF" dans HistoryItem

**Auteur :** Benjamin (UX/UI)
**Date :** 2026-03-15
**Dépendances visuelles :** F3-02 (HistoryItem), F3-23 (badge "DÉFI"), F3-05 (HardModeIndicator GameHUD)

---

## Écran : HistoryItem — badge DIFF (mode difficile)

### Objectif
Permettre au joueur d'identifier en un coup d'oeil quelles parties de son historique ont été jouées en mode difficile, avec ou sans coexistence du badge "DÉFI".

---

### Analyse du composant existant

La ligne 1 de l'HistoryItem (`row`) contient séquentiellement :
1. Badge statut ("Victoire" vert ou "Abandonné" gris) — largeur variable ~60-80pt
2. Badge "DÉFI" (F3-23, conditionnel) — fond `#D97706`, largeur ~38pt, `marginLeft: 4`
3. Texte trajet (`flex: 1`, coupe avec ellipsis) — prend tout l'espace restant
4. Icône "↗" — largeur fixe ~22pt

Le badge DIFF s'insère dans cette séquence, après le badge "DÉFI" le cas échéant, avant le texte trajet.

---

### Layout (ASCII)

#### Cas 1 — Badge DIFF seul (mode difficile, partie non-défi)

```
┌─────────────────────────────────────────────────────┐  minHeight: 68pt
│  paddingH: 16pt  paddingV: 14pt                     │
│                                                     │
│  ┌──────────┐  ┌──────┐  Titre → Titre long…    ↗  │  Ligne 1 — row
│  │ Victoire │  │ DIFF │  flex:1 ellipsis           │
│  └──────────┘  └──────┘                             │
│  badge statut  badge DIFF                           │
│  (vert/gris)   fond #FEE2E2                         │
│                marginLeft:4                         │
│                                                     │
│  14 mars 2026                                       │  Ligne 2 — date
│  3 sauts · 0:42                                     │  Ligne 3 — stats
└─────────────────────────────────────────────────────┘
```

#### Cas 2 — Badge DÉFI + Badge DIFF simultanés

```
┌─────────────────────────────────────────────────────┐  minHeight: 68pt
│  paddingH: 16pt  paddingV: 14pt                     │
│                                                     │
│  ┌──────────┐  ┌──────┐  ┌──────┐  Titre lon…   ↗  │  Ligne 1 — row
│  │ Victoire │  │ DÉFI │  │ DIFF │  flex:1 ellips   │
│  └──────────┘  └──────┘  └──────┘                  │
│  badge statut  badge défi  badge diff               │
│                #D97706    #FEE2E2                   │
│                mL:4       mL:4                      │
│                                                     │
│  14 mars 2026                                       │  Ligne 2 — date
│  3 sauts · 0:42                                     │  Ligne 3 — stats
└─────────────────────────────────────────────────────┘
```

#### Cas 3 — Badge DÉFI + Badge DIFF sur partie Abandonné

```
┌─────────────────────────────────────────────────────┐  minHeight: 68pt
│                                                     │
│  ┌──────────┐  ┌──────┐  ┌──────┐  Titre lon…   ↗  │
│  │ Abandonné│  │ DÉFI │  │ DIFF │  flex:1           │
│  └──────────┘  └──────┘  └──────┘                  │
│  fond #F1F5F9  #D97706   #FEE2E2                   │
│                                                     │
│  14 mars 2026                                       │
│  5 sauts · 1:15                                     │
└─────────────────────────────────────────────────────┘
```

---

### Composants

#### BadgeDiff (View inline dans `row`)

| Propriété | Valeur |
|-----------|--------|
| `backgroundColor` | `#FEE2E2` |
| `paddingHorizontal` | `8` |
| `paddingVertical` | `3` |
| `borderRadius` | `4` |
| `marginLeft` | `4` |
| `accessible` | `false` |

#### Texte du BadgeDiff

| Propriété | Valeur |
|-----------|--------|
| Libellé | `"DIFF"` |
| `fontSize` | `11` |
| `fontWeight` | `'bold'` |
| `color` | `#991B1B` |

**Gabarit identique** au `badgeDaily` existant (même padding, même borderRadius, même fontSize, même fontWeight) — seule la couleur change.

---

### Règles de position dans la séquence `row`

L'ordre de lecture dans la ligne 1 est toujours :

```
[Badge statut] → [Badge DÉFI si présent] → [Badge DIFF si présent] → [Texte trajet flex:1] → [Icône ↗]
```

- Le badge DIFF vient **toujours après** le badge DÉFI quand les deux sont présents.
- `marginLeft: 4` sur le badge DIFF, comme sur le badge DÉFI (espacement uniforme entre tous les pills).
- Le texte trajet conserve `flex: 1` et `ellipsizeMode="tail"` — il absorbe naturellement la compression due aux badges supplémentaires.

**Analyse de la pression horizontale (cas 2 badges) :**
Les deux badges DÉFI + DIFF représentent environ 80pt cumulés (38 + 4 + 38 = ~80pt). Avec les marges badges + badge statut (~80pt) + icône (~22pt) + marges horizontales (32pt), le texte trajet dispose de ~180pt sur 390pt (iPhone 14). Suffisant pour afficher un titre tronqué lisible. La hauteur `minHeight: 68` reste inchangée — les badges sont alignés verticalement au centre (`alignItems: 'center'` déjà en place).

---

### États

**Default (partie standard, `difficulty` absent ou `'normal'`) :**
Aucun badge DIFF. Comportement identique à l'HistoryItem pré-F3-35.

**Default (partie difficile, `difficulty === 'hard'`) :**
Badge DIFF présent après le badge statut (et après badge DÉFI si applicable).

**Tri via SortBar (F3-10) :**
Le badge est une propriété du `record` rendu — il reste présent quelle que soit l'ordre de tri. Aucun état spécifique à gérer visuellement.

**Pas d'état loading, error ou empty** : ce composant ne fait pas de requête réseau, il reçoit les données via props.

---

### Accessibilité

- [ ] `accessibilityLabel` mis à jour sur le `TouchableOpacity` parent : ajouter le préfixe conditionnel `"Mode difficile. "` quand `isHardMode(record.difficulty) === true`
- [ ] `accessible={false}` sur la `View` badge DIFF et son `Text` enfant — information portée par le label du parent
- [ ] `accessibilityRole="button"` déjà en place sur le `TouchableOpacity` — inchangé
- [ ] Contraste texte badge DIFF : `#991B1B` sur `#FEE2E2` — 5.9:1 — conforme WCAG AA (texte normal ≥ 4.5:1)
- [ ] Ordre de lecture VoiceOver : le label synthétique du `TouchableOpacity` annonce toutes les informations pertinentes dans l'ordre logique — les badges visuels individuels sont tous `accessible={false}`
- [ ] Aucune information transmise par la couleur seule : le libellé textuel "DIFF" porte le sens, la couleur est un renforcement
- [ ] Zones tactiles : le `TouchableOpacity` couvre toute la hauteur de l'item (`minHeight: 68`) — largement supérieur à 44pt

**Pattern `accessibilityLabel` complet (ordre des préfixes) :**

```
[statut]. [Mode difficile. si hard][Défi du jour. si défi][départ] vers [destination]. [N] saut(s). [durée]. Le [date].
```

Exemples concrets :
- Partie normale : `"Victoire. Paris vers Rome. 3 sauts. 0:42. Le 14 mars 2026."`
- Partie difficile : `"Victoire. Mode difficile. Paris vers Rome. 3 sauts. 0:42. Le 14 mars 2026."`
- Défi + difficile : `"Victoire. Mode difficile. Défi du jour. Paris vers Rome. 3 sauts. 0:42. Le 14 mars 2026."`
- Abandonné + difficile : `"Abandonné. Mode difficile. Paris vers Rome. 5 sauts. 1:15. Le 14 mars 2026."`

**Choix de l'ordre "Mode difficile" avant "Défi du jour" :** la difficulté est une propriété intrinsèque de la session de jeu, le défi est une propriété de la paire d'articles. Énoncer la difficulté en premier oriente d'emblée le niveau de lecture du résultat.

---

### Notes pour Laurent

**Insertion dans le code existant :**

Le badge DIFF s'insère dans `HistoryItem.tsx` immédiatement après le bloc conditionnel `isDailyChallenge` (lignes 74-79 actuelles), en suivant le même pattern conditionnel :

```
{/* Badge défi du jour (F3-23) */}
{record.isDailyChallenge === true && (
  <View style={styles.badgeDaily} accessible={false}>...</View>
)}

{/* Badge mode difficile (F3-35) — s'insère ici, après DÉFI */}
{isHardMode(record.difficulty) && (
  <View style={styles.badgeDiff} accessible={false}>...</View>
)}
```

**Mise à jour du `accessibilityLabel` :**

Le préfixe `hardModePrefix` doit être déclaré aux côtés du `dailyChallengePrefix` existant. L'ordre dans la string est : `hardModePrefix` + `dailyChallengePrefix` + le reste (voir exemples accessibilité ci-dessus).

**Import de `isHardMode` :**

Laurent doit importer `isHardMode` depuis `difficulty.utils.ts` (même chemin que les autres utils — confirmer avec Maxime le chemin exact dans le monorepo). La fonction attend la valeur de `record.difficulty` — s'assurer que `GameRecord` expose bien ce champ (dépendance F3-05 à vérifier).

**Pas de nouveau token couleur :**

`#FEE2E2` et `#991B1B` sont des tokens existants (documentés depuis F3-05, HardModeIndicator GameHUD et HardModeBadge VictoryScreen). Réutilisation stricte, pas d'ajout au design system.

**Style à ajouter dans `StyleSheet.create()` :**

```
badgeDiff: {
  paddingHorizontal: 8,
  paddingVertical: 3,
  borderRadius: 4,
  backgroundColor: '#FEE2E2',
  marginLeft: 4,
},
badgeDiffText: {
  fontSize: 11,
  fontWeight: 'bold',
  color: '#991B1B',
},
```

Ces valeurs sont les spécifications visuelles — la traduction en code React Native est de la responsabilité de Laurent.
