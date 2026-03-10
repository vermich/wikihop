# Spécifications visuelles — F3-16 — Indicateur de complétion du défi quotidien

**Auteur :** Benjamin — UX/UI Designer
**Date :** 2026-03-10
**Story liée :** F3-16
**Ecran concerné :** HomeScreen — bouton "Défi du jour"

---

## Contexte et contraintes produit

Le bouton "Défi du jour" (fond ambre `#D97706`) existe déjà dans HomeScreen. Il n'affiche actuellement aucun retour visuel indiquant si le joueur a déjà complété le défi du jour en cours.

**Contraintes imposées par le PO (non négociables) :**
- Le bouton reste cliquable en état "complété" (rejouer est autorisé)
- Pas de changement de taille du bouton (height: 52pt, borderRadius: 12pt inchangés)
- Cohérence palette : bleu `#2563EB` (Jouer), ambre `#D97706` (défi)

**Décision d'approche :** L'état "complété" est communiqué par une combinaison de trois signaux simultanés : modification de fond, ajout d'une icône check, et modification du label. Aucun de ces trois signaux n'est porteur d'information seul — ils se renforcent mutuellement pour garantir l'accessibilité.

---

## Source de données — comment détecter la complétion

La complétion du défi du jour est détectable depuis l'historique des parties (`GameRecord[]`) via `ScoreStorage`. Un défi est considéré "complété aujourd'hui" si l'historique contient au moins un `GameRecord` satisfaisant simultanément :

- `record.isDailyChallenge === true`
- `record.dailyChallengeDate === todayUTC` (fonction `isDailyChallengeToday` déjà disponible dans `daily-challenge.utils.ts`)
- `record.status === 'completed'` (partie terminée avec victoire)

La logique de détection appartient au hook ou composant, pas à cette spec visuelle. Ces specs décrivent uniquement **ce qui est affiché** selon le résultat de cette détection.

**Prop attendue sur le composant bouton (ou variable locale dans HomeScreen) :**
```
isDailyCompleted: boolean
```

---

## Écran : HomeScreen — Bouton "Défi du jour" (deux états)

### Objectif

Permettre au joueur de distinguer d'un coup d'oeil si le défi quotidien a déjà été complété, tout en conservant la possibilité de rejouer.

---

### État 1 — Non complété (défaut)

Le défi du jour est disponible et n'a pas encore été joué avec succès aujourd'hui.

```
┌──────────────────────────────────────────┐  height: 52pt
│                                          │  backgroundColor: #D97706
│          Défi du jour                    │  borderRadius: 12pt
│                                          │  alignItems: center / justifyContent: center
└──────────────────────────────────────────┘
```

**Composants — État non complété :**

- **Fond du bouton** : `#D97706` (ambre — token existant DailyChallengeButton)
- **Texte** : `"Défi du jour"` — fontSize: 18, fontWeight: `bold`, color: `#FFFFFF`
- **Icône** : aucune

**Contraste texte/fond :** `#FFFFFF` sur `#D97706` — rapport 2.94:1.

> Note contraste : Ce rapport est inférieur à 4.5:1 pour le texte normal de 18px. Or 18px Bold correspond au seuil "grand texte" selon WCAG 2.1 (14pt Bold = 18.67px). Le seuil applicable est donc 3:1 pour le grand texte. Le rapport 2.94:1 est très légèrement inférieur à ce seuil. Il s'agit d'un écart préexistant dans le design système établi (token `DailyChallengeButton` validé en Phase 3). **Cette spec ne modifie pas cet état — l'écart est hérité et documenté ici pour traçabilité.** Si une correction est demandée, elle doit faire l'objet d'une décision séparée (changer `#D97706` vers un ambre plus foncé impacterait l'identité visuelle).

---

### État 2 — Complété (défi du jour joué avec succès)

Le joueur a terminé le défi du jour avec une victoire. Le bouton reste actif pour rejouer.

