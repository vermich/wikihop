---
id: M-02
title: Génération d'une paire d'articles aléatoires (backend)
phase: 2-MVP
priority: Must
agents: [Backend Dev]
status: in-progress
created: 2026-02-28
completed:
---

# M-02 — Génération d'une paire d'articles aléatoires (backend)

## User Story
En tant que joueur, je veux recevoir deux articles Wikipedia aléatoires et différents pour chaque nouvelle partie, afin de toujours avoir un défi unique.

## Critères d'acceptance
- [ ] Endpoint `GET /api/game/random-pair` retourne `{ start: Article, target: Article }`
- [ ] Les deux articles sont distincts
- [ ] Les articles sont des articles encyclopédiques (pas des pages de catégorie, portail, aide)
- [ ] Les articles ont un contenu suffisant (non-ébauche) — critère à définir avec Tech Lead
- [ ] Le temps de réponse est inférieur à 2 secondes (p95)
- [ ] L'endpoint gère les erreurs Wikipedia API (timeout, 404) et retourne un code d'erreur approprié

## Notes de réalisation

### Spécifications techniques — Julien (Backend Dev)

Story de référence : `docs/stories/M-02-random-pair-api.md`
ADR de référence : ADR-002 (stack), ADR-004 (CI)

---

#### 1. Nouveau type partagé — `ArticleSummary`

