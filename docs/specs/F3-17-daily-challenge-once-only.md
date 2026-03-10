# Specs techniques — F3-17 : Défi quotidien — une seule tentative par jour

**Destinataire :** Laurent (Frontend Dev)
**Référence story :** `docs/stories/phase-3/🔄-F3-17-daily-challenge-once-only.md`
**Dépend de :** F3-16 (`useDailyCompletionStatus`, `daily-completion.service.ts`)
**Stack :** React Native Expo — `apps/mobile/`
**Date :** 2026-03-11

---

## 1. Contexte

F3-16 a introduit l'indicateur visuel de complétion du défi quotidien mais le bouton
"Défi du jour" restait cliquable (`disabled={false}`) et le bouton "Rejouer" restait
visible sur VictoryScreen même après complétion d'un défi.

F3-17 verrouille le défi après la première réussite jusqu'au renouvellement automatique
(minuit UTC). La logique de détection `isDailyCompleted` via `useDailyCompletionStatus`
est entièrement en place — cette story est essentiellement une modification de deux
attributs JSX et une correction de bug de timing.

---

## 2. Périmètre

### Dans le scope

- `HomeScreen.tsx` : passage de `disabled={false}` à `disabled={true}` sur le bouton
  "Défi du jour" quand `isDailyButtonCompleted === true`
- `HomeScreen.tsx` : correction des attributs `accessibilityLabel` et `accessibilityState`
  pour l'état bloqué
- `VictoryScreen.tsx` : masquage du bouton "Rejouer" quand la session est un défi
  quotidien (`currentSession?.isDailyChallenge === true`)
- `VictoryScreen.tsx` : adaptation du layout `primaryButtonsRow` quand "Rejouer" est absent
- Correction BUG-02 : flash gris/texte blanc au refocus HomeScreen

### Hors scope

- Aucune modification de `useDailyCompletionStatus`
- Aucune modification de `daily-completion.service.ts`
- Aucune modification du backend ou du store Zustand
- Aucune animation de transition entre les états du bouton

---

## 3. Fichiers à modifier

```
apps/mobile/src/
└── screens/
    ├── HomeScreen.tsx    [MODIFIER — 2 zones : helpers visuels + bloc success]
    └── VictoryScreen.tsx [MODIFIER — zone stickyButtons]
```

Aucun fichier à créer. Aucun test TDD de fonctions pures requis (pas de nouvelle
logique métier — voir section 5).

---

## 4. Modification HomeScreen — bouton "Défi du jour"

### 4.1 Helpers visuels (lignes ~369-385)

Trois changements dans les helpers calculés avant `renderContent()` :

**`dailyButtonLabel`** — remplacer la valeur en état complété :

```diff
- isDailyButtonCompleted
-   ? 'Défi du jour complété — rejouer'
+ isDailyButtonCompleted
+   ? 'Défi du jour déjà complété aujourd\'hui'
```

La valeur exacte est `'Défi du jour déjà complété aujourd\'hui'` — correspond au
critère d'acceptance de la story.

**Nouveau helper `isDailyButtonDisabled`** — à ajouter après `isDailyButtonCompleted` :

```typescript
// Bouton désactivé si complété OU si le défi n'est pas encore chargé (F3-17)
const isDailyButtonDisabled = isDailyButtonCompleted || dailyChallengeState.status !== 'success';
```

Ce booléen est extrait en helper pour éviter la duplication entre les deux blocs de
`renderContent()` (loading et success).

### 4.2 Bloc loading — bouton Défi du jour (lignes ~412-429)

Pas de modification fonctionnelle requise dans le bloc `loading` : le bouton y est déjà
`disabled={true}` en permanence. Seul l'`accessibilityLabel` doit être cohérent :

```tsx
<TouchableOpacity
  style={dailyButtonStyle}
  disabled={true}
  accessibilityLabel={dailyButtonLabel}   {/* utilise déjà dailyButtonLabel — OK */}
  accessibilityRole="button"
  accessibilityState={{ disabled: true }}
>
```

Aucune modification de code dans ce bloc — le `dailyButtonLabel` mis à jour en 4.1
se propage automatiquement.

