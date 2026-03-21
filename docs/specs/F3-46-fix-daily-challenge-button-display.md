# Spec technique — F3-46 : Fix affichage bouton défi du jour (FR/IT + délai autres langues)

## 1. Contexte

Story : `docs/stories/phase-3/🔄-F3-46-fix-daily-challenge-button-display.md`

En FR et IT, le bouton défi du jour présente un état visuel incorrect. Sur les autres langues, un flash de style intermédiaire est visible avant l'affichage correct. Ce bug est issu d'une combinaison entre :

1. L'hydratation asynchrone de `isLanguageHydrated` (le `LanguageSelectorButton` ne s'affiche qu'après hydratation) — mais le bouton défi lui n'est pas conditionné de la même manière.
2. Le style du bouton `dailyButtonStyle` est calculé **avant** que `dailyChallengeState` soit résolu. Au premier render, `dailyChallengeState.status === 'loading'` → le style est `styles.dailyButtonDisabled` (fond gris `#E2E8F0`). Une fois le défi chargé, le style passe à `styles.dailyButton` (fond ambre `#D97706`) — transition visible.
3. En FR et IT, un problème spécifique : le style de base `dailyButton` applique `marginTop: 12` mais ne définit pas `height` et `borderRadius` dans `dailyButtonDisabled` — ce qui cause un collapsing partiel visible lors de la transition entre les deux états (absent en EN/ES/DE qui ont un path de rendu identique mais dont la longueur de texte cache le phénomène).

**Analyse du code `HomeScreen.tsx` — lignes 399–427** :

```typescript
// Ces calculs sont effectués à chaque render, AVANT que dailyChallengeState soit settled
const isDailyButtonCompleted = isDailyCompleted && dailyChallengeState.status === 'success';
const isDailyButtonDisabled = isDailyButtonCompleted || dailyChallengeState.status !== 'success';
const showDailyBadge = dailyChallengeState.status === 'success' && !isDailyCompleted;

const dailyButtonStyle =
  isDailyButtonCompleted
    ? styles.dailyButtonCompleted
    : dailyChallengeState.status !== 'success'    // ← produit dailyButtonDisabled sur TOUS les renders initiaux
      ? styles.dailyButtonDisabled
      : styles.dailyButton;
```

Le style `dailyButtonDisabled` (ligne 841) ne définit que `backgroundColor` — il manque `height`, `borderRadius`, `alignItems`, `justifyContent`, `marginTop`, `flexDirection`. Ces propriétés sont définies dans `dailyButton` mais pas dans `dailyButtonDisabled`, qui est censé être un override. Le tableau `[dailyButtonStyle, { opacity: dailyButtonOpacity }]` applique donc soit `dailyButton` (avec toutes les props) soit `dailyButtonDisabled` (sans les props de layout).

**Correction attendue :** rendre `dailyButtonDisabled` un style complet autonome (copier les props de layout de `dailyButton`) pour éviter le flash de layout lors de la transition. La propriété `marginTop` doit être présente dans les deux états.

## 2. Périmètre

**Dans scope :**
- Fichier `apps/mobile/src/screens/HomeScreen.tsx` — styles `dailyButtonDisabled` et `dailyButtonCompleted`
- Vérification visuelle sur les 8 locales

**Hors scope :**
- Logique de chargement du défi (`useDailyChallenge`)
- Comportement du bouton (tap, navigation)
- Tests automatisés (pas de logique pure à tester ici — correction visuelle uniquement)

## 3. Architecture proposée

### Correction StyleSheet

Dans `StyleSheet.create()`, rendre `dailyButtonDisabled` un style complet autonome :

```typescript
// AVANT
dailyButtonDisabled: {
  backgroundColor: '#E2E8F0',
},

// APRÈS
dailyButtonDisabled: {
  height: 52,
  backgroundColor: '#E2E8F0',
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: 12,
  // NB : pas de flexDirection: 'row' — état disabled n'a pas d'icône checkmark
},
```

Vérifier également `dailyButtonCompleted` (ligne 845) : il définit déjà `height`, `borderRadius`, `alignItems`, `justifyContent`, `marginTop`, `flexDirection`. OK — pas de modification nécessaire.

### Aucune modification de la logique React

Le calcul de `dailyButtonStyle` (lignes 409–414) est correct — c'est uniquement le style CSS qui est incomplet. Aucun changement de `useState`, `useEffect` ou de condition de rendu n'est nécessaire.

## 4. TDD — fonctions pures et hooks à tester

Aucune nouvelle fonction pure ni hook n'est introduit. Ce fix est purement stylistique. Pas de tests nouveaux requis.

Les tests existants sur `HomeScreen` (si présents) ne doivent pas régresser.

## 5. Critères de qualité (PR review)

- [ ] `StyleSheet.create()` : `dailyButtonDisabled` contient au minimum `height: 52`, `borderRadius: 12`, `alignItems: 'center'`, `justifyContent: 'center'`, `marginTop: 12`
- [ ] Aucune autre modification dans le fichier (pas de refactoring profitant de l'occasion)
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur

## 6. Points de vigilance

- Le style `dailyButton` (état normal ambre) et `dailyButtonCompleted` (état complété) ne doivent pas être modifiés — seul `dailyButtonDisabled` est en cause.
- Le tableau de styles `[dailyButtonStyle, { opacity: dailyButtonOpacity }]` fonctionne correctement — pas de modification nécessaire côté JSX.
- Tester visuellement en simulant un délai de chargement (ajouter un `setTimeout` artificiel dans `useDailyChallenge` en dev pour confirmer l'absence de flash — à retirer avant commit).
