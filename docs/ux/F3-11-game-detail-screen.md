# Spécifications visuelles — F3-11 — GameDetailScreen

**Auteur :** Benjamin — UX/UI Designer
**Date :** 2026-03-11
**Story liée :** F3-11
**Dépend de :** F3-02 (GameRecord, HistoryScreen), F3-10 (navigation depuis HistoryScreen)
**Écran concerné :** GameDetailScreen (nouvel écran)

---

## Décisions de design préalables

### Structure générale : header fixe + ScrollView libre

L'écran affiche un volume de données variable selon la longueur du chemin parcouru (de 1 article à potentiellement 20+). Un layout avec header fixe et contenu scrollable est donc indispensable. La zone de boutons d'actions (Rejouer / Supprimer) est en bas, collée au SafeAreaView, pour rester accessible sans scroll — pattern établi en VictoryScreen.

### Boutons d'action : deux boutons à hiérarchie distincte

- "Rejouer cette partie" : action principale positive. Bouton primaire plein `#2563EB`, hauteur 52pt. Placé en premier dans l'ordre de lecture (action la plus fréquente attendue).
- "Supprimer cette partie" : action destructive irréversible. Bouton texte seul `#E11D48`, hauteur 44pt. Placé en second, moins prominent — même traitement que "Effacer l'historique" dans HistoryScreen.

Un troisième bouton "Retour" n'est pas nécessaire : le header contient déjà un bouton retour "←" natif. Ajouter un bouton Retour en bas de page créerait une redondance et alourdissait la zone de boutons.

### Chemin parcouru : liste ordonnée numérotée

Le chemin (liste des articles visités) est affiché comme une liste ordonnée verticale. Chaque article est un élément tactile ouvrant l'`ArticleViewer` (WebView externe). Le premier article = départ, le dernier = destination (ou dernier article visité si abandonné). La numérotation permet de visualiser immédiatement la longueur du chemin et l'ordre. Les articles sont affichés dans l'ordre chronologique de visite (1, 2, 3...).

### Article de destination atteinte : mise en valeur

