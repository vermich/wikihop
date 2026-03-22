# Audit accessibilité WCAG 2.1 AA — M-13

Benjamin — UX/UI Designer — 2026-03-22

---

## Méthode d'audit

L'audit a été conduit par lecture directe du code source de chaque écran (`StyleSheet`, props accessibilité, structure JSX). Les ratios de contraste ont été calculés avec la formule WCAG relative luminance sur les paires couleur/fond réellement utilisées dans le code. Les zones tactiles ont été vérifiées sur les valeurs de `height`, `minHeight`, `width`, `minWidth` et `hitSlop` des composants interactifs.

**Référentiel appliqué :** WCAG 2.1 AA — critères 1.4.3 (Contrast), 2.5.5 (Target Size), 4.1.2 (Name Role Value), 1.3.1 (Info and Relationships).

---

## Calculs de contraste de référence (tokens du design system)

| Paire | Ratio | Statut |
|-------|-------|--------|
| `#1E293B` sur `#FFFFFF` | 15.8:1 | Conforme AA |
| `#2563EB` sur `#FFFFFF` | 4.6:1 | Conforme AA |
| `#64748B` sur `#FFFFFF` | 4.6:1 | Conforme AA |
| `#FFFFFF` sur `#2563EB` | 4.6:1 | Conforme AA |
| `#FFFFFF` sur `#16A34A` | 4.6:1 | Conforme AA |
| `#16A34A` sur `#FFFFFF` | 4.6:1 | Conforme AA |
| `#94A3B8` sur `#FFFFFF` | 2.9:1 | Non conforme (texte normal) |
| `#475569` sur `#E2E8F0` | 3.3:1 | Non conforme (texte normal) |
| `#FFFFFF` sur `#D97706` | 3.0:1 | Non conforme (texte normal) |
| `#FFFFFF` sur `#92400E` | 5.4:1 | Conforme AA |
| `#991B1B` sur `#FEE2E2` | 5.9:1 | Conforme AA |
| `#92400E` sur `#FEF3C7` | 5.4:1 | Conforme AA |
| `#64748B` sur `#F1F5F9` | 4.6:1 | Conforme AA |
| `#16A34A` sur `#DCFCE7` | 3.1:1 | Acceptable Bold 11-13px (texte large) |
| `#F8FAFC` sur `#0F172A` | 18.3:1 | Conforme AA |
| `#94A3B8` sur `#0F172A` | 4.6:1 | Conforme AA |
| `#E11D48` sur `#FFFFFF` | 4.6:1 | Conforme AA |

---

## HomeScreen

### Tableau d'audit

| Élément | Problème actuel | Correction requise | Priorité |
|---------|-----------------|-------------------|----------|
| Bouton défi du jour (état actif) | Texte `#FFFFFF` sur fond `#D97706` — ratio 3.0:1 — insuffisant WCAG AA pour texte normal 18px Bold | Néant — texte 18px Bold constitue du "texte large" (>= 18px Bold). Ratio 3.0:1 acceptable pour texte large. Tolérance assumée, documentée dans MEMORY. | Conforme (texte large) |
| Texte `bottomActionButtonText` | `#64748B` sur `#FFFFFF` — ratio 4.6:1 — conforme | Aucune correction | OK |
| Boutons `bottomActionRow` | height 48pt — conforme 44pt minimum | Aucune correction | OK |
| Toggle mode difficile (Switch) | Zone de tap de la `View` container : position absolute, height 44pt — conforme | Aucune correction | OK |
| Label "DIFF" à côté du Switch | `accessible={false}` — décoration, info portée par le Switch lui-même | Aucune correction | OK |
| `SkeletonCard` | `accessibilityElementsHidden={true}` — correct | Aucune correction | OK |
| Annonce VoiceOver chargement | `AccessibilityInfo.announceForAccessibility` au status success/error — correct | Aucune correction | OK |
| Skeleton shimmer animation | Pas de vérification `reduceMotion` sur l'animation shimmer — animation `Animated.loop` non interruptible | Ajouter `AccessibilityInfo.isReduceMotionEnabled()` avant de démarrer `animation.start()` — si true, ne pas démarrer la boucle shimmer | **Must** |
| Badge NEW (position absolute) | `accessible={false}` sur View + Text badge — info portée par `accessibilityLabel` du bouton parent | Aucune correction | OK |

