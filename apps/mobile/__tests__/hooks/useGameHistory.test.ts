/**
 * Tests unitaires — useGameHistory.ts (F3-02)
 *
 * Couvre :
 *   - Chargement initial : records peuplé, isLoading passe à false
 *   - deleteAll : appelle ScoreStorage.deleteAll puis vide les records localement
 *   - deleteRecord : appelle ScoreStorage.deleteRecord puis filtre localement
 *   - refresh : recharge les records depuis ScoreStorage
 *
 * Stratégie de mock :
 *   - score-storage.service entièrement mocké (jest.mock)
 *   - renderHook de @testing-library/react-native
 *   - act() pour attendre les mises à jour d'état asynchrones
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { Article, GameRecord } from '@wikihop/shared';

import { useGameHistory } from '../../src/hooks/useGameHistory';
import * as ScoreStorage from '../../src/services/score-storage.service';

// ─────────────────────────────────────────────────────────────────────────────
// Mock du service ScoreStorage
// ─────────────────────────────────────────────────────────────────────────────

jest.mock('../../src/services/score-storage.service');

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const ARTICLE_PARIS: Article = {
  id: '681',
  title: 'Paris',
  url: 'https://fr.wikipedia.org/wiki/Paris',
  language: 'fr',
};

const ARTICLE_TOUR_EIFFEL: Article = {
  id: '1359684',
  title: 'Tour Eiffel',
  url: 'https://fr.wikipedia.org/wiki/Tour_Eiffel',
  language: 'fr',
};

function makeRecord(id: string): GameRecord {
  return {
    id,
    startArticle: ARTICLE_PARIS,
    targetArticle: ARTICLE_TOUR_EIFFEL,
    jumps: 3,
    durationMs: 125000,
    startedAt: '2026-03-06T12:00:00.000Z',
    completedAt: '2026-03-06T12:02:05.000Z',
    status: 'won',
  };
}

const MOCK_RECORDS: ReadonlyArray<GameRecord> = [
  makeRecord('id-1'),
  makeRecord('id-2'),
  makeRecord('id-3'),
];

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

const mockedGetAll = jest.mocked(ScoreStorage.getAll);
const mockedDeleteAll = jest.mocked(ScoreStorage.deleteAll);
const mockedDeleteRecord = jest.mocked(ScoreStorage.deleteRecord);

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetAll.mockResolvedValue(MOCK_RECORDS);
  mockedDeleteAll.mockResolvedValue(undefined);
  mockedDeleteRecord.mockResolvedValue(undefined);
});

// ─────────────────────────────────────────────────────────────────────────────
// Chargement initial
// ─────────────────────────────────────────────────────────────────────────────

describe('useGameHistory — chargement initial', () => {
  it('démarre avec isLoading à true avant le chargement', () => {
    // Garder la promesse en suspens pour observer l'état initial
    mockedGetAll.mockReturnValueOnce(new Promise(() => undefined));

    const { result } = renderHook(() => useGameHistory());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.records).toEqual([]);
  });

  it('peuple records et passe isLoading à false après le chargement', async () => {
    const { result } = renderHook(() => useGameHistory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.records).toEqual(MOCK_RECORDS);
  });

  it('appelle ScoreStorage.getAll au montage', async () => {
    renderHook(() => useGameHistory());

    await waitFor(() => {
      expect(mockedGetAll).toHaveBeenCalledTimes(1);
    });
  });

  it('records est [] si ScoreStorage.getAll retourne tableau vide', async () => {
    mockedGetAll.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useGameHistory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.records).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// deleteAll
// ─────────────────────────────────────────────────────────────────────────────

describe('useGameHistory — deleteAll', () => {
  it('appelle ScoreStorage.deleteAll', async () => {
    const { result } = renderHook(() => useGameHistory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteAll();
    });

    expect(mockedDeleteAll).toHaveBeenCalledTimes(1);
  });

  it('vide les records localement après deleteAll', async () => {
    const { result } = renderHook(() => useGameHistory());

    await waitFor(() => {
      expect(result.current.records).toEqual(MOCK_RECORDS);
    });

    await act(async () => {
      await result.current.deleteAll();
    });

    expect(result.current.records).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// deleteRecord
// ─────────────────────────────────────────────────────────────────────────────

describe('useGameHistory — deleteRecord', () => {
  it('appelle ScoreStorage.deleteRecord avec l\'id fourni', async () => {
    const { result } = renderHook(() => useGameHistory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteRecord('id-2');
    });

    expect(mockedDeleteRecord).toHaveBeenCalledWith('id-2');
  });

  it('filtre localement l\'entrée supprimée sans rechargement complet', async () => {
    const { result } = renderHook(() => useGameHistory());

    await waitFor(() => {
      expect(result.current.records).toEqual(MOCK_RECORDS);
    });

    // On réinitialise le compteur pour vérifier que getAll n'est pas rappelé
    mockedGetAll.mockClear();

    await act(async () => {
      await result.current.deleteRecord('id-2');
    });

    // Filtre local — getAll ne doit pas avoir été rappelé
    expect(mockedGetAll).not.toHaveBeenCalled();

    // L'entrée id-2 ne doit plus être dans records
    expect(result.current.records.find((r) => r.id === 'id-2')).toBeUndefined();
    // Les autres entrées restent
    expect(result.current.records.find((r) => r.id === 'id-1')).toBeDefined();
    expect(result.current.records.find((r) => r.id === 'id-3')).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// refresh
// ─────────────────────────────────────────────────────────────────────────────

describe('useGameHistory — refresh', () => {
  it('recharge les records depuis ScoreStorage', async () => {
    const { result } = renderHook(() => useGameHistory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const updatedRecords: GameRecord[] = [makeRecord('id-new')];
    mockedGetAll.mockResolvedValueOnce(updatedRecords);

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.records).toEqual(updatedRecords);
  });
});
