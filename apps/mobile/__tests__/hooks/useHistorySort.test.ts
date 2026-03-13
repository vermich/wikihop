/**
 * Tests unitaires — useHistorySort.ts (F3-10)
 *
 * Couvre :
 *   - Chargement initial : lit AsyncStorage, applique DEFAULT si absent/invalide
 *   - setCriterion : met à jour l'état local immédiatement, puis AsyncStorage
 *   - isLoading : true pendant la lecture, false après
 *
 * Stratégie de mock :
 *   - AsyncStorage mocké via le mock global jest.setup.ts
 *   - renderHook de @testing-library/react-native
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useHistorySort } from '../../src/hooks/useHistorySort';
import { DEFAULT_SORT_CRITERION, SORT_CRITERION_STORAGE_KEY } from '../../src/utils/history-sort.utils';

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// Chargement initial
// ─────────────────────────────────────────────────────────────────────────────

describe('useHistorySort — chargement initial', () => {
  it('démarre avec isLoading à true', () => {
    jest.spyOn(AsyncStorage, 'getItem').mockReturnValueOnce(new Promise(() => undefined));
    const { result } = renderHook(() => useHistorySort());
    expect(result.current.isLoading).toBe(true);
  });

  it('démarre avec le critère par défaut', () => {
    jest.spyOn(AsyncStorage, 'getItem').mockReturnValueOnce(new Promise(() => undefined));
    const { result } = renderHook(() => useHistorySort());
    expect(result.current.criterion).toBe(DEFAULT_SORT_CRITERION);
  });

  it('passe isLoading à false après le chargement', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce(null);
    const { result } = renderHook(() => useHistorySort());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('utilise le critère stocké si valide', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce('jumps_asc');
    const { result } = renderHook(() => useHistorySort());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.criterion).toBe('jumps_asc');
  });

  it('utilise DEFAULT si AsyncStorage retourne null', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce(null);
    const { result } = renderHook(() => useHistorySort());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.criterion).toBe(DEFAULT_SORT_CRITERION);
  });

  it('utilise DEFAULT si AsyncStorage retourne une valeur invalide', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce('valeur_invalide');
    const { result } = renderHook(() => useHistorySort());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.criterion).toBe(DEFAULT_SORT_CRITERION);
  });

  it('lit la bonne clé AsyncStorage', async () => {
    const spy = jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce(null);
    renderHook(() => useHistorySort());

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith(SORT_CRITERION_STORAGE_KEY);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// setCriterion
// ─────────────────────────────────────────────────────────────────────────────

describe('useHistorySort — setCriterion', () => {
  it('met à jour l\'état local immédiatement', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce(null);
    jest.spyOn(AsyncStorage, 'setItem').mockResolvedValue(undefined);
    const { result } = renderHook(() => useHistorySort());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.setCriterion('duration_asc');
    });

    expect(result.current.criterion).toBe('duration_asc');
  });

  it('persiste le critère dans AsyncStorage avec la bonne clé', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce(null);
    const setSpy = jest.spyOn(AsyncStorage, 'setItem').mockResolvedValue(undefined);
    const { result } = renderHook(() => useHistorySort());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.setCriterion('jumps_desc');
    });

    expect(setSpy).toHaveBeenCalledWith(SORT_CRITERION_STORAGE_KEY, 'jumps_desc');
  });

  it('peut changer le critère plusieurs fois', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce(null);
    jest.spyOn(AsyncStorage, 'setItem').mockResolvedValue(undefined);
    const { result } = renderHook(() => useHistorySort());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.setCriterion('date_asc');
    });
    expect(result.current.criterion).toBe('date_asc');

    await act(async () => {
      await result.current.setCriterion('duration_desc');
    });
    expect(result.current.criterion).toBe('duration_desc');
  });
});
