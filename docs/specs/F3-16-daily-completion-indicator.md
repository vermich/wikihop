# Specs techniques — F3-16 : Indicateur de complétion du défi quotidien

**Destinataire :** Laurent (Frontend Dev)
**Référence story :** `docs/stories/F3-16-daily-completion-indicator.md` (à créer par le PM)
**Stack :** React Native Expo — `apps/mobile/`
**Date :** 2026-03-10

---

## 1. Contexte

Le bouton "Défi du jour" sur `HomeScreen` doit afficher un état visuel distinct
quand le joueur a déjà complété le défi du jour en cours. Le design est validé par
Benjamin (UX/UI) — specs dans `docs/ux/F3-16-daily-completion-indicator.md`.

Le défi est identifié par sa date `YYYY-MM-DD` (champ `dailyChallengeDate` de
`DailyChallengeResponse`). La détection de complétion est purement locale :
aucun appel backend.

---

## 2. Périmètre

### Dans le scope

- Service `daily-completion.service.ts` : lecture et écriture de la date de complétion
- Hook `useDailyCompletionStatus` : état réactif de complétion pour HomeScreen
- Mise à jour de `VictoryScreen` : écriture de la date au montage si défi quotidien gagné
- Mise à jour de `HomeScreen` : rendu conditionnel du bouton + `useFocusEffect` pour rafraîchir
- Mise à jour `ADR-005` : ajout de la nouvelle clé AsyncStorage
- Tests TDD des fonctions pures listées en section 6

### Hors scope

- Modification du backend ou de `GameSession`
- Toute persistance dans `@wikihop/game_session` ou `@wikihop/game_history`
- Animation de transition entre les deux états du bouton (spécifié "instantané" par UX)

---

## 3. Décision d'architecture — pourquoi une clé dédiée

Deux approches candidates pour détecter si le défi du jour est complété :

**Option A — Lire `@wikihop/game_history`** et filtrer par `isDailyChallenge === true`
et `dailyChallengeDate === today` et `status === 'won'`.

**Option B — Clé dédiée `@wikihop/daily_completion_date`** stockant la date de la
dernière complétion quotidienne.

**Décision : Option B retenue.** Justifications :
- L'historique peut contenir jusqu'à 50 entrées — parser et filtrer l'ensemble à
  chaque focus HomeScreen est disproportionné pour une question binaire.
- La clé dédiée permet une lecture O(1), sans désérialisation complexe.
- Elle suit le pattern établi par `@wikihop/difficulty_preference` : état de présentation
  UI persisté séparément du flux de session.
- `@wikihop/game_history` reste la source de vérité pour l'historique. La clé dédiée
  est un **cache de présentation**, non une donnée métier.

---

## 4. Nouvelle clé AsyncStorage

| Clé | Type | TTL | Description |
|-----|------|-----|-------------|
| `@wikihop/daily_completion_date` | `string` (YYYY-MM-DD) | Aucun | Date du dernier défi quotidien complété. Comparée à la date du défi courant pour déterminer si le joueur a déjà joué aujourd'hui. |

Convention respectée : préfixe `@wikihop/` + `snake_case`.

La valeur stockée est une chaîne `YYYY-MM-DD` brute (pas JSON.stringify — pas de
quotes wrappées, lecture directe avec `AsyncStorage.getItem`).

**Nota :** Cette clé ne se réinitialise pas automatiquement — elle contient simplement
la date de la dernière complétion. La logique de comparaison avec la date du jour est
dans la fonction pure `isDailyChallengeCompleted` (voir section 6).

---

## 5. Fichiers à créer ou modifier

```
apps/mobile/src/
├── services/
│   └── daily-completion.service.ts          [CRÉER]
├── hooks/
│   └── useDailyCompletionStatus.ts          [CRÉER]
├── screens/
│   ├── HomeScreen.tsx                        [MODIFIER]
│   └── VictoryScreen.tsx                     [MODIFIER]
└── services/
    └── daily-completion.service.test.ts      [CRÉER — TDD]
```

---

## 6. Fonctions pures TDD — écrire les tests AVANT le code

Ces fonctions pures doivent avoir leurs tests écrits en premier, avant toute
implémentation. Elles sont exportées depuis `daily-completion.service.ts`.

### 6.1 `isDailyChallengeCompleted`

```typescript
/**
 * Détermine si le défi quotidien a déjà été complété pour une date donnée.
 *
 * @param storedDate  - Valeur lue depuis AsyncStorage (string YYYY-MM-DD ou null)
 * @param challengeDate - Date du défi courant (string YYYY-MM-DD)
 * @returns true si storedDate === challengeDate
 */
export function isDailyChallengeCompleted(
  storedDate: string | null,
  challengeDate: string,
): boolean
```

