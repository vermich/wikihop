/**
 * DailyCompletionService — WikiHop Mobile — Phase 3 (F3-16)
 *
 * Gère la persistance de la date de complétion du défi quotidien.
 * Clé AsyncStorage : @wikihop/daily_completion_date
 *
 * Conventions :
 *   - Exports nommés uniquement
 *   - Valeur stockée : string YYYY-MM-DD brute (pas JSON.stringify — dérogation ADR-005)
 *   - Erreurs AsyncStorage absorbées, jamais remontées à l'appelant
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const DAILY_COMPLETION_KEY = '@wikihop/daily_completion_date';

/**
 * Détermine si le défi quotidien a déjà été complété pour une date donnée.
 *
 * @param storedDate    - Valeur lue depuis AsyncStorage (string YYYY-MM-DD ou null)
 * @param challengeDate - Date du défi courant (string YYYY-MM-DD)
 * @returns true si storedDate === challengeDate (comparaison stricte)
 */
export function isDailyChallengeCompleted(
  storedDate: string | null,
  challengeDate: string,
): boolean {
  if (storedDate === null || storedDate === '') {
    return false;
  }
  return storedDate === challengeDate;
}

/**
 * Lit la date de complétion depuis AsyncStorage.
 * La valeur est stockée brute (pas JSON) — lue directement avec getItem.
 * Retourne null si la clé est absente ou en cas d'erreur.
 */
export async function getDailyCompletionDate(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(DAILY_COMPLETION_KEY);
  } catch (e: unknown) {
    // eslint-disable-next-line no-console
    console.warn('[DailyCompletionService] getDailyCompletionDate — erreur lecture :', e);
    return null;
  }
}

/**
 * Persiste la date de complétion dans AsyncStorage.
 * La valeur est stockée brute (pas JSON.stringify) — dérogation documentée dans ADR-005.
 * Les erreurs sont loguées (console.error) et ne bloquent pas l'appelant.
 *
 * @param date - Date YYYY-MM-DD à persister
 */
export async function saveDailyCompletionDate(date: string): Promise<void> {
  try {
    await AsyncStorage.setItem(DAILY_COMPLETION_KEY, date);
  } catch (e: unknown) {
    // eslint-disable-next-line no-console
    console.error('[DailyCompletionService] saveDailyCompletionDate — erreur écriture :', e);
  }
}