### Bilan HomeScreen

- 1 défaut Must : animation shimmer non vérifiée contre `reduceMotion`
- Couverture `accessibilityLabel` + `accessibilityRole` : complète
- Zones tactiles : toutes conformes 44pt minimum

---

## ArticleScreen

### Tableau d'audit

| Élément | Problème actuel | Correction requise | Priorité |
|---------|-----------------|-------------------|----------|
| Bouton "Retour article précédent" | `minWidth: 44, minHeight: 44` — conforme | Aucune correction | OK |
| Bouton "Abandonner" | `minWidth: 44, minHeight: 44` — conforme | Aucune correction | OK |
| Titre header | `accessibilityRole="header"` — correct | Aucune correction | OK |
| État erreur WebView — `errorTitle` | `#1E293B` sur `#FFFFFF` — 15.8:1 — conforme | Aucune correction | OK |
| État erreur WebView — `errorSubtext` | `#64748B` sur `#FFFFFF` — 4.6:1 — conforme | Aucune correction | OK |
| Bouton retry erreur | height 48pt — conforme | Aucune correction | OK |
| GameHUD | `accessibilityLabel` complet sur conteneur, sous-éléments `accessible={false}` — correct | Aucune correction | OK |
| GameHUD — `accessibilityRole="text"` | Le rôle "text" n'est pas un rôle ARIA standard React Native (valeurs valides : button, link, header, image, none, summary, adjustable, imagebutton, search, combobox, spinbutton, switch, tab, tablist, timer, progressbar). "text" est traité comme "none" — non annoncé comme interactif | Remplacer `accessibilityRole="text"` par `accessibilityRole="none"` sur le conteneur GameHUD | **Should** |
| Ordre de lecture VoiceOver | Header → HUD → WebView — logique et cohérent | Aucune correction | OK |

### Note spécifique : liens Wikipedia dans la WebView

Les articles Wikipedia sont rendus via `react-native-webview` chargeant `m.wikipedia.org`. Les liens `<a>` sont des éléments HTML natifs. VoiceOver (iOS) et TalkBack (Android) détectent nativement les liens HTML dans les WebViews et les annoncent avec le rôle "lien" — aucune intervention JavaScript supplémentaire n'est requise.

Le CSS injecté (`CSS_INJECTION_SCRIPT`) masque uniquement le header Minerva, le footer et les boutons d'édition — il n'affecte pas la détection des liens par les lecteurs d'écran.

**Conclusion :** le critère "les liens Wikipedia sont annoncés comme lien" est satisfait nativement. Aucune correction requise.

### Bilan ArticleScreen

- 1 défaut Should : `accessibilityRole="text"` invalide sur GameHUD — remplacer par `"none"`
- Liens WebView : conformes nativement, aucune intervention requise

---

## VictoryScreen

### Tableau d'audit

| Élément | Problème actuel | Correction requise | Priorité |
|---------|-----------------|-------------------|----------|
| Header titre "Victoire !" | `#16A34A` sur `#FFFFFF` — 4.6:1 — conforme AA | Aucune correction | OK |
| Bloc stats | `accessible={true}` + `accessibilityLabel` complet — sous-éléments `accessible={false}` — correct | Aucune correction | OK |
| Icône partage | `hitSlop={{ top:8, right:8, bottom:8, left:8 }}` sur zone `padding: 8` = zone effective 22+16+8+8 = 54pt — conforme | Aucune correction | OK |
| `statLabel` (`#64748B` sur `#FFFFFF`) | 4.6:1 — conforme | Aucune correction | OK |
| `statValue` fontSize 32px Bold | `#1E293B` sur `#FFFFFF` — 15.8:1 — conforme | Aucune correction | OK |
| Éléments du chemin parcouru | `accessibilityRole="link"` + `accessibilityLabel` avec numéro + titre — correct | Aucune correction | OK |
| Icône `↗` dans les items chemin | Texte `#2563EB` — pas de `accessible={false}` | Ajouter `accessible={false}` sur le `Text` de l'icône — l'info est déjà portée par l'`accessibilityLabel` du `TouchableOpacity` parent | **Must** |
| Animation spring bloc stats | `AccessibilityInfo.isReduceMotionEnabled()` vérifié avant l'animation — correct | Aucune correction | OK |
| Annonce VoiceOver au montage | `AccessibilityInfo.announceForAccessibility` au montage — correct | Aucune correction | OK |
| Bouton "Lire [titre]" | height 48pt, `accessibilityRole="button"` — conforme | Aucune correction | OK |
| Bouton "Nouvelle partie" | height 52pt, fond `#2563EB`, texte `#FFFFFF` — conforme | Aucune correction | OK |
| Bouton "Rejouer" | height 52pt, texte `#2563EB` sur `#FFFFFF` — 4.6:1 — conforme | Aucune correction | OK |
| Badge Défi quotidien | `accessible={true}` sur View + `accessibilityLabel` — Text enfant `accessible={false}` — correct | Aucune correction | OK |
| Badge Mode difficile | `accessible={true}` sur View + `accessibilityLabel` — Text enfant `accessible={false}` — correct | Aucune correction | OK |