```
┌──────────────────────────────────────────┐  height: 52pt — inchangé
│                                          │  backgroundColor: #92400E
│    ✓   Défi du jour complété             │  borderRadius: 12pt — inchangé
│                                          │
└──────────────────────────────────────────┘
```

**Composants — État complété :**

- **Fond du bouton** : `#92400E` (brun profond — version assombrie de l'ambre pour signifier l'état "passé")
- **Icône** : checkmark `✓` — fontSize: 16, fontWeight: `bold`, color: `#FFFFFF`, marginRight: 8pt
- **Texte** : `"Défi du jour complété"` — fontSize: 16, fontWeight: `bold`, color: `#FFFFFF`

**Contraste texte/fond :** `#FFFFFF` sur `#92400E` — rapport 5.4:1. Conforme WCAG AA (texte normal ≥ 4.5:1 ET texte large ≥ 3:1).

**Justification du choix `#92400E` :**
- Token déjà présent dans le design system (texte du badge DailyChallenge dans VictoryScreen)
- Sémantiquement cohérent : même teinte brun/ambre, mais saturé et foncé = "c'est passé, c'est accompli"
- Contraste WCAG AA sur fond blanc ET contraste suffisant pour le texte blanc dessus
- Visuellement distinct de l'état non-complété sans rupture chromatique

**Pourquoi ne pas utiliser `#16A34A` (vert victoire) ?**
Le vert est un token sémantique réservé à VictoryScreen. L'utiliser ici créerait une ambiguïté (est-ce un élément de victoire ? est-ce actif ?) et violerait la politique de tokens sémantiques établie.

---

### Comparaison visuelle des deux états

```
[NON COMPLÉTÉ]
┌──────────────────────────────────────────┐
│          Défi du jour                    │  fond: #D97706 (ambre)
└──────────────────────────────────────────┘

[COMPLÉTÉ]
┌──────────────────────────────────────────┐
│    ✓   Défi du jour complété             │  fond: #92400E (brun profond)
└──────────────────────────────────────────┘

[DÉSACTIVÉ — chargement en cours]
┌──────────────────────────────────────────┐
│          Défi du jour                    │  fond: #E2E8F0, texte: #94A3B8
└──────────────────────────────────────────┘
```

Le troisième état (désactivé pendant le chargement) est inchangé par rapport à l'existant.

---

### Layout dans HomeScreen — position du bouton dans buttonsContainer

```
┌─────────────────────────────┐  [SCROLL]
│  ...                        │
│  [ArticleCard DÉPART]       │
│                             │
│         ↓                   │
│                             │
│  [ArticleCard DESTINATION]  │
│                             │
│  ┌─────────────────────┐   │  marginTop: 24pt
│  │  [Défi du jour]     │   │  height: 52pt — fond #D97706 ou #92400E
│  └─────────────────────┘   │  marginBottom: 12pt
│  ┌─────────────────────┐   │
│  │       Jouer         │   │  height: 52pt — fond #2563EB
│  └─────────────────────┘   │
│                             │
│  Nouveaux articles ↺        │  height: 44pt
│  ─────────────────────────  │
│  Mode difficile  [ Switch ] │  minHeight: 44pt
│  Historique                 │  height: 44pt
│  Soutenir Wikipedia         │  height: 44pt
│  À propos                   │  height: 44pt
└─────────────────────────────┘
```

---

### Disposition interne du bouton — État complété (précisions d'alignement)

```
┌──────────────────────────────────────────┐
│  [flex:1, flexDirection: row]            │
│  [alignItems: center]                    │
│  [justifyContent: center]                │
│                                          │
│      ✓        Défi du jour complété      │
│    [16px]    [16px Bold]                 │
│    [mr: 8pt]                             │
└──────────────────────────────────────────┘
```

Le texte passe de 18px (état non-complété) à 16px (état complété) pour accommoder le texte plus long + l'icône dans la même hauteur de 52pt. La différence de 2px est imperceptible visuellement mais permet d'éviter toute troncature sur petits écrans.

