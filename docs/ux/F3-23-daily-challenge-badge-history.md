# Spécifications visuelles — F3-23 — Badge "Défi du jour" dans HistoryItem

**Auteur :** Benjamin — UX/UI Designer
**Date :** 2026-03-14
**Story liée :** F3-23
**Dépend de :** F3-02 (HistoryItem existant), F3-01 (champ `isDailyChallenge` dans GameRecord)
**Écran concerné :** HistoryScreen — composant HistoryItem

---

## Contexte

Le composant `HistoryItem` affiche une entrée de l'historique des parties. Sa structure actuelle (F3-02) comprend une ligne 1 (badge statut + titre trajet) et une ligne 2 (métriques). Lorsque `record.isDailyChallenge === true`, un badge supplémentaire doit signaler que la partie est un défi quotidien.

Rappel des badges existants dans HistoryItem :
- **Badge Victoire :** fond `#DCFCE7`, texte `#16A34A` Bold 11px
- **Badge Abandonné :** fond `#F1F5F9`, texte `#64748B` Bold 11px

---

## Réponses aux questions de validation

### Question 1 — Position du badge

**Proposition de Maxime :** entre le badge statut et le titre du trajet, dans la ligne 1.

**Validation : CONFIRMÉ avec précision.**

La position est correcte. L'ordre de lecture de la ligne 1 devient :

`[VICTOIRE]  [DÉFI]  Albert Camus → Existentialisme`

ou

`[ABANDONNÉ]  [DÉFI]  Albert Camus → Existentialisme`

Cette séquence est naturelle : le statut est lu en premier (résultat de la partie), puis le contexte (défi ou libre), puis le trajet. L'utilisateur identifie rapidement les défis dans sa liste.

**Précision sur le titre trajet :** le titre trajet doit être en `flex: 1` avec `numberOfLines={1}` et `ellipsizeMode="tail"` — inchangé par rapport à F3-02. Avec deux badges en ligne 1, le titre dispose de moins de largeur. Cela est acceptable car les titres longs sont déjà gérés par l'ellipsis. Sur les appareils avec un écran étroit (iPhone SE, 320pt), le titre peut être très court — acceptable.

---

### Question 2 — Style amber `#D97706`

**Proposition de Maxime :** fond `#D97706` (amber), texte "Défi" Bold 11px blanc.

**Validation : CONFIRMÉ.**

`#D97706` est le token amber existant du projet, utilisé pour le bouton "Défi du jour" dans HomeScreen. Son usage ici est cohérent — même sémantique "défi quotidien" sur deux écrans différents. La couleur amber sur fond blanc (`#D97706`/`#FFFFFF`) est visible et reconnaissable sans créer de surcharge visuelle.

**Contraste :** texte blanc `#FFFFFF` sur fond `#D97706` = **3.0:1**. Ce ratio est à la limite du seuil WCAG AA pour le texte normal (4.5:1 requis). Cependant :
- Le texte du badge est Bold 11px, ce qui relève du "texte large" au sens WCAG seulement si >= 18px Regular ou >= 14px Bold. À 11px, ce n'est techniquement pas "texte large" — le seuil de 4.5:1 s'applique.
- Ce même écart est déjà assumé pour le badge Victoire : `#16A34A` sur `#DCFCE7` = 3.1:1 (documenté en MEMORY.md comme "acceptable Bold 11px"). La cohérence justifie d'aligner la tolérance sur le même niveau.
- Le badge n'est pas le seul vecteur d'information : l'`accessibilityLabel` du HistoryItem parent annonce vocalement "Défi du jour" pour les lecteurs d'écran (voir section Accessibilité).

**Décision : le style amber `#D97706` fond / `#FFFFFF` texte est retenu, avec l'écart WCAG assumé et documenté — même tolérance que le badge Victoire existant.**

Si à l'avenir une version haute accessibilité est requise, une alternative conforme serait texte `#92400E` (brun) sur fond `#FEF3C7` (jaune pâle) = 5.4:1 — tokens déjà existants dans le projet (utilisés pour DailyChallengeBadge de VictoryScreen). Cette alternative est documentée mais non retenue pour la cohérence avec le bouton HomeScreen amber `#D97706`.

---

### Question 3 — Dimensions

**Proposition de Maxime :** `paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4`

**Validation : CONFIRMÉ.**

Ces dimensions sont identiques aux badges statut existants de HistoryItem (`borderRadius: 4pt`, `paddingH: 8pt`, `paddingV: 3pt`). La cohérence géométrique entre les trois badges de la ligne 1 est fondamentale — des badges de tailles différentes créeraient une ligne hétérogène et peu soignée.

---

## Écran : HistoryScreen — Composant HistoryItem mis à jour

### Objectif

Distinguer visuellement les parties jouées en mode défi quotidien dans la liste de l'historique, sans alourdir le composant.

### Layout (ASCII)

**HistoryItem sans badge défi (partie libre) — inchangé**

```
┌──────────────────────────────────────────────────────────┐  minH:64pt
│  [VICTOIRE]  Albert Camus → Existentialisme          →  │  Ligne 1
│              3 sauts · 1:23 · 06/03/2026                │  Ligne 2
└──────────────────────────────────────────────────────────┘
  paddingH:16  paddingV:12
```

**HistoryItem avec badge défi (isDailyChallenge === true)**

```
┌──────────────────────────────────────────────────────────┐  minH:64pt
│  [VICTOIRE]  [DÉFI]  Albert Camus → Existentialisme  →  │  Ligne 1
│                      3 sauts · 1:23 · 06/03/2026        │  Ligne 2
└──────────────────────────────────────────────────────────┘
  paddingH:16  paddingV:12
```