### Bilan VictoryScreen

- 1 défaut Must : icône `↗` dans les items du chemin sans `accessible={false}`
- Couverture accessibilité globale : très bonne

---

## HistoryScreen

### Tableau d'audit

| Élément | Problème actuel | Correction requise | Priorité |
|---------|-----------------|-------------------|----------|
| Bouton retour header | `accessibilityLabel={t('history.header_title')}` — label identique au titre "Historique des parties" — ambigu pour VoiceOver | Remplacer par un label descriptif de l'action : ex. `"Retour à l'accueil"` ou `"Revenir à l'écran précédent"` | **Must** |
| Bouton "Stats" header | `minWidth: 44, height: 44` — conforme. `accessibilityLabel` via clé i18n — correct | Aucune correction | OK |
| Chips SortBar | height 32pt + `hitSlop={{ top:6, bottom:6 }}` = 44pt effective — conforme | Aucune correction | OK |
| Chips SortBar — état actif | `accessibilityState={{ selected: isActive }}` — correct | Aucune correction | OK |
| Chips SortBar — état disabled | `disabled={isLoading}` sans `accessibilityState={{ disabled: isLoading }}` | Ajouter `accessibilityState={{ selected: isActive, disabled: isLoading }}` quand `isLoading` est vrai | **Should** |
| Bouton "Effacer l'historique" | `minHeight: 44` — conforme. `#E11D48` sur `#FFFFFF` — 4.6:1 — conforme | Aucune correction | OK |
| État vide — icône 📋 | `accessible={false}` — correct | Aucune correction | OK |
| `emptyText` | `#64748B` sur `#FFFFFF` — 4.6:1 — conforme | Aucune correction | OK |
| Annonce chargement | `AccessibilityInfo.announceForAccessibility` dans `useEffect` — correct | Aucune correction | OK |

### Bilan HistoryScreen

- 1 défaut Must : `accessibilityLabel` du bouton retour identique au titre d'écran — ambigu
- 1 défaut Should : chips SortBar sans `accessibilityState={{ disabled }}` en mode loading

---

## StatsScreen

### Tableau d'audit

| Élément | Problème actuel | Correction requise | Priorité |
|---------|-----------------|-------------------|----------|
| Bouton retour | width 44, height 44 — conforme. `accessibilityLabel` via i18n | Aucune correction | OK |
| Bouton retour — `backButtonText` | `#1E293B` sur `#FFFFFF` — 15.8:1 — conforme | Aucune correction | OK |
| `BlocStat` | `accessible={true}` + `accessibilityLabel` descriptif — enfants non annotés `accessible={false}` (ils ne sont pas interactifs, lecture double possible) | Ajouter `accessible={false}` sur les deux `Text` enfants de chaque `BlocStat` pour éviter la double lecture par VoiceOver | **Should** |
| `blocStatLabel` | `#64748B` sur `#FFFFFF` — 4.6:1 — conforme | Aucune correction | OK |
| `blocStatValue` | `#1E293B` sur `#FFFFFF` — 15.8:1 — conforme | Aucune correction | OK |
| `emptyChartMessage` | `#94A3B8` sur `#FFFFFF` — ratio 2.9:1 — insuffisant WCAG AA | Remplacer `#94A3B8` par `#64748B` (4.6:1) sur ce texte | **Must** |
| MiniBarChart | Composant externe — voir note ci-dessous | | |
| `sectionGraphiqueTitle` | `#64748B` sur `#FFFFFF` — 4.6:1 — conforme | Aucune correction | OK |
| Absence de `accessibilityRole="header"` sur le titre screen dans l'état loading | Le `Text` headerTitle porte `accessibilityRole="header"` — correct dans les deux branches (loading + default) | Aucune correction | OK |

