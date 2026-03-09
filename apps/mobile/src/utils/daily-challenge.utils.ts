/**
 * Utilitaires purs pour le défi quotidien — F3-01
 *
 * Fonctions exportées :
 *   - formatDailyChallengeDate : 'YYYY-MM-DD' → 'DD/MM/YYYY'
 *   - isDailyChallengeToday    : compare date du défi avec date UTC du jour
 *
 * TDD strict : les tests dans __tests__/daily-challenge.utils.test.ts ont été
 * écrits et committés AVANT cette implémentation.
 *
 * Conventions :
 *   - Exports nommés uniquement
 *   - Fonctions pures — zéro effet de bord
 *   - Zéro any
 */

// ─────────────────────────────────────────────────────────────────────────────
// formatDailyChallengeDate
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formate une date YYYY-MM-DD en DD/MM/YYYY.
 *
 * Exemple : '2026-03-08' → '08/03/2026'
 *
 * Note : manipulation par split de chaîne plutôt que new Date() pour
 * éviter les décalages de fuseau horaire (la chaîne est déjà en UTC).
 *
 * @param dateStr - Date au format YYYY-MM-DD
 * @returns Date formatée au format DD/MM/YYYY
 */
export function formatDailyChallengeDate(dateStr: string): string {
  const parts = dateStr.split('-');
  // parts : ['2026', '03', '08']
  const year = parts[0] ?? '';
  const month = parts[1] ?? '';
  const day = parts[2] ?? '';

  return `${day}/${month}/${year}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// isDailyChallengeToday
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vérifie si la date du défi quotidien correspond au jour courant UTC.
 *
 * Comparaison stricte de chaînes YYYY-MM-DD.
 * Ne throw pas sur entrées invalides (chaînes vides, formats incorrects).
 *
 * @param dailyChallengeDate - Date du défi (format YYYY-MM-DD)
 * @param todayUTC           - Date du jour UTC (format YYYY-MM-DD)
 * @returns true si les deux chaînes sont identiques et non vides
 */
export function isDailyChallengeToday(
  dailyChallengeDate: string,
  todayUTC: string,
): boolean {
  if (dailyChallengeDate === '' || todayUTC === '') {
    return false;
  }

  return dailyChallengeDate === todayUTC;
}
