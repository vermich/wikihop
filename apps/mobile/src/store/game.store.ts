/**
 * Game Store — WikiHop Mobile
 *
 * Store Zustand pour la gestion de la session de jeu courante.
 * Phase 1 : structure minimale typée, actions complètes en Phase 2.
 *
 * ADR-002 : Zustand pour le state management global
 * Convention : export nommé du hook useGameStore
 */

import type { GameSession } from '@wikihop/shared';
import { create } from 'zustand';

/**
 * État et actions du store de jeu.
 *
 * currentSession : null si aucune partie en cours.
 * Les actions métier complètes (navigation Wikipedia, comptage de sauts)
 * seront ajoutées en Phase 2 (stories M-02+).
 */
interface GameState {
  /** Session de jeu en cours, null si aucune partie active */
  currentSession: GameSession | null;
  /**
   * Démarre une nouvelle session de jeu.
   * Phase 2 : créera la session via le backend.
   */
  startGame: (session: GameSession) => void;
  /**
   * Termine la session en cours (victoire).
   * Phase 2 : enverra le résultat au backend.
   */
  endGame: () => void;
  /**
   * Abandonne la session en cours.
   * Phase 2 : notifiera le backend de l'abandon.
   */
  abandonGame: () => void;
}

export const useGameStore = create<GameState>()((set) => ({
  currentSession: null,

  startGame: (session: GameSession): void => {
    set({ currentSession: session });
  },

  endGame: (): void => {
    set((state) => {
      if (state.currentSession === null) {
        return state;
      }
      return {
        currentSession: {
          ...state.currentSession,
          status: 'won' as const,
          completedAt: new Date(),
        },
      };
    });
  },

  abandonGame: (): void => {
    set((state) => {
      if (state.currentSession === null) {
        return state;
      }
      return {
        currentSession: {
          ...state.currentSession,
          status: 'abandoned' as const,
          completedAt: new Date(),
        },
      };
    });
  },
}));
