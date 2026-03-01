---
id: M-07
title: Modèle de données GameSession (local)
phase: 2-MVP
priority: Must
agents: [Frontend Dev, Tech Lead]
status: done
created: 2026-02-28
completed: 2026-03-02
---

# M-07 — Modèle de données GameSession (local)

## User Story
En tant qu'application, je veux stocker la session de jeu en cours localement, afin de ne pas perdre la progression si l'app est mise en arrière-plan.

## Critères d'acceptance
- [x] Le type `GameSession` est implémenté tel que défini dans `context.md` (dans `packages/shared`)
- [x] La session en cours est persistée dans AsyncStorage
- [x] Si l'app est fermée puis rouverte, la session en cours est restaurée avec le bon article affiché
- [x] Une session terminée (`won` ou `abandoned`) est marquée comme telle avant d'être écrasée
- [x] La session est initialisée proprement au démarrage d'une nouvelle partie (pas de données de la partie précédente)

## Notes de réalisation

> **Specs rédigées par Tech Lead (Maxime) — destinataire : Frontend Dev (Laurent)**
> Référence : ADR-005, ADR-007 | Story : `docs/stories/M-07-game-session-model.md`

---

### Périmètre

**Dans scope :**
- Refactoring du store `game.store.ts` existant (Phase 1, stub) vers l'implémentation complète Phase 2
- Persistance `GameSession` via AsyncStorage
- Action `hydrate()` appelée au démarrage
- Sélecteur calculé `isLanguageLocked`

**Hors scope :**
- Slice `language` et slice `popularPages` (stories dédiées M-16 / settings)
- Logique de navigation WebView entre articles (story M-04)
- Historique de parties (Phase 3, story F3-02)

---

### 1. Type `GameSession` dans `packages/shared`

Le type `GameSession` est **déjà défini** dans `packages/shared/src/types/index.ts`. Aucune modification n'est requise sur ce fichier. Les champs exacts sont :

```typescript
// packages/shared/src/types/index.ts — déjà en place, NE PAS modifier

export interface GameSession {
  id: string;           // UUID v4 généré côté mobile au startSession
  startArticle: Article;
  targetArticle: Article;
  path: Article[];      // [startArticle, ...articlesSuivants] — startArticle en index 0
  jumps: number;        // Invariant : jumps === path.length - 1
  startedAt: Date;      // new Date() au moment du startSession
  completedAt?: Date;   // Renseigné uniquement sur won / abandoned
  status: GameStatus;   // 'in_progress' | 'won' | 'abandoned'
}
```

**Point d'attention `exactOptionalPropertyTypes` :** `completedAt` est `Date | undefined` (champ optionnel). Ne jamais écrire `completedAt: undefined` dans un spread — omettre le champ ou utiliser la syntaxe objet conditionnelle.

---

### 2. Store Zustand — `apps/mobile/src/store/game.store.ts`

Le fichier existant (`game.store.ts` Phase 1) est à **remplacer intégralement** par l'implémentation suivante. Le store Phase 1 expose `startGame` / `endGame` / `abandonGame` — ces actions sont renommées et étendues conformément à ADR-007.

#### 2.1 Interface du slice `gameSession`

```typescript
// Interface du slice — à définir dans game.store.ts

interface GameSessionSlice {
  // ── État ──────────────────────────────────────────
  currentSession: GameSession | null;
  isHydrated: boolean; // true une fois que hydrate() a terminé sa lecture AsyncStorage

  // ── Actions ───────────────────────────────────────
  startSession: (startArticle: Article, targetArticle: Article) => Promise<void>;
  updateCurrentArticle: (article: Article) => Promise<void>;
  addJump: (article: Article) => Promise<void>;
  completeSession: () => Promise<void>;
  abandonSession: () => Promise<void>;
  restoreSession: (session: GameSession) => void;
  clearSession: () => Promise<void>;
  hydrate: () => Promise<void>;
}
```

#### 2.2 Comportement détaillé de chaque action

