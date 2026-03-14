# Spec technique — F3-23 : Badge "défi du jour" dans l'historique

## Contexte

Story : docs/stories/phase-3/F3-23.
Quand une partie de l'historique correspond à un défi du jour (`record.isDailyChallenge === true`), l'utilisateur doit pouvoir l'identifier visuellement dans la liste. Actuellement, aucun indicateur visuel ne distingue les parties quotidiennes des parties libres.

**Nécessite une spec UX/UI de Benjamin** avant implémentation (voir section dédiée ci-dessous).

## Périmètre

**Dans scope :**
- Modifier `HistoryItem` pour afficher un badge "Défi" quand `record.isDailyChallenge === true`
- Modifier l'`accessibilityLabel` de `HistoryItem` pour inclure "Défi du jour." dans ce cas
- Modifier le test unitaire `HistoryItem.test.tsx` s'il existe, ou créer un test alongside

**Hors scope :**
- Modification de `HistoryScreen`
- Modification de `GameRecord` ou du type `isDailyChallenge`
- Modification de la logique de stockage (`ScoreStorage`)

## Demande UX/UI à Benjamin

Avant que Laurent commence l'implémentation, Benjamin doit valider les points suivants :

1. **Position du badge** : la spec ci-dessous propose d'insérer le badge entre le badge statut (Victoire/Abandonné) et le titre du trajet, dans la ligne 1 de `HistoryItem`. Confirmer ou proposer une alternative.
2. **Style du badge** : fond #D97706 (amber, cohérent avec le bouton défi de HomeScreen), texte "Défi" Bold 11px blanc, mêmes dimensions que le badge statut (`paddingH:8, paddingV:3, borderRadius:4`). Valider.
3. **Marges** : ajouter `marginLeft: 4` entre le badge statut et le badge défi. Valider.

## Fichiers à modifier

- `apps/mobile/src/components/history/HistoryItem.tsx`
- `apps/mobile/src/components/history/__tests__/HistoryItem.test.tsx` (créer si inexistant)

## Interface HistoryItem — pas de modification de props

`GameRecord` expose déjà `isDailyChallenge?: boolean` (défini dans `@wikihop/shared`). Aucune modification des props de `HistoryItem` n'est nécessaire — le champ est accessible via `record.isDailyChallenge`.

## Modification de HistoryItem

### 1. Ligne 1 — insertion du badge défi

Structure actuelle de la ligne 1 :
```tsx
<View style={styles.row}>
  <View style={[styles.badge, ...]}>
    <Text>Victoire / Abandonné</Text>
  </View>
  <Text style={styles.trajet} numberOfLines={1}>...</Text>
  <Text style={styles.navIcon}>↗</Text>
</View>
```

Structure cible :
```tsx
<View style={styles.row}>
  {/* Badge statut — inchangé */}
  <View style={[styles.badge, isVictory ? styles.badgeVictory : styles.badgeAbandoned]} accessible={false}>
    <Text style={[styles.badgeText, isVictory ? styles.badgeTextVictory : styles.badgeTextAbandoned]}>
      {isVictory ? 'Victoire' : 'Abandonné'}
    </Text>
  </View>

  {/* Badge défi du jour — conditionnel */}
  {record.isDailyChallenge === true && (
    <View style={styles.badgeDaily} accessible={false}>
      <Text style={styles.badgeDailyText}>{'Défi'}</Text>
    </View>
  )}

  {/* Trajet — inchangé */}
  <Text style={styles.trajet} numberOfLines={1} ellipsizeMode="tail" accessible={false}>
    {`${record.startArticle.title} → ${record.targetArticle.title}`}
  </Text>
  <Text style={styles.navIcon} accessible={false}>{'↗'}</Text>
</View>
```

### 2. Modification de l'accessibilityLabel

Format actuel :
```
"Victoire. [départ] vers [destination]. [N] saut(s). [durée]. Le [date]."
```

Format cible quand `isDailyChallenge === true` :
```
"Victoire. Défi du jour. [départ] vers [destination]. [N] saut(s). [durée]. Le [date]."
```

```typescript
// Avant (ligne 51) :
const accessibilityLabel = `${isVictory ? 'Victoire' : 'Abandonné'}. ${record.startArticle.title} vers ${record.targetArticle.title}. ${String(record.jumps)} ${jumpLabel}. ${formattedDuration}. Le ${formattedDate}.`;

// Après :
const dailyChallengePrefix = record.isDailyChallenge === true ? 'Défi du jour. ' : '';
const accessibilityLabel = `${isVictory ? 'Victoire' : 'Abandonné'}. ${dailyChallengePrefix}${record.startArticle.title} vers ${record.targetArticle.title}. ${String(record.jumps)} ${jumpLabel}. ${formattedDuration}. Le ${formattedDate}.`;
```

