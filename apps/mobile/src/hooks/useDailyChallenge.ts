/**
 * useDailyChallenge — WikiHop Mobile — Phase 3 (F3-01)
 *
 * Hook qui encapsule la récupération du défi quotidien depuis le backend.
 * Charge une seule fois au montage (le défi du jour est fixe pour une langue donnée).
 *
 * Références :
 *   Story : docs/stories/phase-3/F3-01-daily-challenge.md
 *
 * Conventions :
 *   - Export nommé
 *   - États discriminés : loading / success / error
 *   - Lit la langue depuis useLanguageStore
 *   - Flag `cancelled` pour éviter les setState après démontage
 */

import { useEffect, useState } from 'react';

import type { DailyChallengeResponse } from '../services/daily-challenge.service';
import { fetchDailyChallenge } from '../services/daily-challenge.service';
import { useLanguageStore } from '../store/language.store';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** États discriminés du hook useDailyChallenge */
export type DailyChallengeState =
  | { status: 'loading' }
  | { status: 'success'; data: DailyChallengeResponse }
  | { status: 'error'; message: string };

/** Interface de retour du hook */
export interface UseDailyChallengeReturn {
  state: DailyChallengeState;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Charge le défi quotidien au montage.
 *
 * Le défi est fixe pour la journée : pas de refresh manuel.
 * En cas d'échec (réseau, backend indisponible), status === 'error'.
 *
 * La langue courante est lue depuis useLanguageStore.
 * Si la langue change, le défi est rechargé (useEffect [language]).
 */
export function useDailyChallenge(): UseDailyChallengeReturn {
  const language = useLanguageStore((state) => state.language);
  const [state, setState] = useState<DailyChallengeState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    // BUG-02 : log temporaire pour vérifier si le hook repasse par 'loading'
    // au retour sur HomeScreen (focus). Si ce log apparaît sans changement de langue,
    // cela indique que le hook est remonté inutilement (à documenter dans la PR).
    // eslint-disable-next-line no-console
    console.log('[useDailyChallenge] useEffect déclenché — language:', language);

    setState({ status: 'loading' });

    void (async () => {
      const result = await fetchDailyChallenge(language);

      if (cancelled) return;

      if (result === null) {
        setState({
          status: 'error',
          message: 'Le défi du jour est momentanément indisponible.',
        });
        return;
      }

      setState({ status: 'success', data: result });
    })();

    return () => {
      cancelled = true;
    };
  }, [language]);

  return { state };
}