### 4.3 Bloc success — bouton Défi du jour (lignes ~537-553)

C'est la modification principale. Remplacer les trois attributs hardcodés :

```diff
  <TouchableOpacity
    style={dailyButtonStyle}
    onPress={() => { void handlePlayDaily(); }}
-   disabled={false}
+   disabled={isDailyButtonDisabled}
    accessibilityLabel={dailyButtonLabel}
    accessibilityRole="button"
-   accessibilityState={{ disabled: false }}
+   accessibilityState={{ disabled: isDailyButtonDisabled }}
  >
```

Le contenu JSX interne (`isDailyButtonCompleted ? ... : ...`) est inchangé.

### 4.4 Récapitulatif des valeurs selon les états

| État | `disabled` | `accessibilityLabel` | Style |
|------|-----------|---------------------|-------|
| Chargement (`status !== 'success'`) | `true` | `'Défi du jour — chargement en cours'` | `dailyButtonDisabled` |
| Chargé, non complété | `false` | `'Jouer le défi du jour'` | `dailyButton` |
| Chargé, complété | `true` | `'Défi du jour déjà complété aujourd\'hui'` | `dailyButtonCompleted` |

**Note :** dans l'état complété, `disabled={true}` fait que `onPress` ne se déclenche
pas. L'`accessibilityLabel` exprime clairement la raison du blocage à l'utilisateur de
lecteur d'écran.

---

## 5. Pas de TDD requis pour cette story

F3-17 ne crée aucune fonction pure ni custom hook. Les modifications sont :
- Des attributs JSX (`disabled`, `accessibilityState`)
- Un helper de composition booléenne (`isDailyButtonDisabled = a || b`) — trop trivial
  pour justifier un test unitaire isolé
- Un masquage conditionnel (`{condition && <TouchableOpacity ...>}`)

La logique métier sous-jacente (`isDailyChallengeCompleted`, `useDailyCompletionStatus`)
est déjà couverte par les tests TDD de F3-16.

---

## 6. Modification VictoryScreen — bouton "Rejouer"

### 6.1 Condition de masquage

`VictoryScreen` consomme déjà `currentSession` via `useGameStore` et teste déjà
`currentSession?.isDailyChallenge === true` pour le badge (ligne 286). Aucun import
supplémentaire requis.

La condition exacte pour masquer le bouton "Rejouer" :

```typescript
const isDaily = currentSession?.isDailyChallenge === true;
```

Ce booléen est calculé **une seule fois** en haut du composant, après le guard
d'entrée existant (`currentSession === null → navigate('Home')`).

### 6.2 Zone `stickyButtons` — modification

```diff
  <View style={styles.stickyButtons}>
    <View style={styles.primaryButtonsRow}>
      <TouchableOpacity
-       style={[styles.primaryButton, styles.newGameButton]}
+       style={[styles.primaryButton, styles.newGameButton, isDaily && styles.newGameButtonFull]}
        onPress={handleNewGame}
        accessibilityLabel="Démarrer une nouvelle partie"
        accessibilityRole="button"
      >
        <Text style={styles.newGameButtonText}>{'Nouvelle partie'}</Text>
      </TouchableOpacity>
-     <TouchableOpacity
-       style={[styles.primaryButton, styles.replayButton]}
-       onPress={() => { void handleReplay(); }}
-       accessibilityLabel="Rejouer avec les mêmes articles"
-       accessibilityRole="button"
-     >
-       <Text style={styles.replayButtonText}>{'Rejouer'}</Text>
-     </TouchableOpacity>
+     {!isDaily && (
+       <TouchableOpacity
+         style={[styles.primaryButton, styles.replayButton]}
+         onPress={() => { void handleReplay(); }}
+         accessibilityLabel="Rejouer avec les mêmes articles"
+         accessibilityRole="button"
+       >
+         <Text style={styles.replayButtonText}>{'Rejouer'}</Text>
+       </TouchableOpacity>
+     )}
    </View>
```

### 6.3 Adaptation du layout quand "Rejouer" est absent

