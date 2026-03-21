/**
 * useRefreshablePair — WikiHop Mobile — F3-32
 *
 * Hook similaire à useRandomPair mais avec support du rechargement manuel.
 * Chaque appel à refresh() déclenche un nouveau chargement de paire.
 * Contrairement à useRandomPair, ce hook est conçu pour une utilisation
 * dans des composants qui gèrent plusieurs paires indépendantes (N slots).
 *
 * Conventions :
 *   - Export nommé useRefreshablePair
 *   - AbortController + flag cancelled pour éviter setState après démontage
 *   - Même logique de fetch que useRandomPair (URL backend, gestion 503, AbortError)
 *   - refreshKey : state number, incrémenté par refresh() → déclenche le useEffect
 *
 * TDD strict : les tests dans __tests__/hooks/useRefreshablePair.test.ts
 * ont été écrits et committés AVANT cette implémentation.
 */

import type { ArticleSummary } from '@wikihop/shared';
import { useCallback, useEffect, useState } from 'react';

import { BACKEND_BASE_URL } from '../config/backend.config';
import { useLanguageStore } from '../store/language.store';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type RefreshablePairState =
  | { status: 'loading' }
  | { status: 'success'; start: ArticleSummary; target: ArticleSummary }
  | { status: 'error'; message: string };

export interface UseRefreshablePairReturn {
  state: RefreshablePairState;
  /** Recharge une nouvelle paire depuis le backend. Remet state à 'loading'. */
  refresh: () => void;
}

/**
 * Réponse du backend GET /api/game/random-pair
 */
interface RandomPairApiResponse {
  start: ArticleSummary;
  target: ArticleSummary;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Charge une paire d'articles aléatoires depuis le backend, avec support
 * du rechargement manuel via refresh().
 *
 * Comportement :
 * 1. Au montage : state 'loading', déclenche un fetch.
 * 2. HTTP 200 → state 'success' avec start et target.
 * 3. HTTP 503 → state 'error' avec message "Service temporairement indisponible".
 * 4. Autre erreur → state 'error' avec message générique.
 * 5. refresh() → remet state à 'loading' + incrémente refreshKey → nouveau fetch.
 * 6. Changement de langue → nouveau fetch automatique.
 * 7. Démontage pendant fetch → AbortController annule le fetch, setState ignoré.
 * 8. Si refresh() rapide (deux appels) : l'AbortController annule le fetch précédent.
 */
export function useRefreshablePair(): UseRefreshablePairReturn {
  const language = useLanguageStore((state) => state.language);
  const [state, setState] = useState<RefreshablePairState>({ status: 'loading' });
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback((): void => {
    setState({ status: 'loading' });
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    void (async () => {
      try {
        const url = `${BACKEND_BASE_URL}/api/game/random-pair?lang=${language}&difficulty=normal`;
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
  // refreshKey change quand refresh() est appelé — relance le fetch
  // language : un changement de langue relance le fetch automatiquement
  }, [language, refreshKey]);

  return { state, refresh };
}
