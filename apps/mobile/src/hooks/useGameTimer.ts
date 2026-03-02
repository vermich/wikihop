/**
 * useGameTimer — WikiHop Mobile — Wave 3 (M-05)
 *
 * Hook qui calcule le temps écoulé depuis session.startedAt en temps réel.
 * Le timer est basé sur Date.now() - startedAt (pas de compteur incrémental)
 * pour éviter le drift d'accumulation.
 *
 * Décision UX (M-05) : le timer continue en arrière-plan car le calcul
 * est dynamique depuis startedAt. Au retour au premier plan, le vrai
 * temps écoulé est immédiatement affiché sans logique de pause/reprise.
 *
 * Références :
 *   Story : docs/stories/M-05-jumps-timer.md
 *
 * Conventions :
 *   - Export nommé
 *   - formatSeconds exportée séparément (pure function, testable sans mock)
 *   - setInterval nettoyé au démontage (return () => clearInterval)
 */

import { useEffect, useState } from 'react';

import { useGameStore } from '../store/game.store';

// ─────────────────────────────────────────────────────────────────────────────
// Utilitaire pur
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formate un nombre de secondes entières en chaîne "mm:ss".
 * Fonction pure — testable sans mock.
 *
 * @example
 *   formatSeconds(0)    // "00:00"
 *   formatSeconds(61)   // "01:01"
 *   formatSeconds(3600) // "60:00"
 *   formatSeconds(59)   // "00:59"
 */
export function formatSeconds(seconds: number): string {
  const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
  const ss = (seconds % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface UseGameTimerResult {
  /** Temps écoulé formaté "mm:ss". Retourne "00:00" si pas de session active. */
  formattedTime: string;
  /** Secondes entières écoulées depuis startedAt. Utile pour les tests et l'accessibilité. */
  elapsedSeconds: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcule le temps écoulé depuis session.startedAt en temps réel.
 *
 * - Met à jour toutes les secondes via setInterval.
 * - S'arrête automatiquement si status !== 'in_progress'.
 * - Retourne "00:00" et 0 si currentSession est null.
 * - Nettoie l'intervalle au démontage du composant.
 *
 * Pas de dépendance à AppState — le timer continue en arrière-plan
 * (voir décision UX dans M-05).
 */
export function useGameTimer(): UseGameTimerResult {
  const currentSession = useGameStore((state) => state.currentSession);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (currentSession === null || currentSession.status !== 'in_progress') {
      setElapsedSeconds(0);
      return;
    }

    // Calcul initial immédiat pour éviter la seconde de délai au montage
    const computeElapsed = (): number =>
      Math.floor((Date.now() - currentSession.startedAt.getTime()) / 1000);

    setElapsedSeconds(computeElapsed());

    const interval = setInterval(() => {
      setElapsedSeconds(computeElapsed());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [currentSession]);

  const formattedTime = formatSeconds(elapsedSeconds);

  return { formattedTime, elapsedSeconds };
}