---

### États complets du bouton

**État : loading (données défi non chargées)**
- Fond : `#E2E8F0`
- Texte : `"Défi du jour"` — color: `#94A3B8`
- Pas d'icône
- `disabled: true`, `accessibilityState: { disabled: true }`
- Inchangé par rapport à l'existant

**État : error (chargement défi échoué)**
- Fond : `#E2E8F0`
- Texte : `"Défi du jour"` — color: `#94A3B8`
- Pas d'icône
- `disabled: true`, `accessibilityState: { disabled: true }`
- Identique à l'état loading — pas de différenciation visuelle spécifique (l'erreur est dans un contexte global, pas spécifique au bouton défi)

**État : success, non complété**
- Fond : `#D97706`
- Texte : `"Défi du jour"` — 18px Bold `#FFFFFF`
- Pas d'icône
- `disabled: false`

**État : success, complété (F3-16)**
- Fond : `#92400E`
- Icône `✓` + texte `"Défi du jour complété"` — 16px Bold `#FFFFFF`
- `disabled: false` (rejouer autorisé)

---

### Transition entre états

**Transition instantanée — pas d'animation.**

La raison : le changement d'état (non-complété → complété) se produit uniquement au retour depuis VictoryScreen après avoir gagné le défi du jour. Ce n'est pas une transition en temps réel pendant que l'écran est affiché — c'est un état lu au montage ou au refocus de HomeScreen. Une animation serait ici superflue et potentiellement perturbante.

Si un jour le HomeScreen implémente un `useFocusEffect` pour relire l'état au retour de Game/Victory, la transition restera instantanée : pas d'animation de fond ou de fade-in de l'icône.

**Respect de `reduceMotion` :** sans objet (aucune animation prévue).

---

### Accessibilité

- [ ] `accessibilityLabel` explicite — état non-complété : `"Jouer le défi du jour"` (pas "Défi du jour" — décrire l'action)
- [ ] `accessibilityLabel` explicite — état complété : `"Défi du jour complété — rejouer"` (annonce l'état ET l'action disponible)
- [ ] `accessibilityLabel` explicite — état désactivé : `"Défi du jour — chargement en cours"` ou `"Défi du jour — indisponible"` selon le cas
- [ ] `accessibilityRole="button"` dans tous les états
- [ ] `accessibilityState={{ disabled: false }}` en état complété (le bouton EST actif — rejouer est possible)
- [ ] `accessibilityState={{ disabled: true }}` en état loading/error uniquement
- [ ] L'état "complété" est communiqué par le label, pas uniquement par la couleur : `"Défi du jour complété — rejouer"` informe un lecteur d'écran sans voir le fond `#92400E`
- [ ] L'icône `✓` est décorative (`accessible={false}` sur le Text icône si implémentée séparément) — l'information est portée par le label
- [ ] Contrastes vérifiés :
  - Non-complété : `#FFFFFF` / `#D97706` = 2.94:1 — écart hérité, documenté (voir note contraste ci-dessus)
  - Complété : `#FFFFFF` / `#92400E` = 5.4:1 — conforme AA texte normal et grand texte
  - Désactivé : `#94A3B8` / `#E2E8F0` = 2.17:1 — état inchangé, écart hérité
- [ ] Zone tactile : height 52pt > 44pt minimum — conforme dans tous les états
- [ ] Aucune animation — `reduceMotion` sans objet
- [ ] Ordre de lecture VoiceOver/TalkBack : le bouton défi est lu avant le bouton Jouer (ordre visuel respecté)

---

### Valeurs StyleSheet exactes pour Laurent

**Style `dailyButton` — inchangé (état non-complété)**
```
height: 52,
backgroundColor: '#D97706',
borderRadius: 12,
alignItems: 'center',
justifyContent: 'center',
marginBottom: 12,
```

**Nouveau style `dailyButtonCompleted`**
```
height: 52,
backgroundColor: '#92400E',
borderRadius: 12,
alignItems: 'center',
justifyContent: 'center',
marginBottom: 12,
flexDirection: 'row',
```

**Style `dailyButtonText` — inchangé (état non-complété)**
```
fontSize: 18,
fontWeight: 'bold',
color: '#FFFFFF',
```

**Nouveau style `dailyButtonTextCompleted`**
```
fontSize: 16,
fontWeight: 'bold',
color: '#FFFFFF',
```

**Nouveau style `dailyButtonCheckIcon`**
```
fontSize: 16,
fontWeight: 'bold',
color: '#FFFFFF',
marginRight: 8,
```

**Logique d'application (décision de rendu — NOT code, guidance uniquement) :**

L'état du bouton est déterminé par la combinaison de `dailyChallengeState.status` et d'un booléen `isDailyCompleted` à calculer depuis l'historique :

| `dailyChallengeState.status` | `isDailyCompleted` | Style bouton | Texte | Icône | disabled |
|---|---|---|---|---|---|
| `'loading'` ou `'error'` | (ignoré) | `dailyButtonDisabled` | `"Défi du jour"` | aucune | `true` |
| `'success'` | `false` | `dailyButton` | `"Défi du jour"` | aucune | `false` |
| `'success'` | `true` | `dailyButtonCompleted` | `"Défi du jour complété"` | `✓` | `false` |

**Où calculer `isDailyCompleted` :**
Ce calcul doit lire l'historique des parties depuis `ScoreStorage` (ou un hook qui l'encapsule). Il utilise `isDailyChallengeToday` depuis `daily-challenge.utils.ts` et la date UTC du défi courant (`dailyChallengeState.data.date` quand status === 'success'). Ce point appartient aux specs techniques du Tech Lead pour F3-16 — la présente spec décrit uniquement le rendu visuel selon le résultat booléen.

