# Spec technique — F3-51 : Défi du jour basé sur l'actualité Wikipedia (pré-calculé J-1)

## 1. Contexte

Story : `docs/stories/phase-3/🔄-F3-51-daily-challenge-news-based-precalculated.md`
ADR : `docs/adr/ADR-009-daily-challenge-news-precalculated.md`

La route `GET /api/game/daily` utilise actuellement un mécanisme hash+pageviews pour produire une paire déterministe. Cette story enrichit le système avec :
1. Une table `daily_challenges` PostgreSQL qui stocke les paires pré-calculées
2. Un service `daily-news.service.ts` qui interroge le feed Wikimedia `feed/featured`
3. Une route admin `POST /api/admin/daily-challenges/precompute` pour déclencher le calcul
4. Une modification de `GET /api/game/daily` pour lire depuis la base en priorité

**Contrainte clé** : le feed `feed/featured` est pleinement supporté uniquement pour `en`. Pour `fr`, `de`, `es`, il existe des données partielles. Pour `nl`, `pl`, `pt`, `it`, le pool peut être insuffisant (< 5 articles valides) → fallback hash+pageviews.

## 2. Périmètre

**Dans scope :**
- `apps/backend/src/db/migrations/002_daily_challenges.sql` — nouvelle migration
- `apps/backend/src/db/schema.ts` — type `DailyChallengeRow`
- `apps/backend/src/services/daily-news.service.ts` — nouveau service
- `apps/backend/src/routes/game.route.ts` — modification `GET /api/game/daily`
- `apps/backend/src/routes/admin.route.ts` — nouvelle route `POST /api/admin/daily-challenges/precompute`
- `apps/backend/src/routes/index.ts` — enregistrement `adminRoutes`

