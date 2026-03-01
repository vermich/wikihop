---
id: M-08
title: Service Wikipedia API (client mobile)
phase: 2-MVP
priority: Must
agents: [Frontend Dev, Backend Dev]
status: in-progress
created: 2026-02-28
completed:
---

# M-08 — Service Wikipedia API (client mobile)

## User Story
En tant que développeur, je veux un service centralisé pour appeler l'API Wikipedia, afin de gérer les erreurs, le cache et les timeouts de manière cohérente.

## Critères d'acceptance
- [ ] Service `WikipediaService` dans `apps/mobile/src/services/`
- [ ] Méthodes : `getArticleSummary(title)`, `getArticleContent(title)`, `extractInternalLinks(html)`
- [ ] Timeout configuré (ex : 10 secondes) avec message d'erreur explicite
- [ ] Cache en mémoire des articles déjà chargés pendant la session (évite les appels redondants)
- [ ] Les appels respectent le `User-Agent` recommandé par Wikimedia (`WikiHop/1.0`)
- [ ] Les erreurs 404 (article non trouvé) sont distinguées des erreurs réseau

## Notes de réalisation

### Spécifications techniques — Laurent (Frontend Dev)

Story de référence : `docs/stories/M-08-wikipedia-service.md`
ADR de référence : ADR-006 (WebView, interception liens), ADR-002 (stack mobile)

---

#### 1. Prérequis — type `ArticleSummary`

Le type `ArticleSummary` est défini dans `packages/shared/src/types/index.ts` par Julien dans le cadre de M-02. Laurent doit l'importer depuis `@wikihop/shared`. **Ne pas redéfinir localement.**

```typescript
import type { ArticleSummary, Language } from '@wikihop/shared';
```

Si M-02 n'est pas encore mergé au moment d'implémenter M-08, définir un type local temporaire dans le fichier de service (commenté `// TODO: remplacer par import @wikihop/shared une fois M-02 mergé`) — à retirer avant la PR finale.

---

#### 2. Fichier — `apps/mobile/src/services/wikipedia.service.ts`

Export nommé : toutes les fonctions sont exportées nommément. Pas de classe, pas de singleton instancié — le module lui-même est le service.

**Structure du fichier :**

```
apps/mobile/src/services/wikipedia.service.ts
```

---

#### 3. Constantes et configuration

```typescript
/** Timeout par appel Wikipedia (ms) */
const WIKIPEDIA_TIMEOUT_MS = 5_000;

/** Header User-Agent obligatoire (politique Wikimedia) */
const USER_AGENT = 'WikiHop/1.0 (contact@wikihop.app)';

/** Cache mémoire : clé = `{lang}:{title}`, valeur = ArticleSummary */
const summaryCache = new Map<string, ArticleSummary>();

/** Préfixes de namespaces non jouables à filtrer (liens internes) */
const NON_PLAYABLE_PREFIXES = [
  'Portail:', 'Catégorie:', 'Aide:', 'Wikipédia:', 'Liste des ', 'Liste de ',
  'Modèle:', 'Spécial:', 'Fichier:',
  'Portal:', 'Category:', 'Help:', 'Wikipedia:', 'List of ',
  'Template:', 'Special:', 'File:',
] as const;
```

Le `summaryCache` est un module-level Map — il persiste pendant la durée de vie du module JS (= durée de la session RN, réinitialisé au redémarrage de l'app). Il ne doit pas être persisté dans AsyncStorage.

---

#### 4. Méthode `getArticleSummary`

```typescript
/**
 * Récupère le résumé d'un article Wikipedia via l'API REST.
 * Met en cache le résultat pour éviter les re-fetch pendant la session.
 *
 * @throws WikipediaNotFoundError si l'article retourne HTTP 404
 * @throws WikipediaNetworkError si timeout ou erreur réseau
 */
export async function getArticleSummary(
  title: string,
  lang: Language,
): Promise<ArticleSummary>;
```

**Comportement :**

1. Clé de cache : `${lang}:${title}` — vérifier d'abord le cache avant tout appel réseau
2. Si présent en cache : retourner directement sans appel réseau
3. URL : `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
4. Headers : `{ 'User-Agent': USER_AGENT }`
5. Timeout : 5s via `AbortController`, `clearTimeout` dans le `finally`
6. Si HTTP 404 : lever `WikipediaNotFoundError` (classe définie dans le même fichier)
7. Si HTTP non-200 (hors 404) ou erreur réseau : lever `WikipediaNetworkError`
8. Parser la réponse JSON et construire un `ArticleSummary` :
   - `id` : `String(json.pageid)`
   - `title` : `json.title`
   - `url` : `json.content_urls.desktop.page`
   - `language` : le paramètre `lang`
   - `extract` : `json.extract ?? ''`
   - `thumbnailUrl` : `json.thumbnail?.source` (optionnel)
9. Stocker dans `summaryCache` avant de retourner

**Types d'erreur à définir dans le même fichier :**

```typescript
export class WikipediaNotFoundError extends Error {
  constructor(title: string, lang: Language) {
    super(`Article non trouvé : ${title} (${lang})`);
    this.name = 'WikipediaNotFoundError';
  }
}

export class WikipediaNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WikipediaNetworkError';
  }
}
```

---

#### 5. Méthode `getArticleContent`

```typescript
/**
 * Récupère le HTML complet d'un article Wikipedia.
 * Retourne le HTML brut tel que fourni par l'API.
 * Ce HTML est destiné à être injecté dans un WebView (ADR-006).
 *
 * @throws WikipediaNotFoundError si HTTP 404
 * @throws WikipediaNetworkError si timeout ou erreur réseau
 */
