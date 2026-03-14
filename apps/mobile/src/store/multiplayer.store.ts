/**
 * useMultiplayerStore — Store Zustand pour le mode multijoueur local (F3-12)
 *
 * Gère l'état d'une session multijoueur hot-seat :
 *   - Liste des joueurs et leur résultat individuel
 *   - Index du joueur en cours
 *   - Articles (départ + destination) partagés entre tous les joueurs
 *   - isSessionActive : flag pour savoir si une session multijoueur est en cours
 *
 * Pas de persistance AsyncStorage — la session est éphémère (en mémoire uniquement).
 * resetSession() remet tout à zéro (appelée depuis MultiplayerResultScreen).
 *
 * Conventions :
 *   - Export nommé useMultiplayerStore
 *   - Zéro any — typage explicite
 */

import { create } from 'zustand';

import type { Article } from '@wikihop/shared';

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

export interface MultiplayerState {
  players: MultiplayerPlayer[];
  currentPlayerIndex: number;
  startArticle: Article | null;
  targetArticle: Article | null;
  isSessionActive: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────────────────────

interface MultiplayerActions {
  /** Initialise une session avec les noms de joueurs et la paire d'articles. */
  setupSession(players: string[], start: Article, target: Article): void;

  /** Enregistre le résultat du tour du joueur à l'index donné. */
  recordTurnResult(index: number, jumps: number, durationMs: number, won: boolean): void;

  /** Passe au joueur suivant (incrémente currentPlayerIndex). */
  advanceToNextPlayer(): void;

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
};

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useMultiplayerStore = create<MultiplayerState & MultiplayerActions>((set) => ({
  ...initialState,

  setupSession: (playerNames, start, target) => {
    set({
      players: playerNames.map((name) => ({
        name,
        status: 'waiting',
        jumps: null,
        durationMs: null,
        won: false,
      })),
      currentPlayerIndex: 0,
      startArticle: start,
      targetArticle: target,
      isSessionActive: true,
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

  resetSession: () => {
    set(initialState);
  },
}));
