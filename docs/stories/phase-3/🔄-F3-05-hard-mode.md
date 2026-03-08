---
id: F3-05
title: Mode difficile (articles sans liens évidents)
phase: 3-Features
priority: Should
agents: [Backend Dev, Frontend Dev, UX/UI]
status: in-progress
created: 2026-02-28
completed:
---

# F3-05 — Mode difficile (articles sans liens évidents)

## User Story
En tant que joueur expert, je veux un mode difficile avec des paires d'articles thématiquement éloignées, afin d'augmenter le défi intellectuel.

## Critères d'acceptance
- [ ] Le mode difficile est sélectionnable depuis l'écran d'accueil
- [ ] Les paires sont générées avec un algorithme qui maximise la distance sémantique (à définir en ADR)
- [ ] Un indicateur visuel distingue les parties en mode difficile
- [ ] Le score en mode difficile est affiché séparément dans l'historique
- [ ] La définition technique du "mode difficile" est documentée dans un ADR

## Notes de réalisation

### Analyse préalable et décisions d'architecture

**Critère "maximise la distance sémantique"** : ce critère est ambigu et impraticable sans embeddings ou graphe Wikipedia. Il est recadré en "articles moins populaires" (percentile bas du pool) — ce qui produit des paires moins évidentes sans complexité algorithmique. Un ADR n'est pas nécessaire pour ce choix — la décision est documentée ici et dans le code.

**Critère "score affiché séparément dans l'historique"** : hors scope Phase 3 — `HistoryScreen` n'est pas modifiée. Le champ `difficulty` est persisté dans `GameRecord` pour usage futur.

**Évaluation des deux options pour les articles "difficiles" :**

| Option | Avantages | Inconvénients |
|--------|-----------|--------------|
| Paramètre `?difficulty=hard` sur `/random-pair` + percentile bas du pool live | Dynamique, s'adapte aux nouvelles données Wikimedia, une seule source de vérité | Le pool live n'est pas trié par popularité décroissante (Wikimedia retourne déjà le top 200) — le bas du pool = rangs 150-200, articles moins populaires mais pas "obscurs" |
| Fichier `hard-pages.json` séparé | Contrôle éditorial total, curatif, stable | Maintenance manuelle, risque de rot (articles supprimés), effort récurrent |

**Décision : option 1 — paramètre `?difficulty=hard` sur `/random-pair`, sélection dans le dernier tiers du pool (rangs 134-200 sur 200 articles).** La liste Wikimedia étant déjà triée par popularité décroissante, les derniers tiers contiennent naturellement des articles moins connus. Pas de fichier `hard-pages.json`.

---

### Backend — Julien

**Fichiers à modifier :**
- `apps/backend/src/routes/game.route.ts` (ajout paramètre `difficulty` dans querystring)
- `apps/backend/src/__tests__/game.route.test.ts` (nouveaux cas de test)

#### Modification du querystring de `/api/game/random-pair`

```typescript
// Avant
const randomPairQuerySchema = z.object({
  lang: z.enum(['fr', 'en']).default('fr'),
});

// Après
const randomPairQuerySchema = z.object({
  lang: z.enum(['fr', 'en']).default('fr'),
  difficulty: z.enum(['normal', 'hard']).default('normal'),
});
```

Le type `RandomPairQuery` (inféré par Zod) intègre automatiquement `difficulty`.

#### Stratégie de sélection en mode difficile

```typescript
// Constantes à ajouter dans game.route.ts
const HARD_MODE_POOL_START_FRACTION = 0.67; // commence au rang 67% du pool
// Sur 200 articles : début à l'indice 134 (0.67 * 200)

function getHardModePool(articles: string[]): string[] {
  const startIdx = Math.floor(articles.length * HARD_MODE_POOL_START_FRACTION);
  return articles.slice(startIdx);
  // Ex : pool de 200 → articles[134..199] (66 articles)
  // Ex : pool de 50  → articles[34..49]  (16 articles)
}
```

Dans le handler de `/api/game/random-pair` :

```typescript
const { lang, difficulty } = request.query;
const popularPages = await getPopularPages(lang);
const pool = difficulty === 'hard'
  ? getHardModePool(popularPages.articles)
  : popularPages.articles;

// pool.length < 2 → 503 immédiat (pas de retry inutile)
```

**Précondition :** `getPopularPages()` retourne toujours au minimum le fallback JSON. Le fallback contient au moins 50 articles par langue — le tiers inférieur contient au moins 16 articles, suffisant pour `pickTwoDistinctIndices`.

#### Fonction pure à extraire (TDD strict — Julien écrit les tests avant)

| Fonction | Signature | Cas à tester |
|----------|-----------|--------------|
| `getHardModePool(articles: string[]): string[]` | Retourne le dernier tiers du tableau | Pool de 200 → 66 éléments depuis l'indice 134; pool de 3 → 1 élément; pool de 2 → 0 élément (edge case — guard à documenter); pool vide → [] |
| `pickTwoDistinctIndices(length: number): [number, number]` | Déjà existante — ajouter le cas `length < 2` dans les tests existants si non couvert |

