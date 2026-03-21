/**
 * Tests TDD — multiplayer.store.ts — F3-49
 *
 * TDD strict : ce fichier est committé AVANT l'implémentation de recordForfeit.
 * Les tests doivent être rouges au premier commit (l'action n'existe pas encore).
 *
 * Couvre :
 *   - recordForfeit : cas nominal, index invalide, interaction avec advanceToNextPlayer
 *   - Rétrocompatibilité : recordTurnResult ne régresse pas
 */

import { useMultiplayerStore } from '../../src/store/multiplayer.store';
import type { MultiplayerPlayer, MultiplayerPlayerStatus } from '../../src/store/multiplayer.store';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

function makePlayer(overrides: Partial<MultiplayerPlayer> = {}): MultiplayerPlayer {
  return {
    name: 'Player',
    status: 'playing' as MultiplayerPlayerStatus,
    jumps: null,
    durationMs: null,
    won: false,
    ...overrides,
  };
}

const ARTICLE_START = {
  id: '1',
  title: 'Paris',
  url: 'https://fr.m.wikipedia.org/wiki/Paris',
  language: 'fr' as const,
};

const ARTICLE_TARGET = {
  id: '2',
  title: 'Louvre',
  url: 'https://fr.m.wikipedia.org/wiki/Louvre',
  language: 'fr' as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  useMultiplayerStore.setState({
    players: [],
    currentPlayerIndex: 0,
    startArticle: null,
    targetArticle: null,
    isSessionActive: false,
    roundCount: 1,
    currentRound: 1,
    roundHistory: [],
    allPairs: [],
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// recordForfeit — F3-49 — TDD strict
// ─────────────────────────────────────────────────────────────────────────────

describe('recordForfeit', () => {
  it('cas 1 — marque le joueur à l\'index donné : status=forfeit, forfeit=true, won=false, jumps=null, durationMs=null', () => {
    // Préparer un état avec 2 joueurs
    useMultiplayerStore.setState({
      players: [
        makePlayer({ name: 'Alice', status: 'playing', jumps: 3, durationMs: 10000 }),
        makePlayer({ name: 'Bob', status: 'playing' }),
      ],
      currentPlayerIndex: 0,
    });

    useMultiplayerStore.getState().recordForfeit(0);

    const { players } = useMultiplayerStore.getState();
    const alice = players[0];
    expect(alice).toBeDefined();
    if (!alice) return;

    expect(alice.status).toBe('forfeit');
    expect(alice.forfeit).toBe(true);
    expect(alice.won).toBe(false);
    expect(alice.jumps).toBeNull();
    expect(alice.durationMs).toBeNull();
  });

  it('cas 2 — index hors limites → état inchangé', () => {
    const initialPlayers = [
      makePlayer({ name: 'Alice' }),
      makePlayer({ name: 'Bob' }),
    ];
    useMultiplayerStore.setState({ players: initialPlayers });

    useMultiplayerStore.getState().recordForfeit(99);

    const { players } = useMultiplayerStore.getState();
    // L'état n'a pas changé
    expect(players).toHaveLength(2);
    expect(players[0]?.status).toBe('playing');
    expect(players[1]?.status).toBe('playing');
  });

  it('cas 3 — index négatif → état inchangé', () => {
    useMultiplayerStore.setState({
      players: [makePlayer({ name: 'Alice' })],
    });

    useMultiplayerStore.getState().recordForfeit(-1);

    const { players } = useMultiplayerStore.getState();
    expect(players[0]?.status).toBe('playing');
  });

  it('cas 4 — recordForfeit sur l\'index 1 ne modifie pas l\'index 0', () => {
    useMultiplayerStore.setState({
      players: [
        makePlayer({ name: 'Alice', status: 'done', won: true, jumps: 5, durationMs: 8000 }),
        makePlayer({ name: 'Bob', status: 'playing' }),
      ],
    });

    useMultiplayerStore.getState().recordForfeit(1);

    const { players } = useMultiplayerStore.getState();
    const alice = players[0];
    const bob = players[1];

    expect(alice).toBeDefined();
    expect(bob).toBeDefined();
    if (!alice || !bob) return;

    // Alice inchangée
    expect(alice.status).toBe('done');
    expect(alice.won).toBe(true);
    expect(alice.jumps).toBe(5);

    // Bob forfeit
    expect(bob.status).toBe('forfeit');
    expect(bob.forfeit).toBe(true);
  });

  it('cas 5 — après recordForfeit, advanceToNextPlayer incrémente currentPlayerIndex normalement', () => {
    useMultiplayerStore.setState({
      players: [
        makePlayer({ name: 'Alice' }),
        makePlayer({ name: 'Bob' }),
      ],
      currentPlayerIndex: 0,
    });

    useMultiplayerStore.getState().recordForfeit(0);
    useMultiplayerStore.getState().advanceToNextPlayer();

    expect(useMultiplayerStore.getState().currentPlayerIndex).toBe(1);
  });

  it('cas 6 — setupSession puis recordForfeit : le joueur forfeit a le bon statut', () => {
    useMultiplayerStore.getState().setupSession(
      ['Alice', 'Bob', 'Charlie'],
      [{ start: ARTICLE_START, target: ARTICLE_TARGET }],
      1,
    );

    useMultiplayerStore.getState().recordForfeit(1);

    const { players } = useMultiplayerStore.getState();
    const bob = players[1];
    expect(bob).toBeDefined();
    if (!bob) return;
    expect(bob.status).toBe('forfeit');
    expect(bob.forfeit).toBe(true);
    expect(bob.won).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rétrocompatibilité — recordTurnResult ne doit pas régresser
// ─────────────────────────────────────────────────────────────────────────────

describe('recordTurnResult (non-régression F3-49)', () => {
  it('marque un joueur comme done avec ses stats', () => {
    useMultiplayerStore.setState({
      players: [
        makePlayer({ name: 'Alice' }),
        makePlayer({ name: 'Bob' }),
      ],
    });

    useMultiplayerStore.getState().recordTurnResult(0, 4, 12000, true);

    const { players } = useMultiplayerStore.getState();
    const alice = players[0];
    expect(alice).toBeDefined();
    if (!alice) return;
    expect(alice.status).toBe('done');
    expect(alice.jumps).toBe(4);
    expect(alice.durationMs).toBe(12000);
    expect(alice.won).toBe(true);
    // forfeit ne doit PAS être positionné
    expect(alice.forfeit).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MultiplayerRoundResult.forfeit — rétrocompatibilité types
// ─────────────────────────────────────────────────────────────────────────────

describe('MultiplayerRoundResult avec forfeit (F3-49)', () => {
  it('startNextRound inclut le champ forfeit dans le snapshot si le joueur a forfeit', () => {
    useMultiplayerStore.getState().setupSession(
      ['Alice', 'Bob'],
      [
        { start: ARTICLE_START, target: ARTICLE_TARGET },
        { start: ARTICLE_TARGET, target: ARTICLE_START },
      ],
      2,
    );

    // Alice gagne, Bob forfeit
    useMultiplayerStore.getState().recordTurnResult(0, 3, 9000, true);
    useMultiplayerStore.getState().recordForfeit(1);

    // Passer à la manche suivante
    useMultiplayerStore.getState().startNextRound(ARTICLE_TARGET, ARTICLE_START);

    const { roundHistory } = useMultiplayerStore.getState();
    const manche1 = roundHistory[0];
    expect(manche1).toBeDefined();
    if (!manche1) return;

    const bobResult = manche1[1];
    expect(bobResult).toBeDefined();
    if (!bobResult) return;
    expect(bobResult.won).toBe(false);
    // Le snapshot de la manche doit inclure forfeit=true
    expect(bobResult.forfeit).toBe(true);
  });
});