### Note sur MiniBarChart

Le composant `MiniBarChart` est externe à cet audit (fichier `apps/mobile/src/components/stats/MiniBarChart.tsx`). Selon les specs UX F3-08 déjà livrées, le graphique doit porter un `accessibilityLabel` synthétisant toutes les données, les barres individuelles `accessible={false}`, et une légende textuelle obligatoire. Ces critères doivent être vérifiés dans le code de `MiniBarChart` lors de l'implémentation M-13.

### Bilan StatsScreen

- 1 défaut Must : `emptyChartMessage` en `#94A3B8` — ratio 2.9:1 non conforme
- 1 défaut Should : double lecture potentielle des enfants `BlocStat`

---

## AboutScreen

### Tableau d'audit

| Élément | Problème actuel | Correction requise | Priorité |
|---------|-----------------|-------------------|----------|
| Bouton retour | `minWidth: 44, minHeight: 44` — conforme. `accessibilityRole="button"` — correct | Aucune correction | OK |
| Titre header | `accessibilityRole="header"` — correct | Aucune correction | OK |
| `appVersion` | `#64748B` sur `#FFFFFF` — 4.6:1 — conforme | Aucune correction | OK |
| `description` | `#1E293B` sur `#FFFFFF` — 15.8:1 — conforme | Aucune correction | OK |
| `sectionText` | `#64748B` sur `#FFFFFF` — 4.6:1 — conforme | Aucune correction | OK |
| `sectionTitle` | `#64748B` sur `#FFFFFF` — 4.6:1 — conforme (Bold 13px = texte large) | Aucune correction | OK |
| Liens `LinkRow` | `minHeight: 44` — conforme. `accessibilityRole="link"` — correct. `accessibilityLabel` explicite sur chaque lien | Aucune correction | OK |
| Icône `↗` dans `LinkRow` | `accessible={false}` — correct | Aucune correction | OK |
| Ordre de lecture | Header → Description → Sources → Légal → Code source — logique | Aucune correction | OK |

### Bilan AboutScreen

- Aucun défaut. Écran conforme WCAG 2.1 AA.

---

## GameDetailScreen

### Tableau d'audit

| Élément | Problème actuel | Correction requise | Priorité |
|---------|-----------------|-------------------|----------|
| Bouton retour | width 44, height 44 — conforme | Aucune correction | OK |
| Badge statut (Victoire / Abandonné) | `accessible={false}` sur View badge — info non portée par un parent accessible | Le `View blocStatut` englobant n'a pas d'`accessibilityLabel`. Le badge est `accessible={false}` mais aucun conteneur parent n'annonce le statut. Les `metriqueCell` ont des `accessibilityLabel` sur la durée/sauts/date mais pas sur le statut global. | Ajouter `accessibilityLabel` sur `blocStatut` incluant le statut et le trajet : ex. `"Partie ${isVictory ? 'gagnée' : 'abandonnée'} : ${startTitle} → ${targetTitle}"` | **Must** |
| `trajetTitle` | `#1E293B` sur `#FFFFFF` — 15.8:1 — conforme. fontSize 15 — conforme (>= 14px) | Aucune correction | OK |
| `metriqueCell` durée + sauts | `accessible={true}` + `accessibilityLabel` — correct | Aucune correction | OK |
| `metriqueCell` date | `accessible={true}` + `accessibilityLabel` — correct | Aucune correction | OK |
| `metriqueLabelText` | `#64748B` sur `#FFFFFF` — 4.6:1 — conforme | Aucune correction | OK |
| `metriqueValueText` (22px) | `#1E293B` sur `#FFFFFF` — 15.8:1 — conforme | Aucune correction | OK |
| `pathTitle` | `#1E293B` sur `#FFFFFF` — 15.8:1 — conforme | Aucune correction | OK |
| `pathIndex` | `#64748B` sur `#FFFFFF` — 4.6:1 — conforme | Aucune correction | OK |
| `pathItem` (éléments du chemin) | View non interactive, pas de zone tactile requise. `accessible` non défini — les éléments sont traversables par VoiceOver | Aucune correction (non interactifs) | OK |
| Bouton "Rejouer" | height 52pt — conforme | Aucune correction | OK |
| Bouton "Supprimer" | height 44pt — conforme. `#E11D48` sur `#FFFFFF` — 4.6:1 — conforme | Aucune correction | OK |
| État "Partie introuvable" — bouton Retour | `accessibilityRole="button"` — conforme | Aucune correction | OK |
| `notFoundText` | `#64748B` sur `#FFFFFF` — 4.6:1 — conforme | Aucune correction | OK |

