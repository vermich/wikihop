/**
 * daily-news.service.ts — Service de récupération des articles d'actualité Wikipedia
 *
 * Expose :
 * - extractArticlesFromFeed  (pure — TDD)
 * - isValidFeedArticle       (pure — TDD)
 * - selectNewsPair           (pure — TDD)
 * - fetchValidFeedArticles   (impure — appel réseau avec AbortController)
 * - computeDailyChallengeFromNews (impure — orchestre le calcul J-1)
 *
 * Note : ce service n'a pas accès à une instance Fastify — le logging est délégué
 * au caller (handler de route) qui dispose de request.log.
 *
 * Référence : docs/specs/F3-51-daily-challenge-news-precalculated.md — Section 5
 */

import type { SUPPORTED_LANGUAGES } from '@wikihop/shared';

import type { ArticleSummaryResponse } from '../routes/game.route';
import { computeDailyIndices } from '../utils/daily-challenge.utils';
import { fetchArticleSummary, WIKIPEDIA_USER_AGENT } from '../utils/wikipedia.utils';

// ---------------------------------------------------------------------------
// Types exportés
// ---------------------------------------------------------------------------

/** Article extrait depuis le feed featured — structure minimale */
export interface FeedArticle {
  title?: string;
  extract?: string;
  content_urls?: { desktop: { page: string } };
  pageid?: number;
}

/** Structure minimale de la réponse feed/featured */
export interface FeaturedFeedResponse {
  news?: Array<{ links?: FeedArticle[] }>;
  onthisday?: Array<{ pages?: FeedArticle[] }>;
}

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const MIN_EXTRACT_LENGTH = 200;
const MIN_NEWS_POOL_SIZE = 5;
const FEED_TIMEOUT_MS = 5_000;

// ---------------------------------------------------------------------------
// Fonctions pures exportées (TDD strict — tests écrits avant implémentation)
// ---------------------------------------------------------------------------

/**
 * Extrait les titres d'articles depuis une réponse feed/featured.
 * Parcourt news.links puis onthisday.pages — déduplique.
 *
 * @returns Tableau de titres (peut être vide si feed vide ou mal formé)
 */
export function extractArticlesFromFeed(feed: FeaturedFeedResponse): string[] {
  const seen = new Set<string>();
  const titles: string[] = [];

  // Parcourir news[].links[]
  for (const newsItem of feed.news ?? []) {
    for (const link of newsItem.links ?? []) {
      if (typeof link.title === 'string' && link.title.length > 0) {
        if (!seen.has(link.title)) {
          seen.add(link.title);
          titles.push(link.title);
        }
      }
    }
  }

  // Parcourir onthisday[].pages[]
  for (const dayItem of feed.onthisday ?? []) {
    for (const page of dayItem.pages ?? []) {
      if (typeof page.title === 'string' && page.title.length > 0) {
        if (!seen.has(page.title)) {
          seen.add(page.title);
          titles.push(page.title);
        }
      }
    }
  }

  return titles;
}

/**
 * Vérifie qu'un article extrait du feed est jouable (non-ébauche, URL présente).
 *
 * Critères :
 * - title présent et non vide
 * - extract présent et longueur > MIN_EXTRACT_LENGTH (strictement)
 * - content_urls.desktop.page présent
 */
export function isValidFeedArticle(article: FeedArticle): boolean {
  if (typeof article.title !== 'string' || article.title.length === 0) {
    return false;
  }

  if (typeof article.extract !== 'string' || article.extract.length <= MIN_EXTRACT_LENGTH) {
    return false;
  }

  if (
    article.content_urls === undefined ||
    typeof article.content_urls.desktop?.page !== 'string'
  ) {
    return false;
  }

  return true;
}

/**
 * Sélectionne une paire déterministe depuis un pool de titres.
 *
 * @param titles - Pool de titres valides (doit avoir longueur >= 2)
 * @param hash   - Hash djb2 de la date+lang (issu de djb2Hash)
 * @returns Tuple [titleStart, titleTarget] ou null si pool insuffisant
 */
export function selectNewsPair(titles: string[], hash: number): [string, string] | null {
  if (titles.length < 2) {
    return null;
  }

  const [idxStart, idxTarget] = computeDailyIndices(hash, titles.length);

  const titleStart = titles[idxStart];
  const titleTarget = titles[idxTarget];

  if (titleStart === undefined || titleTarget === undefined) {
    return null;
  }

  return [titleStart, titleTarget];
}

