/**
 * Game Store — WikiHop Mobile — Phase 2 + F3-13
 *
 * Store Zustand pour la gestion de la session de jeu courante.
 * Remplace l'implémentation minimale Phase 1 (startGame/endGame/abandonGame).
 *
 * Références :
 *   ADR-005 : Persistance locale via AsyncStorage (clé @wikihop/game_session)
 *   ADR-007 : Architecture store Zustand — slices, persistance explicite
 *   Story   : docs/stories/M-07-game-session-model.md
 *   Story   : docs/stories/phase-3/F3-13-dev-mode.md (isDevMode, toggleDevMode)
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
import type { Article, GameDifficulty, GameSession } from '@wikihop/shared';
import { create } from 'zustand';

import * as ScoreStorage from '../services/score-storage.service';
import { buildGameRecord } from '../utils/history.utils';

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

/** Clé AsyncStorage du mode développeur (F3-13) */
const DEV_MODE_STORAGE_KEY = '@wikihop/dev_mode';

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

  // ── État mode développeur ────────────────────────────────────────────────────
  /** Actif uniquement pendant les sessions de développement/test. */
  isDevMode: boolean;

  // ── Actions ─────────────────────────────────────────────────────────────────
  /**
   * Démarre une nouvelle session avec les deux articles fournis.
   * Génère un UUID v4 via crypto.randomUUID() (disponible Hermes / RN 0.74+).
   * Persiste immédiatement dans AsyncStorage.
   *
   * @param options.isDailyChallenge - true si c'est un défi quotidien (F3-01)
   * @param options.dailyChallengeDate - Date YYYY-MM-DD du défi (F3-01)
   * @param options.difficulty - Niveau de difficulté (F3-05), défaut 'normal'
   */
  startSession: (
    startArticle: Article,
    targetArticle: Article,
    options?: {
      isDailyChallenge?: boolean;
      dailyChallengeDate?: string;
      difficulty?: GameDifficulty;
    },
  ) => Promise<void>;

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
   * - Lit aussi DEV_MODE_STORAGE_KEY avec guard __DEV__ && parsed === true (F3-13).
   */
  hydrate: () => Promise<void>;

  /**
   * Bascule le mode développeur et persiste l'état dans AsyncStorage.
   * Ne fait rien si __DEV__ est false (build de production).
   */
  toggleDevMode: () => Promise<void>;
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
  isDevMode: false,

  startSession: async (
    startArticle: Article,
    targetArticle: Article,
    options?: {
      isDailyChallenge?: boolean;
      dailyChallengeDate?: string;
      difficulty?: GameDifficulty;
    },
  ): Promise<void> => {
    // Construction de la session — exactOptionalPropertyTypes :
    // les champs optionnels ne sont jamais affectés à undefined explicitement.
    // On construit le socle commun puis on enrichit selon les options.
    const baseSession = {
      id: generateUUID(),
      startArticle,
      targetArticle,
      path: [startArticle],
      jumps: 0,
      startedAt: new Date(),
      status: 'in_progress' as const,
      // difficulty est toujours présent (valeur par défaut 'normal')
      // pour garantir que les sessions créées avec options ont toujours le champ
      difficulty: options?.difficulty ?? 'normal' as GameDifficulty,
    };

    // Ajout conditionnel des champs isDailyChallenge et dailyChallengeDate
    // via spread conditionnel (conforme exactOptionalPropertyTypes)
    const session: GameSession =
      options?.isDailyChallenge === true && options.dailyChallengeDate !== undefined
        ? {
            ...baseSession,
            isDailyChallenge: true,
            dailyChallengeDate: options.dailyChallengeDate,
          }
        : baseSession;

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

    // Historique best-effort : fire-and-forget intentionnel (void).
    // Une erreur AsyncStorage ne doit jamais bloquer la navigation vers VictoryScreen.
    const record = buildGameRecord(updatedSession);
    if (record !== null) {
      void ScoreStorage.save(record);
    }
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

    // Historique best-effort : fire-and-forget intentionnel (void).
    // Une erreur AsyncStorage ne doit jamais bloquer le retour à HomeScreen.
    const record = buildGameRecord(updatedSession);
    if (record !== null) {
      void ScoreStorage.save(record);
    }
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
          isDailyChallenge?: boolean;
          dailyChallengeDate?: string;
          difficulty?: GameDifficulty;
        };

        // Construction explicite sans spread du type intermédiaire,
        // pour que exactOptionalPropertyTypes soit satisfait dans toutes les branches.
        //
        // Les champs optionnels (isDailyChallenge, dailyChallengeDate, difficulty)
        // sont propagés via spread conditionnel conforme à exactOptionalPropertyTypes.
        // difficulty utilise ?? 'normal' pour la rétrocompatibilité des sessions
        // persistées avant F3-05 (champ absent → traité comme 'normal').

        const optionalFields = {
          // difficulty : toujours présent après désérialisation (default 'normal')
          difficulty: parsed.difficulty ?? ('normal' as GameDifficulty),
          // Champs défi quotidien : spread conditionnel
          ...(parsed.isDailyChallenge === true ? { isDailyChallenge: true as const } : {}),
          ...(parsed.dailyChallengeDate !== undefined
            ? { dailyChallengeDate: parsed.dailyChallengeDate }
            : {}),
        };

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
                ...optionalFields,
              }
            : {
                id: parsed.id,
                startArticle: parsed.startArticle,
                targetArticle: parsed.targetArticle,
                path: parsed.path,
                jumps: parsed.jumps,
                startedAt: new Date(parsed.startedAt),
                status: parsed.status,
                ...optionalFields,
              };

        get().restoreSession(session);
      }
    } catch (e: unknown) {
      console.error('[game.store] Erreur lors de la réhydratation :', e);
      // JSON malformé ou lecture impossible : on repart propre
      await get().clearSession();
    }

    // Lecture du mode dev (best-effort — ne bloque pas l'hydratation)
    try {
      const rawDevMode = await AsyncStorage.getItem(DEV_MODE_STORAGE_KEY);
      if (rawDevMode !== null) {
        const parsedDevMode = JSON.parse(rawDevMode) as boolean;
        if (__DEV__ && parsedDevMode === true) {
          set({ isDevMode: true });
        }
      }
    } catch {
      // Ignoré silencieusement — le mode dev n'est pas critique
    }

    // isHydrated passe à true dans tous les cas (succès, vide, erreur)
    set({ isHydrated: true });
  },

  toggleDevMode: async (): Promise<void> => {
    // Guard production : ne jamais activer en build release
    if (!__DEV__) return;

    const next = !get().isDevMode;
    set({ isDevMode: next });

    try {
      await AsyncStorage.setItem(DEV_MODE_STORAGE_KEY, JSON.stringify(next));
    } catch (e: unknown) {
      console.error('[game.store] Erreur persistance dev_mode :', e);
    }
  },
}));