Ajouter dans `packages/shared/src/types/index.ts` (après l'interface `Article`) :

```typescript
/**
 * Résumé d'un article Wikipedia retourné par l'API REST (/page/summary/{title}).
 * Utilisé par M-02 (backend) et M-08 (mobile) comme type de contrat commun.
 */
export interface ArticleSummary {
  /** pageid Wikipedia */
  id: string;
  /** Titre affiché */
  title: string;
  /** URL canonique de l'article */
  url: string;
  /** Langue de l'article */
  language: Language;
  /** Extrait texte brut (premier paragraphe, > 200 chars si article non-ébauche) */
  extract: string;
  /** URL de l'image de couverture (thumbnail), absente si article sans image) */
  thumbnailUrl?: string;
}
```

`ArticleSummary` remplace `Article` pour les réponses de l'endpoint M-02 — il étend `Article` avec les champs Wikimedia REST supplémentaires. Il doit être exporté depuis le barrel `packages/shared/src/types/index.ts`.

---

#### 2. Route Fastify — `apps/backend/src/routes/game.route.ts` (nouveau fichier)

Pattern obligatoire : `.withTypeProvider<ZodTypeProvider>()` en tête de plugin (voir `health.route.ts` comme modèle).

Imports depuis `zod/v4` (pas `zod` — voir point de vigilance 8 de la mémoire agent).

**Schéma de query :**
```typescript
const randomPairQuerySchema = z.object({
  lang: z.enum(['fr', 'en']).default('fr'),
});
```

**Schéma de réponse (succès 200) :**
```typescript
const articleSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url(),
  language: z.enum(['fr', 'en']),
  extract: z.string(),
  thumbnailUrl: z.string().url().optional(),
});

const randomPairResponseSchema = z.object({
  start: articleSummarySchema,
  target: articleSummarySchema,
});
```

**Schéma d'erreur (503) :**
```typescript
const serviceUnavailableSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.literal('RANDOM_PAIR_UNAVAILABLE'),
    message: z.string(),
  }),
});
```

**Signature de la route :**
```typescript
export async function gameRoutes(instance: FastifyInstance): Promise<void> {
  const app = instance.withTypeProvider<ZodTypeProvider>();

  app.get(
    '/api/game/random-pair',
    {
      schema: {
        description: 'Retourne une paire d\'articles Wikipedia aléatoires pour démarrer une partie',
        tags: ['game'],
        querystring: randomPairQuerySchema,
        response: {
          200: randomPairResponseSchema,
          503: serviceUnavailableSchema,
        },
      },
    },
    async (request, reply) => { /* ... */ },
  );
}
```

---

#### 3. Enregistrement dans `routes/index.ts`

Ajouter après l'enregistrement de `healthRoutes` :

```typescript
import { gameRoutes } from './game.route';
// ...
void app.register(gameRoutes);
```

Pas de préfixe supplémentaire — le chemin `/api/game/random-pair` est défini directement dans la route.

---

#### 4. Logique métier de la route

La route implémente une boucle de sélection avec retentatives (max 5).

**Étape 1 — Récupération du pool :**
Appeler `getPopularPages(lang)` (importé depuis `../services/popular-pages.service`). Cette fonction retourne toujours un résultat non-vide (fallback embarqué garanti).

**Étape 2 — Sélection aléatoire :**
Sélectionner 2 titres distincts depuis `result.articles` par tirage aléatoire (`Math.random()`). Les deux titres doivent être différents.

**Étape 3 — Validation Wikipedia (par tentative) :**
Pour chaque titre sélectionné, appeler l'API Wikipedia REST :
```
GET https://{lang}.wikipedia.org/api/rest_v1/page/summary/{encodedTitle}
```
- Encoder le titre via `encodeURIComponent(title)`
- Header obligatoire : `User-Agent: WikiHop/1.0 (contact@wikihop.app)` (politique Wikimedia)
- Timeout : **3 secondes** via `AbortController` — pattern `clearTimeout` dans le `finally` (voir point de vigilance 11)
- Un article est **valide** si : réponse HTTP 200 ET `extract` présent ET `extract.length > 200`
- Un article est **invalide** si : HTTP non-200, timeout, ou `extract.length <= 200` (ébauche)

**Étape 4 — Construction de l'`ArticleSummary` depuis la réponse Wikipedia :**

La réponse JSON de `/page/summary/{title}` contient notamment :
- `pageid` → `id` (converti en `string` via `String(pageid)`)
- `title` → `title`
- `content_urls.desktop.page` → `url`
- `extract` → `extract`
- `thumbnail?.source` → `thumbnailUrl` (optionnel)
- La langue (`lang`) est injectée depuis le paramètre de query

**Étape 5 — Retentative :**
Si l'une des deux validations échoue, incrémenter le compteur et recommencer depuis l'étape 2. Après **5 tentatives** infructueuses, répondre `503` avec le body :
```json
{
  "success": false,
  "error": {
    "code": "RANDOM_PAIR_UNAVAILABLE",
    "message": "Impossible de générer une paire valide après 5 tentatives"
  }
}
```

**Log Pino à chaque tentative échouée :**
```typescript
request.log.warn({ attempt, lang, reason }, 'random-pair: tentative invalide');
```

---

#### 5. Type guard interne (non exporté)

Définir dans `game.route.ts` un type guard pour la réponse Wikipedia :

```typescript
interface WikipediaSummaryResponse {
  pageid: number;
  title: string;
  extract?: string;
  content_urls: {
    desktop: { page: string };
  };
  thumbnail?: { source: string };
}

function isWikipediaSummaryResponse(value: unknown): value is WikipediaSummaryResponse {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj['pageid'] === 'number' &&
    typeof obj['title'] === 'string' &&
    typeof obj['content_urls'] === 'object' &&
    obj['content_urls'] !== null
  );
}
```

---

#### 6. Tests — `apps/backend/__tests__/routes/game.route.test.ts`

Utiliser Supertest + `buildApp()` (pattern existant dans les tests de health).

**Cas à couvrir :**

| Cas | Comportement attendu |
|-----|---------------------|
| `GET /api/game/random-pair` (sans param) | 200, `lang` défaut `'fr'`, `start !== target` |
| `GET /api/game/random-pair?lang=en` | 200, articles en langue `'en'` |
| `GET /api/game/random-pair?lang=de` | 400 (validation Zod — lang invalide) |
| Wikipedia API renvoie toujours des ébauches | 503 avec code `RANDOM_PAIR_UNAVAILABLE` |
| Wikipedia API timeout (AbortController) | tentative comptabilisée, retry |

Mocker `getPopularPages` et `fetch` global dans les tests. Ne jamais appeler la vraie API Wikimedia en CI.

**Structure de mock recommandée :**
```typescript
jest.mock('../../src/services/popular-pages.service', () => ({
  getPopularPages: jest.fn(),
}));

// Pour fetch : utiliser jest.spyOn(global, 'fetch')
```

**Seuil de coverage :** ≥ 70 % sur `game.route.ts` (logique de retry, validation, construction ArticleSummary).

---

#### 7. Points de vigilance

1. **`noUncheckedIndexedAccess`** : tout accès `articles[i]` retourne `string | undefined` — vérifier avant usage.
2. **`AbortController` + `clearTimeout`** : le `clearTimeout` doit être dans le `finally` pour couvrir les erreurs réseau précoces (voir point de vigilance 11 de la mémoire agent).
3. **Pas d'interpolation SQL** : sans objet — pas de BDD dans cette route. Mais aucune interpolation de titre dans les URLs sans `encodeURIComponent`.
4. **`zod/v4`** : importer exclusivement depuis `'zod/v4'`, jamais depuis `'zod'` (voir point de vigilance 8).
5. **Performance p95 < 2s** : avec un timeout Wikipedia à 3s et max 5 tentatives séquentielles, le worst case est ~15s. Pour respecter le p95 < 2s du critère d'acceptance, les deux appels Wikipedia de la tentative 1 doivent être faits **en parallèle** (`Promise.all`) et non séquentiellement.
6. **Exports nommés** : `gameRoutes` en export nommé (pas de `export default`).

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
