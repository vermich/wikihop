/**
 * Tests TDD — multiplayer-history.utils.ts (F3-31)
 *
 * TDD strict : ce fichier est committé AVANT l'implémentation.
 * Les tests doivent être rouges au moment du premier commit.
 *
 * Fonctions testées :
 *   - getMultiplayerWinner(roundHistory, playerNames)
 *   - formatMultiplayerDate(isoDate)
 *   - buildMultiplayerRecord(id, date, playerNames, roundCount, roundHistory)
 *
 * Note : interfaces locales pour éviter les imports de type (pattern du projet).
 */

import {
  getMultiplayerWinner,
  formatMultiplayerDate,
  buildMultiplayerRecord,
} from '../../src/utils/multiplayer-history.utils';

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces locales (miroir des types)
// ─────────────────────────────────────────────────────────────────────────────

interface RoundResult {
  jumps: number | null;
  durationMs: number | null;
  won: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// getMultiplayerWinner
// ─────────────────────────────────────────────────────────────────────────────

describe('getMultiplayerWinner', () => {
  // Cas 1 : un joueur gagne toutes les manches → retourne son nom
  it('retourne le nom du gagnant clair', () => {
    const roundHistory: RoundResult[][] = [
      [
        { jumps: 3, durationMs: 10000, won: true },
        { jumps: null, durationMs: null, won: false },
      ],
      [
        { jumps: 2, durationMs: 8000, won: true },
        { jumps: null, durationMs: null, won: false },
      ],
    ];
    const result = getMultiplayerWinner(roundHistory, ['Alice', 'Bob']);
    expect(result).toBe('Alice');
  });

  // Cas 2 : égalité parfaite (wins/jumps/durée identiques) → retourne null
  it('retourne null en cas d\'égalité parfaite', () => {
    const roundHistory: RoundResult[][] = [
      [
        { jumps: 3, durationMs: 10000, won: true },
        { jumps: 3, durationMs: 10000, won: true },
      ],
    ];
    const result = getMultiplayerWinner(roundHistory, ['Alice', 'Bob']);
    expect(result).toBeNull();
  });

  // Cas 3 : égalité en wins, départage par jumps → le joueur avec moins de jumps
  it('départage par jumps quand les victoires sont égales', () => {
    const roundHistory: RoundResult[][] = [
      [
        { jumps: 5, durationMs: 12000, won: true },
        { jumps: 3, durationMs: 15000, won: true },
      ],
    ];
    const result = getMultiplayerWinner(roundHistory, ['Alice', 'Bob']);
    // Bob a 3 jumps vs Alice 5 — Bob gagne
    expect(result).toBe('Bob');
  });

  // Cas 4 : égalité wins + jumps, départage par durée → le joueur plus rapide
  it('départage par durée quand wins et jumps sont égaux', () => {
    const roundHistory: RoundResult[][] = [
      [
        { jumps: 3, durationMs: 15000, won: true },
        { jumps: 3, durationMs: 10000, won: true },
      ],
    ];
    const result = getMultiplayerWinner(roundHistory, ['Alice', 'Bob']);
    // Bob 10s vs Alice 15s — Bob est plus rapide
    expect(result).toBe('Bob');
  });

  // Cas 5 : roundHistory vide → retourne null
  it('retourne null si roundHistory est vide', () => {
    const result = getMultiplayerWinner([], ['Alice', 'Bob']);
    expect(result).toBeNull();
  });

  // Cas 6 : playerNames vide → retourne null
  it('retourne null si playerNames est vide', () => {
    const roundHistory: RoundResult[][] = [
      [{ jumps: 3, durationMs: 10000, won: true }],
    ];
    const result = getMultiplayerWinner(roundHistory, []);
    expect(result).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatMultiplayerDate
// ─────────────────────────────────────────────────────────────────────────────

describe('formatMultiplayerDate', () => {
  // Cas 1 : date standard avec jour et mois à padder
  // Note : le résultat dépend du fuseau horaire local de l'appareil — comportement attendu.
  // On construit la date en UTC et on vérifie le format DD/MM/YYYY avec les méthodes locales.
  it('formate correctement une date ISO 8601 en DD/MM/YYYY', () => {
    // Construction d'une date locale connue pour éviter les problèmes de fuseau UTC
    const localDate = new Date(2026, 2, 5, 14, 30, 0); // 5 mars 2026 à 14h30 (local)
    const isoDate = localDate.toISOString();
    // Le format attendu utilise les méthodes locales (getDate, getMonth, getFullYear)
    // donc la valeur doit correspondre à la date locale construite ci-dessus
    const result = formatMultiplayerDate(isoDate);
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    // Le jour et mois doivent être paddés à 2 chiffres
    expect(result.length).toBe(10);
  });

  it('padde le jour et le mois à 2 chiffres', () => {
    // 5 mars 2026 — jour et mois à 1 chiffre → doivent être paddés
    const localDate = new Date(2026, 2, 5); // mois 0-indexed: 2 = mars
    const isoDate = localDate.toISOString();
    const result = formatMultiplayerDate(isoDate);
    // Le mois doit être '03', le jour '05'
    const parts = result.split('/');
    expect(parts[0]).toBe('05'); // jour
    expect(parts[1]).toBe('03'); // mois
    expect(parts[2]).toBe('2026');
  });

  it('formate correctement décembre (mois 12)', () => {
    const localDate = new Date(2026, 11, 31); // mois 0-indexed: 11 = décembre
    const isoDate = localDate.toISOString();
    const result = formatMultiplayerDate(isoDate);
    const parts = result.split('/');
    expect(parts[1]).toBe('12'); // décembre
    expect(parts[2]).toBe('2026');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildMultiplayerRecord
// ─────────────────────────────────────────────────────────────────────────────

describe('buildMultiplayerRecord', () => {
  const TEST_UUID = '550e8400-e29b-41d4-a716-446655440000';
  const TEST_DATE = new Date(2026, 2, 15).toISOString();

  // Cas 1 : 2 joueurs, 2 manches, gagnant identifiable → record avec winner non null
  it('construit un record avec winner non null quand gagnant identifiable', () => {
    const roundHistory: RoundResult[][] = [
      [
        { jumps: 3, durationMs: 10000, won: true },
        { jumps: null, durationMs: null, won: false },
      ],
      [
        { jumps: 2, durationMs: 8000, won: true },
        { jumps: null, durationMs: null, won: false },
      ],
    ];
    const record = buildMultiplayerRecord(
      TEST_UUID,
      TEST_DATE,
      ['Alice', 'Bob'],
      2,
      roundHistory,
    );

    expect(record.id).toBe(TEST_UUID);
    expect(record.date).toBe(TEST_DATE);
    expect(record.playerNames).toEqual(['Alice', 'Bob']);
    expect(record.roundCount).toBe(2);
    expect(record.roundHistory).toBe(roundHistory);
    expect(record.winner).toBe('Alice');
  });

  // Cas 2 : égalité → winner null
  it('construit un record avec winner null en cas d\'égalité', () => {
    const roundHistory: RoundResult[][] = [
      [
        { jumps: 3, durationMs: 10000, won: true },
        { jumps: 3, durationMs: 10000, won: true },
      ],
    ];
    const record = buildMultiplayerRecord(
      TEST_UUID,
      TEST_DATE,
      ['Alice', 'Bob'],
      1,
      roundHistory,
    );

    expect(record.winner).toBeNull();
  });

  // Cas 3 : roundHistory vide → winner null, roundHistory vide dans le record
  it('construit un record avec roundHistory vide et winner null', () => {
    const record = buildMultiplayerRecord(
      TEST_UUID,
      TEST_DATE,
      ['Alice', 'Bob'],
      1,
      [],
    );

    expect(record.roundHistory).toEqual([]);
    expect(record.winner).toBeNull();
  });
});