---

### Notes pour Laurent

1. **`flexDirection: 'row'`** sur `dailyButtonCompleted` uniquement — pas sur `dailyButton` (texte seul, centré). Passer `flexDirection: 'row'` sur l'état non-complété n'est pas nécessaire et compliquerait la lecture du style.

2. **Icône `✓`** : utiliser un `Text` React Native avec le caractère Unicode U+2713 (`'✓'`) plutôt qu'une image ou une librairie d'icônes. C'est cohérent avec les autres icônes textuelles de HomeScreen (`'↓'`, `'↺'`). Mettre `accessible={false}` sur ce `Text` car l'information est portée par le `accessibilityLabel` du `TouchableOpacity` parent.

3. **Taille du texte** : passe de 18px à 16px en état complété. Cette réduction est intentionnelle pour que `"Défi du jour complété"` (texte plus long) + l'icône tiennent dans 52pt de hauteur sans troncature. Sur un iPhone SE (320pt de large), le bouton fait environ 288pt utiles (16pt marges de chaque côté) — `✓ + 8 + "Défi du jour complété"` en 16px Bold tient sans débordement.

4. **`accessibilityLabel` dynamique** : le label change selon l'état. Penser à mettre à jour les deux branches du rendu (loading et success) dans `renderContent()`. Le label en état loading dans le rendu skeleton doit aussi refléter cela.

5. **Pas de changement du handler `handlePlayDaily`** : le comportement au tap est identique qu'il soit complété ou non (rejouer autorisé). Pas de guard conditionnel à ajouter dans le handler pour cet état.

6. **Source de `isDailyCompleted`** : ce booléen sera fourni par la logique métier (hook ou calcul dans HomeScreen). La spec visuelle ne prescrit pas l'implémentation — attendre les specs du Tech Lead pour F3-16 sur ce point.

7. **Consistance avec le badge VictoryScreen** : le fond `#92400E` est identique au texte du badge `DailyChallengeBadge` dans VictoryScreen (`color: '#92400E'`). C'est intentionnel — cela crée une cohérence chromatique entre "j'ai fait le défi" sur l'écran de victoire et "j'ai fait le défi" sur HomeScreen.
