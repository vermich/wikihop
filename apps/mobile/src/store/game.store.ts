/**
 * Game Store — WikiHop Mobile — Phase 2
 *
 * Store Zustand pour la gestion de la session de jeu courante.
 * Remplace l'implémentation minimale Phase 1 (startGame/endGame/abandonGame).
 *
 * Références :
 *   ADR-005 : Persistance locale via AsyncStorage (clé @wikihop/game_session)
 *   ADR-007 : Architecture store Zustand — slices, persistance explicite
 *   Story   : docs/stories/M-07-game-session-model.md
 *
 * Conventions :
 *   - Export nommé : useGameStore
 *   - Persistance AsyncStorage déclenchée explicitement dans chaque action mutante
 *   - PAS de zustand/middleware/persist (voir ADR-005 et ADR-007)
 *   - Les erreurs AsyncStorage sont loguées (console.error) mais ne bloquent jamais l'UI
 *
 * Sélecteur calculé (ne PAS chercher un champ isLanguageLocked dans le store) :
 *   const isLanguageLocked = useGameStore(
 *     (state) => state.currentSession?.status === 'in_progress'
 *   );
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Article, GameSession } from '@wikihop/shared';
import { create } from 'zustand';

/**
 * Génère un UUID v4 conforme RFC 4122 sans dépendance sur l'API Web Crypto.
 *
 * Motivation : `crypto.randomUUID()` n'est pas disponible sur le moteur Hermes
 * utilisé par React Native / Expo sur device physique (voir bug ReferenceError
 * "Property 'crypto' doesn't exist").
 *
 * L'implémentation suit le format xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx :
 *   - version  : 4 (nibble haut du 3e groupe = 0x4)
 *   - variante : 8, 9, a ou b (bits 7-6 du 4e groupe = 0b10)
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Clé AsyncStorage de la session courante (ADR-005) */
const STORAGE_KEY = '@wikihop/game_session';

// ─────────────────────────────────────────────────────────────────────────────
// Interface du slice gameSession
// ─────────────────────────────────────────────────────────────────────────────

interface GameSessionSlice {
  // ── État ────────────────────────────────────────────────────────────────────
  /** Session en cours. null = aucune partie active. */
  currentSession: GameSession | null;
  /**
   * Vaut true une fois que hydrate() a terminé sa lecture AsyncStorage.
   * Les écrans doivent afficher un indicateur de chargement tant que isHydrated === false.
   */
  isHydrated: boolean;

  // ── Actions ─────────────────────────────────────────────────────────────────
  /**
   * Démarre une nouvelle session avec les deux articles fournis.
   * Génère un UUID v4 via crypto.randomUUID() (disponible Hermes / RN 0.74+).
   * Persiste immédiatement dans AsyncStorage.
   */
  startSession: (startArticle: Article, targetArticle: Article) => Promise<void>;

  /**
   * Alias sémantique de addJump — conservé pour que les composants
   * puissent nommer leur point d'appel de façon explicite.
   * En interne, délègue à addJump.
   */
  updateCurrentArticle: (article: Article) => Promise<void>;

  /**
   * Enregistre un saut vers un nouvel article.
   * Guards : ne fait rien si currentSession est null ou status !== 'in_progress'.
   * Invariant maintenu : après chaque addJump, session.jumps === session.path.length - 1.
   */
  addJump: (article: Article) => Promise<void>;

  /**
   * Termine la session en victoire.
   * Guard : ne fait rien si currentSession est null.
   */
  completeSession: () => Promise<void>;

  /**
   * Abandonne la session en cours.
   * Guard : ne fait rien si currentSession est null.
   * Le JSON persisté reste conforme à GameSession pour F3-02 (ADR-007).
   */
  abandonSession: () => Promise<void>;

  /**
   * Restaure une session depuis AsyncStorage dans le store (action synchrone).
   * Utilisée uniquement par hydrate(). Ne persiste pas (la donnée vient déjà d'AsyncStorage).
   */
  restoreSession: (session: GameSession) => void;

  /**
   * Remet currentSession à null et supprime la clé AsyncStorage.
   */
  clearSession: () => Promise<void>;

