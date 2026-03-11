# Spécifications visuelles — F3-10 — Tri multi-critères dans l'historique

**Auteur :** Benjamin — UX/UI Designer
**Date :** 2026-03-11
**Story liée :** F3-10
**Dépend de :** F3-02 (HistoryScreen existant)
**Écran concerné :** HistoryScreen

---

## Décisions de design préalables

### Choix du pattern de tri : chips horizontales en ScrollView

Trois options ont été évaluées.

**Option A — Picker/Dropdown natif OS**
Écarté. Le Picker natif iOS/Android présente une UI système qui peut être déroutante (modale bottom sheet iOS vs. dropdown Android). Il n'est pas directement stylisable pour respecter le design system. Il masque les options disponibles au premier coup d'oeil — l'utilisateur ne sait pas combien de critères existent avant d'ouvrir le menu.

**Option B — Segmented control horizontal**
Écarté pour 6 critères. Un segmented control à 6 segments sur mobile (375pt logiques) produirait des labels de 4 à 5 caractères maximum par segment, illisibles. Les guidelines Apple HIG déconseillent plus de 5 segments sur iPhone.

**Option C retenue — Chips horizontales en ScrollView**
6 chips de longueur variable, défilant horizontalement sous le header. Ce pattern est largement établi sur mobile (Google Maps, Airbnb, App Store) pour des filtres multi-options. Il permet des labels lisibles complets, rend toutes les options visibles sans interaction préalable, et occupe une hauteur fixe modérée (44pt). Le chip actif est clairement distingué par une couleur de fond pleine. Le scroll horizontal signale naturellement qu'il y a d'autres options.

### Labels des chips

Les 6 critères sont présentés avec des labels courts exploitant une iconographie directionnelle :

| Critère | Label chip |
|---------|-----------|
| Date (plus récent) | Date ↓ |
| Date (plus ancien) | Date ↑ |
| Durée (plus courte) | Durée ↑ |
| Durée (plus longue) | Durée ↓ |
| Sauts (moins) | Sauts ↑ |
| Sauts (plus) | Sauts ↓ |

Convention mnémotechnique : la flèche indique le sens de la valeur dans la liste (↓ = valeur décroissante ou "plus grand d'abord", ↑ = valeur croissante ou "plus petit d'abord"). C'est une convention utilisée dans les applications de données mobiles (App Store évaluations, Airbnb).

Justification de "Sauts" plutôt que "Clics" : le design system et les écrans existants (GameHUD, VictoryScreen) utilisent systématiquement "saut(s)". Cohérence obligatoire.

---

## Écran : HistoryScreen — Bandeau de tri

### Objectif

Permettre au joueur de changer le critère de tri de son historique depuis un bandeau compact sous le header.

### Layout (ASCII)

```
┌─────────────────────────────────────┐  [FIXED - SafeAreaView top]
│  ←   Historique                     │  Header 64pt — inchangé
├─────────────────────────────────────┤  Bordure #E2E8F0 1pt
│  [Date ↓] [Date ↑] [Durée ↑] …  →  │  [FIXED - SortBar 44pt]
├─────────────────────────────────────┤  Bordure #E2E8F0 1pt
│                                     │  [SCROLL - FlatList]
│  ┌───────────────────────────────┐  │
│  │ [HistoryItem]                 │  │
│  └───────────────────────────────┘  │
│  ──────────────────────────────     │
│  ┌───────────────────────────────┐  │
│  │ [HistoryItem]                 │  │
│  └───────────────────────────────┘  │
│  ──────────────────────────────     │
│  ...                                │
│                                     │
│  [ Effacer l'historique ]           │  ListFooterComponent
└─────────────────────────────────────┘  [FIXED - SafeAreaView bottom]
```

**Zoom sur le SortBar**

```
┌─────────────────────────────────────────────────────┐  [FIXED 44pt]
│  ← défilement horizontal →                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───    │
│  │ Date ↓  │  │ Date ↑  │  │ Durée ↑ │  │ Du    │
│  └──────────┘  └──────────┘  └──────────┘  └───    │
│   chip actif    chips inactifs                       │
│   fond #2563EB  fond #F1F5F9                         │
└─────────────────────────────────────────────────────┘
```

**Détail chip actif vs. inactif**

```
Chip actif (critère sélectionné) :
┌────────────────┐
│   Date ↓      │  fond: #2563EB — texte: #FFFFFF Bold 13px
└────────────────┘  borderRadius: 20pt — paddingH: 14pt — hauteur: 32pt

Chip inactif :
┌────────────────┐
│   Date ↑      │  fond: #F1F5F9 — texte: #64748B Regular 13px
└────────────────┘  borderRadius: 20pt — paddingH: 14pt — hauteur: 32pt
```

### Composants

