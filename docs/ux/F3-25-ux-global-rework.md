# Specs UX/UI — F3-25 : Refonte UX/UI globale

> Benjamin — UX/UI Designer WikiHop
> Date : 2026-03-15
> Story : docs/stories/phase-3/🔄-F3-25-ux-ui-global-rework.md

---

## Critère 1 — Renommage "Historique" → "Historique des parties"

### Occurrences à modifier

**HomeScreen.tsx**

| Ligne | Contenu actuel | Contenu cible |
|-------|----------------|---------------|
| 493 | `{'Historique'}` (texte bouton, branche loading) | `{'Historique des parties'}` |
| 488–490 | `accessibilityLabel="Voir mon historique de parties"` | inchangé (déjà correct) |
| 629 | `{'Historique'}` (texte bouton, branche success) | `{'Historique des parties'}` |
| 623–625 | `accessibilityLabel="Voir mon historique de parties"` | inchangé (déjà correct) |

**HistoryScreen.tsx**

| Ligne | Contenu actuel | Contenu cible |
|-------|----------------|---------------|
| 98 | `{'Historique'}` (titre header) | `{'Historique des parties'}` |

**Note : titre de navigation**
Le titre affiché dans le header de HistoryScreen est rendu via le composant `Header` interne (pas via `options.title` de React Navigation). Seul le `Text` ligne 98 est à modifier. Si le `RootNavigator` définit un `title` pour la route `'History'`, Laurent doit aussi le mettre à jour — à vérifier.

### Composant Header — avant / après

```
AVANT
┌─────────────────────────────────┐
│  ←   Historique            ⊞   │  h:64
└─────────────────────────────────┘

APRÈS
┌─────────────────────────────────┐
│  ←   Historique des parties ▦  │  h:64
└─────────────────────────────────┘
```

Note : "Historique des parties" est plus long que "Historique". Voir le critère 7 pour le remplacement de l'icone ⊞. Laurent devra vérifier que le titre ne tronque pas sur petit écran (iPhone SE 375pt). Si tronqué, passer le titre à `fontSize: 20` au lieu de 24.

---

## Critère 2 — Toggle mode difficile repositionné dans le header HomeScreen

### Problème actuel

Le toggle "Mode difficile" est positionné dans la ScrollView, après les boutons principaux. Il nécessite de scroller pour être atteint. La story demande son repositionnement à **gauche du titre "WikiHop"** dans le header.

### Layout header — avant

```
┌─────────────────────────────────────┐  h:64
│           WikiHop         FR | EN   │
│    (titre flex:1 centré)  (abs r16) │
└─────────────────────────────────────┘
```

### Layout header — après

```
┌─────────────────────────────────────┐  h:64
│  [DIFF]    WikiHop         FR | EN  │
│  (abs l16) (titre flex:1)  (abs r16)│
└─────────────────────────────────────┘
```

### Composant DifficultyHeaderToggle

- **Position :** `position: 'absolute'`, `left: 16`, centré verticalement dans le header (h:64 → `top: 10`, ou `alignItems: 'center'` via View enveloppante)
- **Dimensions zone tactile :** 44×44pt minimum — le Switch RN natif est ~50×30pt, acceptable
- **Libellé visible :** Supprimer le `Text` "Mode difficile" (trop long dans le header). Le Switch seul suffit, accompagné d'un `accessibilityLabel` complet.
- **Accessibilité :** `accessibilityLabel` = `isDifficultyHard ? 'Mode difficile activé — désactiver' : 'Mode difficile désactivé — activer'`
- **Couleurs :** identiques à l'existant — `trackColor: { false: '#E2E8F0', true: '#FECACA' }`, `thumbColor: isDifficultyHard ? '#EF4444' : '#FFFFFF'`

### États

- **Default (normal) :** Switch thumb blanc, piste grise `#E2E8F0`
- **Hard activé :** Switch thumb `#EF4444`, piste rose `#FECACA`

### Suppression dans la ScrollView

Le bloc `difficultyToggleRow` (lignes 476–486 branche loading et 612–622 branche success) est **retiré des deux branches** de `renderContent()`. Il ne reste qu'une seule instance dans le header, toujours visible quel que soit l'état de chargement.

### Notes pour Laurent

