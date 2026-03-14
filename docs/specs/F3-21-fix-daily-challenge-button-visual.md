# Spec technique — F3-21 : Fix état visuel bouton défi du jour complété

## Contexte

Story : docs/stories/phase-3/F3-21.
Quand le défi du jour est complété ou en cours de chargement, `isDailyButtonDisabled = true` est positionné sur le `TouchableOpacity`. Or, `TouchableOpacity` React Native ne réduit pas automatiquement l'opacité quand `disabled={true}` — le bouton garde l'apparence d'un élément interactif.

Problème : l'utilisateur ayant complété le défi voit un bouton brun (#92400E) visuellement identique à un bouton pressable. Idem pour l'état loading (gris #E2E8F0).

## Périmètre

**Dans scope :**
- Ajouter une opacité réduite sur le bouton défi en états `disabled` et `completed`
- Tester les 3 états visuels : loading/disabled, complété, normal

**Hors scope :**
- Modifier le flow logique (`isDailyButtonDisabled`, `isDailyButtonCompleted`, `handlePlayDaily`)
- Modifier le style `dailyButtonCompleted` (fond brun #92400E, icône ✓, texte "Défi du jour complété")
- Modifier le comportement `disabled={isDailyButtonDisabled}`
- Modifier le badge NEW (F3-19)

## Fichiers à modifier

- `apps/mobile/src/screens/HomeScreen.tsx` — modification uniquement dans le rendu du bouton défi

## Comportement attendu par état

| État | `isDailyButtonDisabled` | Style fond | Opacité |
|------|------------------------|------------|---------|
| Normal (défi disponible) | `false` | `dailyButton` — #D97706 amber | `1` (pleine) |
| Loading / non chargé | `true` | `dailyButtonDisabled` — #E2E8F0 gris | `0.5` |
| Complété | `true` | `dailyButtonCompleted` — #92400E brun | `0.5` |

## Modification à apporter

### 1. Calculer l'opacité du bouton défi

Ajouter dans la section "Helpers visuels" (autour de la ligne 370 dans HomeScreen) :

```typescript
// F3-21 : opacité réduite quand le bouton est désactivé (disabled ou complété)
// TouchableOpacity ne gère pas automatiquement l'opacity sur disabled=true
const dailyButtonOpacity = isDailyButtonDisabled ? 0.5 : 1;
```

### 2. Appliquer l'opacité sur les deux instances du bouton

Le bouton défi est rendu **deux fois** dans HomeScreen : une fois dans le bloc `loading` (l. ~420) et une fois dans le bloc `success` (l. ~549). Les deux instances doivent recevoir la modification.

```tsx
// Avant (les deux instances) :
<TouchableOpacity
  style={dailyButtonStyle}
  disabled={isDailyButtonDisabled}
  ...
>

// Après :
<TouchableOpacity
  style={[dailyButtonStyle, { opacity: dailyButtonOpacity }]}
  disabled={isDailyButtonDisabled}
  activeOpacity={isDailyButtonDisabled ? 1 : 0.8}
  ...
>
```

**Explication de `activeOpacity` :**
- État normal : `activeOpacity={0.8}` — feedback visuel au press (valeur par défaut RN = 0.2, trop fort)
- État disabled/complété : `activeOpacity={1}` — pas de feedback visuel puisque non pressable

### 3. Retirer le `marginTop` manquant sur `dailyButtonDisabled`

En examinant les styles, `dailyButtonDisabled` ne définit que `backgroundColor: '#E2E8F0'` — sans `height`, `borderRadius`, ni `marginTop`. Ces propriétés sont héritées du style de base uniquement si le style de base est appliqué en premier.

Vérifier que le style est bien appliqué comme suit (état loading) :

```typescript
const dailyButtonStyle =
  isDailyButtonCompleted
    ? styles.dailyButtonCompleted           // height:52, borderRadius:12, marginTop:12, bgColor:#92400E
    : dailyChallengeState.status !== 'success'
      ? styles.dailyButtonDisabled          // bgColor:#E2E8F0 SEULEMENT — manque height/borderRadius/marginTop
      : styles.dailyButton;                 // height:52, borderRadius:12, marginTop:12, bgColor:#D97706
```

`dailyButtonDisabled` ne contient pas `height:52`, `borderRadius:12`, `marginTop:12`. Ces attributs sont absents quand ce style est appliqué seul. Deux approches :

**Option recommandée :** Enrichir `dailyButtonDisabled` dans les styles pour qu'il soit autonome :

```typescript
dailyButtonDisabled: {
  height: 52,
  borderRadius: 12,
  marginTop: 12,
  backgroundColor: '#E2E8F0',
  alignItems: 'center',
  justifyContent: 'center',
},
```

Si `dailyButtonDisabled` est déjà complet visuellement (pas de régression QA rapportée sur la hauteur), ne pas modifier les styles et se contenter de l'opacité.

## TDD — pas de TDD strict sur ce composant

`HomeScreen` est un composant UI — tests alongside. Aucun test unitaire n'est requis pour ce fix visuel. La validation est visuelle (simulateur + device).

## Critères de qualité (PR review)

- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur
- [ ] Les 3 états visuels sont vérifiés sur simulateur iOS et Android
- [ ] Zéro modification du flow logique (`isDailyButtonDisabled`, `handlePlayDaily`)
- [ ] Les deux instances du bouton défi dans `renderContent()` ont reçu la modification
- [ ] `activeOpacity={1}` appliqué sur les états disabled et complété

## Points de vigilance

- Le bouton défi est dupliqué dans `renderContent()` : bloc `loading` (~l.420) et bloc `success` (~l.549). Les deux doivent être modifiés. Oubli de l'un des deux = bug visuel en état loading.
- `style={[dailyButtonStyle, { opacity: dailyButtonOpacity }]}` : l'objet inline `{ opacity }` est correct ici (pas de `StyleSheet.create` pour une valeur dynamique). Pas de warning de perf sur un seul composant.
- Ne pas confondre `disabled` (prop booléenne) et `opacity` (style visuel) — les deux sont indépendants et doivent être appliqués séparément.
