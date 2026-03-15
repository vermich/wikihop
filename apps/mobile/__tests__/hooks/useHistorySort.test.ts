/**
 * Tests unitaires — useHistorySort.ts (F3-10, refonte F3-25)
 *
 * Couvre :
 *   - Chargement initial : lit AsyncStorage, applique les defaults si absent/invalide
 *   - selectCriterion : cycle direction sur le même critère, reset sur un nouveau
 *   - setCriterion (compat legacy) : mapping SortCriterion → bouton + direction
 *   - legacyCriterion : toujours un SortCriterion valide
 *   - isLoading : true pendant la lecture, false après
 *
 * F3-25 : le hook expose (criterion: SortButtonCriterion, direction: SortDirection)
 * au lieu d'un unique SortCriterion à 6 valeurs.
 *
 * Stratégie de mock :
 *   - AsyncStorage mocké via le mock global jest.setup.ts
 *   - renderHook de @testing-library/react-native
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useHistorySort } from '../../src/hooks/useHistorySort';
import { SORT_CRITERION_STORAGE_KEY } from '../../src/utils/history-sort.utils';

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

  it('démarre avec le critère et direction par défaut (date, null)', () => {
    jest.spyOn(AsyncStorage, 'getItem').mockReturnValueOnce(new Promise(() => undefined));
    const { result } = renderHook(() => useHistorySort());
    expect(result.current.criterion).toBe('date');
    expect(result.current.direction).toBe(null);
  });

  it('passe isLoading à false après le chargement', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce(null);
    const { result } = renderHook(() => useHistorySort());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('utilise le state stocké si valide (JSON)', async () => {
    const stored = JSON.stringify({ criterion: 'jumps', direction: 'asc' });
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce(stored);
    const { result } = renderHook(() => useHistorySort());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.criterion).toBe('jumps');
    expect(result.current.direction).toBe('asc');
  });

  it('utilise le state stocké : direction null', async () => {
    const stored = JSON.stringify({ criterion: 'duration', direction: null });
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce(stored);
    const { result } = renderHook(() => useHistorySort());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.criterion).toBe('duration');
    expect(result.current.direction).toBe(null);
  });

  it('utilise les defaults si AsyncStorage retourne null', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce(null);
    const { result } = renderHook(() => useHistorySort());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.criterion).toBe('date');
    expect(result.current.direction).toBe(null);
  });

  it('utilise les defaults si AsyncStorage retourne une valeur JSON invalide', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce('not-valid-json{');
    const { result } = renderHook(() => useHistorySort());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.criterion).toBe('date');
    expect(result.current.direction).toBe(null);
  });

  it('utilise les defaults si l\'objet JSON a des champs invalides', async () => {
    const stored = JSON.stringify({ criterion: 'invalid', direction: 'up' });
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce(stored);
    const { result } = renderHook(() => useHistorySort());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.criterion).toBe('date');
    expect(result.current.direction).toBe(null);
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
// selectCriterion — F3-25 : cycle à 3 états
// ─────────────────────────────────────────────────────────────────────────────

describe('useHistorySort — selectCriterion', () => {
  it('premier tap sur un critère neutre → ascendant', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce(null);
    jest.spyOn(AsyncStorage, 'setItem').mockResolvedValue(undefined);
    const { result } = renderHook(() => useHistorySort());

    await waitFor(() => { expect(result.current.isLoading).toBe(false); });

    await act(async () => {
      await result.current.selectCriterion('jumps');
    });

    expect(result.current.criterion).toBe('jumps');
    expect(result.current.direction).toBe('asc');
  });

  it('deuxième tap sur le même critère ascendant → descendant', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce(
      JSON.stringify({ criterion: 'jumps', direction: 'asc' }),
    );
    jest.spyOn(AsyncStorage, 'setItem').mockResolvedValue(undefined);
    const { result } = renderHook(() => useHistorySort());

    await waitFor(() => { expect(result.current.isLoading).toBe(false); });

    await act(async () => {
      await result.current.selectCriterion('jumps');
    });

    expect(result.current.criterion).toBe('jumps');
    expect(result.current.direction).toBe('desc');
  });

  it('troisième tap sur le même critère descendant → neutre', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce(
      JSON.stringify({ criterion: 'jumps', direction: 'desc' }),
    );
    jest.spyOn(AsyncStorage, 'setItem').mockResolvedValue(undefined);
    const { result } = renderHook(() => useHistorySort());

    await waitFor(() => { expect(result.current.isLoading).toBe(false); });

    await act(async () => {
      await result.current.selectCriterion('jumps');
    });

    expect(result.current.criterion).toBe('jumps');
    expect(result.current.direction).toBe(null);
  });

  it('tap sur un critère différent → ascendant direct', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce(
      JSON.stringify({ criterion: 'date', direction: 'desc' }),
    );
    jest.spyOn(AsyncStorage, 'setItem').mockResolvedValue(undefined);
    const { result } = renderHook(() => useHistorySort());

    await waitFor(() => { expect(result.current.isLoading).toBe(false); });

    await act(async () => {
      await result.current.selectCriterion('duration');
    });

    expect(result.current.criterion).toBe('duration');
    expect(result.current.direction).toBe('asc');
  });

  it('persiste le state dans AsyncStorage avec la bonne clé', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce(null);
    const setSpy = jest.spyOn(AsyncStorage, 'setItem').mockResolvedValue(undefined);
    const { result } = renderHook(() => useHistorySort());

    await waitFor(() => { expect(result.current.isLoading).toBe(false); });

    await act(async () => {
      await result.current.selectCriterion('jumps');
    });

    expect(setSpy).toHaveBeenCalledWith(
      SORT_CRITERION_STORAGE_KEY,
      JSON.stringify({ criterion: 'jumps', direction: 'asc' }),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// legacyCriterion — mapping vers SortCriterion
// ─────────────────────────────────────────────────────────────────────────────

describe('useHistorySort — legacyCriterion', () => {
  it('retourne date_desc quand direction est null (fallback)', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce(null);
    const { result } = renderHook(() => useHistorySort());

    await waitFor(() => { expect(result.current.isLoading).toBe(false); });

    expect(result.current.legacyCriterion).toBe('date_desc');
  });

  it('retourne jumps_asc pour criterion=jumps direction=asc', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce(
      JSON.stringify({ criterion: 'jumps', direction: 'asc' }),
    );
    const { result } = renderHook(() => useHistorySort());

    await waitFor(() => { expect(result.current.isLoading).toBe(false); });

    expect(result.current.legacyCriterion).toBe('jumps_asc');
  });

  it('retourne duration_desc pour criterion=duration direction=desc', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce(
      JSON.stringify({ criterion: 'duration', direction: 'desc' }),
    );
    const { result } = renderHook(() => useHistorySort());

    await waitFor(() => { expect(result.current.isLoading).toBe(false); });

    expect(result.current.legacyCriterion).toBe('duration_desc');
  });
});
