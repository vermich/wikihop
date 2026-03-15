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

import { validatePlayerNames, rankPlayers, rankPlayersGlobal, rankPlayersGlobalWithRank } from '../../src/utils/multiplayer.utils';

// ─────────────────────────────────────────────────────────────────────────────
// Interface locale pour rankPlayersGlobalWithRank (TDD — implémentation à venir)
// ─────────────────────────────────────────────────────────────────────────────

interface RankEntryWithRank {
  name: string;
  wins: number;
  totalJumps: number;
  totalDurationMs: number;
  rank: number;
}

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

  it('cas 7 — résultat avec jumps null (won=false) ne contribue pas aux stats (rankPlayersGlobal)', () => {
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

// ─────────────────────────────────────────────────────────────────────────────
// rankPlayersGlobalWithRank — F3-33 — TDD strict
// ─────────────────────────────────────────────────────────────────────────────

describe('rankPlayersGlobalWithRank', () => {
  it('cas 1 — 3 joueurs, aucune égalité → ranks 1, 2, 3', () => {
    // Alice : 2 victoires, Bob : 1 victoire, Charlie : 0
    const roundHistory = [
      [
        makeRoundResult({ won: true, jumps: 3, durationMs: 10000 }),
        makeRoundResult({ won: true, jumps: 3, durationMs: 10000 }),
        makeRoundResult({ won: false }),
      ],
      [
        makeRoundResult({ won: true, jumps: 2, durationMs: 8000 }),
        makeRoundResult({ won: false }),
        makeRoundResult({ won: false }),
      ],
    ];
    const result = rankPlayersGlobalWithRank(roundHistory, ['Alice', 'Bob', 'Charlie']);
    expect(result).toHaveLength(3);
    const alice = result.find((r: RankEntryWithRank) => r.name === 'Alice');
    const bob = result.find((r: RankEntryWithRank) => r.name === 'Bob');
    const charlie = result.find((r: RankEntryWithRank) => r.name === 'Charlie');
    expect(alice).toBeDefined();
    expect(bob).toBeDefined();
    expect(charlie).toBeDefined();
    if (!alice || !bob || !charlie) return;
    expect(alice.rank).toBe(1);
    expect(bob.rank).toBe(2);
    expect(charlie.rank).toBe(3);
  });

  it('cas 2 — 2 joueurs ex-aequo sur tout → ranks 1, 1', () => {
    // Alice et Bob : wins=1, totalJumps=3, totalDurationMs=10000
    const roundHistory = [
      [
        makeRoundResult({ won: true, jumps: 3, durationMs: 10000 }),
        makeRoundResult({ won: true, jumps: 3, durationMs: 10000 }),
      ],
    ];
    const result = rankPlayersGlobalWithRank(roundHistory, ['Alice', 'Bob']);
    const alice = result.find((r: RankEntryWithRank) => r.name === 'Alice');
    const bob = result.find((r: RankEntryWithRank) => r.name === 'Bob');
    expect(alice).toBeDefined();
    expect(bob).toBeDefined();
    if (!alice || !bob) return;
    expect(alice.rank).toBe(1);
    expect(bob.rank).toBe(1);
  });

  it('cas 3 — 3 joueurs, les 2 premiers ex-aequo → ranks 1, 1, 3 (pas 2)', () => {
    // Alice et Bob : wins=2, totalJumps=3, totalDurationMs=10000
    // Charlie : wins=1, totalJumps=2, totalDurationMs=5000
    const roundHistory = [
      [
        makeRoundResult({ won: true, jumps: 1, durationMs: 5000 }),
        makeRoundResult({ won: true, jumps: 1, durationMs: 5000 }),
        makeRoundResult({ won: true, jumps: 2, durationMs: 5000 }),
      ],
      [
        makeRoundResult({ won: true, jumps: 2, durationMs: 5000 }),
        makeRoundResult({ won: true, jumps: 2, durationMs: 5000 }),
        makeRoundResult({ won: false }),
      ],
    ];
    const result = rankPlayersGlobalWithRank(roundHistory, ['Alice', 'Bob', 'Charlie']);
    const alice = result.find((r: RankEntryWithRank) => r.name === 'Alice');
    const bob = result.find((r: RankEntryWithRank) => r.name === 'Bob');
    const charlie = result.find((r: RankEntryWithRank) => r.name === 'Charlie');
    expect(alice).toBeDefined();
    expect(bob).toBeDefined();
    expect(charlie).toBeDefined();
    if (!alice || !bob || !charlie) return;
    expect(alice.rank).toBe(1);
    expect(bob.rank).toBe(1);
    // Charlie 3e (pas 2e) car 2 joueurs avant lui ont le même rang 1
    expect(charlie.rank).toBe(3);
  });

  it('cas 4 — tous ex-aequo (wins=0, totalJumps=0, totalDurationMs=0) → tous rank 1', () => {
    const roundHistory = [
      [
        makeRoundResult({ won: false }),
        makeRoundResult({ won: false }),
        makeRoundResult({ won: false }),
      ],
    ];
    const result = rankPlayersGlobalWithRank(roundHistory, ['A', 'B', 'C']);
    result.forEach((r: RankEntryWithRank) => {
      expect(r.rank).toBe(1);
    });
  });

  it('cas 5 — session 1 manche, comportement standard', () => {
    // Alice gagne, Bob abandonne
    const roundHistory = [
      [
        makeRoundResult({ won: true, jumps: 3, durationMs: 5000 }),
        makeRoundResult({ won: false, jumps: null, durationMs: null }),
      ],
    ];
    const result = rankPlayersGlobalWithRank(roundHistory, ['Alice', 'Bob']);
    const alice = result.find((r: RankEntryWithRank) => r.name === 'Alice');
    const bob = result.find((r: RankEntryWithRank) => r.name === 'Bob');
    expect(alice).toBeDefined();
    expect(bob).toBeDefined();
    if (!alice || !bob) return;
    expect(alice.rank).toBe(1);
    expect(alice.wins).toBe(1);
    expect(bob.rank).toBe(2);
    expect(bob.wins).toBe(0);
  });

  it('cas 6 — roundHistory vide : retourne tableau vide', () => {
    const result = rankPlayersGlobalWithRank([], ['Alice', 'Bob']);
    // Tous wins=0, tous rank=1 (cas défensif)
    expect(result).toHaveLength(2);
    result.forEach((r: RankEntryWithRank) => {
      expect(r.wins).toBe(0);
      expect(r.rank).toBe(1);
    });
  });
});