// ---------------------------------------------------------------------------
// Fonctions impures
// ---------------------------------------------------------------------------

/**
 * Type guard pour la réponse du feed featured Wikimedia.
 */
function isFeaturedFeedResponse(value: unknown): value is FeaturedFeedResponse {
  if (typeof value !== 'object' || value === null) return false;
  return true; // Structure minimale — les champs news/onthisday peuvent être absents
}

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
): Promise<FeedArticle[] | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, FEED_TIMEOUT_MS);

  try {
    // Construire l'URL : YYYY/MM/DD séparés
    const [year, month, day] = date.split('-');
    const url = `https://${lang}.wikipedia.org/api/rest_v1/feed/featured/${year}/${month}/${day}`;

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': WIKIPEDIA_USER_AGENT,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    let parsed: unknown;
    try {
      parsed = (await response.json()) as unknown;
    } catch {
      return null;
    }

    if (!isFeaturedFeedResponse(parsed)) {
      return null;
    }

    // Extraire tous les titres, puis récupérer les articles complets
    // Note : le feed ne contient pas toujours l'extract — on filtre avec isValidFeedArticle
    // Pour les articles avec extract disponible dans le feed, on les retourne directement.
    // Les articles sans extract seront filtrés par isValidFeedArticle dans computeDailyChallengeFromNews.
    const allArticles: FeedArticle[] = [];

    for (const newsItem of parsed.news ?? []) {
      for (const link of newsItem.links ?? []) {
        if (typeof link.title === 'string' && link.title.length > 0) {
          allArticles.push(link);
        }
      }
    }

    for (const dayItem of parsed.onthisday ?? []) {
      for (const page of dayItem.pages ?? []) {
        if (typeof page.title === 'string' && page.title.length > 0) {
          allArticles.push(page);
        }
      }
    }

    return allArticles;
  } catch (error: unknown) {
    // AbortError (timeout) ou erreur réseau — retourne null silencieusement
    void error;
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Calcule la paire du défi du jour pour une langue et une date cible.
 * Tente le feed/featured — si pool insuffisant (< MIN_NEWS_POOL_SIZE), retourne null.
 *
 * Logique :
 * 1. fetchValidFeedArticles → null ou vide → null
 * 2. filtrer isValidFeedArticle → pool < 2 → null
 * 3. selectNewsPair → null → null
 * 4. fetchArticleSummary en parallèle pour les 2 titres (timeout 3s)
 * 5. Si l'un est null → null
 * 6. Retourne { start, target }
 *
 * @param lang       - Langue cible
 * @param targetDate - Date au format YYYY-MM-DD (ex: '2026-03-22' pour J+1)
 * @param hash       - Hash djb2(targetDate + ':' + lang) pour la sélection déterministe
 * @returns Paire { start, target } ou null si pool insuffisant
 */
export async function computeDailyChallengeFromNews(
  lang: SupportedLanguage,
  targetDate: string,
  hash: number,
): Promise<{ start: ArticleSummaryResponse; target: ArticleSummaryResponse } | null> {
  // 1. Récupérer les articles du feed
  const feedArticles = await fetchValidFeedArticles(lang, targetDate);

  if (feedArticles === null || feedArticles.length < MIN_NEWS_POOL_SIZE) {
    return null;
  }

  // 2. Filtrer les articles valides (non-ébauches avec extract et URL)
  const validArticles = feedArticles.filter(isValidFeedArticle);

  if (validArticles.length < 2) {
    return null;
  }

  // 3. Sélectionner une paire déterministe
  const validTitles = validArticles
    .map((a) => a.title)
    .filter((t): t is string => typeof t === 'string');

  const pair = selectNewsPair(validTitles, hash);

  if (pair === null) {
    return null;
  }

  const [titleStart, titleTarget] = pair;

  // 4. Récupérer les résumés en parallèle
  const [start, target] = await Promise.all([
    fetchArticleSummary(titleStart, lang),
    fetchArticleSummary(titleTarget, lang),
  ]);

  // 5. Si l'un des deux est null → pool insuffisant pour cette langue
  if (start === null || target === null) {
    return null;
  }

  return { start, target };
}