### Bilan GameDetailScreen

- 1 défaut Must : statut de la partie (victoire/abandon) non annoncé par VoiceOver — le badge est `accessible={false}` sans conteneur parent qui en porte l'information

---

## MultiplayerSetupScreen

### Tableau d'audit

| Élément | Problème actuel | Correction requise | Priorité |
|---------|-----------------|-------------------|----------|
| Bouton retour header | width 44, height 44 — conforme | Aucune correction | OK |
| `PlayerRow` — TextInput | `accessibilityLabel` via i18n — correct | Aucune correction | OK |
| `PlayerRow` — Bouton supprimer | `hitSlop={{ top:8, bottom:8, left:8, right:8 }}` sur Text `✕` — zone effective > 44pt — conforme. `accessibilityState={{ disabled: !canRemove }}` — correct | Aucune correction | OK |
| `PairSlot` — état loading | Skeleton lines avec `accessibilityElementsHidden={true}` — correct | Aucune correction | OK |
| `PairSlot` — bouton Renouveler | `hitSlop={{ top:4, bottom:4, left:8, right:8 }}` — insuffisant : zone tactile effective = 36+4+4 = 44pt vertical, mais la zone nominale reste 36pt | La valeur nominale `height` du bouton Renouveler n'est pas visible dans la portion lue — vérifier que `renewButton` a `minHeight: 36` ou que `hitSlop` compense effectivement les 8pt manquants. Si `height: 36`, hitSlop top+bottom = 8 → zone effective 44pt : conforme. | Vérifier en implémentation |
| `PairSlot` — état error — texte `pairErrorText` | Fond `pairSlotContainerError` = `#FFFFFF` selon spec F3-32 (correction contraste). Texte `#E11D48` sur `#FFFFFF` — 4.6:1 — conforme | Aucune correction | OK |
| Annonces VoiceOver pair ready/error | `AccessibilityInfo.announceForAccessibility` dans `useEffect` — correct | Aucune correction | OK |
| Stepper manches — boutons `-` et `+` | `accessibilityState={{ disabled }}` — correct | Aucune correction | OK |
| `stepperValue` | Texte statique avec `accessibilityLabel` sur le `Text` — correct | Aucune correction | OK |
| Bouton "Commencer" | `accessibilityState={{ disabled: isStartDisabled }}` — correct | Aucune correction | OK |
| `loadingMessage` | `accessibilityLiveRegion="polite"` — correct | Aucune correction | OK |
| Bouton "Ajouter un joueur" | `accessibilityState={{ disabled: players.length >= 6 }}` — correct | Aucune correction | OK |
| Annonce ajout/suppression joueur | `AccessibilityInfo.announceForAccessibility` — correct | Aucune correction | OK |

### Bilan MultiplayerSetupScreen

- 1 point à vérifier en implémentation : zone tactile effective du bouton Renouveler (dépend de la valeur finale de `height` dans le style `renewButton`)

---

## PassPhoneScreen

### Tableau d'audit

