/**
 * Tests TDD — multiplayer.utils.ts (F3-12)
 *
 * TDD strict : ce fichier est committé AVANT l'implémentation.
 * Les tests doivent être rouges au moment du premier commit.
 */

import type { MultiplayerPlayer } from '../../src/store/multiplayer.store';
import { validatePlayerNames, rankPlayers } from '../../src/utils/multiplayer.utils';

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

function makePlayer(overrides: Partial<MultiplayerPlayer>): MultiplayerPlayer {
  return {
    name: 'Player',
    status: 'done',
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
    expect(result[0]?.name).toBe('Alice');
  });

  it('trie deux gagnants par sauts croissants', () => {
    const a = makePlayer({ name: 'Alice', won: true, jumps: 3, durationMs: 60000 });
    const b = makePlayer({ name: 'Bob', won: true, jumps: 5, durationMs: 30000 });
    const result = rankPlayers([b, a]);
    expect(result[0]?.name).toBe('Alice');
  });

  it('trie par durée si sauts égaux', () => {
    const a = makePlayer({ name: 'Alice', won: true, jumps: 3, durationMs: 90000 });
    const b = makePlayer({ name: 'Bob', won: true, jumps: 3, durationMs: 60000 });
    const result = rankPlayers([a, b]);
    expect(result[0]?.name).toBe('Bob');
  });

  it("conserve l'ordre d'arrivée pour les abandons", () => {
    const a = makePlayer({ name: 'Alice', won: false });
    const b = makePlayer({ name: 'Bob', won: false });
    const result = rankPlayers([a, b]);
    expect(result[0]?.name).toBe('Alice');
    expect(result[1]?.name).toBe('Bob');
  });

  it('retourne un tableau vide si entrée vide', () => {
    expect(rankPlayers([])).toEqual([]);
  });
});