Fichier de test : `apps/backend/src/__tests__/game.route.test.ts` (étendre les tests existants).

**Edge case critique** : si `getHardModePool` retourne un tableau de 0 ou 1 élément (pool trop petit), le handler détecte `pool.length < 2` et retourne 503 immédiatement. Julien documente ce comportement dans le code et l'ajoute dans les tests.

#### Tests d'intégration supplémentaires

```typescript
// Test 1 — difficulty=hard retourne HTTP 200
const r = await request(app).get('/api/game/random-pair?lang=fr&difficulty=hard');
expect(r.status).toBe(200);
expect(r.body.start.title).toBeDefined();
expect(r.body.target.title).toBeDefined();
expect(r.body.start.title).not.toBe(r.body.target.title);

// Test 2 — difficulty=normal reste le comportement existant (non-régression)
const r2 = await request(app).get('/api/game/random-pair?lang=fr&difficulty=normal');
expect(r2.status).toBe(200);

// Test 3 — difficulty invalide → 400
const r3 = await request(app).get('/api/game/random-pair?lang=fr&difficulty=extreme');
expect(r3.status).toBe(400);

// Test 4 — difficulty absent → comportement normal (défaut 'normal')
const r4 = await request(app).get('/api/game/random-pair?lang=fr');
expect(r4.status).toBe(200);
```

**Note :** les tests Supertest pour ce module mockent `fetchArticleSummary` — ne pas appeler Wikipedia réel en CI.

---

### Frontend — Laurent

**Fichiers à créer / modifier :**
- `apps/mobile/src/hooks/useRandomPair.ts` (paramètre `difficulty`)
- `apps/mobile/src/screens/HomeScreen.tsx` (toggle mode difficile)
- `apps/mobile/src/screens/VictoryScreen.tsx` (badge conditionnel)
- `apps/mobile/src/store/game.store.ts` (champ `difficulty` dans GameSession)
- `apps/mobile/src/services/difficulty-storage.service.ts` (nouveau — persistance préférence)

#### Modification de `GameSession` et `GameRecord` dans `packages/shared/src/types/index.ts`

```typescript
// Type à ajouter
export type GameDifficulty = 'normal' | 'hard';

export interface GameSession {
  // ... champs existants ...
  /** Difficulté de la partie. Absent = 'normal' (rétrocompatibilité) */
  difficulty?: GameDifficulty;
}

export interface GameRecord {
  // ... champs existants ...
  difficulty?: GameDifficulty;
}
```

**Rétrocompatibilité :** les sessions persistées avant cette feature n'ont pas le champ `difficulty`. La lecture dans `hydrate()` doit tolérer l'absence — le champ est `?: GameDifficulty`, donc `undefined` est valide. Afficher comme 'normal' si absent.

#### Service `difficulty-storage.service.ts`

```typescript
// apps/mobile/src/services/difficulty-storage.service.ts

const DIFFICULTY_KEY = '@wikihop/difficulty_preference';

export async function getDifficultyPreference(): Promise<GameDifficulty>
// Retourne 'normal' si la clé est absente ou si la valeur est invalide

export async function setDifficultyPreference(difficulty: GameDifficulty): Promise<void>
// Persiste silencieusement — erreurs AsyncStorage loguées, jamais remontées
```

Ce service est **appelé uniquement au démarrage** pour lire la préférence, et lors du changement via le toggle. Il ne doit pas être lu à chaque render.

#### Modification `game.store.ts` — action `startSession`

Étendre la signature (en cohérence avec F3-01 si les deux features sont développées en parallèle) :

```typescript
startSession: (
  startArticle: Article,
  targetArticle: Article,
  options?: {
    isDailyChallenge?: boolean;
    dailyChallengeDate?: string;
    difficulty?: GameDifficulty;
  }
) => Promise<void>
```

Construction explicite pour satisfaire `exactOptionalPropertyTypes` :

```typescript
const session: GameSession = {
  id: generateUUID(),
  startArticle,
  targetArticle,
  path: [startArticle],
  jumps: 0,
  startedAt: new Date(),
  status: 'in_progress',
  difficulty: options?.difficulty ?? 'normal',
};
```

Note : `difficulty: 'normal'` est toujours présent dans la construction (pas de champ optionnel manquant). C'est l'interface partagée qui le déclare optionnel pour la rétrocompatibilité des données persistées.

#### Toggle mode difficile dans HomeScreen

**Emplacement :** en dessous du bouton "Défi du jour" (si F3-01 implémenté) ou en dessous du bouton "Jouer" — avant les boutons secondaires (Historique, Soutenir).

**Composant RN :** `Switch` natif de React Native — pas de dépendance externe. Label sur la gauche, `Switch` sur la droite, dans un `View` `flexDirection: 'row'` `alignItems: 'center'` `justifyContent: 'space-between'`.

```typescript
const [isDifficultyHard, setIsDifficultyHard] = useState(false);
```

Initialisation au montage :
```typescript
useEffect(() => {
  void DifficultyStorage.getDifficultyPreference().then((pref) => {
    setIsDifficultyHard(pref === 'hard');
  });
}, []);
```

