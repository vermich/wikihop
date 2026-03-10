/**
 * useDailyCompletionStatus — WikiHop Mobile — Phase 3 (F3-16)
 *
 * Retourne si le défi du jour (identifié par challengeDate) est déjà complété.
 *
 * Deux déclencheurs :
 *   1. useFocusEffect — rafraîchit au retour sur l'écran (ex. retour depuis VictoryScreen)
 *   2. useEffect([challengeDate]) — rafraîchit quand la date du défi est connue
 *      (passage undefined → 'YYYY-MM-DD' lors du chargement initial)
 *
 * Valeur initiale : false — évite un flash "complété" avant la lecture AsyncStorage.
 *
 * Conventions :
 *   - Export nommé
 *   - Zéro any, TypeScript strict
 */

import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';

import {
  getDailyCompletionDate,
  isDailyChallengeCompleted,
} from '../services/daily-completion.service';

/**
 * Retourne si le défi du jour (identifié par challengeDate) est déjà complété.
 *
 * Se rafraîchit à chaque focus de l'écran (useFocusEffect) et à chaque
 * changement de challengeDate (useEffect).
 *
 * @param challengeDate - Date YYYY-MM-DD du défi courant,
 *                        ou undefined si le défi n'est pas encore chargé.
 * @returns boolean — false tant que challengeDate est undefined ou que la lecture
 *                    AsyncStorage n'est pas terminée.
 */
export function useDailyCompletionStatus(challengeDate: string | undefined): boolean {
  const [isCompleted, setIsCompleted] = useState(false);

  // Rafraîchissement au focus (retour depuis VictoryScreen ou autre écran)
  useFocusEffect(
    useCallback(() => {
      if (challengeDate === undefined) {
        setIsCompleted(false);
        return;
      }

      void getDailyCompletionDate().then((stored) => {
        setIsCompleted(isDailyChallengeCompleted(stored, challengeDate));
      });
    }, [challengeDate]),
  );

  // Rafraîchissement au changement de challengeDate (chargement initial du défi :
  // passage undefined → 'YYYY-MM-DD' pendant que l'écran est déjà focalisé)
  useEffect(() => {
    if (challengeDate === undefined) return;
    void getDailyCompletionDate().then((stored) => {
      setIsCompleted(isDailyChallengeCompleted(stored, challengeDate));
    });
  }, [challengeDate]);

  return isCompleted;
}
