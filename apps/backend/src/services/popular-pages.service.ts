/**
 * popular-pages.service.ts — Service de récupération des pages populaires Wikipedia
 *
 * Stratégie hybride :
 *   1. Appel à l'API Wikimedia Pageviews (timeout 3s via AbortController)
 *   2. Fallback sur le fichier JSON statique embarqué si l'API est inaccessible
 *
 * Ce service est interne — il est consommé par la route /api/game/random-pair (M-02).
 * Aucune route HTTP n'est exposée ici à ce stade.
 *
 * Référence : docs/stories/M-16-popular-pages-strategy.md — Partie A
 */

import popularPagesData from '../assets/popular-pages.json';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PopularPagesResult {
  /** Titres normalisés (espaces, filtrés) */
  articles: string[];
  language: 'fr' | 'en';
  source: 'wikimedia' | 'fallback';
}

/** Type inféré automatiquement depuis le JSON embarqué */
type PopularPagesData = { fr: string[]; en: string[] };

// Assertion de type nécessaire car TypeScript infère le type littéral du JSON
const fallbackData = popularPagesData as PopularPagesData;

// ---------------------------------------------------------------------------
// Schéma de réponse Wikimedia (structure partielle — on ne parse que ce qu'on utilise)
// ---------------------------------------------------------------------------

interface WikimediaArticleEntry {
  article: string;
  views: number;
  rank: number;
}

interface WikimediaPageviewsItem {
  project: string;
  access: string;
  year: string;
  month: string;
  day: string;
  articles: WikimediaArticleEntry[];
}

interface WikimediaPageviewsResponse {
  items: WikimediaPageviewsItem[];
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const WIKIMEDIA_TIMEOUT_MS = 3_000;

/**
 * Préfixes et termes à exclure pour ne conserver que les articles encyclopédiques jouables.
 * Insensible à la casse (comparaison via .toLowerCase()).
 */
const EXCLUDED_PREFIXES = [
  // Namespaces français
  'Portail:',
  'Catégorie:',
  'Aide:',
  'Wikipédia:',
  'Liste des ',
  'Liste de ',
  'Modèle:',
  'Spécial:',
  'Fichier:',
  // Namespaces anglais
  'Portal:',
  'Category:',
  'Help:',
  'Wikipedia:',
  'List of ',
  'Template:',
  'Special:',
  'File:',
] as const;

// ---------------------------------------------------------------------------
// Fonctions utilitaires (non exportées)
// ---------------------------------------------------------------------------

/**
 * Détermine si un titre (après normalisation underscores → espaces) est un article jouable.
 * Exclut les namespaces non-encyclopédiques et les pages spéciales.
 */
function isPlayableArticle(title: string): boolean {
  const normalized = title.replace(/_/g, ' ');
  return (
    !EXCLUDED_PREFIXES.some((prefix) =>
      normalized.toLowerCase().startsWith(prefix.toLowerCase()),
    ) &&
    normalized !== 'Accueil' &&
    normalized !== 'Main Page'
  );
}

/**
 * Calcule l'URL de l'API Wikimedia Pageviews pour le mois précédent.
 *
 * On cible le mois précédent car le mois en cours n'a pas encore de données
 * complètes pour le jour "all-days".
 *
 * Format : https://{lang}.wikipedia.org/api/rest_v1/metrics/pageviews/top/{lang}.wikipedia/all-access/{YYYY}/{MM}/all-days
 */
function buildWikimediaUrl(lang: 'fr' | 'en'): string {
  const now = new Date();
  // Mois précédent : si janvier (mois 0), on recule sur décembre de l'année précédente
  const targetDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = targetDate.getFullYear().toString();
  // Padding mois sur 2 chiffres (01, 02, …, 12)
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');

  return `https://${lang}.wikipedia.org/api/rest_v1/metrics/pageviews/top/${lang}.wikipedia/all-access/${year}/${month}/all-days`;
}

/**
 * Vérifie que la valeur parsée correspond bien à la structure attendue de l'API Wikimedia.
 * Guard de type minimal — on ne valide que la présence des champs critiques.
 */
function isWikimediaResponse(value: unknown): value is WikimediaPageviewsResponse {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (!Array.isArray(obj['items'])) return false;
  const firstItem = obj['items'][0] as Record<string, unknown> | undefined;
  if (firstItem === undefined) return false;
  if (!Array.isArray(firstItem['articles'])) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Interface publique du service
// ---------------------------------------------------------------------------

/**
 * Récupère les pages populaires depuis l'API Wikimedia Pageviews.
 *
 * Retourne `null` en cas d'erreur (timeout, réseau, HTTP non-2xx, JSON malformé).
 * Le caller est responsable du fallback.
 *
 * @param language - Langue Wikipedia cible ('fr' | 'en')
 * @param limit    - Nombre maximum d'articles à retourner (défaut : 200)
 */
export async function fetchPopularPagesFromWikimedia(
  language: 'fr' | 'en',
  limit = 200,
): Promise<string[] | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, WIKIMEDIA_TIMEOUT_MS);

  try {
    const url = buildWikimediaUrl(language);
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      // Erreur HTTP (4xx, 5xx) — on retourne null pour déclencher le fallback
      return null;
    }

    let parsed: unknown;
    try {
      parsed = await response.json() as unknown;
    } catch {
      // JSON malformé
      return null;
    }

    if (!isWikimediaResponse(parsed)) {
      return null;
    }

    // noUncheckedIndexedAccess : items[0] peut être undefined — vérifié par isWikimediaResponse
    const firstItem = parsed.items[0];
    if (firstItem === undefined) {
      return null;
    }

    const articles = firstItem.articles
      .filter((entry) => isPlayableArticle(entry.article))
      .slice(0, limit)
      .map((entry) => entry.article.replace(/_/g, ' '));

    return articles;
  } catch (error: unknown) {
    // AbortError (timeout) ou erreur réseau — on retourne null silencieusement
    // Le logger Pino n'est pas accessible ici (service sans instance Fastify).
    // Le caller est responsable du logging contextuel.
    void error; // Erreur intentionnellement absorbée — le fallback prend le relais
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Retourne les pages populaires depuis le fichier JSON statique embarqué.
 *
 * Ne peut pas échouer : les données sont embarquées au moment du build.
 *
 * @param language - Langue cible ('fr' | 'en')
 */
export function getPopularPagesFromFallback(language: 'fr' | 'en'): string[] {
  return fallbackData[language];
}

/**
 * Stratégie hybride : tente l'API Wikimedia d'abord, bascule sur le JSON statique en cas d'échec.
 *
 * Retourne toujours un résultat non vide (garanti par le fallback embarqué).
 *
 * @param language - Langue cible ('fr' | 'en')
 * @param limit    - Nombre maximum d'articles (défaut : 200)
 */
export async function getPopularPages(
  language: 'fr' | 'en',
  limit = 200,
): Promise<PopularPagesResult> {
  const wikimediaArticles = await fetchPopularPagesFromWikimedia(language, limit);

  if (wikimediaArticles !== null && wikimediaArticles.length > 0) {
    return {
      articles: wikimediaArticles,
      language,
      source: 'wikimedia',
    };
  }

  // Fallback sur le JSON statique
  const fallbackArticles = getPopularPagesFromFallback(language);

  return {
    articles: fallbackArticles.slice(0, limit),
    language,
    source: 'fallback',
  };
}
