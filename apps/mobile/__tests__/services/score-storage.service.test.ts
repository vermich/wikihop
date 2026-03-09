/**
 * Tests unitaires — score-storage.service.ts (F3-02)
 *
 * Couvre :
 *   - save : insère en tête, tronque à 50 entrées
 *   - getAll : retourne [] si clé absente
 *   - getAll : retourne les entrées parsées correctement
 *   - deleteRecord : supprime l'entrée avec l'id correspondant
 *   - deleteAll : vide l'historique
 *   - Erreurs AsyncStorage absorbées (pas de throw vers l'appelant)
 *
 * Mock AsyncStorage : déclaré dans apps/mobile/jest.setup.ts
 * (utilise @react-native-async-storage/async-storage/jest/async-storage-mock)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Article, GameRecord } from '@wikihop/shared';

import {
  deleteAll,
  deleteRecord,
  getAll,
  save,
} from '../../src/services/score-storage.service';

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const HISTORY_KEY = '@wikihop/game_history';

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

function makeRecord(id: string, jumps = 3): GameRecord {
  return {
    id,
    startArticle: ARTICLE_PARIS,
    targetArticle: ARTICLE_TOUR_EIFFEL,
    jumps,
    durationMs: 125000,
    startedAt: '2026-03-06T12:00:00.000Z',
    completedAt: '2026-03-06T12:02:05.000Z',
    status: 'won',
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
// getAll
// ─────────────────────────────────────────────────────────────────────────────

describe('getAll', () => {
  it('retourne un tableau vide si la clé est absente', async () => {
    const result = await getAll();
    expect(result).toEqual([]);
  });

  it('retourne les entrées parsées correctement', async () => {
    const records: GameRecord[] = [makeRecord('id-1'), makeRecord('id-2', 5)];
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(records));

    const result = await getAll();
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(records[0]);
    expect(result[1]).toEqual(records[1]);
  });

  it('retourne [] si les données stockées ne sont pas un tableau', async () => {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify({ invalid: true }));
    const result = await getAll();
    expect(result).toEqual([]);
  });

  it('absorbe l\'erreur AsyncStorage et retourne [] sans throw', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('Storage error'));
    await expect(getAll()).resolves.toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// save
// ─────────────────────────────────────────────────────────────────────────────

describe('save', () => {
  it('insère le nouvel enregistrement en tête de liste', async () => {
    const existing = makeRecord('id-old');
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify([existing]));

    const newRecord = makeRecord('id-new');
    await save(newRecord);

    const stored = JSON.parse((await AsyncStorage.getItem(HISTORY_KEY)) ?? '[]') as GameRecord[];
    expect(stored[0]).toEqual(newRecord);
    expect(stored[1]).toEqual(existing);
  });

  it('tronque à 50 entrées après insertion', async () => {
    // Préremplir avec 50 enregistrements existants
    const existing: GameRecord[] = Array.from({ length: 50 }, (_, i) =>
      makeRecord(`id-${String(i).padStart(3, '0')}`),
    );
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(existing));

    // Insérer un 51ème
    const newest = makeRecord('id-newest');
    await save(newest);

    const stored = JSON.parse((await AsyncStorage.getItem(HISTORY_KEY)) ?? '[]') as GameRecord[];
    expect(stored).toHaveLength(50);
    // Le plus récent est en tête
    expect(stored[0]).toEqual(newest);
    // Le plus ancien a été éliminé
    expect(stored.find((r) => r.id === 'id-049')).toBeUndefined();
  });

  it('absorbe l\'erreur AsyncStorage sans throw', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('Storage read error'));
    await expect(save(makeRecord('id-fail'))).resolves.toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// deleteRecord
// ─────────────────────────────────────────────────────────────────────────────

describe('deleteRecord', () => {
  it('supprime l\'entrée correspondant à l\'id fourni', async () => {
    const records: GameRecord[] = [makeRecord('id-a'), makeRecord('id-b'), makeRecord('id-c')];
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(records));

    await deleteRecord('id-b');

    const stored = JSON.parse((await AsyncStorage.getItem(HISTORY_KEY)) ?? '[]') as GameRecord[];
    expect(stored).toHaveLength(2);
    expect(stored.find((r) => r.id === 'id-b')).toBeUndefined();
    expect(stored.find((r) => r.id === 'id-a')).toBeDefined();
    expect(stored.find((r) => r.id === 'id-c')).toBeDefined();
  });

  it('est un no-op si l\'id est absent (ne modifie pas les autres entrées)', async () => {
    const records: GameRecord[] = [makeRecord('id-a'), makeRecord('id-b')];
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(records));

    await deleteRecord('id-inexistant');

    const stored = JSON.parse((await AsyncStorage.getItem(HISTORY_KEY)) ?? '[]') as GameRecord[];
    expect(stored).toHaveLength(2);
  });

  it('absorbe l\'erreur AsyncStorage sans throw', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('Storage error'));
    await expect(deleteRecord('id-any')).resolves.toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// deleteAll
// ─────────────────────────────────────────────────────────────────────────────

describe('deleteAll', () => {
  it('vide l\'historique — getAll retourne [] après', async () => {
    const records: GameRecord[] = [makeRecord('id-1'), makeRecord('id-2')];
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(records));

    await deleteAll();

    const result = await getAll();
    expect(result).toEqual([]);
  });

  it('appelle AsyncStorage.removeItem avec la bonne clé', async () => {
    const removeSpy = jest.spyOn(AsyncStorage, 'removeItem');
    await deleteAll();
    expect(removeSpy).toHaveBeenCalledWith(HISTORY_KEY);
  });

  it('absorbe l\'erreur AsyncStorage sans throw', async () => {
    jest.spyOn(AsyncStorage, 'removeItem').mockRejectedValueOnce(new Error('Storage error'));
    await expect(deleteAll()).resolves.toBeUndefined();
  });
});