**Cas de test attendus :**
- `isDailyChallengeCompleted('2026-03-10', '2026-03-10')` → `true`
- `isDailyChallengeCompleted('2026-03-09', '2026-03-10')` → `false` (défi d'hier)
- `isDailyChallengeCompleted(null, '2026-03-10')` → `false` (jamais joué)
- `isDailyChallengeCompleted('', '2026-03-10')` → `false` (valeur vide)
- `isDailyChallengeCompleted('2026-03-10', '2026-03-10')` avec dates identiques futures → `true`

### 6.2 `getDailyCompletionDate` (async, à tester avec mock AsyncStorage)

```typescript
/**
 * Lit la date de complétion depuis AsyncStorage.
 * Retourne null si la clé est absente ou en cas d'erreur.
 */
export async function getDailyCompletionDate(): Promise<string | null>
```

**Cas de test :**
- AsyncStorage retourne une chaîne → retourne la chaîne
- AsyncStorage retourne null → retourne null
- AsyncStorage.getItem throw → retourne null (erreur absorbée, console.warn)

### 6.3 `saveDailyCompletionDate` (async, à tester avec mock AsyncStorage)

```typescript
/**
 * Persiste la date de complétion dans AsyncStorage.
 * Les erreurs sont loguées (console.error) et ne bloquent pas l'appelant.
 *
 * @param date - Date YYYY-MM-DD à persister
 */
export async function saveDailyCompletionDate(date: string): Promise<void>
```

**Cas de test :**
- Appel normal → `AsyncStorage.setItem('@wikihop/daily_completion_date', '2026-03-10')` appelé
- AsyncStorage.setItem throw → pas de throw remontant, console.error appelé

---

## 7. Service `daily-completion.service.ts`

```typescript
/**
 * DailyCompletionService — WikiHop Mobile — Phase 3 (F3-16)
 *
 * Gère la persistance de la date de complétion du défi quotidien.
 * Clé AsyncStorage : @wikihop/daily_completion_date
 *
 * Conventions :
 *   - Exports nommés uniquement
 *   - Valeur stockée : string YYYY-MM-DD brute (pas JSON.stringify)
 *   - Erreurs AsyncStorage absorbées, jamais remontées
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const DAILY_COMPLETION_KEY = '@wikihop/daily_completion_date';

export function isDailyChallengeCompleted(
  storedDate: string | null,
  challengeDate: string,
): boolean { ... }

export async function getDailyCompletionDate(): Promise<string | null> { ... }

export async function saveDailyCompletionDate(date: string): Promise<void> { ... }
```

**Règle de lecture AsyncStorage :** utiliser `AsyncStorage.getItem` directement
(pas `JSON.parse`) — la valeur est une string brute, pas du JSON.

---

## 8. Hook `useDailyCompletionStatus`

Ce hook est utilisé par `HomeScreen` pour savoir si le défi du jour courant est complété.

```typescript
// apps/mobile/src/hooks/useDailyCompletionStatus.ts

import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import { getDailyCompletionDate, isDailyChallengeCompleted } from '../services/daily-completion.service';

/**
 * Retourne si le défi du jour (identifié par challengeDate) est déjà complété.
 *
 * Se rafraîchit à chaque focus de l'écran (useFocusEffect).
 * Valeur initiale : false (évite un flash "complété" avant la lecture AsyncStorage).
 *
 * @param challengeDate - Date YYYY-MM-DD du défi courant,
 *                        ou undefined si le défi n'est pas encore chargé.
 * @returns boolean
 */
export function useDailyCompletionStatus(challengeDate: string | undefined): boolean
```

**Comportement interne :**
- État local `isCompleted: boolean`, initialisé à `false`
- `useFocusEffect(useCallback(...))` : à chaque focus, appelle `getDailyCompletionDate()`
  puis `isDailyChallengeCompleted(storedDate, challengeDate)` si `challengeDate` est défini
- Si `challengeDate === undefined`, retourne `false` sans appel AsyncStorage
- Pas de `useEffect` avec deps `[challengeDate]` — le `useFocusEffect` couvre aussi le
  cas où `dailyChallengeState` passe de `loading` à `success` pendant que l'écran est focalisé.
  Ajouter également un `useEffect([challengeDate])` pour ce cas de figure (voir note).

**Note sur la double dépendance :**
`useFocusEffect` se déclenche au retour sur l'écran (après VictoryScreen), mais pas
lors de la résolution du chargement initial du défi sur HomeScreen (qui reste monté).
Il faut donc **aussi** un `useEffect([challengeDate])` pour traiter le passage
`undefined → 'YYYY-MM-DD'` :

```typescript
// Rafraîchissement au changement de challengeDate (ex. chargement initial du défi)
useEffect(() => {
  if (challengeDate === undefined) return;
  void getDailyCompletionDate().then((stored) => {
    setIsCompleted(isDailyChallengeCompleted(stored, challengeDate));
  });
}, [challengeDate]);
```

---

## 9. Modifications `VictoryScreen`

### 9.1 Où écrire la date de complétion

`completeSession()` est appelé dans `ArticleScreen`. `VictoryScreen` monte avec
`currentSession.status === 'won'` déjà établi. L'écriture de la date doit se faire
dans `VictoryScreen` au montage, dans un `useEffect` dédié, **après** la vérification
du guard d'entrée.

```typescript
// Après le guard d'entrée existant (deps [] intentionnels)

// Persistance de la complétion du défi quotidien (F3-16)
useEffect(() => {
  if (
    currentSession === null
    || currentSession.status !== 'won'
    || currentSession.isDailyChallenge !== true
    || currentSession.dailyChallengeDate === undefined
  ) {
    return;
  }

  void saveDailyCompletionDate(currentSession.dailyChallengeDate);
  // Intentionnellement best-effort — une erreur AsyncStorage ne doit pas
  // affecter l'affichage de VictoryScreen
}, []);
// deps [] : on lit currentSession une seule fois au montage,
// la session est stable à ce stade (status 'won' garanti par le guard)
```

**Import à ajouter :**

```typescript
import { saveDailyCompletionDate } from '../services/daily-completion.service';
```

### 9.2 Point de vigilance

Le `useEffect` de persistance a des `deps []` intentionnels, alignés avec le guard
d'entrée existant. Commenter explicitement pour éviter un refactor futur qui ajouterait
`currentSession` comme dépendance (ce qui provoquerait une double écriture si le store
est mis à jour entre-temps).

---

## 10. Modifications `HomeScreen`

### 10.1 Consommation du hook

```typescript
// Après la ligne : const { state: dailyChallengeState } = useDailyChallenge();

const dailyChallengeDate =
  dailyChallengeState.status === 'success' ? dailyChallengeState.data.date : undefined;

const isDailyCompleted = useDailyCompletionStatus(dailyChallengeDate);
```

**Import à ajouter :**

```typescript
import { useDailyCompletionStatus } from '../hooks/useDailyCompletionStatus';
```

### 10.2 Rendu conditionnel du bouton "Défi du jour"

Le bouton est rendu deux fois dans `renderContent()` : dans le bloc `loading` (lignes ~387-401)
et dans le bloc `success` (lignes ~508-526). Les deux blocs doivent être mis à jour.

**État non-complété (comportement actuel conservé) :**

```tsx
<TouchableOpacity
  style={[
    styles.dailyButton,
    dailyChallengeState.status !== 'success' && styles.dailyButtonDisabled,
  ]}
  onPress={() => { void handlePlayDaily(); }}
  disabled={dailyChallengeState.status !== 'success'}
  accessibilityLabel="Défi du jour"
  accessibilityRole="button"
  accessibilityState={{ disabled: dailyChallengeState.status !== 'success' }}
>
  <Text style={[
    styles.dailyButtonText,
    dailyChallengeState.status !== 'success' && styles.dailyButtonTextDisabled,
  ]}>
    {'Défi du jour'}
  </Text>
</TouchableOpacity>
```

**État complété (`isDailyCompleted === true && dailyChallengeState.status === 'success'`) :**

```tsx
<TouchableOpacity
  style={styles.dailyButtonCompleted}
  onPress={() => { void handlePlayDaily(); }}
  disabled={false}
  accessibilityLabel="Défi du jour complété — rejouer"
  accessibilityRole="button"
  accessibilityState={{ disabled: false }}
>
  <Text style={styles.dailyButtonText}>
    <Text accessible={false}>{'✓ '}</Text>
    {'Défi du jour complété'}
  </Text>
</TouchableOpacity>
```

**Logique de sélection du style :** extraire un helper local pour éviter la duplication
entre les deux blocs `loading` et `success` :

```typescript
// Dans le composant HomeScreen, avant renderContent()
const dailyButtonStyle =
  isDailyCompleted && dailyChallengeState.status === 'success'
    ? styles.dailyButtonCompleted
    : dailyChallengeState.status !== 'success'
      ? styles.dailyButtonDisabled
      : styles.dailyButton;

const dailyButtonLabel =
  isDailyCompleted && dailyChallengeState.status === 'success'
    ? 'Défi du jour complété — rejouer'
    : 'Défi du jour';

const dailyButtonText =
  isDailyCompleted && dailyChallengeState.status === 'success'
    ? '✓ Défi du jour complété'
    : 'Défi du jour';
```

### 10.3 Nouveaux styles à ajouter dans `StyleSheet.create`

```typescript
// État complété du défi (F3-16) — fond brun foncé #92400E
dailyButtonCompleted: {
  height: 52,
  backgroundColor: '#92400E',
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: 12,
},
```

`dailyButtonText` existant (`color: '#FFFFFF'`) est réutilisé sans modification dans
les deux états — le texte blanc convient sur `#92400E` comme sur `#D97706`.

**Attention au bloc `loading` :** dans ce bloc, `isDailyCompleted` ne doit pas rendre
le bouton cliquable même si l'état est "complété". Le bouton reste `disabled={true}`
en état loading, mais peut adopter le style `dailyButtonCompleted` (visuel cohérent,
fonctionnellement désactivé).

---

## 11. Contrat de l'icône `✓`

Selon les specs UX validées :
- L'icône `✓` doit être `accessible={false}` — elle est décorative, le sens est porté par
  le texte et l'`accessibilityLabel`
- Ne pas utiliser un composant `Image` pour ce caractère — le caractère Unicode `✓`
  (U+2713) est suffisant et garanti de s'afficher correctement sur iOS et Android

---

## 12. Critères de qualité (code review)

- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur
- [ ] Tests TDD écrits **avant** le code pour les 3 fonctions pures (section 6)
- [ ] Coverage ≥ 70% sur `daily-completion.service.ts`
- [ ] Zéro `any` non justifié
- [ ] `isDailyCompleted` initialisé à `false` — aucun flash visuel "complété" au montage
- [ ] Le bouton reste cliquable dans les deux états quand `dailyChallengeState.status === 'success'`
- [ ] `accessibilityLabel` en état complété : `"Défi du jour complété — rejouer"` (exact)
- [ ] `accessible={false}` sur le `✓` (ou le `<Text>` le wrappant)
- [ ] Le bloc `loading` de `renderContent()` est également mis à jour (pas seulement `success`)
- [ ] `saveDailyCompletionDate` est appelé uniquement dans `VictoryScreen` (pas dans le game store)
- [ ] Les deps `[]` du `useEffect` dans VictoryScreen sont commentées

---

## 13. Points de vigilance

### Race condition au retour de VictoryScreen

Le flux est : `ArticleScreen` appelle `completeSession()` → `navigation.navigate('Victory')`
→ VictoryScreen monte → `saveDailyCompletionDate()` → joueur clique "Retour" ou
"Nouvelle partie" → HomeScreen reprend le focus → `useFocusEffect` lit AsyncStorage.

Ce flux est séquentiel : `saveDailyCompletionDate` a le temps de s'exécuter avant que
`useFocusEffect` ne soit déclenché sur HomeScreen. Pas de race condition à craindre.

### Rejouer le défi déjà complété

Le bouton reste cliquable même en état "complété" (spécifié par UX). Si le joueur
rejoue, `VictoryScreen` appellera à nouveau `saveDailyCompletionDate` avec la même date —
opération idempotente, sans effet de bord.

### `noUncheckedIndexedAccess`

`currentSession.dailyChallengeDate` est `string | undefined` dans `GameSession`.
Le guard `currentSession.dailyChallengeDate === undefined` est obligatoire dans
le `useEffect` de VictoryScreen avant d'appeler `saveDailyCompletionDate`.

### Pas de migration AsyncStorage nécessaire

La clé `@wikihop/daily_completion_date` est absente au premier démarrage → `getDailyCompletionDate()`
retourne `null` → `isDailyChallengeCompleted(null, date)` retourne `false` → comportement
correct sans migration.

---

## 14. Mise à jour ADR-005

Ajouter la ligne suivante dans le tableau des clés de `docs/adr/ADR-005-persistance-locale-mobile.md` :

| `@wikihop/daily_completion_date` | `string` (YYYY-MM-DD) | Aucun | Date du dernier défi quotidien complété. Comparée à `dailyChallengeDate` du défi courant pour l'indicateur de complétion HomeScreen (F3-16). Valeur brute, pas JSON. |

**Attention :** la valeur est stockée brute (pas `JSON.stringify`) — noter explicitement
dans l'ADR que cette clé déroge à la convention JSON des autres clés.
