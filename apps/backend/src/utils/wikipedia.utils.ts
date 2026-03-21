/**
 * wikipedia.utils.ts — Utilitaire partagé pour les appels Wikipedia REST API
 *
 * Expose fetchArticleSummary, extraite depuis game.route.ts (F3-51).
 * Utilisée par :
 * - game.route.ts (random-pair, daily)
 * - daily-news.service.ts (computeDailyChallengeFromNews)
 *
 * Référence : docs/specs/F3-51-daily-challenge-news-precalculated.md — Section 5.5
 */

import type { SUPPORTED_LANGUAGES } from '@wikihop/shared';

import type { ArticleSummaryResponse } from '../routes/game.route';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const WIKIPEDIA_TIMEOUT_MS = 3_000;
const EXTRACT_MIN_LENGTH = 200;
export const WIKIPEDIA_USER_AGENT = 'WikiHop/1.0 (contact@wikihop.app)';

// ---------------------------------------------------------------------------
// Type interne — réponse Wikipedia REST /page/summary/{title}
// ---------------------------------------------------------------------------

type SupportedLang = (typeof SUPPORTED_LANGUAGES)[number];

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

// ---------------------------------------------------------------------------
// fetchArticleSummary
// ---------------------------------------------------------------------------

/**
 * Appelle GET https://{lang}.wikipedia.org/api/rest_v1/page/summary/{encodedTitle}
 * avec un timeout de 3 secondes.
 *
 * Retourne l'ArticleSummaryResponse si l'article est valide (HTTP 200, extract > 200 chars).
 * Retourne null si l'article est invalide (ébauche, timeout, HTTP non-200, JSON malformé).
 */
export async function fetchArticleSummary(
  title: string,
  lang: SupportedLang,
): Promise<ArticleSummaryResponse | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, WIKIPEDIA_TIMEOUT_MS);

  try {
    const encodedTitle = encodeURIComponent(title);
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodedTitle}`;

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': WIKIPEDIA_USER_AGENT,
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

    if (!isWikipediaSummaryResponse(parsed)) {
      return null;
    }

    const extract = parsed.extract ?? '';

    // Critère non-ébauche : extract doit dépasser EXTRACT_MIN_LENGTH caractères
    if (extract.length <= EXTRACT_MIN_LENGTH) {
      return null;
    }

    const contentUrls = parsed.content_urls.desktop;
    const articleUrl = contentUrls.page;

    const result: ArticleSummaryResponse = {
      id: String(parsed.pageid),
      title: parsed.title,
      url: articleUrl,
      language: lang,
      extract,
    };

    if (parsed.thumbnail?.source !== undefined) {
      result.thumbnailUrl = parsed.thumbnail.source;
    }

    return result;
  } catch (error: unknown) {
    // AbortError (timeout) ou erreur réseau — retourne null silencieusement
    void error;
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
