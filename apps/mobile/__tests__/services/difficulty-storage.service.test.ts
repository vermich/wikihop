/**
 * Tests unitaires — difficulty-storage.service.ts (F3-05)
 *
 * Couvre :
 *   - getDifficultyPreference : retourne 'normal' si clé absente
 *   - getDifficultyPreference : retourne la valeur persistée si valide
 *   - getDifficultyPreference : retourne 'normal' si valeur invalide
 *   - getDifficultyPreference : retourne 'normal' si erreur AsyncStorage
 *   - setDifficultyPreference : persiste la valeur correctement
 *   - setDifficultyPreference : absorbe les erreurs AsyncStorage (pas de throw)
 *
 * Mock AsyncStorage : déclaré dans apps/mobile/jest.setup.ts
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getDifficultyPreference,
  setDifficultyPreference,
} from '../../src/services/difficulty-storage.service';

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const DIFFICULTY_KEY = '@wikihop/difficulty_preference';

// ─────────────────────────────────────────────────────────────────────────────
// getDifficultyPreference
// ─────────────────────────────────────────────────────────────────────────────

describe('getDifficultyPreference', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retourne "normal" si la clé est absente', async () => {
    await AsyncStorage.clear();

    const result = await getDifficultyPreference();

    expect(result).toBe('normal');
  });

  it('retourne "hard" si "hard" a été persisté', async () => {
    await AsyncStorage.setItem(DIFFICULTY_KEY, JSON.stringify('hard'));

    const result = await getDifficultyPreference();

    expect(result).toBe('hard');
  });

  it('retourne "normal" si "normal" a été persisté', async () => {
    await AsyncStorage.setItem(DIFFICULTY_KEY, JSON.stringify('normal'));

    const result = await getDifficultyPreference();

    expect(result).toBe('normal');
  });

  it('retourne "normal" si la valeur stockée est invalide (chaîne non reconnue)', async () => {
    await AsyncStorage.setItem(DIFFICULTY_KEY, JSON.stringify('extreme'));

    const result = await getDifficultyPreference();

    expect(result).toBe('normal');
  });

  it('retourne "normal" si la valeur stockée est un nombre', async () => {
    await AsyncStorage.setItem(DIFFICULTY_KEY, JSON.stringify(42));

    const result = await getDifficultyPreference();

    expect(result).toBe('normal');
  });

  it('retourne "normal" si la valeur stockée est null (JSON)', async () => {
    await AsyncStorage.setItem(DIFFICULTY_KEY, JSON.stringify(null));

    const result = await getDifficultyPreference();

    expect(result).toBe('normal');
  });

  it('retourne "normal" si AsyncStorage.getItem throw', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('Storage error'));

    const result = await getDifficultyPreference();

    expect(result).toBe('normal');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// setDifficultyPreference
// ─────────────────────────────────────────────────────────────────────────────

describe('setDifficultyPreference', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persiste "hard" dans AsyncStorage', async () => {
    await setDifficultyPreference('hard');

    const raw = await AsyncStorage.getItem(DIFFICULTY_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string)).toBe('hard');
  });

  it('persiste "normal" dans AsyncStorage', async () => {
    await setDifficultyPreference('normal');

    const raw = await AsyncStorage.getItem(DIFFICULTY_KEY);
    expect(JSON.parse(raw as string)).toBe('normal');
  });

  it('ne throw pas si AsyncStorage.setItem throw', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('Storage error'));

    await expect(setDifficultyPreference('hard')).resolves.not.toThrow();
  });

  it('la préférence persistée est relisible via getDifficultyPreference', async () => {
    await AsyncStorage.clear();
    await setDifficultyPreference('hard');

    const result = await getDifficultyPreference();

    expect(result).toBe('hard');
  });
});
