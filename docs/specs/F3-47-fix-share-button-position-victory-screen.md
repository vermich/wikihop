# Spec technique — F3-47 : Fix position bouton partage VictoryScreen

## 1. Contexte

Story : `docs/stories/phase-3/🔄-F3-47-fix-share-button-position-victory-screen.md`

Le bouton de partage (icône `share-social-outline`, introduit en F3-41) est positionné en absolu dans le `statsBlock` via le style `shareIconButton`. Son positionnement actuel (`top: 12, right: 12`) le fait chevaucher le label de durée ("seconde(s)") dans la cellule droite du `statsRow`.

**Analyse du code `VictoryScreen.tsx`** :

```typescript
// Style actuel shareIconButton (ligne 729) :
shareIconButton: {
  position: 'absolute',
  top: 12,
  right: 12,
  padding: 11,
  alignItems: 'center',
  justifyContent: 'center',
},
```

Le `statsBlock` a `paddingVertical: 16`. L'icône à `top: 12` est dans la zone de padding du bloc. La cellule de droite (`statCell`) contient la valeur numérique (`statValue`, `fontSize: 32`) puis le label (`statLabel`, `fontSize: 11`). Avec `paddingVertical: 8` sur `statCell`, la valeur commence à environ y=24 depuis le haut du bloc. L'icône à `top: 12` avec `padding: 11` (zone de tap 44×44 effective) descend jusqu'à environ y=46 — soit en chevauchement avec la valeur numérique de durée.

**Comportement attendu** : l'icône de partage est clairement séparée du contenu textuel du `statsRow`. La zone visuellement visible de l'icône (22px) doit être entièrement dans la zone de padding supérieur du bloc, ou suffisamment éloignée des valeurs texte pour ne pas créer d'ambiguïté visuelle.

## 2. Périmètre

**Dans scope :**
- Fichier `apps/mobile/src/screens/VictoryScreen.tsx` — style `shareIconButton`
- Vérification visuelle sur iPhone SE (375pt) et Pro Max (430pt)

**Hors scope :**
- Logique du partage (`handleShare`) — inchangée
- Accessibilité (`accessibilityLabel`, `hitSlop`) — inchangés
- Taille de l'icône (22px) — inchangée

## 3. Architecture proposée

### Correction StyleSheet

Le problème est que `top: 12` positionne le coin supérieur du `TouchableOpacity` à 12pt du haut du bloc, mais `padding: 11` étend la zone de tap vers le bas. L'icône elle-même (22px) est centrée dans la zone `padding: 11`, ce qui la place visuellement à environ `top: 12 + 11 = 23pt`.

La correction consiste à aligner l'icône sur le `badgePill` éventuellement présent, ou à positionner l'icône assez haut pour être clairement dans la zone de header du bloc :

```typescript
// APRÈS — aligner l'icône en haut à droite sans déborder sur le contenu
shareIconButton: {
  position: 'absolute',
  top: 8,
  right: 8,
  padding: 8,            // zone de tap réduite à 38×38 (min 44 garanti par hitSlop déjà en place)
  alignItems: 'center',
  justifyContent: 'center',
},
```

**Règle de positionnement** : l'icône (22px) + padding (8pt × 2) = 38pt de hauteur totale, positionnée à `top: 8`. Elle occupe la bande verticale [8, 46]pt depuis le haut du bloc. Le `statsRow` commence après les éventuels badges (`marginBottom: 8` pour `badgePill`) et après le padding interne du bloc (16pt). Le premier élément du `statsRow` est à environ y=32pt (sans badge) ou y=52pt (avec badge) depuis le haut du bloc — hors de la zone d'affichage de l'icône.

Note : `hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}` est déjà défini sur le `TouchableOpacity` (ligne 426) — la zone de tap effective reste ≥ 44×44 même avec `padding: 8`.

### Vérification des deux cas (avec / sans badges)

- **Sans badge** (partie normale, mode normal) : `statsRow` commence immédiatement dans `statsBlock` après le `paddingVertical: 16`. L'icône à [8, 46] ne chevauche pas le `statsRow` démarrant à [16, ...].
- **Avec badge défi du jour** : `badgePill` + `marginBottom: 8` ≈ 36pt. Le `statsRow` commence à environ [52, ...]. L'icône à [8, 46] ne chevauche pas.
- **Avec badge difficile** : `badgePillHard` + `marginBottom: 12` ≈ 40pt. Pareil.

## 4. TDD — fonctions pures et hooks à tester

Aucune nouvelle fonction pure ni hook. Correction purement stylistique. Pas de nouveaux tests requis.

## 5. Critères de qualité (PR review)

- [ ] `shareIconButton` : `top` et `right` ajustés, `padding` ≤ 11 (la zone `hitSlop` garantit la taille de tap)
- [ ] L'icône ne chevauche plus aucun texte du `statsRow` ni des badges, vérifié visuellement
- [ ] La fonctionnalité de partage est inchangée (tap → `handleShare`)
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur

## 6. Points de vigilance

- Ne pas modifier `hitSlop` — il est crucial pour l'accessibilité (zone de tap ≥ 44×44).
- Ne pas changer la taille de l'icône (22px) ni sa couleur (`#2563EB`).
- Tester visuellement avec les deux badges présents simultanément (partie défi + mode difficile) — cas le plus contraint.
- Sur iPhone SE (375pt de large) avec `paddingHorizontal: 16` du `statsBlock`, la zone disponible pour les stats est 375 - 32 = 343pt. L'icône à `right: 8` depuis le bord intérieur du bloc ne crée pas de conflit avec le texte centré.
