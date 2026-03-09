/**
 * useGameHistory — Hook pour accéder à l'historique des parties (F3-02)
 *
 * Charge les enregistrements depuis ScoreStorage au montage,
 * et expose des actions pour effacer ou supprimer des entrées.
 *
 * Utilisé dans HistoryScreen avec useFocusEffect pour un rafraîchissement
 * automatique au retour sur l'écran (après la fin d'une partie).
 *
 * Conventions :
 *   - Export nommé useGameHistory
 *   - Zéro any, TypeScript strict
 */

import type { GameRecord } from '@wikihop/shared';
import { useCallback, useEffect, useState } from 'react';

import * as ScoreStorage from '../services/score-storage.service';

// ─────────────────────────────────────────────────────────────────────────────
// Interface
// ─────────────────────────────────────────────────────────────────────────────

interface UseGameHistoryResult {
  /** Liste des parties, de la plus récente à la plus ancienne */
  records: ReadonlyArray<GameRecord>;
  /** true pendant le chargement initial */
  isLoading: boolean;
  /** Efface tout l'historique (la confirmation est gérée par l'écran appelant) */
  deleteAll: () => Promise<void>;
  /** Supprime une entrée par son id (filtre localement, pas de rechargement complet) */
  deleteRecord: (id: string) => Promise<void>;
  /** Recharge manuellement depuis AsyncStorage */
  refresh: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useGameHistory(): UseGameHistoryResult {
  const [records, setRecords] = useState<ReadonlyArray<GameRecord>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Chargement initial au montage
  useEffect(() => {
    void (async () => {
      const data = await ScoreStorage.getAll();
      setRecords(data);
      setIsLoading(false);
    })();
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    const data = await ScoreStorage.getAll();
    setRecords(data);
  }, []);

  const deleteAll = useCallback(async (): Promise<void> => {
    await ScoreStorage.deleteAll();
    setRecords([]);
  }, []);

  const deleteRecord = useCallback(async (id: string): Promise<void> => {
    await ScoreStorage.deleteRecord(id);
    // Filtre localement pour éviter un rechargement complet AsyncStorage
    setRecords((prev) => prev.filter((record) => record.id !== id));
  }, []);

  return {
    records,
    isLoading,
    refresh,
    deleteAll,
    deleteRecord,
  };
}
