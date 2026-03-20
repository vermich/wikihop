# Spécifications visuelles — F3-45 — Ligne de 3 boutons en bas de HomeScreen

**Auteur :** Benjamin (UX/UI)
**Date :** 2026-03-20
**Story :** docs/stories/phase-3/F3-45-home-bottom-action-row.md

---

## Écran : HomeScreen — BottomActionRow

### Objectif
Le joueur trouve les 3 actions secondaires (Soutenir Wikipedia, Recharger les articles, À propos) regroupées en une ligne horizontale compacte, distincte des boutons de jeu principaux, sans encombrer la zone centrale.

### Contexte de la modification

**Avant F3-45 :** Les 3 actions étaient des `secondaryTextButton` individuels (texte centré 16px `#64748B`, h:44pt), empilés verticalement. Le bouton Recharger avait son propre style distinct avec icône ↺. Ils occupaient environ 140pt de hauteur verticale.

**Après F3-45 :** Les 3 actions sont regroupées sur une seule ligne horizontale de 48pt, chacune dans un bouton compact. La hauteur libérée est d'environ 90pt — réduction significative du scroll sur iPhone SE.

---

### Décision de style — Boutons compacts libellé seul (sans icône)

Les 3 boutons utilisent un style **texte compact sans icône**. Justification :
- Les libellés sont courts et suffisamment descriptifs sans icône
- Les icônes risquent d'être ambiguës sur 3 langues différentes (ex. "Soutenir" — quel pictogramme ?)
- La cohérence avec le design system minimaliste Wikipedia-centric prime
- Pas de risque de débordement sur iPhone SE 375pt avec 3 libellés courts

Variante avec icône envisagée et rejetée : les icônes Ionicons sont petites et peu lisibles à cette taille dans une rangée compacte. Si une itération future les demande, spécifier à ce moment-là.

---

### Layout (ASCII)

**Vue globale — fin de zone boutons :**

```
┌─────────────────────────────────────────────────────┐  [SCROLL]
│                                                     │
│  [Jouer une partie]            (bleu plein, 52pt)  │
│  [Défi du jour]                (ambre, 52pt)       │
│  [Multijoueur]                 (outline bleu, 52pt)│
│  [Historique des parties]      (outline bleu, 52pt)│  ← F3-44
│                                                     │
│  ───────── séparateur #E2E8F0 ──────────────────   │  marginTop: 16
│                                                     │
│  ┌──────────────┬──────────────────┬────────────┐  │
│  │  Soutenir    │  ↺ Recharger     │  À propos  │  │  ← F3-45
│  │  Wikipedia   │                  │            │  │
│  └──────────────┴──────────────────┴────────────┘  │
│                                                     │
│                          paddingBottom: 24          │
└─────────────────────────────────────────────────────┘
```

**Détail BottomActionRow :**

```
┌─────────────────────────────────────────────────────┐
│  flex: 1                                            │  ← View row container
│  flexDirection: 'row'                               │
│  justifyContent: 'space-between'                    │
│  paddingHorizontal: 0  (hérité du scrollContent)    │
│                                                     │
│  ┌──────────────┐  │  ┌──────────────┐  │  ┌────┐  │
│  │  Soutenir    │  │  │  ↺ Recharger │  │  │ À  │  │
│  │  Wikipedia   │  │  │  les articles│  │  │propos│ │
│  │  flex: 1     │  │  │  flex: 1     │  │  │ f:1│  │
│  │  h: 48pt     │  │  │  h: 48pt     │  │  │h:48│  │
│  └──────────────┘  │  └──────────────┘  │  └────┘  │
│                    │                    │           │
│               sep 1pt              sep 1pt          │
│               #E2E8F0              #E2E8F0           │
└─────────────────────────────────────────────────────┘
```

**Séparateurs verticaux :** Deux `View` de `width: 1, height: 20, backgroundColor: '#E2E8F0'`, centrés verticalement dans la ligne, placés entre les boutons. Ils ne sont pas des bordures sur les boutons — ce sont des éléments séparateurs indépendants (`accessible={false}`).

