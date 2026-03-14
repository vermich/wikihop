/**
 * Tests TDD — multiplayer.utils.ts (F3-12, F3-28)
 *
 * TDD strict : ce fichier est committé AVANT l'implémentation.
 * Les tests doivent être rouges au moment du premier commit.
 *
 * F3-28 : rankPlayersGlobal — TDD ajouté avant implémentation (2026-03-14)
 *
 * Note : babel-preset-expo + jest-expo ne supporte pas `import type` ni
 * les déclarations de type de niveau module dans les fichiers .ts de test.
 * Les helpers sont typés avec des interfaces locales.
 */

import { validatePlayerNames, rankPlayers, rankPlayersGlobal } from '../../src/utils/multiplayer.utils';

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces locales (miroir des types du store — évite import type)
// ─────────────────────────────────────────────────────────────────────────────

interface PlayerOverrides {
  name?: string;
  status?: 'waiting' | 'playing' | 'done';
  jumps?: number | null;
  durationMs?: number | null;
  won?: boolean;
}

interface RoundResultOverrides {
  jumps?: number | null;
  durationMs?: number | null;
  won?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makePlayer(overrides: PlayerOverrides): {
  name: string;
  status: 'waiting' | 'playing' | 'done';
  jumps: number | null;
  durationMs: number | null;
  won: boolean;
} {
  return {
    name: 'Player',
    status: 'done',
    jumps: null,
    durationMs: null,
    won: false,
    ...overrides,
  };
}

function makeRoundResult(overrides: RoundResultOverrides): {
  jumps: number | null;
  durationMs: number | null;
  won: boolean;
} {
  return {
    jumps: null,
    durationMs: null,
    won: false,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// validatePlayerNames
// ─────────────────────────────────────────────────────────────────────────────

describe('validatePlayerNames', () => {
  it('retourne une erreur si moins de 2 joueurs (tableau vide)', () => {
    expect(validatePlayerNames([])).toContain('Minimum 2 joueurs requis.');
  });

  it('retourne une erreur si moins de 2 joueurs (1 seul joueur)', () => {
    expect(validatePlayerNames(['Alice'])).toContain('Minimum 2 joueurs requis.');
  });

  it('retourne vide si 2 joueurs valides', () => {
    expect(validatePlayerNames(['Alice', 'Bob'])).toEqual([]);
  });

  it('retourne une erreur si un nom est vide', () => {
    expect(validatePlayerNames(['Alice', ''])).toContain('Le nom du joueur 2 est requis.');
  });

  it('accepte 6 joueurs', () => {
    expect(validatePlayerNames(['A', 'B', 'C', 'D', 'E', 'F'])).toEqual([]);
  });

  it('retourne une erreur si plus de 6 joueurs', () => {
    expect(validatePlayerNames(['A', 'B', 'C', 'D', 'E', 'F', 'G'])).toContain('Maximum 6 joueurs autorisés.');
  });

  it('traite les noms avec espaces uniquement comme vides', () => {
    expect(validatePlayerNames(['  ', 'Bob'])).toContain('Le nom du joueur 1 est requis.');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// rankPlayers
// ─────────────────────────────────────────────────────────────────────────────

describe('rankPlayers', () => {
  it('place le gagnant avant un abandonné', () => {
    const winner = makePlayer({ name: 'Alice', won: true, jumps: 5, durationMs: 60000 });
    const loser = makePlayer({ name: 'Bob', won: false });
    const result = rankPlayers([loser, winner]);
    const first = result[0];
    expect(first).toBeDefined();
    if (!first) return;
    expect(first.name).toBe('Alice');
  });

  it('trie deux gagnants par sauts croissants', () => {
    const a = makePlayer({ name: 'Alice', won: true, jumps: 3, durationMs: 60000 });
    const b = makePlayer({ name: 'Bob', won: true, jumps: 5, durationMs: 30000 });
    const result = rankPlayers([b, a]);
    const first = result[0];
    expect(first).toBeDefined();
    if (!first) return;
    expect(first.name).toBe('Alice');
  });

  it('trie par durée si sauts égaux', () => {
    const a = makePlayer({ name: 'Alice', won: true, jumps: 3, durationMs: 90000 });
    const b = makePlayer({ name: 'Bob', won: true, jumps: 3, durationMs: 60000 });
    const result = rankPlayers([a, b]);
    const first = result[0];
    expect(first).toBeDefined();
    if (!first) return;
    expect(first.name).toBe('Bob');
  });

  it("conserve l'ordre d'arrivée pour les abandons", () => {
    const a = makePlayer({ name: 'Alice', won: false });
    const b = makePlayer({ name: 'Bob', won: false });
    const result = rankPlayers([a, b]);
    const first = result[0];
    const second = result[1];
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (!first || !second) return;
    expect(first.name).toBe('Alice');
    expect(second.name).toBe('Bob');
  });

  it('retourne un tableau vide si entrée vide', () => {
    expect(rankPlayers([])).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// rankPlayersGlobal — F3-28 — TDD strict
// ─────────────────────────────────────────────────────────────────────────────

describe('rankPlayersGlobal', () => {
  it('cas 1 — classement par victoires (A gagne 2 manches, B gagne 1 manche)', () => {
    const roundHistory = [
      [
        makeRoundResult({ won: true, jumps: 3, durationMs: 10000 }),
        makeRoundResult({ won: false }),
      ],
      [
        makeRoundResult({ won: true, jumps: 4, durationMs: 12000 }),
        makeRoundResult({ won: true, jumps: 5, durationMs: 8000 }),
      ],
    ];
    const result = rankPlayersGlobal(roundHistory, ['A', 'B']);
    const first = result[0];
    const second = result[1];
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (!first || !second) return;
    expect(first.name).toBe('A');
    expect(first.wins).toBe(2);
    expect(second.name).toBe('B');
    expect(second.wins).toBe(1);
  });

  it('cas 2 — égalité victoires, tri par sauts (A=8 sauts, B=5 sauts → B premier)', () => {
    const roundHistory = [
      [
        makeRoundResult({ won: true, jumps: 4, durationMs: 10000 }),
        makeRoundResult({ won: true, jumps: 2, durationMs: 10000 }),
      ],
      [
        makeRoundResult({ won: true, jumps: 4, durationMs: 10000 }),
        makeRoundResult({ won: true, jumps: 3, durationMs: 10000 }),
      ],
    ];
    const result = rankPlayersGlobal(roundHistory, ['A', 'B']);
    const first = result[0];
    const second = result[1];
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (!first || !second) return;
    expect(first.name).toBe('B');
    expect(first.totalJumps).toBe(5);
    expect(second.name).toBe('A');
    expect(second.totalJumps).toBe(8);
  });

  it('cas 3 — égalité victoires + sauts, tri par durée (A=12000ms, B=9000ms → B premier)', () => {
    const roundHistory = [
      [
        makeRoundResult({ won: true, jumps: 3, durationMs: 6000 }),
        makeRoundResult({ won: true, jumps: 3, durationMs: 4000 }),
      ],
      [
        makeRoundResult({ won: true, jumps: 3, durationMs: 6000 }),
        makeRoundResult({ won: true, jumps: 3, durationMs: 5000 }),
      ],
    ];
    const result = rankPlayersGlobal(roundHistory, ['A', 'B']);
    const first = result[0];
    const second = result[1];
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (!first || !second) return;
    expect(first.name).toBe('B');
    expect(first.totalDurationMs).toBe(9000);
    expect(second.name).toBe('A');
    expect(second.totalDurationMs).toBe(12000);
  });

  it('cas 4 — aucune victoire : tous wins=0, ordre préservé', () => {
    const roundHistory = [
      [makeRoundResult({ won: false }), makeRoundResult({ won: false })],
    ];
    const result = rankPlayersGlobal(roundHistory, ['Alice', 'Bob']);
    const first = result[0];
    const second = result[1];
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (!first || !second) return;
    expect(first.wins).toBe(0);
    expect(second.wins).toBe(0);
    expect(first.name).toBe('Alice');
    expect(second.name).toBe('Bob');
  });

  it('cas 5 — 3 joueurs, 2 manches (agrégation correcte)', () => {
    const roundHistory = [
      [
        makeRoundResult({ won: true, jumps: 3, durationMs: 10000 }),
        makeRoundResult({ won: true, jumps: 5, durationMs: 8000 }),
        makeRoundResult({ won: false }),
      ],
      [
        makeRoundResult({ won: false }),
        makeRoundResult({ won: true, jumps: 2, durationMs: 7000 }),
        makeRoundResult({ won: true, jumps: 4, durationMs: 9000 }),
      ],
    ];
    const result = rankPlayersGlobal(roundHistory, ['A', 'B', 'C']);
    const first = result[0];
    const second = result[1];
    const third = result[2];
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(third).toBeDefined();
    if (!first || !second || !third) return;
    expect(first.name).toBe('B');
    expect(first.wins).toBe(2);
    expect(first.totalJumps).toBe(7);
    expect(first.totalDurationMs).toBe(15000);
    expect(second.name).toBe('A');
    expect(third.name).toBe('C');
  });

  it('cas 6 — roundHistory vide : tous wins=0, totalJumps=0, totalDurationMs=0', () => {
    const result = rankPlayersGlobal([], ['Alice', 'Bob']);
    expect(result).toHaveLength(2);
    result.forEach((r) => {
      expect(r.wins).toBe(0);
      expect(r.totalJumps).toBe(0);
      expect(r.totalDurationMs).toBe(0);
    });
  });

  it('cas 7 — résultat avec jumps null (won=false) ne contribue pas aux stats', () => {
    const roundHistory = [
      [
        makeRoundResult({ won: true, jumps: 5, durationMs: 10000 }),
        makeRoundResult({ won: false, jumps: null, durationMs: null }),
      ],
    ];
    const result = rankPlayersGlobal(roundHistory, ['A', 'B']);
    const bResult = result.find((r) => r.name === 'B');
    expect(bResult).toBeDefined();
    if (!bResult) return;
    expect(bResult.wins).toBe(0);
    expect(bResult.totalJumps).toBe(0);
    expect(bResult.totalDurationMs).toBe(0);
  });
});
