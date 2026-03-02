/**
 * useRandomPair — WikiHop Mobile — Wave 4 (M-01)
 *
 * Hook qui encapsule l'appel au backend pour obtenir une paire d'articles
 * aléatoires (départ + destination). Gère les états loading/success/error
 * et la fonction refresh() pour tirer une nouvelle paire.
 *
 * Références :
 *   Story : docs/stories/M-01-home-screen.md
 *
 * Conventions :
 *   - Export nommé
 *   - AbortController + flag `cancelled` pour éviter les setState après démontage
 *   - URL backend : localhost:3000 en développement (Phase 2)
 *   - La langue courante est lue depuis useLanguageStore
 */

import type { ArticleSummary } from '@wikihop/shared';
import { useCallback, useEffect, useState } from 'react';

import { useLanguageStore } from '../store/language.store';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** États discriminés du hook useRandomPair */
export type RandomPairState =
  | { status: 'loading' }
  | { status: 'success'; start: ArticleSummary; target: ArticleSummary }
  | { status: 'error'; message: string };

/** Interface de retour du hook */
export interface UseRandomPairReturn {
  state: RandomPairState;
  /** Recharge une nouvelle paire depuis le backend */
  refresh: () => void;
}

/**
 * Réponse du backend GET /api/game/random-pair
 * Correspond au RandomPairResponse de game.route.ts
 */
interface RandomPairApiResponse {
  start: ArticleSummary;
  target: ArticleSummary;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Charge une paire d'articles aléatoires depuis le backend.
 *
 * Comportement :
 * 1. Au montage (et à chaque refresh()), déclenche un fetch vers le backend.
 * 2. Pendant le fetch : status 'loading'.
 * 3. HTTP 200 → status 'success' avec start et target.
 * 4. HTTP 503 → status 'error' avec message "Service temporairement indisponible".
 * 5. Autre erreur (réseau, timeout) → status 'error' avec message générique.
 * 6. refresh() repasse à 'loading' et relance le fetch.
 * 7. Démontage pendant fetch → AbortController annule le fetch, setState ignoré.
 */
export function useRandomPair(): UseRandomPairReturn {
  const language = useLanguageStore((state) => state.language);
  const [state, setState] = useState<RandomPairState>({ status: 'loading' });

  const [trigger, setTrigger] = useState(0);

  const refresh = useCallback((): void => {
    setState({ status: 'loading' });
    setTrigger((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    void (async () => {
      try {
        const url = `http://localhost:3000/api/game/random-pair?lang=${language}`;
        const response = await fetch(url, {
          signal: controller.signal,
        });

        if (cancelled) return;

        if (response.status === 503) {
          setState({
            status: 'error',
            message: 'Service temporairement indisponible. Réessayez dans quelques instants.',
          });
          return;
        }

        if (!response.ok) {
          setState({
            status: 'error',
            message: 'Erreur lors du chargement. Vérifiez votre connexion.',
          });
          return;
        }

        const data = (await response.json()) as RandomPairApiResponse;

        if (cancelled) return;

        setState({ status: 'success', start: data.start, target: data.target });
      } catch (error: unknown) {
        if (cancelled) return;

        // AbortError : fetch annulé par le cleanup — ne pas mettre à jour l'état
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        setState({
          status: 'error',
          message: 'Erreur lors du chargement. Vérifiez votre connexion.',
        });
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  // trigger change quand refresh() est appelé — relance le fetch
  }, [language, trigger]);

  return { state, refresh };
}