**Hors scope :**
- Frontend (pas de modification — le contrat de `GET /api/game/daily` est préservé)
- Authentification de la route admin (hors scope Phase 3 — route accessible en réseau interne uniquement)
- Cron intégré (délégué à l'infrastructure — hors scope)

## 3. Migration PostgreSQL

**Fichier** : `apps/backend/src/db/migrations/002_daily_challenges.sql`

```sql
-- Migration 002 : Table daily_challenges (F3-51)
-- Paires pré-calculées pour le défi du jour basé sur l'actualité Wikipedia.

CREATE TABLE IF NOT EXISTS daily_challenges (
  date           DATE         NOT NULL,
  lang           VARCHAR(2)   NOT NULL,
  start_article  JSONB        NOT NULL,
  target_article JSONB        NOT NULL,
  source         VARCHAR(20)  NOT NULL DEFAULT 'news',
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (date, lang)
);

CREATE INDEX IF NOT EXISTS daily_challenges_date_idx ON daily_challenges (date);
```

## 4. Schéma TypeScript

**Fichier** : `apps/backend/src/db/schema.ts` — ajouter à la fin :

```typescript
/**
 * Représente une ligne de la table `daily_challenges`.
 * start_article et target_article sont des JSONB correspondant à ArticleSummaryResponse.
 */
export interface DailyChallengeRow {
  date: Date;
  lang: string;
  start_article: unknown;
  target_article: unknown;
  source: string;
  created_at: Date;
}
```

## 5. Service daily-news.service.ts

**Fichier** : `apps/backend/src/services/daily-news.service.ts`

### 5.1 Types internes

```typescript
/** Article extrait depuis le feed featured — structure minimale */
export interface FeedArticle {
  title: string;
  extract?: string;
  content_urls?: { desktop: { page: string } };
  pageid?: number;
}

/** Structure minimale de la réponse feed/featured */
export interface FeaturedFeedResponse {
  news?: Array<{ links?: FeedArticle[] }>;
  onthisday?: Array<{ pages?: FeedArticle[] }>;
}
```

### 5.2 Constantes

```typescript
const MIN_EXTRACT_LENGTH = 200;
const MIN_NEWS_POOL_SIZE = 5;
const FEED_TIMEOUT_MS = 5_000;
const WIKIPEDIA_USER_AGENT = 'WikiHop/1.0 (contact@wikihop.app)';
```

### 5.3 Fonctions pures exportées (TDD obligatoire)

Ces trois fonctions doivent être écrites en TDD strict (tests avant implémentation) :

#### `extractArticlesFromFeed(feed: FeaturedFeedResponse): string[]`

Extrait les titres d'articles depuis la réponse `feed/featured`. Parcourt dans l'ordre : `feed.news[].links[]`, puis `feed.onthisday[].pages[]`. Déduplique les titres (cas où un article apparaît dans news ET onthisday).

```typescript
/**
 * Extrait les titres d'articles depuis une réponse feed/featured.
 * Parcourt news.links puis onthisday.pages — déduplique.
 *
 * @returns Tableau de titres (peut être vide si feed vide ou mal formé)
 */
export function extractArticlesFromFeed(feed: FeaturedFeedResponse): string[];
```

**Cas de test attendus** :
- Feed avec `news` et des `links` → retourne les titres
- Feed avec seulement `onthisday` → retourne les titres des `pages`
- Feed avec `news` ET `onthisday` → déduplique les doublons
- Feed vide `{}` → retourne `[]`
- Feed avec `news: []` → retourne `[]`
- Lien sans `title` (malformed) → ignoré silencieusement

#### `isValidFeedArticle(article: FeedArticle): boolean`

Vérifie qu'un article du feed est jouable : `title` présent, `extract` présent et `> MIN_EXTRACT_LENGTH`, `content_urls.desktop.page` présent.

```typescript
/**
 * Vérifie qu'un article extrait du feed est jouable (non-ébauche, URL présente).
 */
export function isValidFeedArticle(article: FeedArticle): boolean;
```

**Cas de test attendus** :
- Article avec tous les champs et `extract.length > 200` → `true`
- Article sans `extract` → `false`
- Article avec `extract.length === 200` → `false` (strictement supérieur)
- Article avec `extract.length === 201` → `true`
- Article sans `content_urls` → `false`
- Article sans `title` → `false`

#### `selectNewsPair(titles: string[], hash: number): [string, string] | null`

Sélectionne une paire déterministe depuis un tableau de titres via le hash. Retourne `null` si `titles.length < 2`. Réutilise la logique de `computeDailyIndices` depuis `daily-challenge.utils.ts`.

```typescript
/**
 * Sélectionne une paire déterministe depuis un pool de titres.
 *
 * @param titles - Pool de titres valides (doit avoir longueur >= 2)
 * @param hash   - Hash djb2 de la date+lang (issu de djb2Hash)
 * @returns Tuple [titleStart, titleTarget] ou null si pool insuffisant
 */
export function selectNewsPair(titles: string[], hash: number): [string, string] | null;
```

**Cas de test attendus** :
- Pool de 2 titres → retourne les deux titres distincts
- Pool de 1 titre → `null`
- Pool vide → `null`
- Même hash + même pool → même résultat (déterminisme)
- Résultat : les deux titres sont distincts (`result[0] !== result[1]`)

### 5.4 Fonction principale (non pure)

```typescript
/**
 * Récupère et valide les articles du feed featured Wikimedia pour une date et une langue.
 *
 * Appel : https://{lang}.wikipedia.org/api/rest_v1/feed/featured/{YYYY}/{MM}/{DD}
 * Timeout : 5s via AbortController (clearTimeout dans finally)
 *
 * @param lang - Langue cible
 * @param date - Date au format YYYY-MM-DD (ex: '2026-03-22')
 * @returns Tableau de FeedArticle valides, ou null en cas d'échec réseau/HTTP/JSON
 */
export async function fetchValidFeedArticles(
  lang: SupportedLanguage,
  date: string,
): Promise<FeedArticle[] | null>;
```

Pattern AbortController obligatoire (clearTimeout dans `finally` — point de vigilance récurrent).

### 5.5 Fonction de pré-calcul

```typescript
/**
 * Calcule la paire du défi du jour pour une langue et une date cible.
 * Tente le feed/featured — si pool insuffisant (< MIN_NEWS_POOL_SIZE), retourne null.
 *
 * @param lang       - Langue cible
 * @param targetDate - Date au format YYYY-MM-DD (ex: '2026-03-22' pour J+1)
 * @param hash       - Hash djb2(targetDate + ':' + lang) pour la sélection déterministe
 * @returns Paire {start, target} de ArticleSummaryResponse, ou null si pool insuffisant
 */
export async function computeDailyChallengeFromNews(
  lang: SupportedLanguage,
  targetDate: string,
  hash: number,
): Promise<{ start: ArticleSummaryResponse; target: ArticleSummaryResponse } | null>;
```

Logique interne :
1. `fetchValidFeedArticles(lang, targetDate)` → si `null` ou longueur < `MIN_NEWS_POOL_SIZE` → retourne `null`
2. Filtrer avec `isValidFeedArticle` → si pool filtré < 2 → retourne `null`
3. `selectNewsPair(validTitles, hash)` → si `null` → retourne `null`
4. `fetchArticleSummary(titleStart, lang)` + `fetchArticleSummary(titleTarget, lang)` en `Promise.all` (timeout 3s)
5. Si l'un des deux est `null` → retourne `null`
6. Retourne `{ start, target }`

Note : `fetchArticleSummary` existe déjà dans `game.route.ts` mais est non exportée. Julien doit soit l'extraire dans un fichier utilitaire partagé (`apps/backend/src/utils/wikipedia.utils.ts`), soit la dupliquer. **Recommandation** : extraire dans `wikipedia.utils.ts` pour éviter la duplication — cette extraction fait partie du scope F3-51.

## 6. Route admin

**Fichier** : `apps/backend/src/routes/admin.route.ts` (à créer)

### Contrat

```
POST /api/admin/daily-challenges/precompute
```

**Query params** : aucun (calcule toujours J+1 pour toutes les langues supportées)

**Body** : vide

**Réponses** :
- `200` : `{ date: string, results: Array<{ lang: string, status: 'ok' | 'fallback' | 'error', source?: string }> }`
- `500` : `{ success: false, error: { code: string, message: string } }`

### Logique

Pour chaque langue dans `SUPPORTED_LANGUAGES` :
1. Calculer `targetDate` = demain en UTC (`getTodayUTC()` + 1 jour)
2. `hash = djb2Hash(targetDate + ':' + lang)`
3. `computeDailyChallengeFromNews(lang, targetDate, hash)` → si `{ start, target }` :
   - Insérer dans `daily_challenges` via `INSERT ... ON CONFLICT (date, lang) DO UPDATE SET ...`
   - `status: 'ok'`, `source: 'news'`
4. Si `null` (pool insuffisant pour cette langue) :
   - `status: 'fallback'` — pas d'insertion en base (le fallback hash+pageviews sera utilisé)
5. Si exception → `status: 'error'`

**Schéma Zod de réponse** :
```typescript
const precomputeResponseSchema = z.object({
  date: z.string(),
  results: z.array(z.object({
    lang: z.string(),
    status: z.enum(['ok', 'fallback', 'error']),
    source: z.string().optional(),
  })),
});
```

### Enregistrement dans routes/index.ts

```typescript
import { adminRoutes } from './admin.route';
// ...
void app.register(adminRoutes);
```

## 7. Modification GET /api/game/daily

**Fichier** : `apps/backend/src/routes/game.route.ts`

Avant le calcul hash+pageviews existant, interroger la table `daily_challenges` :

```typescript
// 1. Tenter la lecture depuis daily_challenges
const rows = await query<DailyChallengeRow>(
  'SELECT start_article, target_article FROM daily_challenges WHERE date = $1 AND lang = $2',
  [date, lang],
);

const row = rows[0];
if (row !== undefined) {
  // Parser et valider start_article et target_article avec Zod articleSummarySchema
  const startParsed = articleSummarySchema.safeParse(row.start_article);
  const targetParsed = articleSummarySchema.safeParse(row.target_article);

  if (startParsed.success && targetParsed.success) {
    return reply.code(200).send({
      date,
      start: startParsed.data,
      target: targetParsed.data,
    });
  }
  // Données corrompues → log warn + fallback
  request.log.warn({ lang, date }, 'daily: données corrompues en base — fallback hash+pageviews');
}

// 2. Fallback hash+pageviews (comportement existant inchangé)
// ... code existant ...
```

Import `query` et `DailyChallengeRow` depuis `db/index.ts` et `db/schema.ts`.

## 8. TDD — récapitulatif fonctions pures

| Fonction | Fichier | TDD obligatoire |
|----------|---------|----------------|
| `extractArticlesFromFeed` | `daily-news.service.ts` | Oui — tests avant code |
| `isValidFeedArticle` | `daily-news.service.ts` | Oui — tests avant code |
| `selectNewsPair` | `daily-news.service.ts` | Oui — tests avant code |

**Tests d'intégration** (alongside) :
- `GET /api/game/daily` : cas nominal (paire en base), cas fallback (pas de paire en base), cas données corrompues
- `POST /api/admin/daily-challenges/precompute` : cas succès (pool suffisant), cas fallback (pool insuffisant), cas échec API Wikimedia (mock)

## 9. Critères de qualité (PR review)

- [ ] Migration `002_daily_challenges.sql` correcte — PRIMARY KEY (date, lang), JSONB pour les articles
- [ ] `DailyChallengeRow` dans `schema.ts`
- [ ] `fetchArticleSummary` extraite dans `wikipedia.utils.ts` (plus de duplication)
- [ ] Les 3 fonctions pures ont leurs tests écrits AVANT l'implémentation (commits vérifiables)
- [ ] `fetchValidFeedArticles` : AbortController + clearTimeout dans `finally`
- [ ] Route admin : `INSERT ... ON CONFLICT DO UPDATE` (idempotent — rejeu safe)
- [ ] `GET /api/game/daily` : validation Zod des JSONB lus depuis la base avant envoi
- [ ] Jamais d'interpolation SQL — paramètres `$1`, `$2` systématiquement
- [ ] Tests d'intégration : cas nominal + cas fallback
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur

## 10. Points de vigilance

- **Zod + fastify-type-provider-zod v6** : imports `from 'zod/v4'` (point de vigilance projet #8 — MEMORY.md).
- **`noUncheckedIndexedAccess`** : `rows[0]` retourne `DailyChallengeRow | undefined` — guard obligatoire avant usage.
- **Feed featured langue** : l'URL cible `https://{lang}.wikipedia.org/api/rest_v1/feed/featured/{YYYY}/{MM}/{DD}`. Pour `en`, le feed est complet. Pour les autres langues, le feed peut retourner un objet vide ou sans section `news` — `extractArticlesFromFeed` doit gérer ce cas gracieusement (`[]`).
- **Date J+1** : la route admin calcule `targetDate` comme demain UTC. Formule : `new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)` — ou utiliser `getTodayUTC()` et calculer J+1 proprement.
- **ON CONFLICT DO UPDATE** : permet le rejeu de la route admin sans créer de doublon. Mettre à jour `start_article`, `target_article`, `source`, `created_at = NOW()`.
- **Pas d'authentification** sur la route admin en Phase 3 — documenter ce choix dans le code (commentaire explicite).
