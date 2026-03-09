/**
 * Utilitaires purs pour l'historique des parties — F3-02
 *
 * Fonctions exportées :
 *   - formatDuration    : durée en ms → chaîne lisible "X s" / "X min YY s"
 *   - formatRecordDate  : ISO 8601 → date locale "JJ/MM/AAAA à HH:MM"
 *   - buildGameRecord   : GameSession → GameRecord | null
 *
 * TDD strict : les tests dans __tests__/history.utils.test.ts ont été
 * écrits et committés AVANT cette implémentation.
 *
 * Conventions :
 *   - Exports nommés uniquement (pas de default export)
 *   - Zéro any — typage explicite
 *   - Fonctions pures (pas d'effets de bord)
 */

import type { GameRecord, GameSession } from '@wikihop/shared';

// ─────────────────────────────────────────────────────────────────────────────
// formatDuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formate une durée en millisecondes en chaîne lisible.
 *
 * Exemples :
 *   0       → "0 s"
 *   999     → "0 s"    (arrondi vers le bas)
 *   1000    → "1 s"
 *   45000   → "45 s"
 *   60000   → "1 min 00 s"
 *   125000  → "2 min 05 s"
 *   3665000 → "61 min 05 s"  (pas d'heures — format plat)
 */
export function formatDuration(durationMs: number): string {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${String(seconds)} s`;
  }

  return `${String(minutes)} min ${String(seconds).padStart(2, '0')} s`;
}

// ─────────────────────────────────────────────────────────────────────────────
// formatRecordDate
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formate une date ISO 8601 en chaîne localisée.
 *
 * Format produit : "JJ/MM/AAAA à HH:MM" (ex : "06/03/2026 à 14:30")
 * L'heure est affichée en heure locale du device.
 *
 * La date est formatée avec les options Intl explicites pour
 * garantir un format stable indépendamment de la locale du device.
 */
export function formatRecordDate(isoString: string): string {
  const date = new Date(isoString);

  // Jour, mois, année avec padding
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());

  // Heure et minutes avec padding
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} à ${hours}:${minutes}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// buildGameRecord
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Construit un GameRecord depuis une GameSession terminée.
 *
 * Préconditions :
 *   - session.status === 'won' || session.status === 'abandoned'
 *   - session.completedAt est défini
 *
 * Retourne null si les préconditions ne sont pas satisfaites.
 *
 * Note sur exactOptionalPropertyTypes : les champs sont construits
 * explicitement (pas de spread) pour satisfaire le compilateur strict.
 */
export function buildGameRecord(session: GameSession): GameRecord | null {
  // Guard 1 : statut invalide
  if (session.status === 'in_progress') {
    return null;
  }

  // Guard 2 : completedAt absent
  if (session.completedAt === undefined) {
    return null;
  }

  const completedAt = session.completedAt;
  const durationMs = completedAt.getTime() - session.startedAt.getTime();

  return {
    id: session.id,
    startArticle: session.startArticle,
    targetArticle: session.targetArticle,
    jumps: session.jumps,
    durationMs,
    startedAt: session.startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    status: session.status,
    // Champs optionnels F3-01/F3-05 : spread conditionnel (exactOptionalPropertyTypes)
    ...(session.difficulty !== undefined ? { difficulty: session.difficulty } : {}),
    ...(session.isDailyChallenge === true ? { isDailyChallenge: true as const } : {}),
    ...(session.dailyChallengeDate !== undefined
      ? { dailyChallengeDate: session.dailyChallengeDate }
      : {}),
  };
}
