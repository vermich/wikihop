/**
 * useHistorySort — Hook de gestion du tri de l'historique (F3-10, refonte F3-25)
 *
 * F3-25 : modèle refactorisé en 3 boutons à 3 états cycliques.
 * Expose (criterion: SortButtonCriterion, direction: SortDirection)
 * au lieu des 6 SortCriterion précédents.
 *
 * La clé AsyncStorage et la compatibilité avec sortRecords sont maintenues
 * via toSortCriterion() qui mappe vers les anciens SortCriterion.
 *
 * Clé AsyncStorage : @wikihop/history_sort_criterion
 *   - Format stocké : JSON.stringify({ criterion, direction })
 *   - Compatibilité : si la valeur stockée est un ancien SortCriterion (string brute),
 *     on ignore et on repart sur les valeurs par défaut.
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
  SORT_CRITERION_STORAGE_KEY,
  toSortCriterion,
} from '../utils/history-sort.utils';
import type { SortButtonCriterion, SortCriterion, SortDirection } from '../utils/history-sort.utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface StoredSortState {
  criterion: SortButtonCriterion;
  direction: SortDirection;
}

export interface UseHistorySortResult {
  /** Critère de tri actif parmi les 3 boutons (F3-25) */
  criterion: SortButtonCriterion;
  /** Direction du tri — null = neutre (aucun tri actif sur ce critère) */
  direction: SortDirection;
  /** Critère legacy pour passer à sortRecords — calculé depuis criterion + direction */
  legacyCriterion: SortCriterion;
  /** Sélectionner un critère — cycle direction sur le même critère, reset sur un nouveau */
  selectCriterion: (c: SortButtonCriterion) => Promise<void>;
  isLoading: boolean;
  // Compat legacy F3-10 — alias vers selectCriterion avec mapping inverse
  setCriterion: (c: SortCriterion) => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_BUTTON_CRITERION: SortButtonCriterion = 'date';
const DEFAULT_DIRECTION: SortDirection = null;

function isStoredSortState(value: unknown): value is StoredSortState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const validCriteria: SortButtonCriterion[] = ['date', 'jumps', 'duration'];
  const validDirections: Array<SortDirection> = ['asc', 'desc', null];
  return (
    validCriteria.includes(v['criterion'] as SortButtonCriterion)
    && validDirections.includes(v['direction'] as SortDirection)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useHistorySort(): UseHistorySortResult {
  const [criterion, setCriterionState] = useState<SortButtonCriterion>(DEFAULT_BUTTON_CRITERION);
  const [direction, setDirectionState] = useState<SortDirection>(DEFAULT_DIRECTION);
  const [isLoading, setIsLoading] = useState(true);

  // Lecture du state persisté au montage
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(SORT_CRITERION_STORAGE_KEY);
        if (!cancelled && stored !== null) {
          try {
            const parsed: unknown = JSON.parse(stored);
            if (isStoredSortState(parsed)) {
              setCriterionState(parsed.criterion);
              setDirectionState(parsed.direction);
            }
            // Sinon (ancien format SortCriterion brut ou données corrompues) : defaults
          } catch {
            // JSON invalide → defaults
          }
        }
      } catch (e: unknown) {
        // eslint-disable-next-line no-console
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

  const selectCriterion = useCallback(async (c: SortButtonCriterion): Promise<void> => {
    // Si on tape sur un bouton différent → ascendant direct
    // Si on tape sur le même bouton → cycle direction
    setCriterionState((prev) => {
      if (prev !== c) return c;
      return prev;
    });
    setDirectionState((prev) => {
      if (criterion !== c) return 'asc';
      // Cycle sur le même critère
      if (prev === null) return 'asc';
      if (prev === 'asc') return 'desc';
      return null;
    });

    // Calculer les nouvelles valeurs pour la persistance
    const newDirection: SortDirection =
      criterion !== c
        ? 'asc'
        : direction === null
          ? 'asc'
          : direction === 'asc'
            ? 'desc'
            : null;

    try {
      const newState: StoredSortState = {
        criterion: c,
        direction: newDirection,
      };
      await AsyncStorage.setItem(SORT_CRITERION_STORAGE_KEY, JSON.stringify(newState));
    } catch (e: unknown) {
      // eslint-disable-next-line no-console
      console.error('[useHistorySort] Erreur de sauvegarde AsyncStorage :', e);
    }
  }, [criterion, direction]);

  // Compat legacy F3-10 : setCriterion accepte les SortCriterion anciens
  // Utilisé par handleCriterionSelect dans HistoryScreen (sera retiré après migration UI complète)
  const setCriterion = useCallback(async (c: SortCriterion): Promise<void> => {
    // Mapping inverse : SortCriterion → SortButtonCriterion + direction
    let newCriterion: SortButtonCriterion = 'date';
    let newDirection: SortDirection = null;

    if (c === 'date_desc') { newCriterion = 'date'; newDirection = 'desc'; }
    else if (c === 'date_asc') { newCriterion = 'date'; newDirection = 'asc'; }
    else if (c === 'duration_asc') { newCriterion = 'duration'; newDirection = 'asc'; }
    else if (c === 'duration_desc') { newCriterion = 'duration'; newDirection = 'desc'; }
    else if (c === 'jumps_asc') { newCriterion = 'jumps'; newDirection = 'asc'; }
    else if (c === 'jumps_desc') { newCriterion = 'jumps'; newDirection = 'desc'; }

    setCriterionState(newCriterion);
    setDirectionState(newDirection);

    try {
      const newState: StoredSortState = { criterion: newCriterion, direction: newDirection };
      await AsyncStorage.setItem(SORT_CRITERION_STORAGE_KEY, JSON.stringify(newState));
    } catch (e: unknown) {
      // eslint-disable-next-line no-console
      console.error('[useHistorySort] Erreur de sauvegarde AsyncStorage :', e);
    }
  }, []);

  const legacyCriterion = toSortCriterion(criterion, direction);

  return {
    criterion,
    direction,
    legacyCriterion,
    selectCriterion,
    setCriterion,
    isLoading,
  };
}

export { DEFAULT_SORT_CRITERION };