### 3. Styles à ajouter dans StyleSheet.create

```typescript
// Badge défi du jour (F3-23) — amber cohérent avec HomeScreen
badgeDaily: {
  paddingHorizontal: 8,
  paddingVertical: 3,
  borderRadius: 4,
  backgroundColor: '#D97706',
  marginLeft: 4,
},
badgeDailyText: {
  fontSize: 11,
  fontWeight: 'bold',
  color: '#FFFFFF',
},
```

## Tests — alongside

Des tests doivent être écrits **en même temps que** l'implémentation (composant UI — pas de TDD strict).

Fichier : `apps/mobile/src/components/history/__tests__/HistoryItem.test.tsx`

### Cas de test requis

```typescript
// Setup : mock @wikihop/shared (GameRecord), mock history.utils

describe('HistoryItem', () => {
  describe('badge défi du jour', () => {
    it('affiche le badge "Défi" quand isDailyChallenge === true', () => {
      // render(<HistoryItem record={{ ...baseRecord, isDailyChallenge: true }} />)
      // expect(screen.getByText('Défi')).toBeTruthy()
    });

    it('n\'affiche pas le badge "Défi" quand isDailyChallenge === false', () => {
      // render(<HistoryItem record={{ ...baseRecord, isDailyChallenge: false }} />)
      // expect(screen.queryByText('Défi')).toBeNull()
    });

    it('n\'affiche pas le badge "Défi" quand isDailyChallenge est absent (undefined)', () => {
      // render(<HistoryItem record={baseRecord} />) // isDailyChallenge non défini
      // expect(screen.queryByText('Défi')).toBeNull()
    });

    it('inclut "Défi du jour." dans l\'accessibilityLabel quand isDailyChallenge === true', () => {
      // render(<HistoryItem record={{ ...baseRecord, isDailyChallenge: true }} />)
      // const element = screen.getByRole('button')
      // expect(element.props.accessibilityLabel).toContain('Défi du jour.')
    });

    it('n\'inclut pas "Défi du jour." dans l\'accessibilityLabel quand isDailyChallenge === false', () => {
      // render(<HistoryItem record={{ ...baseRecord, isDailyChallenge: false }} />)
      // const element = screen.getByRole('button')
      // expect(element.props.accessibilityLabel).not.toContain('Défi du jour.')
    });
  });
});
```

**Note** : si `@testing-library/react-native` n'est pas encore installé, vérifier `apps/mobile/package.json`. Si absent, ne pas l'ajouter pour cette story — utiliser le rendu direct et les assertions sur les props si nécessaire. Vérifier avec Laurent.

## Critères de qualité (PR review)

- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur
- [ ] Le badge "Défi" est visible uniquement quand `record.isDailyChallenge === true`
- [ ] `accessible={false}` sur le badge (l'info est dans l'`accessibilityLabel` du container)
- [ ] `accessibilityLabel` mis à jour avec "Défi du jour." quand applicable
- [ ] Tests alongside écrits couvrant les 5 cas listés
- [ ] Spec UX/UI de Benjamin validée avant merge (position et style du badge)
- [ ] Zéro modification de `HistoryScreen`, `GameRecord`, ni de `ScoreStorage`

## Points de vigilance

1. **`isDailyChallenge?: boolean`** — champ optionnel. Le test `=== true` est impératif (pas de `if (record.isDailyChallenge)`) car `undefined` doit être traité comme `false`. `exactOptionalPropertyTypes` est actif — ne pas écrire `record.isDailyChallenge === true ? ... : ...` avec un spread.

2. **Espace disponible en ligne 1** : le trajet (`startArticle.title → targetArticle.title`) a `flex:1` et `numberOfLines={1}`. L'ajout du badge "Défi" réduit l'espace disponible pour le titre. Avec deux badges (statut + défi), les titres longs peuvent être tronqués plus tôt — comportement acceptable (ellipsis).

3. **`marginLeft: 4`** sur `badgeDaily` — convention alignée avec les `marginLeft: 8` de `trajet` et `navIcon`. La valeur `4` assure un espacement visuel lisible sans surcharger la ligne.