---

### Composants

**BottomActionRow (View conteneur) :**
- `flexDirection: 'row'`
- `alignItems: 'center'`
- `marginTop: 0` — le séparateur horizontal (déjà spécifié dans `secondaryLinksSeparator`, `marginTop: 16`) gère l'espacement supérieur
- Pas de `paddingHorizontal` supplémentaire — hérité du `scrollContent` (16pt de chaque côté)

**Bouton compact (pattern commun aux 3) :**
- `flex: 1`
- `height: 48pt`
- `alignItems: 'center'`
- `justifyContent: 'center'`
- `paddingHorizontal: 4` — léger padding interne pour éviter le texte contre les séparateurs
- `backgroundColor: 'transparent'` (pas de fond)
- Pas de bordure propre au bouton

**Texte des boutons compacts :**
- `fontSize: 14px`
- `fontWeight: 'bold'` — visible malgré la petite taille
- `color: '#64748B'` — identique aux anciens `secondaryTextButton`, cohérence maintenue
- `textAlign: 'center'`
- `numberOfLines: 2` — autorise un retour à la ligne si le libellé est long sur une locale
- `adjustsFontSizeToFit: false` — ne pas réduire la police

**Séparateur vertical (View) :**
- `width: 1`
- `height: 20`
- `backgroundColor: '#E2E8F0'`
- `accessible={false}`

**Icône ↺ dans "Recharger les articles" :**
L'icône rotation de l'existant (`refreshIcon`, Text Unicode ↺) est maintenue pour le bouton Recharger. Elle s'affiche sur la même ligne que le texte. Implémentation : `flexDirection: 'row'` sur le bouton Recharger, texte + Text `↺` côte à côte. L'animation de rotation (quand chargement en cours) s'applique uniquement à l'icône.

**Libellés courts recommandés (par locale) :**
Les libellés doivent être courts pour ne pas déborder sur iPhone SE (375pt — soit ~125pt par bouton). Les libellés existants sont trop longs. Recommandation :
- "Soutenir Wikipedia" → utiliser `home.support_wikipedia_link` existant. Sur 375pt = ~125pt/bouton — 13 caractères + taille 14px — acceptable sur 2 lignes.
- "Recharger les articles" → utiliser `home.new_articles_button` existant. 22 caractères — passera sur 2 lignes à 14px Bold sur 125pt. Acceptable.
- "À propos" → utiliser `home.about_link` existant. 8 caractères — passe sur 1 ligne.

Vérification iPhone SE (375pt) :
- Largeur disponible : 375 - 32 (marges) = 343pt
- 343pt / 3 boutons = ~114pt net par bouton (en tenant compte des 2 séparateurs de 1pt)
- Police 14px Bold — hauteur ligne : 21px — 2 lignes = 42px < 48pt — OK
- "Recharger les articles" (22 chars) — environ 11 chars/ligne à 14px Bold = 2 lignes — conforme

Vérification iPhone Pro Max (430pt) :
- Largeur disponible : 430 - 32 = 398pt / 3 = ~132pt net par bouton
- Tous les libellés passent sur 1 ou 2 lignes — aucun débordement.

---

### États

