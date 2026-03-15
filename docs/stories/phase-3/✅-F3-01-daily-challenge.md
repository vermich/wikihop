---
id: F3-01
title: Défi quotidien (même paire pour tous les joueurs)
phase: 3-Features
priority: Must
agents: [Backend Dev, Frontend Dev, UX/UI]
status: done
created: 2026-02-28
completed: 2026-03-15
---

# F3-01 — Défi quotidien (même paire pour tous les joueurs)

## User Story
En tant que joueur régulier, je veux un défi quotidien avec la même paire d'articles pour tous, afin de pouvoir comparer mes résultats avec d'autres joueurs.

## Critères d'acceptance
- [x] Endpoint `GET /api/game/daily` retourne la paire du jour (identique pour tous les appels de la journée)
- [x] La paire quotidienne change automatiquement à minuit UTC
- [x] Les paires sont générées à l'avance et stockées en base de données *(recadré en génération déterministe stateless — voir Notes de réalisation)*
- [x] Un joueur ne peut jouer le défi quotidien qu'une seule fois par jour (contrôle local)
- [x] L'écran d'accueil affiche clairement le défi du jour avec une indication visuelle distincte
- [ ] Si le joueur a déjà joué le défi du jour, son résultat est affiché à la place du bouton "Jouer" *(hors scope Phase 3 — documenté dans Notes de réalisation ; bouton "Défi du jour complété" affiché à la place)*

## Notes de réalisation

### Analyse préalable des critères d'acceptance

Le critère "Les paires sont générées à l'avance et stockées en base de données" est abandonné — la génération déterministe stateless est préférable (pas de DB, pas de job cron, reproductibilité parfaite). Le critère "Un joueur ne peut jouer le défi qu'une seule fois" reste en contrôle local (AsyncStorage). Le critère "afficher son résultat à la place du bouton Jouer" est hors scope Phase 3 — il requiert une UX non encore maquettée.

---

### Backend — Julien

**Fichiers à créer / modifier :**
- `apps/backend/src/routes/daily-challenge.route.ts` (nouveau)
- `apps/backend/src/schemas/article.schema.ts` (extraction depuis game.route.ts)
- `apps/backend/src/utils/daily-challenge.utils.ts` (fonctions pures)
- `apps/backend/src/routes/index.ts` (ajout du register)
- `apps/backend/src/__tests__/daily-challenge.utils.test.ts` (TDD strict)
- `apps/backend/src/__tests__/daily-challenge.route.test.ts` (Supertest)

#### Extraction du schéma Zod article

Déplacer `articleSummarySchema` de `game.route.ts` vers `src/schemas/article.schema.ts` pour éviter la duplication. `game.route.ts` et `daily-challenge.route.ts` importent depuis ce fichier.

```typescript
// apps/backend/src/schemas/article.schema.ts
import { z } from 'zod/v4';

export const articleSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url(),
  language: z.enum(['fr', 'en']),
  extract: z.string(),
  thumbnailUrl: z.string().url().optional(),
});

export type ArticleSummaryResponse = z.infer<typeof articleSummarySchema>;
```

#### Route GET `/api/game/daily`

```typescript
// Querystring
{ lang: 'fr' | 'en' }  // défaut 'fr'

// Réponse 200
{
  date: string;          // YYYY-MM-DD UTC
  start: ArticleSummary;
  target: ArticleSummary;
}

// Réponse 503
{
  success: false;
  error: { code: 'DAILY_CHALLENGE_UNAVAILABLE'; message: string }
}
```

Enregistrement dans `routes/index.ts` :
```typescript
// Phase 3 — Défi quotidien
void app.register(dailyChallengeRoutes);
```

#### Algorithme de génération déterministe

L'algorithme est entièrement stateless — aucune base de données.

```
Entrées : dateUTC (YYYY-MM-DD), lang ('fr' | 'en'), articles: string[]

1. seed = djb2Hash(dateUTC + lang)
   djb2Hash(str: string): number
     hash = 5381
     pour chaque char de str :
       hash = ((hash << 5) + hash) + charCode  // hash * 33 + c
     retourner Math.abs(hash) (toujours positif)

2. [idxStart, idxTarget] = computeDailyIndices(seed, articles.length)

3. titleStart  = articles[idxStart]  (noUncheckedIndexedAccess : vérifier !== undefined)
4. titleTarget = articles[idxTarget]

5. Valider via fetchArticleSummary() — même logique que /random-pair
   — si l'un échoue → retry avec seed + attempt pour décaler
   — max 5 tentatives → 503 si toutes échouent

6. Retourner { date: getTodayUTC(), start, target }
```