Quand "Rejouer" est masqué, `newGameButton` occupe seul la `primaryButtonsRow` (flex row).
Le style `newGameButton` a `marginRight: 8` et `primaryButton` a `flex: 1` — avec un seul
enfant, le bouton s'étend naturellement à toute la largeur grâce à `flex: 1`. Le `marginRight`
deviendra visible (espace vide à droite).

Ajouter un style conditionnel `newGameButtonFull` dans `StyleSheet.create` :

```typescript
newGameButtonFull: {
  marginRight: 0,
},
```

Ce style annule le `marginRight: 8` de `newGameButton` quand "Rejouer" est absent.

### 6.4 Accessibilité

Quand "Rejouer" est masqué, VoiceOver/TalkBack lit directement "Nouvelle partie" puis
les boutons secondaires. Aucune `accessibilityLabel` supplémentaire n'est requise — le
badge "Défi du jour" visible dans le `statsBlock` informe déjà le contexte.

---

## 7. Correction BUG-02 — flash gris/texte blanc au refocus

### 7.1 Diagnostic

**Symptôme observé :** au retour sur HomeScreen depuis VictoryScreen après un défi
complété, le bouton "Défi du jour" affiche brièvement un fond gris avec du texte blanc
(`dailyButtonDisabled`), puis reprend correctement l'état complété brun (`dailyButtonCompleted`).

**Cause suspectée :** `useDailyChallenge` a ses deps `[language]`. Au retour sur
HomeScreen, si la langue n'a pas changé, le hook **ne refetch pas** — `dailyChallengeState`
reste `status: 'success'` et ne repasse pas par `'loading'`. Donc le flash gris ne peut
pas venir de là.

La vraie cause est dans `useDailyCompletionStatus`. Au moment du `useFocusEffect` au
retour, `isDailyCompleted` repart à `false` le temps que `getDailyCompletionDate()` se
résolve (lecture AsyncStorage asynchrone). Pendant ce bref instant :

- `isDailyButtonCompleted = false && true = false`
- `isDailyButtonDisabled (F3-17) = false || false = false`
- Style appliqué : `styles.dailyButton` (fond ambre `#D97706`) ← ce n'est pas du gris

Reconsidération : le "gris avec texte blanc" décrit dans BUG-02 correspond plutôt à
`dailyButtonDisabled` (fond gris clair `#E2E8F0`, texte blanc). Cela se produit
uniquement si `dailyChallengeState.status !== 'success'` au moment du flash.

**Hypothèse révisée :** `useDailyChallenge` repasse en `status: 'loading'` au refocus.
En lisant le code : le hook a un `useEffect([language])` qui appelle
`setState({ status: 'loading' })` en premier. Si React Navigation démonte et remonte
HomeScreen (selon la config du navigator), le hook se réinitialise et re-fetche.

### 7.2 Investigation à mener par Laurent

Laurent doit vérifier, dans la configuration React Navigation actuelle, si HomeScreen
est **démontée** lors de la navigation vers VictoryScreen ou si elle reste en mémoire
(comportement par défaut du `native-stack` : les écrans inférieurs sont conservés en
mémoire).

**Si HomeScreen n'est pas démontée** (cas normal avec `native-stack`) :
- `useDailyChallenge` ne repasse pas en `loading` au retour
- BUG-02 est causé par le flash `isDailyCompleted: false → true` au résolution AsyncStorage
- Correction : initialiser `isCompleted` à `true` si la valeur AsyncStorage est déjà
  disponible en cache — mais cela viole la spec F3-16 (initialisation à `false` intentionnelle)
- **Solution recommandée** : ne pas corriger le flash au niveau du state initial, mais
  rendre la transition imperceptible en évitant le changement de style entre `dailyButton`
  (ambre) et `dailyButtonCompleted` (brun). La seule façon d'avoir un flash **gris** est
  que `dailyChallengeState.status !== 'success'` soit vrai au moment du flash.

**Si HomeScreen est démontée** (configuration inhabituelle) :
- `useDailyChallenge` refetch au remontage → passe par `loading` → `isDailyButtonDisabled = true`
  → style `dailyButtonDisabled` (gris) → flash gris confirmé
