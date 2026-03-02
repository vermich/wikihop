/**
 * Language Store — WikiHop Mobile — Phase 2 (M-12)
 *
 * Store Zustand pour la gestion de la langue active.
 * Slice indépendante de game.store.ts — les deux coexistent.
 *
 * Références :
 *   ADR-005 : Persistance locale via AsyncStorage (clé @wikihop/language)
 *   ADR-007 : Architecture store Zustand — sélecteurs calculés, persistance explicite
 *   Story   : docs/stories/M-12-language-support.md
 *
 * Conventions :
 *   - Export nommé : useLanguageStore
 *   - isLanguageLocked est un sélecteur calculé (PAS un champ du store — ADR-007)
 *   - Accès inter-store via useGameStore.getState() (jamais de hook dans un store)
 *   - Persistance AsyncStorage déclenchée explicitement dans setLanguage
 *   - finally obligatoire dans hydrateLanguage pour garantir isLanguageHydrated: true
 *   - PAS de zustand/middleware/persist (voir ADR-005 et ADR-007)
 *
 * Sélecteur calculé isLanguageLocked (à utiliser dans les composants) :
 *   const isLanguageLocked = useGameStore(
 *     (state) => state.currentSession?.status === 'in_progress'
 *   );
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Language } from '@wikihop/shared';
import { create } from 'zustand';

import { useGameStore } from './game.store';

/** Clé AsyncStorage de la préférence de langue (ADR-005) */
const LANGUAGE_STORAGE_KEY = '@wikihop/language';

// ─────────────────────────────────────────────────────────────────────────────
// Interface du slice language
// ─────────────────────────────────────────────────────────────────────────────

interface LanguageSlice {
  // ── État ────────────────────────────────────────────────────────────────────

  /** Langue active. Défaut : 'fr'. Persistée dans AsyncStorage. */
  language: Language;

  /**
   * Vaut true une fois que hydrateLanguage() a terminé sa lecture AsyncStorage.
   * Permet aux composants d'attendre avant d'afficher le sélecteur de langue.
   * Toujours mis à true dans le finally de hydrateLanguage(), même en cas d'erreur.
   */
  isLanguageHydrated: boolean;

  // ── Actions ─────────────────────────────────────────────────────────────────

  /**
   * Change la langue active.
   *
   * Bloquée si une session est in_progress (sélecteur calculé depuis game.store).
   * En cas de blocage : retour silencieux, pas d'erreur levée (ADR-007).
   *
   * Si la langue change effectivement, invalide le cache popularPages
   * (TODO M-16 frontend : brancher usePopularPagesStore.getState().invalidatePopularPages()).
   *
   * Persiste dans AsyncStorage uniquement si le changement est autorisé.
   */
  setLanguage: (lang: Language) => Promise<void>;

  /**
   * Réhydrate la langue depuis AsyncStorage au démarrage de l'app.
   * Appelée depuis App.tsx en parallèle avec hydrate() du game store.
   *
   * Comportement :
   * - Lit la clé @wikihop/language
   * - Valide strictement : accepte uniquement 'fr' ou 'en' (pas de cast direct)
   * - Valeur invalide ou absente → garde le défaut 'fr' sans erreur
   * - Toujours termine par set({ isLanguageHydrated: true }), même en cas d'erreur
   */
  hydrateLanguage: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store Zustand
// ─────────────────────────────────────────────────────────────────────────────

export const useLanguageStore = create<LanguageSlice>()((set, get) => ({
  language: 'fr',
  isLanguageHydrated: false,

  setLanguage: async (lang: Language): Promise<void> => {
    // Calcul du verrou depuis le store de jeu (sélecteur calculé, ADR-007)
    // On utilise getState() et non un hook — valide hors du cycle de rendu React
    const isLanguageLocked =
      useGameStore.getState().currentSession?.status === 'in_progress';

    if (isLanguageLocked) {
      // Silencieux : pas d'erreur levée, la langue reste inchangée (ADR-007)
      return;
    }

    const previousLang = get().language;
    set({ language: lang });

    // Persistance AsyncStorage
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, JSON.stringify(lang));
    } catch (e: unknown) {
      console.error('[language.store] Erreur AsyncStorage.setItem :', e);
    }

    // Invalidation du cache popularPages si la langue a changé (ADR-007)
    if (previousLang !== lang) {
      // TODO M-16 frontend : remplacer par usePopularPagesStore.getState().invalidatePopularPages()
      // une fois le store popularPages implémenté. Pour l'instant : no-op commenté.
      // Le cache Wikipedia (summaryCache dans wikipedia.service.ts) est
      // automatiquement cohérent par clé `${lang}:${title}` — pas besoin de l'invalider.
    }
  },

  hydrateLanguage: async (): Promise<void> => {
    try {
      const raw = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);

      if (raw !== null) {
        const parsed = JSON.parse(raw) as unknown;

        // Validation stricte : uniquement 'fr' ou 'en' acceptés (exactOptionalPropertyTypes)
        // Ne pas caster `parsed as Language` directement — vérification explicite requise
        if (parsed === 'fr' || parsed === 'en') {
          set({ language: parsed });
        }
        // Valeur invalide en AsyncStorage (ex: 'es', 'de', valeur corrompue) :
        // on conserve le défaut 'fr'. Pas de clearItem — sera écrasé au prochain setLanguage.
      }
      // Clé absente (null) : on conserve le défaut 'fr'
    } catch (e: unknown) {
      console.error('[language.store] Erreur lors de la réhydratation :', e);
      // Erreur JSON.parse ou lecture AsyncStorage : on conserve le défaut 'fr'
    } finally {
      // isLanguageHydrated passe à true dans tous les cas (succès, valeur absente, erreur)
      set({ isLanguageHydrated: true });
    }
  },
}));
