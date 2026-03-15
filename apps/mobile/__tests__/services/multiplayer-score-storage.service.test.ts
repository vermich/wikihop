/**
 * Tests unitaires — multiplayer-score-storage.service.ts (F3-31)
 *
 * Couvre :
 *   - save + loadAll : sauvegarder 1 record, vérifier qu'il est retourné
 *   - save : insère en tête de liste
 *   - Limite 20 entrées : sauvegarder 21 records, vérifier les 20 plus récents
 *   - loadAll sur storage vide : retourner []
 *   - loadAll sur données corrompues : retourner []
 *   - Erreurs AsyncStorage absorbées (pas de throw vers l'appelant)
 *
 * Mock AsyncStorage : déclaré dans apps/mobile/jest.setup.ts
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  loadAll,
  save,
} from '../../src/services/multiplayer-score-storage.service';

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const MULTIPLAYER_HISTORY_KEY = '@wikihop/multiplayer_history';

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces locales (évite les imports de type)
// ─────────────────────────────────────────────────────────────────────────────

interface RoundResult {
  jumps: number | null;
  durationMs: number | null;
  won: boolean;
}

interface MultiplayerRecord {
  id: string;
  date: string;
  playerNames: string[];
  roundCount: number;
  roundHistory: RoundResult[][];
  winner: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

function makeRecord(id: string, winner: string | null = 'Alice'): MultiplayerRecord {
  return {
    id,
    date: new Date(2026, 2, 15).toISOString(),
    playerNames: ['Alice', 'Bob'],
    roundCount: 1,
    roundHistory: [
      [
        { jumps: 3, durationMs: 10000, won: true },
        { jumps: null, durationMs: null, won: false },
      ],
    ],
    winner,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// loadAll
// ─────────────────────────────────────────────────────────────────────────────

describe('loadAll', () => {
  it('retourne un tableau vide si la clé est absente', async () => {
    const result = await loadAll();
    expect(result).toEqual([]);
  });

  it('retourne les entrées parsées correctement après save', async () => {
    const record = makeRecord('id-1');
    await save(record);

    const result = await loadAll();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(record);
  });

  it('retourne [] si les données stockées ne sont pas un tableau (données corrompues)', async () => {
    await AsyncStorage.setItem(MULTIPLAYER_HISTORY_KEY, JSON.stringify({ invalid: true }));
    const result = await loadAll();
    expect(result).toEqual([]);
  });

  it('retourne [] si les données stockées sont une string non-tableau', async () => {
    await AsyncStorage.setItem(MULTIPLAYER_HISTORY_KEY, '"not-an-array"');
    const result = await loadAll();
    expect(result).toEqual([]);
  });

  it('absorbe l\'erreur AsyncStorage et retourne [] sans throw', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('Storage error'));
    await expect(loadAll()).resolves.toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// save
// ─────────────────────────────────────────────────────────────────────────────

describe('save', () => {
  it('insère le nouvel enregistrement en tête de liste', async () => {
    const old = makeRecord('id-old');
    await save(old);

    const newest = makeRecord('id-new');
    await save(newest);

    const stored = JSON.parse(
      (await AsyncStorage.getItem(MULTIPLAYER_HISTORY_KEY)) ?? '[]',
    ) as MultiplayerRecord[];
    expect(stored[0]).toEqual(newest);
    expect(stored[1]).toEqual(old);
  });

  it('tronque à 20 entrées après insertion', async () => {
    // Préremplir avec 20 enregistrements existants
    const existing: MultiplayerRecord[] = Array.from({ length: 20 }, (_, i) =>
      makeRecord(`id-${String(i).padStart(3, '0')}`),
    );
    await AsyncStorage.setItem(MULTIPLAYER_HISTORY_KEY, JSON.stringify(existing));

    // Insérer un 21ème
    const newest = makeRecord('id-newest');
    await save(newest);

    const stored = JSON.parse(
      (await AsyncStorage.getItem(MULTIPLAYER_HISTORY_KEY)) ?? '[]',
    ) as MultiplayerRecord[];
    expect(stored).toHaveLength(20);
    // Le plus récent est en tête
    expect(stored[0]).toEqual(newest);
    // Le plus ancien a été éliminé
    expect(stored.find((r) => r.id === 'id-019')).toBeUndefined();
  });

  it('conserve les 20 premiers si exactement 20 entrées existent déjà', async () => {
    // 19 existants + 1 nouveau = 20 total (pas de troncation)
    const existing: MultiplayerRecord[] = Array.from({ length: 19 }, (_, i) =>
      makeRecord(`id-${String(i)}`),
    );
    await AsyncStorage.setItem(MULTIPLAYER_HISTORY_KEY, JSON.stringify(existing));

    await save(makeRecord('id-new'));

    const stored = JSON.parse(
      (await AsyncStorage.getItem(MULTIPLAYER_HISTORY_KEY)) ?? '[]',
    ) as MultiplayerRecord[];
    expect(stored).toHaveLength(20);
  });

  it('absorbe l\'erreur AsyncStorage sans throw', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('Storage read error'));
    await expect(save(makeRecord('id-fail'))).resolves.toBeUndefined();
  });

  it('retourne un record avec winner null correctement', async () => {
    const record = makeRecord('id-draw', null);
    await save(record);

    const result = await loadAll();
    expect(result[0]).toBeDefined();
    expect(result[0]?.winner).toBeNull();
  });
});