  /**
   * Réhydrate le store depuis AsyncStorage au démarrage de l'app.
   * - Ne doit être appelée qu'une seule fois, depuis App.tsx (useEffect).
   * - Reconstitue les Date (startedAt, completedAt) depuis les chaînes ISO 8601.
   * - En cas de JSON malformé : appelle clearSession() pour repartir propre.
   * - Toujours termine par set({ isHydrated: true }), même en cas d'erreur.
   * - N'écrit jamais dans AsyncStorage (éco-conception : 1 seule lecture au boot).
   */
  hydrate: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers internes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Persiste la session dans AsyncStorage.
 * Les erreurs sont loguées mais ne bloquent pas l'appelant.
 */
async function persistSession(session: GameSession): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (e: unknown) {
    console.error('[game.store] Erreur AsyncStorage.setItem :', e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Store Zustand
// ─────────────────────────────────────────────────────────────────────────────

export const useGameStore = create<GameSessionSlice>()((set, get) => ({
  currentSession: null,
  isHydrated: false,

  startSession: async (startArticle: Article, targetArticle: Article): Promise<void> => {
    const session: GameSession = {
      id: generateUUID(),
      startArticle,
      targetArticle,
      path: [startArticle],
      jumps: 0,
      startedAt: new Date(),
      status: 'in_progress',
    };
    set({ currentSession: session });
    await persistSession(session);
  },

  updateCurrentArticle: async (article: Article): Promise<void> => {
    await get().addJump(article);
  },

  addJump: async (article: Article): Promise<void> => {
    const { currentSession } = get();

    // Guards : session absente ou partie non en cours
    if (currentSession === null || currentSession.status !== 'in_progress') {
      return;
    }

    const newPath = [...currentSession.path, article];
    // Invariant : jumps === path.length - 1
    // Après le push, newPath.length = ancienne longueur + 1
    // donc jumps = newPath.length - 1
    const newJumps = newPath.length - 1;

    const updatedSession: GameSession = {
      ...currentSession,
      path: newPath,
      jumps: newJumps,
    };

    set({ currentSession: updatedSession });
    await persistSession(updatedSession);
  },

  completeSession: async (): Promise<void> => {
    const { currentSession } = get();

    if (currentSession === null) {
      return;
    }

    const updatedSession: GameSession = {
      ...currentSession,
      status: 'won',
      completedAt: new Date(),
    };

    set({ currentSession: updatedSession });
    await persistSession(updatedSession);
  },

  abandonSession: async (): Promise<void> => {
    const { currentSession } = get();

    if (currentSession === null) {
      return;
    }

    const updatedSession: GameSession = {
      ...currentSession,
      status: 'abandoned',
      completedAt: new Date(),
    };

    set({ currentSession: updatedSession });
    await persistSession(updatedSession);
  },

  restoreSession: (session: GameSession): void => {
    set({ currentSession: session });
  },

  clearSession: async (): Promise<void> => {
    set({ currentSession: null });
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (e: unknown) {
      console.error('[game.store] Erreur AsyncStorage.removeItem :', e);
    }
  },

  hydrate: async (): Promise<void> => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);

      if (raw !== null) {
        // JSON.parse retransmet startedAt et completedAt comme des strings ISO 8601.
        // On reconstitue les Date explicitement, champ par champ, pour satisfaire
        // exactOptionalPropertyTypes (ne jamais spreader completedAt: string
        // et espérer que TS l'accepte comme Date | undefined).
        const parsed = JSON.parse(raw) as {
          id: string;
          startArticle: Article;
          targetArticle: Article;
          path: Article[];
          jumps: number;
          startedAt: string;
          completedAt?: string;
          status: GameSession['status'];
        };

        // Construction explicite sans spread du type intermédiaire,
        // pour que exactOptionalPropertyTypes soit satisfait dans les deux branches.
        const session: GameSession =
          parsed.completedAt !== undefined
            ? {
                id: parsed.id,
                startArticle: parsed.startArticle,
                targetArticle: parsed.targetArticle,
                path: parsed.path,
                jumps: parsed.jumps,
                startedAt: new Date(parsed.startedAt),
                completedAt: new Date(parsed.completedAt),
                status: parsed.status,
              }
            : {
                id: parsed.id,
                startArticle: parsed.startArticle,
                targetArticle: parsed.targetArticle,
                path: parsed.path,
                jumps: parsed.jumps,
                startedAt: new Date(parsed.startedAt),
                status: parsed.status,
              };

        get().restoreSession(session);
      }
    } catch (e: unknown) {
      console.error('[game.store] Erreur lors de la réhydratation :', e);
      // JSON malformé ou lecture impossible : on repart propre
      await get().clearSession();
    } finally {
      // isHydrated passe à true dans tous les cas (succès, vide, erreur)
      set({ isHydrated: true });
    }
  },
}));
