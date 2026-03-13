/**
 * useHistorySort — Hook de gestion du critère de tri de l'historique (F3-10)
 *
 * Lit le critère persisté dans AsyncStorage au montage,
 * expose setCriterion pour le modifier et le persister.
 *
 * Clé AsyncStorage : @wikihop/history_sort_criterion
 *
 * Conventions :
 *   - Export nommé useHistorySort
 *   - Mise à jour locale immédiate avant l'AsyncStorage
 *   - Zéro any
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import {
  DEFAULT_SORT_CRITERION,
  isSortCriterion,
  SORT_CRITERION_STORAGE_KEY,
} from '../utils/history-sort.utils';
import type { SortCriterion } from '../utils/history-sort.utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface UseHistorySortResult {
  criterion: SortCriterion;
  setCriterion: (c: SortCriterion) => Promise<void>;
  isLoading: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useHistorySort(): UseHistorySortResult {
  const [criterion, setCriterionState] = useState<SortCriterion>(DEFAULT_SORT_CRITERION);
  const [isLoading, setIsLoading] = useState(true);

  // Lecture du critère persisté au montage
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(SORT_CRITERION_STORAGE_KEY);
        if (!cancelled) {
          if (stored !== null && isSortCriterion(stored)) {
            setCriterionState(stored);
          }
          // Sinon : DEFAULT_SORT_CRITERION déjà en place
        }
      } catch (e: unknown) {
        // Erreur AsyncStorage : on reste sur le critère par défaut
        console.error('[useHistorySort] Erreur de lecture AsyncStorage :', e);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setCriterion = useCallback(async (c: SortCriterion): Promise<void> => {
    // Mise à jour locale immédiate pour une UI réactive
    setCriterionState(c);
    // Persistance AsyncStorage en arrière-plan
    try {
      await AsyncStorage.setItem(SORT_CRITERION_STORAGE_KEY, c);
    } catch (e: unknown) {
      console.error('[useHistorySort] Erreur de sauvegarde AsyncStorage :', e);
    }
  }, []);

  return { criterion, setCriterion, isLoading };
}