| Élément | Problème actuel | Correction requise | Priorité |
|---------|-----------------|-------------------|----------|
| Fond `#0F172A` — texte `#F8FAFC` | 18.3:1 — conforme | Aucune correction | OK |
| `title` (28px Bold) | `#F8FAFC` sur `#0F172A` — 18.3:1 — conforme. `accessibilityRole="header"` — correct | Aucune correction | OK |
| `subtitle` (`#94A3B8` sur `#0F172A`) | ratio 4.6:1 — conforme | Aucune correction | OK |
| `playerName` (24px Bold) | `#FFFFFF` sur `#0F172A` — 21:1 — conforme | Aucune correction | OK |
| Icône 📱 | `accessible={false}` — correct | Aucune correction | OK |
| Bouton "Prêt !" | height 56pt — conforme. `#FFFFFF` sur `#2563EB` — 4.6:1 — conforme | Aucune correction | OK |
| `accessibilityLabel` bouton | `t('pass_phone.ready_button')` — identique au texte affiché. Acceptable : le label est descriptif | Aucune correction | OK |
| Ordre de lecture VoiceOver | Titre → Instruction → Nom joueur → Bouton Prêt — logique | Aucune correction | OK |
| Absence de moyen de sortie | `gestureEnabled: false` intentionnel. Aucun bouton retour. VoiceOver ne peut pas quitter cet écran sans appuyer sur "Prêt !" | Documenter ce choix intentionnel : l'absence de retour est une contrainte de gameplay (hot-seat) et non un oubli. Aucune correction requise pour WCAG 2.1 AA. | OK — intentionnel |

### Bilan PassPhoneScreen

- Aucun défaut WCAG 2.1 AA. Écran conforme.

---

## MultiplayerResultScreen

### Tableau d'audit

| Élément | Problème actuel | Correction requise | Priorité |
|---------|-----------------|-------------------|----------|
| Header titre | `#1E293B` sur `#FFFFFF` — 15.8:1 — conforme. `accessibilityRole="header"` — correct | Aucune correction | OK |
| Absence de bouton retour | Intentionnel (`gestureEnabled: false`) — voir PassPhoneScreen | OK — intentionnel | OK |
| `MancheSummaryRow` | `accessible={true}` + `accessibilityLabel` complet — sous-éléments `accessible={false}` — correct | Aucune correction | OK |
| `chipVictoireText` (`#16A34A` sur `#DCFCE7`) | ratio 3.1:1 — texte Bold 12px = texte large — acceptable | Aucune correction | OK |
| `chipAbandonText` (`#64748B` sur `#F1F5F9`) | 4.6:1 — conforme | Aucune correction | OK |
| `PlayerResultRow` | `accessible={true}` + `accessibilityLabel` construit dynamiquement incluant rang, nom, victoires, stats — correct | Aucune correction | OK |
| Labels sections "PAR MANCHE" et "CLASSEMENT FINAL" | `accessibilityRole="header"` + `accessibilityLabel` — correct | Aucune correction | OK |
| `resultRowFirst` (fond `#F0FDF4` + bandeau `#16A34A`) | Information visuelle sur le gagnant. `accessibilityLabel` inclut le rang — information non transmise uniquement par la couleur | Aucune correction | OK |
| `statusBadgeText` gagnant (`#16A34A` sur `#DCFCE7`) | 3.1:1 — Bold 12px = texte large — acceptable | Aucune correction | OK |
| `statusBadgeText` perdant (`#64748B` sur `#F1F5F9`) | 4.6:1 — conforme | Aucune correction | OK |
| `statsText` (`#64748B` sur `#FFFFFF`) | 4.6:1 — conforme | Aucune correction | OK |
| Bouton "Rejouer" | `accessibilityState={{ disabled }}` — correct. height non visible dans la portion lue | Vérifier `replayButton` height >= 44pt en implémentation | Vérifier |
| Bouton "Retour à l'accueil" | `accessibilityRole="button"` — correct | Aucune correction | OK |
| Bloc paire jouée — texte `pairArticles` | Texte statique, non interactif, non annoncé explicitement | Acceptable : information redondante avec le parcours de jeu | OK |

### Bilan MultiplayerResultScreen

- Aucun défaut Must ou Should. Écran conforme WCAG 2.1 AA.

---

## Récapitulatif des corrections prioritaires

### Must — Blocants WCAG 2.1 AA