- **Default :** 3 boutons compacts visibles, texte `#64748B`.
- **Loading (articles en cours de chargement) :** Les 3 boutons sont présents et actifs dans la branche `loading` de `renderContent()`. Le bouton Recharger est `disabled={true}` pendant le chargement (cohérence avec l'existant — opacité 0.4). "Soutenir Wikipedia" et "À propos" sont toujours actifs (navigation indépendante du chargement).
- **Error :** L'état error de HomeScreen affiche uniquement le message d'erreur + Réessayer (comportement inchangé). La BottomActionRow n'est pas affichée dans l'état error.
- **Empty :** Non applicable.
- **Pressé :** `activeOpacity: 0.7` sur chaque bouton compact.

---

### Accessibilité

- [ ] `accessibilityLabel` explicite sur chacun des 3 boutons :
  - Soutenir : `"Soutenir Wikipedia, ouvrir la page de don"` — clé `home.donation_a11y` (existante)
  - Recharger : `"Recharger les articles"` — clé `home.refresh_a11y` (existante)
  - À propos : `"À propos de WikiHop"` — clé `home.about_a11y` (existante)
- [ ] `accessibilityRole="button"` sur les 3 TouchableOpacity
- [ ] `accessibilityState={{ disabled: true }}` sur le bouton Recharger quand `isLoading === true`
- [ ] Contraste texte `#64748B` sur `#FFFFFF` : 4.6:1 — conforme WCAG AA
- [ ] Zone tactile : hauteur 48pt > 44pt minimum. Largeur ~114-132pt selon device — conforme.
- [ ] Séparateurs `accessible={false}` — éléments purement décoratifs
- [ ] Aucune information transmise par la couleur seule — les libellés suffisent
- [ ] Ordre de lecture VoiceOver : Soutenir Wikipedia → Recharger → À propos, de gauche à droite — ordre naturel dans le JSX `flexDirection: 'row'`
- [ ] Animation ↺ Recharger : respecte `reduceMotion` — l'animation de rotation est gérée par `rotateAnim` existant, déjà conditionnel selon `state.status === 'loading'`. Pas de changement requis.
- [ ] `numberOfLines: 2` sur les textes — ne jamais tronquer avec `ellipsizeMode` sur des actions navigables (l'utilisateur doit lire l'action complète)

---

### Notes pour Laurent

1. **Structure JSX :** Remplacer les 3 `TouchableOpacity` secondaires individuels (Soutenir, Recharger, À propos) par un `View` `BottomActionRow` contenant : bouton1 + séparateur + bouton2 + séparateur + bouton3. Le séparateur `secondaryLinksSeparator` (horizontal) précédant la row est conservé.

2. **Bouton Recharger dans la row :** L'animation rotation (`rotateInterpolated`) doit être conservée sur l'icône ↺ dans la nouvelle row. La logique est déjà dans `renderContent()` — simplement déplacer l'`Animated.Text` de l'icône dans le nouveau composant compact. Le bouton Recharger n'a plus le style `refreshButton` (hauteur 44 standalone) mais le style compact de la row.

3. **Suppression :** Supprimer les styles `refreshButton`, `refreshButtonInner`, `refreshButtonDisabled`, `refreshButtonText`, `refreshIcon`, `secondaryTextButton`, `secondaryTextButtonText` s'ils ne sont plus référencés après refactoring. Vérifier avant de supprimer (grep dans le fichier).

4. **flexDirection: 'row' et animation :** Le bouton Recharger dans la row aura `flexDirection: 'row'` pour afficher texte + icône ↺. Wrapper l'icône dans un `Animated.Text` (ou une `Animated.View` contenant un `Text`) avec la transform rotate — identique à l'existant.

5. **Branche loading vs success :** Les 3 actions de la BottomActionRow doivent être présentes dans les deux branches (`loading` et `success`) de `renderContent()`. Dans la branche `loading`, le bouton Recharger est `disabled={true}` avec `opacity: 0.4` (via `Animated.View` avec le style `refreshButtonDisabled` ou équivalent dans le nouveau style).

6. **Clés i18n :** Réutiliser les clés existantes pour les 3 boutons. Aucune nouvelle clé n'est nécessaire pour les libellés visibles. Vérifier que `home.support_wikipedia_link`, `home.new_articles_button`, `home.about_link` sont bien dans tous les fichiers de locale (F3-26).

7. **Pas de défilement horizontal :** La row est un `View` en `flex: 1` / `flexDirection: 'row'` — pas de `ScrollView` horizontal. Les 3 boutons ont chacun `flex: 1` et s'adaptent à la largeur disponible sur tous les appareils supportés.
