/**
 * WikipediaService — WikiHop Mobile — Phase 2 (M-08)
 *
 * Service centralisé pour les appels à l'API REST Wikipedia.
 * Gère le cache mémoire session, les timeouts, et les erreurs typées.
 *
 * Références :
 *   ADR-002 : Stack mobile (fetch natif RN)
 *   ADR-006 : WebView — interception des liens
 *   Story   : docs/stories/M-08-wikipedia-service.md
 *
 * Conventions :
 *   - Exports nommés uniquement (pas de classe, pas de singleton instancié)
 *   - Header User-Agent obligatoire sur tous les appels (politique Wikimedia)
 *   - Cache mémoire session-level pour les résumés (Map module-level)
 *   - Pas de cache pour le HTML (contenu volumineux, consommé une seule fois)
 *   - Timeout 5s via AbortController + clearTimeout dans finally
 *   - Erreurs typées : WikipediaNotFoundError (404) et WikipediaNetworkError
 */

import type { ArticleSummary, Language } from '@wikihop/shared';

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

/** Timeout par appel Wikipedia (ms) */
const WIKIPEDIA_TIMEOUT_MS = 5_000;

/** Header User-Agent obligatoire (politique Wikimedia) */
const USER_AGENT = 'WikiHop/1.0 (contact@wikihop.app)';

/**
 * Cache mémoire des résumés d'articles.
 * Clé : `${lang}:${title}` — valeur : ArticleSummary.
 * Durée de vie : session JavaScript (= durée de vie du module RN, réinitialisé au redémarrage).
 * Jamais persisté dans AsyncStorage (ADR-005 : seules les données de jeu/langue sont persistées).
 */
const summaryCache = new Map<string, ArticleSummary>();

/**
 * Préfixes de namespaces non jouables à filtrer dans extractInternalLinks.
 * Ces namespaces correspondent à des pages de maintenance ou méta Wikipedia,
 * pas à des articles encyclopédiques navigables dans le jeu.
 */
const NON_PLAYABLE_PREFIXES = [
  'Portail:',
  'Catégorie:',
  'Aide:',
  'Wikipédia:',
  'Liste des ',
  'Liste de ',
  'Modèle:',
  'Spécial:',
  'Fichier:',
  'Portal:',
  'Category:',
  'Help:',
  'Wikipedia:',
  'List of ',
  'Template:',
  'Special:',
  'File:',
] as const;

/** Titres exacts non jouables (pages d'accueil) */
const NON_PLAYABLE_EXACT = ['Accueil', 'Main Page'] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Types d'erreur
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Levée quand l'API Wikipedia retourne HTTP 404 (article inexistant).
 * Les composants peuvent distinguer ce cas avec `instanceof WikipediaNotFoundError`
 * pour afficher un message "Article introuvable" approprié.
 */
export class WikipediaNotFoundError extends Error {
  constructor(title: string, lang: Language) {
    super(`Article non trouvé : ${title} (${lang})`);
    this.name = 'WikipediaNotFoundError';
  }
}

/**
 * Levée en cas de timeout (AbortError) ou d'erreur réseau générique.
 * Également levée pour les codes HTTP non-200 qui ne sont pas un 404.
 */
export class WikipediaNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WikipediaNetworkError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Type interne pour la réponse brute de l'API Wikipedia /page/summary
// ─────────────────────────────────────────────────────────────────────────────

