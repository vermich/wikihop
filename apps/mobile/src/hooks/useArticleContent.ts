/**
 * useArticleContent — WikiHop Mobile — Wave 3 (M-03)
 *
 * Hook qui encapsule la logique de fetch du contenu HTML d'un article Wikipedia.
 * L'écran ArticleScreen ne contient pas de logique de fetch — tout passe par ce hook.
 *
 * États discriminés (union type) :
 *   - loading    : fetch en cours
 *   - success    : HTML disponible
 *   - not_found  : article inexistant (404) — pas de retry
 *   - error      : erreur réseau — retry disponible
 *
 * Pattern cleanup :
 *   `let cancelled = false` dans useEffect pour éviter un setState
 *   sur un composant démonté lors des navigations rapides.
 *
 * Retry :
 *   Incrémente un compteur retryCount dans le state local pour
 *   forcer le useEffect à se relancer sans changer title/lang.
 *
 * Références :
 *   Story : docs/stories/M-03-article-content-display.md
 *
 * Conventions :
 *   - Export nommé
 *   - Pas de timeout supplémentaire (géré par getArticleContent via AbortController)
 */

import type { Language } from '@wikihop/shared';
import { useCallback, useEffect, useState } from 'react';


import {
  WikipediaNetworkError,
  WikipediaNotFoundError,
  getArticleContent,
} from '../services/wikipedia.service';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ArticleContentState =
  | { status: 'loading' }
  | { status: 'success'; html: string }
  | { status: 'not_found'; title: string }
  | { status: 'error'; message: string };

export interface UseArticleContentResult {
  state: ArticleContentState;
  /** Permet de relancer le fetch après une erreur réseau (bouton "Réessayer") */
  retry: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Récupère le HTML d'un article Wikipedia via getArticleContent().
 *
 * - Lance le fetch au montage et à chaque changement de title, lang ou retryCount.
 * - Expose un état discriminé (loading / success / not_found / error).
 * - `retry()` force un nouveau fetch sans changer title/lang.
 *
 * @param title - Titre de l'article (non encodé)
 * @param lang  - Langue de l'article
 */
export function useArticleContent(
  title: string,
  lang: Language,
): UseArticleContentResult {
  const [state, setState] = useState<ArticleContentState>({ status: 'loading' });
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Pattern cleanup : si le composant est démonté pendant le fetch,
    // on ignore le résultat pour éviter un setState sur composant démonté.
    let cancelled = false;

    setState({ status: 'loading' });

    void (async () => {
      try {
        const html = await getArticleContent(title, lang);

        if (!cancelled) {
          setState({ status: 'success', html });
        }
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }

        if (error instanceof WikipediaNotFoundError) {
          setState({ status: 'not_found', title });
        } else if (error instanceof WikipediaNetworkError) {
          setState({ status: 'error', message: error.message });
        } else {
          // Erreur inattendue — on la traite comme une erreur réseau générique
          const message =
            error instanceof Error ? error.message : 'Erreur inconnue';
          setState({ status: 'error', message });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [title, lang, retryCount]);

  const retry = useCallback(() => {
    setRetryCount((count) => count + 1);
  }, []);

  return { state, retry };
}