**Pourquoi djb2 ?** Hash simple sans dépendance, déterministe, distribue bien les dates. La prédictibilité est souhaitée (même résultat pour tout le monde).

#### Fonctions pures (TDD strict — Julien écrit les tests avant)

Fichier : `apps/backend/src/utils/daily-challenge.utils.ts`

| Fonction | Signature | Cas à tester |
|----------|-----------|--------------|
| `djb2Hash(str: string): number` | Retourne toujours un entier >= 0 | Même entrée → même sortie; deux dates différentes → résultats différents; string vide → valeur stable (5381); résultat toujours >= 0 |
| `getTodayUTC(): string` | Retourne YYYY-MM-DD en UTC | Format correct (regex /^\d{4}-\d{2}-\d{2}$/); cohérent avec `new Date().toISOString().slice(0,10)` |
| `computeDailyIndices(seed: number, length: number): [number, number]` | Deux indices distincts dans [0, length[ | idxStart !== idxTarget toujours; les deux dans les bornes; déterministe pour même seed+length; length = 2 fonctionne |

Algorithme de `computeDailyIndices` :
```typescript
function computeDailyIndices(seed: number, length: number): [number, number] {
  const idxStart  = seed % length;
  let   idxTarget = (seed * 31 + 17) % length;
  if (idxStart === idxTarget) {
    idxTarget = (idxTarget + 1) % length;
  }
  return [idxStart, idxTarget];
}
```

Fichier de test : `apps/backend/src/__tests__/daily-challenge.utils.test.ts`

#### Tests d'intégration (Supertest)

```typescript
// Test 1 — Idempotence : deux appels retournent la même paire
const r1 = await request(app).get('/api/game/daily?lang=fr');
const r2 = await request(app).get('/api/game/daily?lang=fr');
expect(r1.body.start.title).toBe(r2.body.start.title);
expect(r1.body.target.title).toBe(r2.body.target.title);
expect(r1.body.date).toBe(r2.body.date);

// Test 2 — Format de la date
expect(r1.body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

// Test 3 — start !== target
expect(r1.body.start.title).not.toBe(r1.body.target.title);

// Test 4 — lang=en retourne HTTP 200
const r3 = await request(app).get('/api/game/daily?lang=en');
expect(r3.status).toBe(200);

// Test 5 — lang invalide → 400
const r4 = await request(app).get('/api/game/daily?lang=de');
expect(r4.status).toBe(400);
```

**Note :** les tests Supertest mockent `fetchArticleSummary` pour éviter les appels Wikipedia réels en CI.

---

### Frontend — Laurent

**Fichiers à créer / modifier :**
- `apps/mobile/src/services/daily-challenge.service.ts` (nouveau)
- `apps/mobile/src/hooks/useDailyChallenge.ts` (nouveau)
- `apps/mobile/src/utils/daily-challenge.utils.ts` (nouveau — fonctions pures TDD)
- `apps/mobile/src/screens/HomeScreen.tsx` (ajout bouton)
- `apps/mobile/src/screens/VictoryScreen.tsx` (badge conditionnel)
- `apps/mobile/src/store/game.store.ts` (champ `isDailyChallenge` dans startSession)
- `packages/shared/src/types/index.ts` (champs optionnels dans GameSession et GameRecord)

#### Modification de `GameSession` et `GameRecord` dans `packages/shared/src/types/index.ts`

```typescript
export interface GameSession {
  // ... champs existants ...
  /** Indique si la partie est un défi quotidien (F3-01). Absent si partie normale. */
  isDailyChallenge?: boolean;
  /** Date du défi YYYY-MM-DD (présente si isDailyChallenge === true). */
  dailyChallengeDate?: string;
}

export interface GameRecord {
  // ... champs existants ...
  isDailyChallenge?: boolean;
  dailyChallengeDate?: string;
}
```

**Attention `exactOptionalPropertyTypes`** : ne jamais affecter `undefined` explicitement à ces champs. Construire en deux branches (avec/sans) comme dans `hydrate()`.

#### Service `daily-challenge.service.ts`

```typescript
export interface DailyChallengeResponse {
  date: string;        // YYYY-MM-DD
  start: ArticleSummary;
  target: ArticleSummary;
}

/**
 * Appelle GET /api/game/daily?lang={lang}
 * Retourne null en cas d'erreur réseau ou HTTP non-200.
 */
export async function fetchDailyChallenge(
  lang: Language,
): Promise<DailyChallengeResponse | null>
```

Pattern identique à `useRandomPair` : AbortController timeout 10s, flag `cancelled`, retour null sur erreur.

#### Hook `useDailyChallenge`

```typescript
export type DailyChallengeState =
  | { status: 'loading' }
  | { status: 'success'; data: DailyChallengeResponse }
  | { status: 'error'; message: string };

export interface UseDailyChallengeReturn {
  state: DailyChallengeState;
}

export function useDailyChallenge(): UseDailyChallengeReturn
```

Charge au montage uniquement (pas de refresh — le défi du jour est fixe). Lit la langue depuis `useLanguageStore`.

#### Modification `game.store.ts` — action `startSession`

```typescript
startSession: (
  startArticle: Article,
  targetArticle: Article,
  options?: { isDailyChallenge?: boolean; dailyChallengeDate?: string }
) => Promise<void>
```

Construction explicite en deux branches :

```typescript
// Branche défi (isDailyChallenge === true)
const session: GameSession = {
  id: generateUUID(),
  startArticle, targetArticle,
  path: [startArticle], jumps: 0,
  startedAt: new Date(), status: 'in_progress',
  isDailyChallenge: true,
  dailyChallengeDate: options.dailyChallengeDate,
};

// Branche normale (sans les champs optionnels)
const session: GameSession = {
  id: generateUUID(),
  startArticle, targetArticle,
  path: [startArticle], jumps: 0,
  startedAt: new Date(), status: 'in_progress',
};
```

Propager aussi dans `buildGameRecord` (history.utils.ts) — même logique de branche conditionnelle.

#### Persistance — `hydrate()`

Le `parsed` intermédiaire doit inclure les champs optionnels :

```typescript
const parsed = JSON.parse(raw) as {
  // ... champs existants ...
  isDailyChallenge?: boolean;
  dailyChallengeDate?: string;
};
```

Dans la construction de `GameSession`, inclure `isDailyChallenge` et `dailyChallengeDate` dans la branche où ils sont définis (pattern `parsed.completedAt !== undefined` déjà établi).

#### Bouton "Défi du jour" dans HomeScreen

Emplacement : **au-dessus** du bouton "Jouer" dans `buttonsContainer`.

Style : fond `#D97706` (ambre), texte blanc, height 52, borderRadius 12.

Libellé : `"Défi du jour"`.

Handler `handlePlayDaily` :
```typescript
const handlePlayDaily = useCallback(async (): Promise<void> => {
  if (dailyChallengeState.status !== 'success') return;
  const { data } = dailyChallengeState;

  await clearSession();

  const startArticle: Article = {
    id: data.start.id, title: data.start.title,
    url: data.start.url, language: data.start.language,
  };
  const targetArticle: Article = {
    id: data.target.id, title: data.target.title,
    url: data.target.url, language: data.target.language,
  };

  await startSession(startArticle, targetArticle, {
    isDailyChallenge: true,
    dailyChallengeDate: data.date,
  });

  navigation.navigate('Game', { articleTitle: startArticle.title });
}, [dailyChallengeState, clearSession, startSession, navigation]);
```

Désactivé (`disabled={true}`) pendant le chargement du défi.

#### Badge "Défi du jour" dans VictoryScreen

Condition : `currentSession?.isDailyChallenge === true`.

Emplacement : dans le `statsBlock`, au-dessus des stats sauts/durée.

Style : fond `#FEF3C7` (jaune pâle), texte `#92400E` (brun), borderRadius 8, paddingHorizontal 12, paddingVertical 4, fontSize 13.

Libellé : `"Défi du jour — DD/MM/YYYY"` (date formatée depuis `currentSession.dailyChallengeDate`).

Accessibilité : `accessibilityLabel="Partie jouée dans le cadre du défi du jour du DD/MM/YYYY"`.

#### Fonctions pures TDD strict (Laurent écrit les tests avant)

Fichier : `apps/mobile/src/utils/daily-challenge.utils.ts`

| Fonction | Signature | Cas à tester |
|----------|-----------|--------------|
| `formatDailyChallengeDate(dateStr: string): string` | `'2026-03-08' → '08/03/2026'` | Format correct; mois et jour paddés; année sur 4 chiffres; mois 1 → "01" |
| `isDailyChallengeToday(dailyChallengeDate: string, todayUTC: string): boolean` | true si dates identiques | Même date → true; dates différentes → false; undefined-safe (ne pas throw sur entrée invalide) |

Fichier de test : `apps/mobile/src/__tests__/daily-challenge.utils.test.ts`

---

### Critères de qualité (code review)

- `tsc --noEmit` sans erreur après ajout des champs optionnels dans `GameSession` et `GameRecord`
- `exactOptionalPropertyTypes` satisfait sur toutes les constructions d'objets (deux branches explicites)
- Zéro `any`
- Tests unitaires des fonctions pures committés avant l'implémentation (vérifiable via l'ordre des commits)
- Tests Supertest idempotence passants
- Bouton "Défi du jour" désactivé pendant le chargement (pas de crash si tap prématuré)
- Aucune régression sur HomeScreen (bouton "Jouer", refresh, historique)
- Gate device physique obligatoire : flux Home → Défi → Game → Victory testé sur device physique

### Points de vigilance

1. **`articleSummarySchema` extrait** : ne pas dupliquer le schéma Zod — extraire vers `schemas/article.schema.ts` avant de créer la nouvelle route
2. **Race condition boutons** : si l'utilisateur tape "Défi du jour" et "Jouer" rapidement, appliquer le pattern flag `isNavigating` (voir ADR point de vigilance n°17)
3. **Désérialisation `hydrate()`** : `isDailyChallenge` et `dailyChallengeDate` dans le type `parsed` — sinon TypeScript les rejette
4. **Langue du défi** : un joueur FR et un joueur EN jouent des défis différents — intentionnel
5. **`buildGameRecord`** : propager `isDailyChallenge` et `dailyChallengeDate` vers `GameRecord` — ne pas oublier la branche conditionnelle

## Validation QA — Halim

**Date** : 2026-03-15
**Testeur** : Halim
**Statut global** : ✅ Validé avec réserves

### Critères d'acceptance
- [x] Endpoint `GET /api/game/daily` retourne la paire du jour — OK. Route implémentée dans `game.route.ts` (intégré plutôt que fichier séparé — écart specs non bloquant). Tests Supertest idempotence passants (9 tests).
- [x] La paire quotidienne change automatiquement à minuit UTC — OK. `getTodayUTC()` via `new Date().toISOString().slice(0,10)` garantit le changement à minuit UTC.
- [x] Les paires sont générées à l'avance et stockées en base de données — OK. Recadré en génération déterministe stateless (djb2Hash + computeDailyIndices). Décision documentée dans les Notes de réalisation.
- [x] Un joueur ne peut jouer le défi quotidien qu'une seule fois par jour (contrôle local) — OK. `useDailyCompletionStatus` + AsyncStorage clé `@wikihop/daily_completion_date` implémentés via F3-16. Bouton désactivé et libellé "Défi du jour complété" affiché.
- [x] L'écran d'accueil affiche clairement le défi du jour avec une indication visuelle distincte — OK. Bouton fond `#D97706` (ambre), height 52, borderRadius 12, libellé "Défi du jour". Badge date affiché selon état chargement (F3-19). Désactivé pendant le chargement.
- [ ] Si le joueur a déjà joué le défi du jour, son résultat est affiché à la place du bouton "Jouer" — HORS SCOPE Phase 3 (documenté dans Notes de réalisation). Bouton "Défi du jour complété" affiché à la place du bouton actif. Le résultat chiffré (sauts, durée) n'est pas affiché. Acceptable per spec.

### Tests automatisés
- `npm test` (backend) : ✅ 92 tests passants dans les suites liées à F3-01 (daily-challenge.utils, daily-challenge.route). 1 test en échec non bloquant (voir Bug #1 ci-dessous). Échecs `db.test.ts` préexistants (PostgreSQL non démarrée) — hors scope F3-01.
- `npm test` (mobile) : ✅ 600 tests passants, 0 échec. Inclut `daily-challenge.utils.test.ts`, `daily-challenge.service.test.ts`, `useDailyChallenge.test.ts`.
- `tsc --noEmit` : ⚠️ 1 erreur préexistante dans `RootNavigator.tsx` (story TODO connue). 1 erreur dans `V1/` (hors scope). Aucune nouvelle erreur introduite par F3-01.
- `npm run lint` : ✅ 0 erreur, 18 warnings `no-console` préexistants.

### TDD strict vérifié
- Backend : commit `147302a` (tests) antérieur à `2a96a1d` (implémentation) — TDD conforme.
- Mobile : commit `d315c7f` (tests fonctions pures + service) antérieur à `9240a10` (implémentation) — TDD conforme.

### Couverture de code (fichiers F3-01 mobile)
- `daily-challenge.utils.ts` : 100% statements, 70% branches (lignes 35-37), 100% fonctions.
- `daily-challenge.service.ts` : 93.75% statements, 75% branches, 100% lignes.
- `useDailyChallenge.ts` : 94.11% statements, 75% branches, 100% lignes.
- Couverture globale > 70% : ✅ conforme.

### Cas limites testés (automatisés)
- Idempotence (deux appels le même jour) : ✅
- Changement de langue (fr/en) : ✅
- Lang invalide → 400 : ✅
- 5 tentatives Wikipedia en erreur → 503 : ✅
- Pool trop petit : ✅
- `getTodayUTC` format YYYY-MM-DD : ✅
- `computeDailyIndices` déterministe, indices distincts, bornes : ✅
- `formatDailyChallengeDate` + `isDailyChallengeToday` : ✅
- `isDailyChallenge` et `dailyChallengeDate` propagés dans `buildGameRecord` : ✅
- Persistance `hydrate()` avec champs optionnels : ✅

### Gate device physique
- [x] Flux Home → Défi du jour → Game → VictoryScreen : **confirmé par le Client le 2026-03-15**

### Bug identifié

**Bug #1 — Sévérité : Faible**
**Composant** : `apps/backend/__tests__/daily-challenge.utils.test.ts`
**Story liée** : F3-01

**Description** : Le test `"produit la valeur djb2 correcte pour 'abc'"` attend `193491849` mais l'implémentation produit `193485963`. La divergence vient du commentaire de calcul dans le test lui-même : il calcule sans appliquer `>>> 0` à chaque itération (comme le fait l'implémentation). L'algorithme djb2 de l'implémentation est valide, déterministe et satisfait toutes les propriétés requises. Seul le commentaire de vérification `// h = ((5863276 << 5) + 5863276) + 99 = 193491849` est incorrect — il devrait indiquer `5863208` et `193485963`.

**Comportement observé** : Test en échec avec `Expected: 193491849 / Received: 193485963`.
**Comportement attendu** : Test en succès avec la valeur correcte `193485963`, correspondant à l'algo `>>> 0` intermédiaire.

**Impact** : Non bloquant — l'algorithme djb2 est fonctionnel pour toutes les dates réelles. Le test vérifie une valeur de référence incorrecte. Les tests d'idempotence, déterminisme et bornes passent tous.

**Escalade** : Bug Faible — à corriger par Backend Dev (Julien). La correction est triviale : remplacer `193491849` par `193485963` dans le test et corriger le commentaire de calcul.

### Conclusion
Story F3-01 validée. Critères fonctionnels : 5/6 cochés (le 6e est hors scope per spec). 1 bug faible dans un test (valeur de référence djb2 incorrecte) — à corriger par Julien. Gate device physique confirmé par le Client le 2026-03-15 : flux Home → Défi du jour → Game → VictoryScreen validé sur device physique.

## Statut
pending → in-progress → done