**`startSession(startArticle, targetArticle)`**
- Génère un `id` UUID v4 (`crypto.randomUUID()` — disponible dans Expo SDK 54 via `expo-crypto` ou l'API native)
- Construit une `GameSession` : `status: 'in_progress'`, `path: [startArticle]`, `jumps: 0`, `startedAt: new Date()`
- Appelle `set({ currentSession: session })`
- Persiste via `AsyncStorage.setItem('@wikihop/game_session', JSON.stringify(session))`
- Toute erreur AsyncStorage est loguée (`console.error`) mais ne bloque pas l'UI

**`updateCurrentArticle(article)`**

> Cette action est l'alias sémantique de `addJump` — elle est conservée distincte pour que les composants puissent la nommer clairement à leur point d'appel. En interne, elle appelle `addJump`.

**`addJump(article)`**
- Guards : si `currentSession === null` ou `currentSession.status !== 'in_progress'`, ne fait rien
- Ajoute `article` à `path`, incrémente `jumps` (= `path.length` après push, car startArticle est en index 0)
- Invariant à respecter : après chaque `addJump`, `session.jumps === session.path.length - 1`
- Met à jour `currentSession` dans le store et persiste

**`completeSession()`**
- Guards : si `currentSession === null`, ne fait rien
- Passe `status` à `'won'`, renseigne `completedAt: new Date()`
- Met à jour et persiste

**`abandonSession()`**
- Guards : si `currentSession === null`, ne fait rien
- Passe `status` à `'abandoned'`, renseigne `completedAt: new Date()`
- Met à jour et persiste — **ce JSON doit rester lisible par F3-02 sans transformation** (ADR-007)

**`restoreSession(session)`**
- Action synchrone — utilisée uniquement par `hydrate()` pour réhydrater depuis AsyncStorage
- `set({ currentSession: session })` — ne persiste pas (la donnée vient d'AsyncStorage)

**`clearSession()`**
- `set({ currentSession: null })`
- `await AsyncStorage.removeItem('@wikihop/game_session')`

**`hydrate()`**
- Lire `AsyncStorage.getItem('@wikihop/game_session')`
- Si valeur présente : `JSON.parse` + `restoreSession(parsed)`
- Attraper toute erreur de parsing (JSON malformé) → `clearSession()` pour repartir propre
- **Toujours** terminer par `set({ isHydrated: true })`, même en cas d'erreur
- `hydrate()` ne doit être appelée qu'une seule fois au démarrage

#### 2.3 Sélecteur `isLanguageLocked`

Ce n'est **pas** un champ du store — c'est un sélecteur calculé. Ne jamais ajouter de champ `isLanguageLocked` dans l'interface.

```typescript
// Usage dans les composants — NE PAS mettre dans le store
const isLanguageLocked = useGameStore(
  (state) => state.currentSession?.status === 'in_progress'
);
```

Documenter ce pattern en commentaire dans `game.store.ts` pour que Laurent et les futurs devs ne cherchent pas un champ inexistant.

#### 2.4 Sérialisation AsyncStorage — point de vigilance `Date`

`GameSession.startedAt` et `completedAt` sont des `Date`. `JSON.stringify` les convertit en chaîne ISO 8601. Au `JSON.parse`, ils redeviennent des `string`. Il faut reconstituer les `Date` lors de `hydrate()` :

```typescript
// Dans hydrate() — après JSON.parse(raw)
const parsed = JSON.parse(raw) as GameSession;
const session: GameSession = {
  ...parsed,
  startedAt: new Date(parsed.startedAt),
  completedAt: parsed.completedAt !== undefined
    ? new Date(parsed.completedAt)
    : undefined,
};
```

**Attention `exactOptionalPropertyTypes`** : ne pas écrire `completedAt: undefined`. Utiliser la syntaxe conditionnelle ci-dessus.

---

### 3. Hydratation au démarrage — `App.tsx`

L'action `hydrate()` doit être appelée **avant** que les écrans ne montent, pour éviter un flash de l'UI non hydratée. Deux approches sont acceptables :

**Option A — useEffect dans App.tsx (préféré)**

```typescript
// App.tsx
import { useEffect } from 'react';
import { useGameStore } from './src/store/game.store';

export default function App(): React.JSX.Element {
  const hydrate = useGameStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // ...
}
```

Les écrans consultent `isHydrated` pour afficher un indicateur de chargement tant que la hydratation n'est pas terminée.

**Option B — hook dans RootNavigator**

Identique mais placé dans `RootNavigator.tsx` pour garder `App.tsx` minimal.

Choisir l'Option A. Documenter dans le code quel hook hydrate et pourquoi.

---

### 4. Edge case : session `in_progress` restaurée au démarrage

Quand `hydrate()` trouve une session avec `status: 'in_progress'` en AsyncStorage, elle la restaure dans le store. La question est : que faire si l'article courant (`path[path.length - 1]`) n'est plus accessible ?

**Décision architecturale :** la session est restaurée telle quelle. L'inaccessibilité d'un article Wikipedia est un cas marginal (article supprimé entre deux sessions). Le composant d'affichage de l'article (`ArticleWebView`, story M-03) gère déjà les erreurs 404 de l'API Wikipedia et affiche un message d'erreur avec un bouton "Revenir en arrière". Ce n'est pas à `hydrate()` de vérifier l'accessibilité réseau — cela impliquerait un appel réseau bloquant au démarrage, ce qui est contraire au principe de rapidité d'hydratation.

**Comportement attendu :**
1. Session `in_progress` restaurée → l'app redirige l'utilisateur vers l'écran de jeu (logique de navigation à spécifier dans M-04)
2. Si l'article est inaccessible → M-03 affiche l'erreur et propose de revenir à l'article précédent (`path[path.length - 2]`) ou d'abandonner la partie

---

### 5. Tests unitaires attendus — `apps/mobile/__tests__/store/gameStore.test.ts`

Le répertoire `__tests__/store/` est à créer. Fichier : `gameStore.test.ts`.

**Liste des tests obligatoires :**

```
describe('startSession')
  ✓ crée une session avec status 'in_progress', jumps 0, path [startArticle]
  ✓ génère un id non vide (UUID format)
  ✓ persiste la session dans AsyncStorage (@wikihop/game_session)
  ✓ startedAt est une Date valide

describe('addJump')
  ✓ ajoute l'article à path et incrémente jumps
  ✓ respecte l'invariant jumps === path.length - 1 après chaque appel
  ✓ ne fait rien si currentSession est null
  ✓ ne fait rien si status !== 'in_progress'
  ✓ persiste après chaque appel

describe('completeSession')
  ✓ passe status à 'won' et renseigne completedAt
  ✓ ne fait rien si currentSession est null
  ✓ persiste

describe('abandonSession')
  ✓ passe status à 'abandoned' et renseigne completedAt
  ✓ ne fait rien si currentSession est null
  ✓ le JSON persisté est conforme à l'interface GameSession (pas de champ ajouté)

describe('clearSession')
  ✓ met currentSession à null
  ✓ supprime la clé AsyncStorage

describe('hydrate')
  ✓ relit la session depuis AsyncStorage et la restaure dans le store
  ✓ reconstitue les Date (startedAt, completedAt) depuis les chaînes ISO 8601
  ✓ met isHydrated à true après lecture, même si AsyncStorage est vide
  ✓ appelle clearSession si le JSON est malformé, puis met isHydrated à true
  ✓ ne modifie pas AsyncStorage (pas de write pendant hydrate)

describe('isLanguageLocked selector')
  ✓ retourne true si currentSession.status === 'in_progress'
  ✓ retourne false si currentSession est null
  ✓ retourne false si currentSession.status === 'won' ou 'abandoned'
```

**Setup Jest :** mocker `@react-native-async-storage/async-storage` avec `jest-mock-async-storage` ou un mock manuel dans `jest.setup.ts`. Le mock existant dans `apps/mobile/jest.setup.ts` est à vérifier — si absent, ajouter :

```typescript
// apps/mobile/jest.setup.ts — ajout
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
```

---

### 6. Critères de qualité (checklist PR)

- [ ] `tsc --noEmit` passe sans erreur
- [ ] Zéro `any` non justifié
- [ ] `exactOptionalPropertyTypes` respecté — `completedAt` jamais assigné à `undefined` explicitement
- [ ] `noUncheckedIndexedAccess` respecté — `path[path.length - 1]` retourne `Article | undefined`, vérifier avant usage
- [ ] Invariant `jumps === path.length - 1` documenté en commentaire dans `addJump`
- [ ] `hydrate()` appelée une seule fois, depuis `App.tsx`
- [ ] `isHydrated` passe à `true` dans tous les cas (y compris erreur)
- [ ] Tests couvrent les cas d'erreur (session null, JSON malformé)
- [ ] Coverage ≥ 70% sur `game.store.ts`
- [ ] Aucun `console.log` — uniquement `console.error` pour les erreurs AsyncStorage

## Validation QA — Halim

**Date** : 2026-03-02 | **Testeur** : Halim | **Statut** : Validé

### Critères d'acceptance
- [x] Type `GameSession` conforme à la spec `packages/shared` — vérifié (champs id, startArticle, targetArticle, path, jumps, startedAt, completedAt?, status)
- [x] Persistance AsyncStorage clé `@wikihop/game_session` — vérifié par tests unitaires
- [x] Restauration session au redémarrage (`hydrate()`) — vérifié (reconstitution des Date ISO 8601 incluse)
- [x] Session `won` / `abandoned` correctement marquée — vérifié (`completeSession`, `abandonSession`)
- [x] Nouvelle partie initialisée proprement (`startSession` génère un nouvel UUID et écrase l'état) — vérifié

### Tests automatisés
- Jest : 26/26 tests passants, 0 échec
- tsc --noEmit : sans erreur
- npm run lint : 0 erreur (3 warnings `no-console` sur des `console.error` autorisés par la spec)

### Observations
- `no-console` configuré à `warn` (pas `error`) dans `.eslintrc.js` — les 3 occurrences sont des `console.error` pour les erreurs AsyncStorage, conformes aux specs M-07 et aux conventions ADR-007.
- `hydrate()` appelée depuis `App.tsx` via `useEffect` (Option A specifiée) — conforme.
- Sélecteur `isLanguageLocked` documenté en commentaire dans le store — conforme.
- `exactOptionalPropertyTypes` respecté dans la reconstruction des `Date` dans `hydrate()`.
- Invariant `jumps === path.length - 1` documenté et vérifié par test dédié.

## Statut
pending → in-progress → done