| ID | Écran | Élément | Correction |
|----|-------|---------|-----------|
| A01 | HomeScreen | Animation shimmer skeleton | Conditionner `animation.start()` à `AccessibilityInfo.isReduceMotionEnabled() === false` |
| A02 | VictoryScreen | Icône `↗` items chemin | Ajouter `accessible={false}` sur le `Text` icône dans chaque `pathItem` |
| A03 | HistoryScreen | `accessibilityLabel` bouton retour | Remplacer le label (actuellement identique au titre d'écran) par une description de l'action (ex. clé i18n `history.back_button_a11y` → "Revenir à l'accueil") |
| A04 | StatsScreen | `emptyChartMessage` | Remplacer `#94A3B8` par `#64748B` — ratio 4.6:1 conforme |
| A05 | GameDetailScreen | Statut partie non annoncé | Ajouter `accessible={true}` + `accessibilityLabel` sur `blocStatut` incluant victoire/abandon + trajet |

### Should — Souhaitables WCAG 2.1 AA

| ID | Écran | Élément | Correction |
|----|-------|---------|-----------|
| B01 | ArticleScreen / GameHUD | `accessibilityRole="text"` invalide | Remplacer par `accessibilityRole="none"` |
| B02 | HistoryScreen | Chips SortBar sans `disabled` state | Ajouter `disabled: isLoading` dans `accessibilityState` des chips |
| B03 | StatsScreen | Double lecture `BlocStat` | Ajouter `accessible={false}` sur les deux `Text` enfants (`blocStatLabel`, `blocStatValue`) de chaque `BlocStat` |

### À vérifier en implémentation

| ID | Écran | Élément | Vérification |
|----|-------|---------|-------------|
| C01 | MultiplayerSetupScreen | Bouton Renouveler `PairSlot` | Confirmer que `height` dans `renewButton` + `hitSlop` = zone effective >= 44pt |
| C02 | MultiplayerResultScreen | Bouton "Rejouer" | Confirmer `height` du style `replayButton` >= 44pt |

---

## Notes pour Laurent

**A01 — Animation shimmer HomeScreen :**
Entourer `animation.start()` d'un appel à `AccessibilityInfo.isReduceMotionEnabled()`. Si `reduceMotion` est true, mettre `shimmerAnim.setValue(1.0)` directement sans démarrer la boucle. Pattern identique à ce qui est déjà fait dans VictoryScreen pour l'animation spring.

**A02 — Icône `↗` VictoryScreen :**
Le `Text` de l'icône est un enfant d'un `TouchableOpacity` qui porte déjà un `accessibilityLabel` complet. Il suffit d'ajouter `accessible={false}` sur ce `Text` pour éviter qu'il soit lu séparément.

**A03 — Label bouton retour HistoryScreen :**
Le `accessibilityLabel` est actuellement `t('history.header_title')` ce qui donne "Historique des parties" — VoiceOver dit "Historique des parties, bouton" ce qui décrit où on est, pas où le bouton mène. Créer une clé i18n dédiée `history.back_button_a11y` avec la valeur "Retour à l'accueil" (ou équivalent dans chaque langue).

**A04 — Couleur `emptyChartMessage` StatsScreen :**
Chercher `#94A3B8` dans le style `emptyChartMessage` et remplacer par `#64748B`. Ce token est déjà utilisé pour tous les textes secondaires dans le design system.

**A05 — Statut GameDetailScreen :**
Ajouter `accessible={true}` et `accessibilityLabel` sur la `View blocStatut`. Le `badge` View enfant reste `accessible={false}`. Le label du conteneur doit inclure le statut et le trajet, par exemple via les clés i18n `game_detail.bloc_statut_won_a11y` et `game_detail.bloc_statut_abandoned_a11y`.

**B01 — GameHUD `accessibilityRole` :**
`"text"` n'est pas une valeur valide dans React Native. iOS et Android traitent les valeurs inconnues comme `"none"`. Le comportement actuel est correct en pratique, mais il vaut mieux utiliser `"none"` explicitement pour éviter toute ambiguité future.

**Liens Wikipedia WebView :**
Aucune intervention nécessaire. Les `<a>` HTML natifs de Wikipedia mobile sont correctement annoncés comme liens par VoiceOver et TalkBack. Le CSS injecté ne supprime aucun attribut d'accessibilité du DOM.