- **SortBar** — `ScrollView` horizontal, `showsHorizontalScrollIndicator={false}`, hauteur fixe 44pt, `paddingHorizontal: 12pt`, `paddingVertical: 6pt`. Fond `#FFFFFF`. Bordure bas `#E2E8F0` 1pt. Positionnée entre le Header et la FlatList, `position: 'relative'` (flux normal, pas d'absolute). Les chips sont disposés en `flexDirection: 'row'` avec `gap: 8pt` entre chaque.

- **SortChip (actif)** — `TouchableOpacity`. Fond `#2563EB`. Texte Bold 13px `#FFFFFF`. `borderRadius: 20pt`. `paddingHorizontal: 14pt`. Hauteur fixe 32pt (`alignItems: 'center'`, `justifyContent: 'center'`). Zone tactile 44pt assurée via `hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}` (la zone de scroll horizontal contraint la hauteur physique du chip à 32pt, hitSlop compense). `accessibilityState={{ selected: true }}`.

- **SortChip (inactif)** — Identique en géométrie. Fond `#F1F5F9`. Texte Regular 13px `#64748B`. `accessibilityState={{ selected: false }}`. Au press : fond passe à `#E2E8F0` (feedback tactile).

- **Flèche directionnelle** — Caractère Unicode intégré au label texte du chip (pas une icône séparée). La flèche est incluse dans le label du chip : `"Date ↓"`, `"Date ↑"`, etc. Elle n'est pas un `Text` enfant distinct — le label est une seule string.

### États

- **Default :** Bandeau affiché avec le chip "Date ↓" actif (tri par défaut). FlatList triée du plus récent au plus ancien.
- **Loading :** Le SortBar est rendu avec les chips mais tous en état `disabled={true}` (opacité 0.5 globale sur la SortBar) pendant le chargement AsyncStorage initial. Évite une interaction prématurée avant que les données soient chargées.
- **Error :** Sans objet — `ScoreStorage.getAll()` retourne `[]` en cas d'erreur. L'état vide s'affiche, le SortBar reste visible (il n'est pas masqué) car l'utilisateur peut avoir changé l'historique depuis une autre session.
- **Empty :** Le SortBar reste visible même quand l'historique est vide. Un historique vide reste un historique — l'utilisateur peut avoir supprimé toutes ses parties. Masquer le SortBar dans l'état vide créerait un layout shift inattendu dès que la première partie est enregistrée.
- **Changement de critère :** Le chip précédent passe à inactif instantanément, le nouveau chip devient actif. La FlatList est ré-triée immédiatement (pas d'animation de transition — respecte `reduceMotion`). Le critère est persisté en AsyncStorage de manière fire-and-forget (pattern déjà établi en F3-02).

### Accessibilité

- [ ] `accessibilityRole="button"` sur chaque `SortChip`
- [ ] `accessibilityLabel` explicite sur chaque chip — inclure la description complète du critère ET le sens, PAS juste le label affiché. Exemples : `"Trier par date, plus récent en premier"`, `"Trier par date, plus ancien en premier"`, `"Trier par durée, plus courte en premier"`, `"Trier par durée, plus longue en premier"`, `"Trier par nombre de sauts, moins en premier"`, `"Trier par nombre de sauts, plus en premier"`. La flèche ↓/↑ ne doit PAS figurer dans le label vocal — elle est transmise par les mots "plus récent", "plus court", etc.
- [ ] `accessibilityState={{ selected: true/false }}` sur chaque chip — VoiceOver annonce "sélectionné" sur le chip actif
- [ ] `hitSlop` sur chaque chip pour atteindre 44pt de zone tactile effective : `{ top: 6, bottom: 6, left: 4, right: 4 }`
- [ ] Ordre de lecture VoiceOver : Header → SortBar (chip 1 → chip 2 → ... → chip 6) → liste FlatList → bouton Effacer. Le SortBar doit être dans le flux de lecture avant la liste.
- [ ] Aucune information transmise uniquement par la couleur : le chip actif est distingué par la couleur ET par `accessibilityState={{ selected: true }}`
- [ ] Contraste chip actif : `#FFFFFF` sur `#2563EB` = 4.6:1 — conforme WCAG AA (texte normal 13px)
- [ ] Contraste chip inactif : `#64748B` sur `#F1F5F9` = 4.6:1 — conforme WCAG AA
- [ ] Animations : aucune — changement de critère immédiat, `reduceMotion` sans impact
- [ ] Le `ScrollView` horizontal du SortBar est `accessible={false}` en tant que conteneur — seuls les chips sont `accessible`. Cela permet à VoiceOver de naviguer directement d'un chip à l'autre sans annoncer le conteneur scroll.

### Notes pour Laurent

- Le SortBar est un nouveau composant `SortBar.tsx` dans `apps/mobile/src/components/history/`. Il reçoit en props : `criteria: SortCriteria` (critère actif), `onChange: (criteria: SortCriteria) => void`.
- Le type `SortCriteria` est à définir dans `packages/shared/src/types/index.ts` ou dans `history.utils.ts` : `'date_desc' | 'date_asc' | 'duration_asc' | 'duration_desc' | 'jumps_asc' | 'jumps_desc'`. La valeur par défaut est `'date_desc'`.
- La logique de tri est une fonction pure `sortRecords(records: GameRecord[], criteria: SortCriteria): GameRecord[]` à placer dans `history.utils.ts`. Cette fonction est soumise à la règle TDD strict (tests avant implémentation). Cas de test à couvrir : tri par chaque critère, égalité de valeurs (ordre stable).
- La persistance AsyncStorage du critère de tri utilise une nouvelle clé : `@wikihop/history_sort_criteria`. Elle est distincte de `@wikihop/game_history`. La lecture se fait au montage de `HistoryScreen` (ou dans un hook `useHistorySort`). En cas d'erreur de lecture, le critère par défaut `'date_desc'` est appliqué silencieusement.
- Le `hitSlop` sur les chips est préférable à un `minHeight: 44` sur le chip lui-même pour préserver la hauteur visuelle de 32pt. Si `hitSlop` pose des problèmes de chevauchement entre chips sur des petits écrans, augmenter le paddingVertical du SortBar à 8pt et réduire le hitSlop vertical à 4pt chaque côté.
- Le chip actif ne doit pas avoir de bordure supplémentaire — le fond bleu suffit à le distinguer. Ne pas ajouter de `borderWidth` sur le chip actif.
- Sur Android, les chips peuvent avoir une ombre de surélévation non désirée. Utiliser `elevation: 0` sur tous les chips pour neutraliser.