interface WikipediaSummaryApiResponse {
  pageid: number;
  title: string;
  extract?: string;
  content_urls: {
    desktop: {
      page: string;
    };
  };
  thumbnail?: {
    source: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// getArticleSummary
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Récupère le résumé d'un article Wikipedia via l'API REST.
 * Met en cache le résultat pour éviter les re-fetch pendant la session.
 *
 * @param title - Titre de l'article (non encodé, ex : "Tour Eiffel")
 * @param lang  - Langue Wikipedia ('fr' ou 'en')
 * @returns     ArticleSummary avec id, title, url, language, extract, thumbnailUrl
 *
 * @throws WikipediaNotFoundError si l'article retourne HTTP 404
 * @throws WikipediaNetworkError  si timeout (5s) ou erreur réseau
 */
export async function getArticleSummary(
  title: string,
  lang: Language,
): Promise<ArticleSummary> {
  const cacheKey = `${lang}:${title}`;

  // Vérification du cache avant tout appel réseau
  const cached = summaryCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WIKIPEDIA_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });

    if (response.status === 404) {
      throw new WikipediaNotFoundError(title, lang);
    }

    if (!response.ok) {
      throw new WikipediaNetworkError(
        `Erreur Wikipedia HTTP ${response.status} pour l'article "${title}" (${lang})`,
      );
    }

    const json = (await response.json()) as WikipediaSummaryApiResponse;

    const summary: ArticleSummary = {
      id: String(json.pageid),
      title: json.title,
      url: json.content_urls.desktop.page,
      language: lang,
      extract: json.extract ?? '',
      ...(json.thumbnail !== undefined ? { thumbnailUrl: json.thumbnail.source } : {}),
    };

    // Stockage en cache avant de retourner
    summaryCache.set(cacheKey, summary);