Changement du toggle :
```typescript
const handleDifficultyToggle = useCallback((value: boolean): void => {
  setIsDifficultyHard(value);
  void DifficultyStorage.setDifficultyPreference(value ? 'hard' : 'normal');
  refresh(); // relance useRandomPair avec la nouvelle difficulté
}, [refresh]);
```

Accessibilité : `accessibilityLabel={isDifficultyHard ? "Mode difficile activé" : "Mode difficile désactivé"}` sur le `Switch`.

#### Modification de `useRandomPair`

```typescript
export function useRandomPair(difficulty: GameDifficulty = 'normal'): UseRandomPairReturn
```

URL :
```typescript
const url = `http://192.168.1.30:3000/api/game/random-pair?lang=${language}&difficulty=${difficulty}`;
```

`difficulty` ajouté aux dépendances du `useEffect`.

Dans HomeScreen :
```typescript
const { state, refresh } = useRandomPair(isDifficultyHard ? 'hard' : 'normal');
```

#### Badge "Mode difficile" dans VictoryScreen

Condition : `currentSession?.difficulty === 'hard'`.

Style : fond `#FEE2E2` (rouge pâle), texte `#991B1B` (rouge foncé), borderRadius 8, paddingHorizontal 12, paddingVertical 4, fontSize 13.

Libellé : `"Mode difficile"`.

Accessibilité : `accessibilityLabel="Partie jouée en mode difficile"`.

#### Badge dans ArticleScreen (GameHUD)

Un indicateur court `"HARD"` ou `"Difficile"` affiché dans le header de `ArticleScreen` quand `currentSession?.difficulty === 'hard'`. Laurent choisit l'implémentation exacte selon la place disponible — à valider avec Benjamin si le GameHUD est trop dense.

#### Fonctions pures TDD strict (Laurent écrit les tests avant)

| Fonction | Fichier | Signature | Cas à tester |
|----------|---------|-----------|--------------|
| `isHardMode(difficulty: GameDifficulty \| undefined): boolean` | `apps/mobile/src/utils/difficulty.utils.ts` | Retourne true ssi `difficulty === 'hard'` | 'hard' → true; 'normal' → false; undefined → false |
| `getDifficultyLabel(difficulty: GameDifficulty \| undefined): string` | même fichier | 'hard' → "Mode difficile"; 'normal' ou undefined → "" | Couverture des 3 cas |

Fichier de test : `apps/mobile/src/__tests__/difficulty.utils.test.ts`

#### Persistance dans `hydrate()`

```typescript
const parsed = JSON.parse(raw) as {
  // ... champs existants ...
  difficulty?: GameDifficulty;
};
```

Dans la construction de `GameSession` depuis `parsed` :
```typescript
difficulty: parsed.difficulty ?? 'normal'
```

---

### Critères de qualité (code review)

- `tsc --noEmit` sans erreur — notamment après l'ajout de `GameDifficulty` dans le package shared
- `exactOptionalPropertyTypes` satisfait sur les constructions `GameSession` et `GameRecord`
- Zéro `any`
- Tests unitaires des fonctions pures présents avant l'implémentation (vérifiable dans l'ordre des commits)
- Tests Supertest `difficulty=hard` et `difficulty=normal` passants
- Rétrocompatibilité : une session persistée sans `difficulty` ne fait pas crasher `hydrate()`
- Le toggle `Switch` persiste correctement entre deux sessions (tuer l'app et relancer)
- Badge "Mode difficile" affiché sur VictoryScreen si la session est en mode hard
- Gate device physique : le flux Home (toggle hard) → Game → Victory avec badge doit être testé sur device physique

### Points de vigilance

1. **`Switch` RN + état local vs store** : l'état du toggle est local à `HomeScreen` (initialisé depuis AsyncStorage). Ne pas le mettre dans le store Zustand — c'est une préférence UI, pas un état de session. Le store reçoit `difficulty` uniquement via `startSession(options)`.
2. **Ordre `setIsDifficultyHard` + `refresh()`** : quand le toggle change, `refresh()` doit être appelé après `setIsDifficultyHard` pour que `useRandomPair` reçoive la bonne valeur au prochain render. L'ordre des setState React garantit ce comportement — ne pas introduire de setTimeout.
3. **Pool hard trop petit en fallback** : si `popular-pages.json` contient peu d'articles, `getHardModePool` peut retourner 0 ou 1 article. Julien teste ce cas en faisant varier la taille du pool mocké.
4. **Badge dans ArticleScreen** : consulter le `GameHUD` existant avant de modifier le header — ne pas casser le layout sur petits écrans.
5. **F3-01 et F3-05 en parallèle** : si Laurent travaille les deux features simultanément, la signature `startSession(options)` doit être définie une seule fois avec tous les champs optionnels. Éviter deux PRs qui modifient la même signature — coordonner avec l'orchestrateur.
6. **`noUncheckedIndexedAccess`** : `articles.slice(startIdx)` est sûr (retourne [] si startIdx >= length). Le caller doit vérifier `pool.length >= 2` avant `pickTwoDistinctIndices`.

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
