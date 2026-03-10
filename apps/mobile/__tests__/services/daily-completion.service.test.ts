/**
 * Tests TDD — daily-completion.service.ts (F3-16)
 *
 * Écrits AVANT l'implémentation — ordre TDD strict.
 *
 * Fonctions testées :
 *   - isDailyChallengeCompleted : compare storedDate et challengeDate
 *   - getDailyCompletionDate    : lecture AsyncStorage brute (pas JSON)
 *   - saveDailyCompletionDate   : écriture AsyncStorage brute (pas JSON)
 *
 * Mock AsyncStorage : déclaré dans apps/mobile/jest.setup.ts
 * (utilise @react-native-async-storage/async-storage/jest/async-storage-mock)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getDailyCompletionDate,
  isDailyChallengeCompleted,
  saveDailyCompletionDate,
} from '../../src/services/daily-completion.service';

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const COMPLETION_KEY = '@wikihop/daily_completion_date';

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// isDailyChallengeCompleted
// ─────────────────────────────────────────────────────────────────────────────

describe('isDailyChallengeCompleted', () => {
  it('retourne true si storedDate === challengeDate', () => {
    expect(isDailyChallengeCompleted('2026-03-10', '2026-03-10')).toBe(true);
  });

  it('retourne false si storedDate est la veille du défi', () => {
    expect(isDailyChallengeCompleted('2026-03-09', '2026-03-10')).toBe(false);
  });

  it('retourne false si storedDate est null (jamais joué)', () => {
    expect(isDailyChallengeCompleted(null, '2026-03-10')).toBe(false);
  });

  it('retourne false si storedDate est une chaîne vide', () => {
    expect(isDailyChallengeCompleted('', '2026-03-10')).toBe(false);
  });

  it('retourne true avec des dates futures identiques', () => {
    expect(isDailyChallengeCompleted('2026-12-31', '2026-12-31')).toBe(true);
  });

  it('retourne false si storedDate est plus récente que challengeDate', () => {
    expect(isDailyChallengeCompleted('2026-03-11', '2026-03-10')).toBe(false);
  });

  it('est sensible à la casse et au format — ne doit pas confondre des valeurs proches', () => {
    expect(isDailyChallengeCompleted('2026-03-1', '2026-03-10')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getDailyCompletionDate
// ─────────────────────────────────────────────────────────────────────────────

describe('getDailyCompletionDate', () => {
  it('retourne la chaîne lue si AsyncStorage contient une valeur', async () => {
    await AsyncStorage.setItem(COMPLETION_KEY, '2026-03-10');
    const result = await getDailyCompletionDate();
    expect(result).toBe('2026-03-10');
  });

  it('retourne null si la clé est absente', async () => {
    const result = await getDailyCompletionDate();
    expect(result).toBeNull();
  });

  it('ne parse pas la valeur en JSON — retourne la string brute', async () => {
    // La valeur stockée est brute, pas JSON.stringify
    await AsyncStorage.setItem(COMPLETION_KEY, '2026-03-10');
    const result = await getDailyCompletionDate();
    // Ne doit pas retourner '"2026-03-10"' (avec quotes) mais '2026-03-10'
    expect(result).toBe('2026-03-10');
    expect(result).not.toBe('"2026-03-10"');
  });

  it('retourne null et appelle console.warn si AsyncStorage.getItem throw', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('Storage error'));

    const result = await getDailyCompletionDate();
    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// saveDailyCompletionDate
// ─────────────────────────────────────────────────────────────────────────────

describe('saveDailyCompletionDate', () => {
  it('appelle AsyncStorage.setItem avec la bonne clé et la date brute', async () => {
    const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');
    await saveDailyCompletionDate('2026-03-10');
    expect(setItemSpy).toHaveBeenCalledWith(COMPLETION_KEY, '2026-03-10');
  });

  it('persiste une valeur lisible sans JSON.stringify', async () => {
    await saveDailyCompletionDate('2026-03-10');
    // Lecture directe — la valeur doit être brute, pas encapsulée en JSON
    const stored = await AsyncStorage.getItem(COMPLETION_KEY);
    expect(stored).toBe('2026-03-10');
    expect(stored).not.toBe('"2026-03-10"');
  });

  it('ne throw pas si AsyncStorage.setItem échoue — absorbe l\'erreur', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('Storage write error'));
    await expect(saveDailyCompletionDate('2026-03-10')).resolves.toBeUndefined();
  });

  it('appelle console.error si AsyncStorage.setItem throw', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('Storage write error'));

    await saveDailyCompletionDate('2026-03-10');
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