- Correction : mémoriser la dernière réponse réussie du défi dans le store Zustand
  (`popularPages` ou slice dédié) pour éviter le re-fetch à chaque remontage

### 7.3 Action concrète pour Laurent

1. Ajouter un `console.log` temporaire dans `useDailyChallenge` au début du `useEffect`
   pour observer si `setState({ status: 'loading' })` est appelé au retour sur HomeScreen.
2. Si **non appelé** → BUG-02 est un flash ambre→brun (non critique, acceptable) → marquer
   BUG-02 comme "non reproductible" et documenter dans la PR.
3. Si **appelé** → HomeScreen est remontée → escalader au Tech Lead avant de corriger
   (décision architecturale sur le cycle de vie des écrans à prendre via ADR ou note).

**Dans les deux cas**, Laurent documente sa conclusion dans la description de la PR.

---

## 8. Critères de qualité (code review)

- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur
- [ ] `disabled={isDailyButtonDisabled}` dans le bloc success de HomeScreen (ligne ~540)
- [ ] `accessibilityState={{ disabled: isDailyButtonDisabled }}` dans le bloc success
- [ ] `accessibilityLabel` en état complété : `'Défi du jour déjà complété aujourd\'hui'` (exact)
- [ ] `{!isDaily && (<TouchableOpacity ...Rejouer.../>)}` dans VictoryScreen
- [ ] `isDaily` calculé en haut du composant VictoryScreen (pas inline dans le JSX)
- [ ] Style `newGameButtonFull` ajouté et appliqué conditionnellement (`marginRight: 0`)
- [ ] Le bloc loading de HomeScreen est cohérent — `accessibilityLabel={dailyButtonLabel}`
  déjà en place, pas de modification supplémentaire requise
- [ ] BUG-02 documenté dans la PR (conclusion investigation, même si non corrigé)
- [ ] Zéro `any` non justifié
- [ ] Zéro code mort introduit

---

## 9. Points de vigilance

### `isDailyButtonCompleted` vs `isDailyButtonDisabled`

Ces deux booléens sont distincts :

- `isDailyButtonCompleted = isDailyCompleted && dailyChallengeState.status === 'success'`
  — pilote le rendu JSX interne (icône ✓ vs texte standard) et le style du bouton
- `isDailyButtonDisabled = isDailyButtonCompleted || dailyChallengeState.status !== 'success'`
  — pilote uniquement `disabled` et `accessibilityState`

Ne pas les fusionner. `isDailyButtonCompleted` doit rester tel quel pour F3-16.
`isDailyButtonDisabled` est le seul ajout de F3-17.

### `handlePlayDaily` n'est pas protégé côté service

Le handler `handlePlayDaily` dans HomeScreen ne vérifie pas lui-même si le défi est
complété. Le seul verrou est `disabled={true}`. C'est suffisant — React Native ne
déclenche pas `onPress` sur un `TouchableOpacity` avec `disabled={true}`. Pas de
guard supplémentaire à ajouter dans le handler.

### Gate device physique

F3-17 touche le flux Home→VictoryScreen (masquage "Rejouer"). La règle du gate device
physique s'applique. Laurent doit confirmer dans la description de la PR :

> "Le chemin complet Home → défi du jour → VictoryScreen → retour Home a été joué sur
> device physique. Le bouton 'Rejouer' est absent sur VictoryScreen. Le bouton
> 'Défi du jour' est bien désactivé sur HomeScreen après complétion."

### `newGameButton` seul dans `primaryButtonsRow`

Quand "Rejouer" est absent et que `newGameButton` occupe toute la rangée, le `flex: 1`
de `primaryButton` + `marginRight: 0` de `newGameButtonFull` donne un bouton pleine
largeur. Vérifier visuellement sur iOS et Android que le rendu est correct (hauteur 52,
`borderRadius: 12` correctement rendu sur les deux plateformes).

### Pas de régression sur les parties normales

Pour une partie non-défi (`currentSession?.isDailyChallenge !== true`), `isDaily` vaut
`false` et le bouton "Rejouer" reste visible. Ce cas doit être vérifié manuellement.