    return summary;
  } catch (error: unknown) {
    // Relancer les erreurs WikiHop telles quelles (NotFound et Network déjà typées)
    if (error instanceof WikipediaNotFoundError || error instanceof WikipediaNetworkError) {
      throw error;
    }

    // AbortError : timeout déclenché par AbortController
    if (error instanceof Error && error.name === 'AbortError') {
      throw new WikipediaNetworkError(
        `Timeout (${WIKIPEDIA_TIMEOUT_MS}ms) lors du chargement de "${title}" (${lang})`,
      );
    }

    // Erreur réseau générique (ex : pas de connexion)
    const message = error instanceof Error ? error.message : 'Erreur réseau inconnue';
    throw new WikipediaNetworkError(message);
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getArticleContent
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Récupère le HTML complet d'un article Wikipedia.
 * Retourne le HTML brut tel que fourni par l'API — destiné à être injecté dans un WebView (ADR-006).
 * Pas de cache : le HTML est volumineux et consommé une seule fois par le WebView.
 *
 * @param title - Titre de l'article (non encodé)
 * @param lang  - Langue Wikipedia ('fr' ou 'en')
 * @returns     HTML brut de l'article
 *
 * @throws WikipediaNotFoundError si HTTP 404
 * @throws WikipediaNetworkError  si timeout (5s) ou erreur réseau
 */
export async function getArticleContent(
  title: string,
  lang: Language,
): Promise<string> {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(title)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WIKIPEDIA_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });

    if (response.status === 404) {
      throw new WikipediaNotFoundError(title, lang);
    }

    if (!response.ok) {
      throw new WikipediaNetworkError(
        `Erreur Wikipedia HTTP ${response.status} pour le contenu de "${title}" (${lang})`,
      );
    }

    // Retourne le HTML brut — pas de parsing, le WebView le consomme directement
    return response.text();
  } catch (error: unknown) {
    if (error instanceof WikipediaNotFoundError || error instanceof WikipediaNetworkError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new WikipediaNetworkError(
        `Timeout (${WIKIPEDIA_TIMEOUT_MS}ms) lors du chargement du contenu de "${title}" (${lang})`,
      );
    }

    const message = error instanceof Error ? error.message : 'Erreur réseau inconnue';
    throw new WikipediaNetworkError(message);
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// extractInternalLinks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extrait les titres d'articles jouables depuis le HTML d'un article Wikipedia.
 *
 * Filtre les namespaces non encyclopédiques (Catégorie:, Portail:, etc.)
 * et les pages d'accueil (Accueil, Main Page).
 *
 * Utilisé par le composant ArticleWebView pour déterminer si un lien est navigable.
 *
 * Note : cette fonction est pure — pas d'effet de bord, pas d'appel réseau.
 *        Elle peut être testée directement sans mock de fetch.
 *
 * @param html - HTML brut d'un article Wikipedia (retourné par getArticleContent)
 * @returns    Tableau de titres d'articles jouables, dédupliqués
 */
export function extractInternalLinks(html: string): string[] {
  // Regex qui capture les titres d'articles dans les href="/wiki/{titre}"
  // On exclut les ancres (#) pour ne capturer que les titres d'articles
  const wikiLinkRegex = /href="\/wiki\/([^"#]+)"/g;

  const titles: string[] = [];
  let match: RegExpExecArray | null;

  // Extraction de tous les matches
  while ((match = wikiLinkRegex.exec(html)) !== null) {
    // noUncheckedIndexedAccess : match[1] peut être undefined selon TS strict
    const rawTitle = match[1];
    if (rawTitle === undefined) {
      continue;
    }

    // Décodage de l'URL et remplacement des underscores par des espaces
    let decodedTitle: string;
    try {
      decodedTitle = decodeURIComponent(rawTitle).replace(/_/g, ' ');
    } catch {
      // Titre malformé (encodage invalide) : on ignore
      continue;
    }

    // Filtrage des titres exacts non jouables (pages d'accueil)
    if ((NON_PLAYABLE_EXACT as readonly string[]).includes(decodedTitle)) {
      continue;
    }

    // Filtrage des namespaces non jouables
    const isNonPlayable = NON_PLAYABLE_PREFIXES.some((prefix) =>
      decodedTitle.toLowerCase().startsWith(prefix.toLowerCase()),
    );

    if (isNonPlayable) {
      continue;
    }

    titles.push(decodedTitle);
  }

  // Déduplication via Set
  return Array.from(new Set(titles));
}

// ─────────────────────────────────────────────────────────────────────────────
// isPlayableArticle
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vérifie si un titre d'article Wikipedia est jouable dans WikiHop.
 *
 * Un article est non jouable s'il appartient à un namespace de maintenance
 * (Catégorie:, Portail:, Aide:, etc.) ou s'il est une page d'accueil.
 *
 * Fonction pure — pas d'appel réseau, testable directement.
 * Réutilise NON_PLAYABLE_PREFIXES et NON_PLAYABLE_EXACT.
 *
 * Utilisée par ArticleScreen.handleLinkPress (M-04) avant d'appeler addJump.
 *
 * @param title - Titre de l'article (déjà décodé, espaces normalisés)
 * @returns true si l'article est navigable dans le jeu, false sinon
 */
export function isPlayableArticle(title: string): boolean {
  // Titres exacts non jouables (pages d'accueil) — comparaison insensible à la casse
  // pour harmoniser avec le traitement des préfixes (B3)
  if (
    (NON_PLAYABLE_EXACT as readonly string[]).some(
      (exact) => title.toLowerCase() === exact.toLowerCase(),
    )
  ) {
    return false;
  }

  // Namespaces non jouables (comparaison insensible à la casse pour la robustesse)
  const isNonPlayable = NON_PLAYABLE_PREFIXES.some((prefix) =>
    title.toLowerCase().startsWith(prefix.toLowerCase()),
  );

  return !isNonPlayable;
}

// ─────────────────────────────────────────────────────────────────────────────
// clearSummaryCache
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vide le cache mémoire des résumés d'articles.
 *
 * Appelée lors d'un changement de langue (M-12) pour invalider
 * les entrées de la langue précédente.
 *
 * Note M-08 : cette fonction est exportée pour permettre l'invalidation
 * depuis language.store.ts — elle n'est pas nécessaire pendant M-08 lui-même
 * mais sera branchée dans M-12.
 */
export function clearSummaryCache(): void {
  summaryCache.clear();
}