- La View du header est actuellement `flexDirection: 'row'`. Le titre utilise `flex: 1` et `textAlign: 'center'`. Le sélecteur langue est en `position: 'absolute', right: 16`. Le Switch s'ajoute en `position: 'absolute', left: 16` — même pattern que le sélecteur langue.
- Le Switch doit être enveloppé dans une View `{ width: 44, height: 44, justifyContent: 'center' }` pour garantir la zone tactile.
- Sur iOS le Switch mesure ~51×31pt de tappable nativement, c'est suffisant. Sur Android le thumb peut être plus petit — la View enveloppante assure les 44pt.

---

## Critère 3 — VictoryScreen : bouton article cible visible sans scroll

### Problème actuel

Le bouton "Lire '[titre]'" est positionné en bas de la ScrollView, après le bloc stats ET la section "Chemin parcouru" (qui peut compter de nombreux items). Sur une partie longue (8-10 articles), ce bouton est hors de l'écran au chargement initial.

### Solution retenue

Déplacer le bouton "Lire '[titre]'" de la ScrollView vers la **zone sticky du bas**, juste au-dessus des boutons primaires. La zone sticky devient le point d'entrée pour toutes les actions principales.

### Layout VictoryScreen — avant (zone sticky)

```
[FIXED - Zone sticky]
┌─────────────────────────────────┐
│  [Nouvelle partie] [Rejouer]    │  h:52 chacun, flex:1
│  [Partager]                     │  h:44 texte gris
│  [Voir l'historique]            │  h:44 texte gris  ← SUPPRIMÉ (critère 4)
└─────────────────────────────────┘
```

### Layout VictoryScreen — après (zone sticky)

```
[FIXED - Zone sticky]
┌─────────────────────────────────┐
│  [Lire "Titre cible"]           │  h:48 outline bleu — REMONTÉ ICI
├─────────────────────────────────┤
│  [Nouvelle partie] [Rejouer]    │  h:52 chacun, flex:1
│  [Partager]                     │  h:44 texte gris  ← voir critère 5
└─────────────────────────────────┘
```

### Composant ReadButton (dans stickyButtons)