export async function getArticleContent(
  title: string,
  lang: Language,
): Promise<string>;
```

**Comportement :**

1. URL : `https://${lang}.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(title)}`
2. Headers : `{ 'User-Agent': USER_AGENT }`
3. Timeout : 5s via `AbortController`, `clearTimeout` dans le `finally`
4. Si HTTP 404 : `WikipediaNotFoundError`
5. Si HTTP non-200 ou erreur réseau : `WikipediaNetworkError`
6. Retourner `response.text()` — pas de parsing, le HTML brut est retourné directement au composant WebView
7. **Pas de cache** pour le HTML — le contenu est volumineux et consommé une seule fois par le WebView

---

#### 6. Méthode `extractInternalLinks`

```typescript
/**
 * Extrait les titres d'articles jouables depuis le HTML d'un article Wikipedia.
 * Filtre les namespaces non encyclopédiques (Catégorie:, Portail:, etc.).
 * Utilisé par le composant ArticleWebView pour déterminer si un lien est navigable.
 *
 * Note : cette fonction est pure (pas d'effet de bord, pas d'appel réseau).
 * Elle peut être utilisée directement dans les tests sans mock.
 */
export function extractInternalLinks(html: string): string[];
```

**Comportement :**

1. Extraire tous les `href` commençant par `/wiki/` avec une regex :
   ```
   /href="\/wiki\/([^"#]+)"/g
   ```
   Le groupe de capture exclut les ancres (`#`) — on ne veut que les titres d'articles.

2. Décoder chaque titre : `decodeURIComponent(rawTitle).replace(/_/g, ' ')`

3. Filtrer avec la même logique que `isPlayableArticle` du backend (`popular-pages.service.ts`) :
   - Exclure tout titre commençant par un des `NON_PLAYABLE_PREFIXES`
   - Exclure `'Accueil'` et `'Main Page'`
   - Comparaison case-insensitive : `title.toLowerCase().startsWith(prefix.toLowerCase())`

4. Dédupliquer : `Array.from(new Set(titles))`

5. Retourner le tableau de titres normalisés (pas les URL complètes)

**Contrainte** : cette fonction est pure — aucun appel réseau, aucun état externe. Elle doit passer tous ses tests sans mock de `fetch`.

---

#### 7. Cache — règle de vie

Le `summaryCache` (Map module-level) a pour durée de vie la session JavaScript de l'app. Il n'est jamais persisted, jamais partagé entre sessions. Il n'est pas nécessaire de l'exposer via le store Zustand — c'est un cache de service pur.

Si un besoin d'invalidation explicite apparaît (changement de langue), ajouter une fonction `clearSummaryCache(): void` exportée. Pour M-08, elle n'est pas encore nécessaire — la langue ne change jamais en cours de session (ADR-007, verrouillage `isLanguageLocked`).

---

#### 8. Tests — `apps/mobile/__tests__/services/wikipedia.service.test.ts`

Toutes les méthodes sont testées avec `jest.spyOn(global, 'fetch')` pour mocker les appels réseau. Ne jamais appeler la vraie API Wikipedia en CI.

**Cas à couvrir par méthode :**

`getArticleSummary` :
- Retourne un `ArticleSummary` valide depuis la réponse JSON Wikipedia
- Utilise le cache au deuxième appel (fetch appelé une seule fois)
- Lève `WikipediaNotFoundError` si HTTP 404
- Lève `WikipediaNetworkError` si timeout (AbortError)
- Lève `WikipediaNetworkError` si HTTP 500

`getArticleContent` :
- Retourne le HTML brut de l'article
- Lève `WikipediaNotFoundError` si HTTP 404
- Lève `WikipediaNetworkError` si timeout

`extractInternalLinks` :
- Extrait correctement les liens `/wiki/` du HTML
- Filtre les namespaces non-jouables (`Catégorie:`, `Portail:`, etc.)
- Filtre `Accueil` et `Main Page`
- Déduplique les liens répétés
- Retourne un tableau vide si aucun lien interne
- Gère correctement les titres encodés (`%C3%A9` → `é`)

**Seuil de coverage :** ≥ 70 % sur `wikipedia.service.ts`.

---

#### 9. Points de vigilance

1. **`AbortController` + `clearTimeout` dans `finally`** : pattern obligatoire (voir point de vigilance 11 de la mémoire agent). Le `clearTimeout` dans le bloc `try` uniquement ne couvre pas les erreurs réseau précoces.
2. **`encodeURIComponent` sur les titres** : les titres Wikipedia peuvent contenir des espaces, des apostrophes, des caractères accentués.
3. **`noUncheckedIndexedAccess`** : tout accès indicé sur un tableau retourne `T | undefined` — vérifier avant usage dans `extractInternalLinks`.
4. **Séparation des erreurs** : `WikipediaNotFoundError` et `WikipediaNetworkError` sont des classes distinctes — les composants qui appellent ce service pourront les distinguer avec `instanceof` pour afficher des messages différents à l'utilisateur.
5. **Pas de `console.log`** : utiliser les classes d'erreur pour propager l'information. Aucun log dans le service lui-même — le logging est la responsabilité des appelants.
6. **Export nommé obligatoire** : pas de `export default`. Le fichier exporte `getArticleSummary`, `getArticleContent`, `extractInternalLinks`, `WikipediaNotFoundError`, `WikipediaNetworkError`.

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