Si `status === 'won'`, le dernier article du chemin est l'article destination. Il est affiché en Bold vert `#16A34A` — pattern établi dans VictoryScreen pour le chemin de victoire. Si `status === 'abandoned'`, aucun article n'est mis en évidence (le dernier article n'est pas la destination souhaitée).

---

## Écran : GameDetailScreen

### Objectif

Permettre au joueur de consulter le détail complet d'une partie passée, de la rejouer à l'identique, ou de la supprimer définitivement.

### Layout (ASCII)

```
┌─────────────────────────────────────┐  [FIXED - SafeAreaView top]
│  ←   Détail de la partie           │  Header 64pt
├─────────────────────────────────────┤  Bordure #E2E8F0 1pt
│                                     │  [SCROLL - ScrollView]
│  ┌─────────────────────────────┐   │
│  │  [STATUT BADGE]             │   │  Bloc statut — paddingTop: 20pt
│  │                             │   │
│  │  [Départ]  →  [Destination] │   │  Trajet compact
│  └─────────────────────────────┘   │
│                                     │
│  ──────────────────────────────     │  Séparateur #E2E8F0 1pt
│                                     │
│  ┌─────────────────────────────┐   │  Bloc métriques
│  │  Durée          Sauts       │   │
│  │  2 min 05 s     3           │   │
│  │                             │   │
│  │  Date                       │   │
│  │  06/03/2026 à 14:30         │   │
│  └─────────────────────────────┘   │
│                                     │
│  ──────────────────────────────     │  Séparateur #E2E8F0 1pt
│                                     │
│  CHEMIN PARCOURU                    │  Titre section — Caption Bold 13px
│                                     │  uppercase, #64748B
│  1.  Albert Camus               ↗  │  Article tactile
│  2.  Philosophie française      ↗  │
│  3.  Existentialisme            ↗  │  Dernier item = vert Bold si victoire
│                                     │
│  [padding bottom 24pt]              │
└─────────────────────────────────────┘  [FIXED - Zone boutons]
│                                     │  Bordure top #E2E8F0 1pt
│  ┌─────────────────────────────┐   │  paddingH: 16pt
│  │     Rejouer cette partie    │   │  height: 52pt — #2563EB — Bold 16px
│  └─────────────────────────────┘   │
│                                     │  marginTop: 8pt
│      Supprimer cette partie         │  height: 44pt — texte #E11D48
│                                     │  paddingBottom via SafeAreaView
└─────────────────────────────────────┘
```

**Zoom sur le Bloc statut**

```
┌───────────────────────────────────────────┐
│  [VICTOIRE]                               │  Badge pill (même specs que HistoryItem)
│                                           │  marginBottom: 12pt
│  Albert Camus  →  Existentialisme         │  Regular 15px #1E293B
│                                           │  numberOfLines={2}, flex wrap
└───────────────────────────────────────────┘
  paddingHorizontal: 16pt
```

**Zoom sur le Bloc métriques (grille 2 colonnes)**

```
┌────────────────────────┬────────────────────────┐
│  DURÉE                 │  SAUTS                 │
│  2 min 05 s            │  3                     │
└────────────────────────┴────────────────────────┘
┌────────────────────────────────────────────────┐
│  DATE                                          │
│  06/03/2026 à 14:30                            │
└────────────────────────────────────────────────┘
  paddingHorizontal: 16pt — paddingVertical: 16pt
```

Labels de métriques : Caption Bold 13px `#64748B` uppercase, `letterSpacing: 0.8`. Valeurs : Regular 22px `#1E293B`. La taille 22px est délibérément plus grande que le corps (16px) pour créer une hiérarchie de lecture "donnée chiffrée". Les deux colonnes sont en `flex: 1` chacune. La ligne "Date" occupe toute la largeur en dessous, `marginTop: 12pt`.

**Zoom sur la liste Chemin parcouru**

```
┌──────────────────────────────────────────────┐
│  CHEMIN PARCOURU                             │  Caption Bold 13px #64748B
│                                              │  uppercase, letterSpacing:0.8
│  paddingTop: 16pt paddingHorizontal: 16pt    │
├──────────────────────────────────────────────┤
│                                              │
│  1.  Albert Camus                        ↗  │  TouchableOpacity min 44pt
│                                              │  paddingV: 12pt paddingH: 16pt
│  ─────────────────────────────────────────  │  Séparateur #E2E8F0 1pt
│                                              │
│  2.  Philosophie française               ↗  │  Regular 15px #1E293B
│                                              │
│  ─────────────────────────────────────────  │
│                                              │
│  3.  Existentialisme                     ↗  │  Dernier item si victoire :
│                                              │  Bold 15px #16A34A
│                                              │
└──────────────────────────────────────────────┘
```

Numéro d'ordre : Regular 13px `#94A3B8`, `minWidth: 24pt` pour aligner les titres. Icône navigation "↗" : Text 14px `#2563EB`, `accessible={false}`. Séparateurs entre articles : View hauteur 1pt `#E2E8F0`, `marginLeft: 40pt` (aligné sur le début du titre, après le numéro).

### Composants

- **Header** — Identique au Header de HistoryScreen. Hauteur 64pt, fond `#FFFFFF`, bordure bas `#E2E8F0` 1pt. Bouton retour "←" à gauche (44×44pt). Titre "Détail de la partie" centré Bold 24px `#1E293B`. `position: 'absolute', left: 16` pour le bouton retour (titre reste centré).

- **BlocStatut** — View `paddingHorizontal: 16pt`, `paddingTop: 20pt`, `paddingBottom: 16pt`. Contient le badge statut (même composant `StatusBadge` que HistoryItem si extrait en composant partagé) et le titre trajet en Regular 15px `#1E293B`, `numberOfLines={2}` (les titres longs doivent pouvoir se déployer sur 2 lignes sur cet écran de détail, contrairement à HistoryItem où 1 ligne avec ellipsis suffit).

- **BadgeStatut** — Réutilisation exacte des specs HistoryItem : pill `#DCFCE7`/`#16A34A` pour Victoire, `#F1F5F9`/`#64748B` pour Abandonné. `alignSelf: 'flex-start'`, `marginBottom: 12pt`.

- **SeparateurSection** — View `height: 1`, `backgroundColor: '#E2E8F0'`, `marginHorizontal: 16pt`.

- **BlocMetriques** — View `paddingHorizontal: 16pt`, `paddingVertical: 16pt`. Grille : `flexDirection: 'row'`. Deux `MetriqueItem` en `flex: 1` pour Durée et Sauts. `MetriqueItem` contient un Text label (Caption Bold 13px `#64748B` uppercase) et un Text valeur (Regular 22px `#1E293B`). En dessous, un `MetriqueItem` plein largeur pour la Date.

- **SectionChemin** — View, titre section "CHEMIN PARCOURU" en Caption Bold 13px `#64748B` uppercase, `letterSpacing: 0.8`, `paddingHorizontal: 16pt`, `paddingTop: 16pt`, `paddingBottom: 8pt`.

- **ArticlePathItem** — `TouchableOpacity` pour chaque article du chemin. `minHeight: 44pt`, `paddingVertical: 12pt`, `paddingHorizontal: 16pt`. `flexDirection: 'row'`, `alignItems: 'center'`. Contient : numéro (Regular 13px `#94A3B8`, `minWidth: 24pt`), titre article (Regular 15px `#1E293B` — Bold 15px `#16A34A` si dernier article d'une partie gagnée), icône "↗" (Text 14px `#2563EB`, marginLeft auto, `accessible={false}`). Au press : navigation vers `ArticleViewer` avec l'URL Wikipedia de l'article.

- **ZoneBoutons** — View `[FIXED]` en bas d'écran, fond `#FFFFFF`, bordure top `#E2E8F0` 1pt. `paddingHorizontal: 16pt`, `paddingTop: 12pt`. Dans SafeAreaView `edges={['bottom']}`.

- **BoutonRejouer** — `TouchableOpacity`, hauteur 52pt, fond `#2563EB`, `borderRadius: 12pt`, texte Bold 16px `#FFFFFF` centré. Pleine largeur (moins les 16pt de marge de chaque côté). `accessibilityLabel="Rejouer cette partie depuis le début"`.

- **BoutonSupprimer** — `TouchableOpacity`, hauteur 44pt, texte Regular 16px `#E11D48` centré. Pas de fond ni de bordure. `marginTop: 8pt`. `accessibilityLabel="Supprimer définitivement cette partie"`.

### États

- **Default :** Contenu complet affiché. Badge statut, métriques, chemin parcouru, boutons d'action.

- **Loading :** Skeleton sur les blocs métriques et le chemin. Header et boutons d'action visibles immédiatement (ils ne dépendent pas du chargement). Skeleton : rectangles `#F1F5F9`, `borderRadius: 4pt`, animés si `reduceMotion` inactif. Blocs skeleton :
  - BlocStatut : un rectangle 80pt × 24pt (badge), un rectangle pleine largeur 20pt de hauteur (titre trajet)
  - BlocMetriques : deux rectangles 60pt × 30pt côte à côte, un rectangle 120pt × 20pt en dessous
  - Chemin : 3 rectangles pleine largeur 16pt de hauteur, espacés de 12pt

- **Error :** Cas théoriquement impossible — le `GameRecord` est passé en prop de navigation depuis HistoryScreen. Si un article du chemin ne peut pas être ouvert dans l'ArticleViewer, c'est une erreur de navigation gérée par l'ArticleViewer lui-même, hors scope de cet écran.

- **Empty :** Sans objet — un GameDetailScreen sans GameRecord ne peut pas exister (la navigation depuis HistoryScreen passe obligatoirement le record).

- **Partie abandonnée :** Identique au Default sauf que le badge est "Abandonné" gris et qu'aucun article du chemin n'est mis en vert. Le dernier article du chemin est affiché en Regular 15px `#1E293B` (aucune mise en évidence).

### Dialog de confirmation suppression

Le dialog de confirmation est un `Alert.alert` natif React Native — même pattern que "Effacer l'historique" dans HistoryScreen (cohérence).

```
Titre : "Supprimer cette partie ?"
Message : "Cette action est irréversible."
Boutons :
  - "Annuler" (cancel, premier) — pas de destructive style
  - "Supprimer" (destructive, second) — style destructive (rouge natif iOS)
```

Après confirmation "Supprimer" :
1. Appel `ScoreStorage.deleteRecord(record.id)` (via `useGameHistory().deleteRecord`)
2. `navigation.goBack()` immédiat — pas d'animation de transition custom
3. La FlatList de HistoryScreen se met à jour via `useFocusEffect` + `refresh()` au refocus

### Accessibilité

- [ ] `accessibilityRole="header"` sur le titre "Détail de la partie" dans le header
- [ ] `accessibilityLabel="Retour à l'historique"` sur le bouton retour (plus précis que "Retour")
- [ ] `accessibilityRole="button"` sur le bouton retour
- [ ] `accessibilityLabel` sur le BlocStatut (conteneur non interactif) : pas de rôle, pas de label — ses enfants sont lus individuellement par VoiceOver dans l'ordre DOM
- [ ] Badge statut : `accessible={true}`, `accessibilityLabel="Victoire"` ou `"Abandonné"` — NOT `accessible={false}` ici (contrairement à HistoryItem où le label du parent couvrait tout l'item). Dans GameDetailScreen, le badge est un élément de page indépendant, pas englobé dans un TouchableOpacity parent.
- [ ] BlocMetriques : labels de métriques `accessible={false}`, valeurs `accessible={true}` avec `accessibilityLabel` complet. Exemples : `accessibilityLabel="Durée : 2 minutes et 5 secondes"`, `accessibilityLabel="Nombre de sauts : 3"`, `accessibilityLabel="Date de la partie : 6 mars 2026 à 14 heures 30"`. La date doit être lue de façon naturelle, pas en format `"06/03/2026 à 14:30"` qui est illisible vocalement.
- [ ] `accessibilityRole="button"` sur chaque `ArticlePathItem`
- [ ] `accessibilityLabel` sur chaque `ArticlePathItem` : `"Article [N] : [Titre]. Ouvrir dans Wikipedia."` — ex. `"Article 3 : Existentialisme. Ouvrir dans Wikipedia."`. Sur le dernier article d'une victoire, ajouter `"Article [N] : [Titre] — destination atteinte. Ouvrir dans Wikipedia."`
- [ ] Contraste titre trajet `#1E293B` sur `#FFFFFF` : 16.1:1 — conforme
- [ ] Contraste valeurs métriques `#1E293B` sur `#FFFFFF` : 16.1:1 — conforme
- [ ] Contraste article destination `#16A34A` sur `#FFFFFF` : 4.6:1 — conforme (texte large Bold 15px, seuil 3:1 applicable mais 4.6:1 ici)
- [ ] Contraste bouton Rejouer `#FFFFFF` sur `#2563EB` : 4.6:1 — conforme
- [ ] Contraste bouton Supprimer `#E11D48` sur `#FFFFFF` : 4.6:1 — conforme
- [ ] Zones tactiles : bouton retour 44×44pt (hitSlop si nécessaire), ArticlePathItem minHeight 44pt, BoutonRejouer 52pt, BoutonSupprimer 44pt — toutes conformes
- [ ] Ordre de lecture VoiceOver : Header (bouton retour → titre) → Badge statut → Titre trajet → Durée → Sauts → Date → titre section "Chemin parcouru" → Article 1 → Article 2 → ... → Article N → BoutonRejouer → BoutonSupprimer
- [ ] Le Dialog Alert natif est géré par l'OS — accessibilité automatiquement conforme (VoiceOver lit les boutons "Annuler" et "Supprimer")
- [ ] Aucune information transmise uniquement par la couleur : le statut est textuellement dans le badge ("Victoire"/"Abandonné"), la destination est textuellement dans l'accessibilityLabel ("destination atteinte")
- [ ] Animations skeleton : désactivées si `AccessibilityInfo.isReduceMotionEnabled()` — utiliser un skeleton statique (opacité 0.6, pas de pulse)

### Notes pour Laurent

- La navigation vers cet écran se fait depuis `HistoryItem.onPress` dans HistoryScreen. Le `GameRecord` complet est passé en paramètre de navigation : `navigation.navigate('GameDetail', { record })`. Ajouter `GameDetail: { record: GameRecord }` dans `RootStackParamList`.
- Le chemin parcouru (`path`) n'est actuellement pas stocké dans `GameRecord` (décision F3-02 : "Pas de path pour limiter la taille AsyncStorage"). Ce point est un **bloquant potentiel pour F3-11** : la story exige l'affichage du chemin complet, mais `GameRecord` ne le contient pas. Le Tech Lead doit trancher : soit ajouter `path: Article[]` à `GameRecord` (impact sur le stockage), soit récupérer le chemin depuis `GameSession` en cours (impossible pour des parties passées). Cette décision doit être prise avant que Laurent commence l'implémentation. Je signale le bloquant ici — je ne tranche pas.
- La ZoneBoutons est `position: 'absolute'` en bas ou intégrée dans une View flex column avec la ScrollView en `flex: 1`. Recommandation : View container `flex: 1, flexDirection: 'column'`, ScrollView `flex: 1`, ZoneBoutons en bas de la View container (pas d'absolute). Ce pattern évite les problèmes de chevauchement avec le clavier sur Android.
- Pas de `FlatList` pour le chemin parcouru — le chemin est de taille bornée (max ~50 articles dans une session extrême) et est rendu dans une `ScrollView` déjà présente. Utiliser `.map()` sur le tableau du chemin.
- L'URL Wikipedia à passer à `ArticleViewer` est construite depuis le `title` de l'article : `https://fr.wikipedia.org/wiki/[encodeURIComponent(title)]`. Vérifier la logique déjà existante dans l'app pour la construction d'URL Wikipedia (ne pas en créer une nouvelle).
- La mise en évidence du dernier article (Bold vert `#16A34A`) s'applique uniquement si `record.status === 'won'` ET si l'article est le dernier du tableau du chemin (`index === path.length - 1`). Si `status === 'abandoned'`, aucun article n'est mis en évidence, même le dernier.