- **Hauteur :** 48pt
- **Style :** outline, bordure 1pt `#2563EB`, borderRadius 8pt, fond `#FFFFFF`
- **Texte :** `fontSize: 16`, `color: '#2563EB'`
- **Libellé :** `Lire "[titre tronqué]"` — conserver la troncature existante à 20 caractères
- **Position :** premier élément dans `stickyButtons`, au-dessus de `primaryButtonsRow`
- **accessibilityLabel :** `Lire l'article [titre complet]` (titre non tronqué pour le lecteur d'écran)
- **Visibilité :** affiché en toutes circonstances (solo, défi quotidien, multijoueur). En mode multijoueur le bouton "Lire" reste pertinent.
- **Séparation :** `marginBottom: 12` entre le ReadButton et le `primaryButtonsRow`

### ScrollView — contenu après déplacement

La ScrollView ne contient plus que :
1. Bloc stats animé
2. Section "Chemin parcouru"

Le `sectionSeparator` (ligne 472) et le `readButton` (lignes 475–482) sont retirés de la ScrollView.

---

## Critère 4 — VictoryScreen : supprimer le lien vers l'historique

### Suppression

Le bouton `historyButton` (lignes 523–532 dans VictoryScreen) est **retiré définitivement**.

```
// SUPPRIMER ces lignes :
{!isMultiplayerActive && (
  <TouchableOpacity
    style={styles.historyButton}
    onPress={() => { navigation.navigate('History'); }}
    ...
  >
    <Text>{"Voir l'historique"}</Text>
  </TouchableOpacity>
)}
```

Les styles associés `historyButton` et `historyButtonText` sont également supprimés (code mort sinon).

---

## Critère 5 — VictoryScreen : intégrer le partage

### Contexte

Avec la suppression du lien historique, la zone sticky perd un élément. Le bouton "Partager" existant est déjà en place (lignes 514–521) mais en style texte gris (`color: '#64748B'`). Il reste dans la zone sticky mais gagne en visibilité.

### Solution retenue : bouton Partager en texte primaire

Le partage reste en style texte, mais avec une couleur plus visible : `#2563EB` au lieu de `#64748B`. Il prend la place visuelle laissée par le lien historique supprimé.

### Layout zone sticky — état final

```
[FIXED - Zone sticky]  paddingH:16, paddingTop:12, paddingBottom:4
┌─────────────────────────────────────┐  [SafeAreaView bottom]
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Lire "Titre cible"         │   │  h:48, outline #2563EB
│  └─────────────────────────────┘   │
│                                     │  marginBottom:12
│  ┌──────────────┐ ┌──────────────┐ │
│  │ Nouvelle     │ │   Rejouer    │ │  h:52 chacun, flex:1
│  │ partie       │ │              │ │  bleu plein / outline bleu
│  └──────────────┘ └──────────────┘ │
│                                     │  marginTop:8
│         Partager  ↑                │  h:44, texte #2563EB, centré
│                                     │
└─────────────────────────────────────┘
```

**Mode multijoueur :** le bouton Rejouer est absent (logique existante inchangée), "Nouvelle partie" occupe toute la largeur. Le ReadButton et le bouton Partager restent présents.

**Mode défi quotidien :** idem, Rejouer absent, NewGame pleine largeur.

### Composant ShareButton — après

- **Hauteur :** 44pt (inchangé)
- **Texte :** `'Partager  ↑'` — la flèche vers le haut signale l'action de partage sans icone externe
- **Couleur texte :** `#2563EB` (était `#64748B`) — contraste sur `#FFFFFF` : 4.6:1, conforme AA
- **accessibilityLabel :** `'Partager mon résultat'` (inchangé)

### Note : icone de partage

La flèche `↑` est décorative (`accessible={false}` sur le Text si séparé). Si Laurent préfère garder le texte "Partager" seul sans flèche, c'est acceptable — l'important est la couleur bleue pour la hiérarchie visuelle.

---

## Critère 6 — Filtres tri historique : 3 états par bouton

### Problème actuel

6 chips indépendants (Date ↓ / Date ↑ / Durée ↑ / Durée ↓ / Sauts ↑ / Sauts ↓). L'utilisateur doit trouver la paire correspondant au critère voulu. L'interface est surchargée.

### Solution : 3 boutons à 3 états cycliques

**3 boutons visibles :** Date — Sauts — Durée

**Chaque bouton cycle en 3 états :**
1. **Neutre** (aucun tri actif sur ce critère) — fond `#F1F5F9`, texte `#64748B`
2. **Ascendant ↑** — fond `#2563EB`, texte `#FFFFFF`, flèche ↑ dans le libellé
3. **Descendant ↓** — fond `#2563EB`, texte `#FFFFFF`, flèche ↓ dans le libellé

Un seul bouton peut être actif à la fois (les deux autres passent en neutre).

### Layout SortBar — après

```
┌───────────────────────────────────────────┐  h:52, bordure bas #E2E8F0
│  ┌──────────┐  ┌──────────┐  ┌─────────┐ │  paddingH:12
│  │   Date   │  │  Sauts ↑ │  │  Durée  │ │  chips h:32, borderRadius:20
│  └──────────┘  └──────────┘  └─────────┘ │
└───────────────────────────────────────────┘
     neutre       actif↑          neutre
```

### Composant SortButton — états

```
État NEUTRE
  fond: #F1F5F9       borderRadius: 20
  texte: "Date"       fontSize:13, color:#64748B
  hauteur: 32pt       paddingH:14

État ASCENDANT
  fond: #2563EB
  texte: "Date ↑"     fontSize:13, fontWeight:bold, color:#FFFFFF
  hauteur: 32pt

État DESCENDANT
  fond: #2563EB
  texte: "Date ↓"     fontSize:13, fontWeight:bold, color:#FFFFFF
  hauteur: 32pt
```

### Logique de cycle au tap

```
Tap sur un bouton NEUTRE  → passe à ASCENDANT (↑)
Tap sur un bouton ASCENDANT → passe à DESCENDANT (↓)
Tap sur un bouton DESCENDANT → passe à NEUTRE
  (quand un bouton revient à NEUTRE : appliquer le tri par défaut date_desc)
```

### Type SortState (donnée pour Laurent)

Le nouveau modèle remplace `SortCriterion` (6 valeurs) par :

```
criterion: 'date' | 'jumps' | 'duration'
direction: 'asc' | 'desc' | null  (null = neutre)
```

Quand `direction === null`, on applique `date_desc` comme tri de fallback. Les fonctions `sortRecords` existantes sont compatibles — Laurent peut mapper vers les anciens `SortCriterion` en interne.

**Note Tech Lead requis :** la modification du type `SortCriterion` et de `useHistorySort` est une décision technique — Laurent devra valider l'approche de migration avec Maxime.

### Accessibilité SortButton

- `accessibilityRole="button"` sur chaque chip
- `accessibilityState={{ selected: isActive }}` — `selected: true` quand le bouton est en état ascendant ou descendant
- `accessibilityLabel` selon l'état courant et l'action déclenchée par le prochain tap :

| État actuel | accessibilityLabel |
|-------------|-------------------|
| Neutre | `"Trier par date — tap pour trier du plus ancien au plus récent"` |
| Ascendant ↑ | `"Date, tri croissant actif — tap pour inverser"` |
| Descendant ↓ | `"Date, tri décroissant actif — tap pour désactiver"` |

(Adapter pour Sauts et Durée)

- `hitSlop: { top: 6, bottom: 6, left: 4, right: 4 }` — maintenu pour atteindre 44pt tactile

---

## Critère 7 — Remplacement de l'icone ⊞

### Problème actuel

L'icone ⊞ (caractère Unicode "squared plus") est un caractère ambigu. Il ne désigne pas visuellement des statistiques ou un graphique. Les utilisateurs ne comprennent pas qu'il donne accès aux stats.

### Solution retenue : texte "Stats" avec style distinct

Remplacer l'icone par le texte **"Stats"** avec un style qui signale clairement qu'il s'agit d'un bouton secondaire de navigation.

### Composant StatsHeaderButton — après

```
AVANT                    APRÈS
┌─────────────────┐      ┌──────────────────────┐
│        ⊞        │  →   │        Stats         │
│  w:44 h:44      │      │  w:≥44 h:44          │
│  fontSize:20    │      │  fontSize:13 Bold     │
└─────────────────┘      │  color:#2563EB       │
                         └──────────────────────┘
```

### Spécifications

- **Texte :** `'Stats'`
- **Font :** `fontSize: 13`, `fontWeight: 'bold'`
- **Couleur :** `#2563EB` — identifie visuellement un lien/action interactive, contraste 4.6:1 sur `#FFFFFF`
- **Zone tactile :** `minWidth: 44`, `height: 44`, `paddingHorizontal: 8`, `alignItems: 'center'`, `justifyContent: 'center'`
- **Position :** `position: 'absolute'`, `right: 16` — identique à l'existant
- **accessibilityLabel :** `'Voir mes statistiques'` (inchangé)
- **accessibilityRole :** `'button'` (inchangé)

### Conséquence sur la largeur du titre header HistoryScreen

Avec "Historique des parties" (critère 1) et "Stats" à droite, vérifier que le titre ne chevauche pas le bouton Stats sur iPhone SE (375pt). Si chevauchement :
- Réduire le titre à `fontSize: 18` ou `fontSize: 20`
- Alternative : ne pas utiliser `position: absolute` pour les boutons gauche/droite mais une structure `flexDirection: 'row'` avec View spacer

Laurent doit tester sur 375pt de large.

---

## Critère 8 — Bouton "À propos" au-dessus de la ligne de flottaison

### Localisation actuelle

"À propos" est dans la ScrollView de HomeScreen (lignes 503–510 branche success, lignes 503–510 branche loading), après les boutons :
1. Jouer
2. Défi du jour
3. Multijoueur
4. Nouveaux articles
5. Mode difficile (toggle — déplacé dans le header par le critère 2)
6. Historique des parties
7. Soutenir Wikipedia
8. À propos ← hors de l'écran sans scroll

### Analyse de la ligne de flottaison

Sur un iPhone standard (844pt de hauteur disponible) :
- Header : 64pt
- Séparateur : 1pt
- ScrollView contenu : `paddingTop: 16`
- ArticleCard départ : ~130pt
- Flèche inter-carte : 12pt × 2 + ~20pt (icon) = ~44pt
- ArticleCard destination : ~130pt
- Boutons zone : `marginTop: 24` + Jouer (52) + Défi (52+mt12) + Multijoueur (52+mt12) + Refresh (44+mt12)

Cela donne ~520pt de contenu avant même d'atteindre "Historique des parties". Sur 844pt disponibles après header, il reste ~260pt — insuffisant pour afficher tous les boutons, le toggle ET "Soutenir Wikipedia" + "À propos".

### Solution : réorganiser les boutons secondaires

Les boutons "Historique des parties", "Soutenir Wikipedia" et "À propos" sont des **actions secondaires de navigation**. Ils ne doivent pas allonger la liste principale.

**Proposition : section liens secondaires compacte en dessous du bouton Refresh**

```
┌─────────────────────────────────────────┐  [SCROLL]
│  [Carte départ]                         │
│      ↓                                  │
│  [Carte destination]                    │
│                                         │
│  ┌─────────────────────────────────┐   │  mt:24
│  │  Jouer                          │   │  h:52 bleu
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │  mt:12
│  │  Défi du jour                   │   │  h:52 ambre
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │  mt:12
│  │  Multijoueur                    │   │  h:52 outline bleu
│  └─────────────────────────────────┘   │
│                                         │  mt:12
│     Nouveaux articles  ↺               │  h:44 texte bleu
│                                         │
│  ─────────────────────────────────      │  séparateur #E2E8F0 mt:16
│                                         │
│  Historique des parties                │  h:44 texte #64748B
│  Soutenir Wikipedia                    │  h:44 texte #64748B
│  À propos                              │  h:44 texte #64748B
│                                         │
└─────────────────────────────────────────┘
```

La section liens secondaires (3 boutons de 44pt chacun, soit 132pt au total) vient **immédiatement après le bouton Refresh**, sans espacement excessif. Cela permet d'atteindre "À propos" sans scroll ou avec un scroll minime selon la hauteur d'écran.

### Calcul de visibilité — après réorganisation

Hauteur occupée avant les liens secondaires :
- paddingTop 16 + ArticleCard départ 130 + Flèche 44 + ArticleCard destination 130 + buttonsContainer mt:24 + Jouer 52 + Défi mt:12+52 + Multijoueur mt:12+52 + Refresh mt:12+44 + séparateur mt:16+1 = ~597pt

Sur un iPhone standard (hauteur utile ~730pt après header) : 597pt laisse ~133pt disponibles → 3 boutons de 44pt = 132pt. "À propos" est visible sans scroll sur les appareils de taille standard.

Sur iPhone SE (hauteur utile ~603pt) : le dernier bouton "À propos" peut nécessiter un scroll de ~26pt. Acceptable — "À propos" est la dernière action, moins prioritaire.

### Note sur le toggle mode difficile

Avec le déplacement du toggle dans le header (critère 2), la `difficultyToggleRow` (mt:8+44pt) disparait de la ScrollView. Cela libère ~52pt supplémentaires, ce qui améliore encore la visibilité de "À propos" sur petit écran.

### Séparateur visuel avant les liens secondaires

Ajouter un séparateur `height: 1, backgroundColor: '#E2E8F0'` avec `marginTop: 16` et `marginBottom: 4` pour distinguer visuellement la zone CTA principale de la zone liens secondaires.

---

## Récapitulatif des modifications par écran

### HomeScreen — modifications

| Element | Avant | Après |
|---------|-------|-------|
| Toggle "Mode difficile" | ScrollView, après Refresh | Header, position absolute left:16 |
| Texte bouton "Historique" | `'Historique'` | `'Historique des parties'` |
| Bouton "À propos" | En bas de ScrollView, hors écran | Après séparateur, juste après Refresh |
| Ordre boutons secondaires | Après toggle difficile | Après Refresh + séparateur |

### VictoryScreen — modifications

| Element | Avant | Après |
|---------|-------|-------|
| Bouton "Lire [cible]" | Bas de ScrollView | Zone sticky, au-dessus de primaryButtonsRow |
| Lien "Voir l'historique" | Zone sticky | Supprimé |
| Bouton "Partager" | Texte gris `#64748B` | Texte bleu `#2563EB` |

### HistoryScreen — modifications

| Element | Avant | Après |
|---------|-------|-------|
| Titre header | `'Historique'` | `'Historique des parties'` |
| Icone stats | `⊞` fontSize:20 | Texte `'Stats'` fontSize:13 Bold `#2563EB` |
| SortBar | 6 chips indépendants | 3 boutons 3 états cycliques |

---

## Accessibilité — synthèse des changements

### HomeScreen header — DifficultyHeaderToggle

- [ ] `accessibilityLabel` complet incluant l'état courant et l'action possible : `'Mode difficile activé — désactiver'` / `'Mode difficile désactivé — activer'`
- [ ] `accessibilityState={{ checked: isDifficultyHard }}`
- [ ] Zone tactile enveloppante 44×44pt
- [ ] Ordre de lecture VoiceOver : le Switch est le premier élément lu (position absolute left, mais ordre logique dépend de l'ordre dans le DOM React — Laurent doit placer la View Switch **avant** le Text titre dans le JSX, ou utiliser `accessibilityViewIsModal` si nécessaire)

### VictoryScreen — bouton Lire déplacé

- [ ] `accessibilityLabel="Lire l'article [titre complet non tronqué]"` — titre tronqué uniquement dans le texte visible
- [ ] `accessibilityRole="button"` (pas "link" — la navigation est in-app, pas une URL externe)
- [ ] Ordre de lecture : ReadButton avant primaryButtonsRow dans le JSX — conforme à l'ordre visuel

### HistoryScreen — SortBar 3 états

- [ ] `accessibilityLabel` dynamique selon l'état courant du bouton (voir tableau critère 6)
- [ ] `accessibilityState={{ selected: isActive }}` — `selected: true` si ascendant OU descendant
- [ ] Haptic `impactAsync(Light)` maintenu au changement de critère (pattern F3-09 confirmé)
- [ ] Aucune information transmise par la couleur seule — la flèche ↑/↓ dans le texte communique la direction même sans couleur

### HistoryScreen — bouton Stats

- [ ] `accessibilityLabel="Voir mes statistiques"` (inchangé)
- [ ] Contraste `#2563EB` sur `#FFFFFF` : 4.6:1 — conforme WCAG AA texte normal

---

## Notes pour Laurent

### Priorité d'implémentation

Ces 8 critères sont indépendants et peuvent être implémentés en parallèle. Ordre recommandé si séquentiel :
1. Critère 1 (renommage — le plus simple, 3 TextNodes)
2. Critère 4 (suppression historyButton — retrait de code)
3. Critère 7 (remplacement icone stats — 1 Text, 1 style)
4. Critère 3 + 5 (déplacement ReadButton + Partager — même zone, à faire ensemble)
5. Critère 2 (toggle dans header — modifier le header HomeScreen)
6. Critère 8 (À propos — réorganisation boutons ScrollView)
7. Critère 6 (SortBar 3 états — le plus complexe, implique refactoring du type + hook)

### Critère 6 — décision technique bloquante

La refonte de la SortBar implique de modifier :
- Le type `SortCriterion` dans `history-sort.utils.ts`
- Le hook `useHistorySort`
- La clé AsyncStorage (migration ou compatibilité avec l'ancienne valeur)

**Maxime doit valider l'approche avant que Laurent commence cette partie.** Les autres critères peuvent être implémentés sans attendre.

### Critère 2 — vérification ordre JSX pour VoiceOver

Sur iOS, VoiceOver lit les éléments dans l'ordre du JSX (sauf si `accessibilityViewIsModal` ou `importantForAccessibility` sont utilisés). Le Switch doit apparaître en premier dans le JSX du header pour que VoiceOver l'annonce avant le titre "WikiHop". Ordre JSX cible :

```
<View style={styles.header}>
  <View style={styles.difficultyHeaderToggle}>  {/* Switch */}
    <Switch ... />
  </View>
  <Text style={styles.headerTitle}>WikiHop</Text>
  <View style={styles.languageSelector}>  {/* FR | EN */}
    ...
  </View>
</View>
```

### Critère 8 — séparateur visuel

Le séparateur entre CTA principaux et liens secondaires est un `View` de `height: 1`, pas un composant séparé. Il doit être dans la ScrollView, pas dans un conteneur fixe.

### Styles à supprimer (code mort)

Après implémentation, les styles suivants doivent être supprimés pour éviter le code mort :
- `historyButton` et `historyButtonText` dans VictoryScreen (critère 4)
- `difficultyToggleRow` et `difficultyToggleLabel` dans HomeScreen (critère 2, si confirmé aucune autre utilisation)
- Styles de l'ancien `statsButton` / `statsButtonText` dans HistoryScreen si renommés (critère 7)
- Les 6 constantes `SORT_CRITERION_LABELS` et le type `SortCriterion` (6 valeurs) si la migration vers 3 boutons est complète (critère 6 — attendre validation Maxime)