**Zoom sur la ligne 1 avec les deux badges**

```
┌─────────┐  ┌──────┐  Albert Camus → Existentialisme   →
│VICTOIRE │  │ DÉFI │  flex:1, numberOfLines:1, ellipsis
└─────────┘  └──────┘
fond         fond
#DCFCE7      #D97706
texte        texte
#16A34A      #FFFFFF
Bold 11px    Bold 11px
paddingH:8   paddingH:8
paddingV:3   paddingV:3
borderRadius:4           marginLeft:4 (entre les deux badges)

Espace entre badge DÉFI et début du titre trajet : marginLeft:8
```

**Cas abandonné avec badge défi**

```
┌──────────────┐  ┌──────┐  Albert Camus → Philosophie   →
│  ABANDONNÉ   │  │ DÉFI │  flex:1, numberOfLines:1
└──────────────┘  └──────┘
fond #F1F5F9      fond #D97706
texte #64748B     texte #FFFFFF
```

### Composants

- **BadgeDéfi** — View (pill). Fond `#D97706`. `borderRadius: 4pt`. `paddingHorizontal: 8pt`. `paddingVertical: 3pt`. Texte "DÉFI" Bold 11px `#FFFFFF`. `alignSelf: 'center'`. `marginLeft: 4pt` (depuis le BadgeStatut précédent). Conditionnel : rendu uniquement si `record.isDailyChallenge === true`.

- **Structure Ligne 1 (mise à jour)** — `View flexDirection: 'row'`, `alignItems: 'center'`. Contient dans l'ordre : `BadgeStatut` (existant), `BadgeDéfi` (conditionnel, `marginLeft: 4`), Text titre trajet (`flex: 1`, `marginLeft: 8`, `numberOfLines: 1`), icône "→" à droite.

### États

- **Default (partie libre) :** BadgeDéfi absent — layout identique à l'existant.
- **Default (partie défi) :** BadgeDéfi visible en amber, avec `marginLeft: 4` depuis BadgeStatut.
- **Loading :** Skeleton sur HistoryItem — inchangé. Le skeleton ne distingue pas les parties défis (c'est un état de chargement, les données ne sont pas encore disponibles).
- **Error :** Sans objet — même gestion qu'en F3-02.
- **Empty :** Sans objet.

### Accessibilité

- [ ] Le BadgeDéfi est `accessible={false}` — l'information "Défi du jour" est portée par l'`accessibilityLabel` du HistoryItem parent (TouchableOpacity englobant), qui doit être mis à jour.
- [ ] `accessibilityLabel` mis à jour sur le TouchableOpacity du HistoryItem quand `isDailyChallenge === true`. Exemple :

  Avant (F3-02) :
  `"Victoire. Albert Camus vers Existentialisme. 3 sauts, 1 minute 23 secondes, le 6 mars 2026."`

  Après (F3-23) :
  `"Défi du jour. Victoire. Albert Camus vers Existentialisme. 3 sauts, 1 minute 23 secondes, le 6 mars 2026."`

  Le préfixe "Défi du jour." est placé EN PREMIER dans le label — c'est le contexte le plus important pour identifier la nature de la partie. VoiceOver l'annonce immédiatement avant le résultat.

- [ ] Aucune information transmise uniquement par la couleur amber — le label vocal inclut "Défi du jour"
- [ ] Contraste badge DÉFI : `#FFFFFF` sur `#D97706` = 3.0:1 — insuffisant WCAG AA texte normal (4.5:1) mais assumé par cohérence avec les badges existants (même tolérance que badge Victoire 3.1:1). Documenté.
- [ ] Le badge DÉFI ne doit PAS avoir `accessibilityRole="text"` ou `accessible={true}` — il est enfant d'un TouchableOpacity qui porte le label complet. L'activer serait une double lecture.
- [ ] Ordre de lecture VoiceOver sur HistoryItem (pas de changement de structure) : l'item est lu en une seule unité depuis son `accessibilityLabel` parent — les enfants visuels individuels (badges, textes) sont ignorés par VoiceOver.
- [ ] Persistance après changement de tri (F3-10) : l'indicateur reste présent sur les bonnes parties après re-tri via SortBar — c'est automatique car le badge dépend uniquement de `record.isDailyChallenge`, pas de la position dans la liste.

### Notes pour Laurent

- Le BadgeDéfi est rendu conditionnellement : `{record.isDailyChallenge === true && <BadgeDéfi />}`. Ne pas utiliser `record.isDailyChallenge` seul sans la comparaison stricte `=== true` — les GameRecord anciens (avant F3-01) n'ont pas ce champ et `undefined` serait falsy, mais la comparaison stricte est plus lisible et robuste.
- `accessibilityLabel` du TouchableOpacity parent : construire la string en logique conditionnelle dans le composant — si `isDailyChallenge === true`, préfixer par `"Défi du jour. "`. Cette chaîne est assemblée en JavaScript, pas dans le JSX directement, pour rester lisible.
- L'ajout du BadgeDéfi ne doit pas modifier la hauteur minimale du HistoryItem (`minHeight: 64pt` ou équivalent existant). La ligne 1 reste sur une seule ligne — les badges et le titre sont en `flexDirection: 'row'` avec le titre en `flex: 1`. Si le titre devient trop court (écrans étroits), l'ellipsis s'applique — comportement déjà géré.
- Le libellé du badge est "DÉFI" en majuscules (4 caractères) — court et lisible à 11px. Ne pas utiliser "Défi du jour" complet dans le badge (trop long, déséquilibre le layout). L'information complète est dans le label vocal.
- L'impact mémoire de ce changement est nul — `isDailyChallenge` est un booléen optionnel déjà présent dans `GameRecord` depuis F3-01.
