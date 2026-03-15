/**
 * useMultiplayerStore — Store Zustand pour le mode multijoueur local (F3-12, F3-28, F3-32)
 *
 * Gère l'état d'une session multijoueur hot-seat :
 *   - Liste des joueurs et leur résultat individuel
 *   - Index du joueur en cours
 *   - Articles (départ + destination) partagés entre tous les joueurs
 *   - isSessionActive : flag pour savoir si une session multijoueur est en cours
 *   - roundCount / currentRound / roundHistory : manches configurables (F3-28)
 *   - allPairs : paires préchargées pour toutes les manches (F3-32)
 *
 * Pas de persistance AsyncStorage — la session est éphémère (en mémoire uniquement).
 * resetSession() remet tout à zéro (appelée depuis MultiplayerResultScreen).
 *
 * Conventions :
 *   - Export nommé useMultiplayerStore
 *   - Zéro any — typage explicite
 */

import type { Article } from '@wikihop/shared';
import { create } from 'zustand';

// ─────────────────────────────────────────────────────────────────────────────
// Types publics (exportés — utilisés dans les tests et les composants)
// ─────────────────────────────────────────────────────────────────────────────

export type MultiplayerPlayerStatus = 'waiting' | 'playing' | 'done';

export interface MultiplayerPlayer {
  name: string;
  status: MultiplayerPlayerStatus;
  jumps: number | null;
  durationMs: number | null;
  won: boolean;
}

/**
 * Résultat d'un joueur pour une manche donnée.
 * null = joueur qui n'a pas encore joué (ne devrait pas arriver en pratique).
 */
export interface MultiplayerRoundResult {
  jumps: number | null;
  durationMs: number | null;
  won: boolean;
}

export interface MultiplayerState {
  players: MultiplayerPlayer[];
  currentPlayerIndex: number;
  startArticle: Article | null;
  targetArticle: Article | null;
  isSessionActive: boolean;
  /** Nombre total de manches configurées (1-5). Défaut : 1. */
  roundCount: number;
  /** Manche courante, commence à 1. */
  currentRound: number;
  /**
   * Historique des résultats par manche.
   * roundHistory[roundIndex][playerIndex] = résultat du joueur pour cette manche.
   * Rempli par startNextRound() à chaque transition de manche.
   */
  roundHistory: MultiplayerRoundResult[][];
  /**
   * Paires préchargées pour toutes les manches — F3-32.
   * allPairs[i] = paire de la manche i+1.
   * Rempli par setupSession() depuis MultiplayerSetupScreen.
   * Utilisé par MultiplayerRoundTransitionScreen pour éviter un fetch dynamique.
   */
  allPairs: Array<{ start: Article; target: Article }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────────────────────

interface MultiplayerActions {
  /**
   * Initialise une session avec les noms de joueurs, le tableau de paires préchargées,
   * et le nombre de manches.
   *
   * @param players    - Noms des joueurs (2 à 6)
   * @param pairs      - Tableau de paires préchargées. pairs.length DOIT être égal à roundCount.
   *                     pairs[0] = paire manche 1, pairs[1] = paire manche 2, etc.
   * @param roundCount - Nombre de manches configurées (défaut : 1)
   */
  setupSession(
    players: string[],
    pairs: Array<{ start: Article; target: Article }>,
    roundCount?: number,
  ): void;

  /** Enregistre le résultat du tour du joueur à l'index donné. */
  recordTurnResult(index: number, jumps: number, durationMs: number, won: boolean): void;

  /** Passe au joueur suivant (incrémente currentPlayerIndex). */
  advanceToNextPlayer(): void;

  /**
   * Transition vers la manche suivante.
   * - Sauvegarde les résultats des joueurs de la manche courante dans roundHistory
   * - Remet les joueurs en état 'waiting' avec jumps/durationMs/won à zéro
   * - Remet currentPlayerIndex à 0
   * - Incrémente currentRound
   * - Met à jour startArticle et targetArticle pour la nouvelle manche
   */
  startNextRound(start: Article, target: Article): void;

  /**
   * Repart depuis le début avec de nouvelles paires et les mêmes joueurs.
   * Utilisé par F3-29 (bouton Rejouer).
   * - Reset players[].status à 'waiting', jumps/durationMs à null, won à false
   * - currentRound = 1
   * - roundHistory = []
   * - currentPlayerIndex = 0
   * - Met à jour allPairs, startArticle et targetArticle
   *
   * @param pairs - Tableau de paires (longueur = roundCount)
   */
  restartSession(pairs: Array<{ start: Article; target: Article }>): void;

  /** Réinitialise complètement la session multijoueur. */
  resetSession(): void;
}

// ─────────────────────────────────────────────────────────────────────────────
// État initial
// ─────────────────────────────────────────────────────────────────────────────

const initialState: MultiplayerState = {
  players: [],
  currentPlayerIndex: 0,
  startArticle: null,
  targetArticle: null,
  isSessionActive: false,
  roundCount: 1,
  currentRound: 1,
  roundHistory: [],
  allPairs: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useMultiplayerStore = create<MultiplayerState & MultiplayerActions>((set) => ({
  ...initialState,

  setupSession: (playerNames, pairs, roundCount = 1) => {
    const firstPair = pairs[0];
    set({
      players: playerNames.map((name) => ({
        name,
        status: 'waiting',
        jumps: null,
        durationMs: null,
        won: false,
      })),
      currentPlayerIndex: 0,
      allPairs: pairs,
      startArticle: firstPair?.start ?? null,
      targetArticle: firstPair?.target ?? null,
      isSessionActive: true,
      roundCount,
      currentRound: 1,
      roundHistory: [],
    });
  },

  recordTurnResult: (index, jumps, durationMs, won) => {
    set((state) => {
      const updated = [...state.players];
      const player = updated[index];
      if (player === undefined) return state;
      updated[index] = { ...player, status: 'done', jumps, durationMs, won };
      return { players: updated };
    });
  },

  advanceToNextPlayer: () => {
    set((state) => ({ currentPlayerIndex: state.currentPlayerIndex + 1 }));
  },

  startNextRound: (start, target) => {
    set((state) => {
      // Construire le snapshot de la manche courante
      const roundSnapshot: MultiplayerRoundResult[] = state.players.map((p) => ({
        jumps: p.jumps,
        durationMs: p.durationMs,
        won: p.won,
      }));

      return {
        roundHistory: [...state.roundHistory, roundSnapshot],
        players: state.players.map((p) => ({
          ...p,
          status: 'waiting' as MultiplayerPlayerStatus,
          jumps: null,
          durationMs: null,
          won: false,
        })),
        currentPlayerIndex: 0,
        currentRound: state.currentRound + 1,
        startArticle: start,
        targetArticle: target,
      };
    });
  },

  restartSession: (pairs) => {
    const firstPair = pairs[0];
    set((state) => ({
      players: state.players.map((p) => ({
        ...p,
        status: 'waiting' as MultiplayerPlayerStatus,
        jumps: null,
        durationMs: null,
        won: false,
      })),
      currentPlayerIndex: 0,
      currentRound: 1,
      roundHistory: [],
      allPairs: pairs,
      startArticle: firstPair?.start ?? null,
      targetArticle: firstPair?.target ?? null,
    }));
  },

  resetSession: () => {
    set(initialState);
  },
}));
