/**
 * DailyChallengeService — WikiHop Mobile — Phase 3 (F3-01)
 *
 * Service pour récupérer le défi quotidien depuis le backend WikiHop.
 *
 * Références :
 *   Story : docs/stories/phase-3/F3-01-daily-challenge.md
 *
 * Conventions :
 *   - Exports nommés uniquement (pas de classe, pas de singleton)
 *   - AbortController + flag `cancelled` pour éviter les setState après démontage
 *   - Retour null en cas d'erreur (pas de throw) — cohérence avec useRandomPair
 *   - URL backend : centralisée dans config/backend.config.ts (EXPO_PUBLIC_BACKEND_URL)
 *   - Timeout 10s via AbortController
 */

import type { ArticleSummary, Language } from '@wikihop/shared';

import { BACKEND_BASE_URL } from '../config/backend.config';

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

/** Timeout pour l'appel au backend (ms) */
const DAILY_CHALLENGE_TIMEOUT_MS = 10_000;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Réponse parsée du backend GET /api/game/daily.
 * Correspond à la structure retournée par daily-challenge.route.ts.
 */
export interface DailyChallengeResponse {
  /** Date du défi au format YYYY-MM-DD (UTC) */
  date: string;
  /** Article de départ du défi */
  start: ArticleSummary;
  /** Article cible du défi */
  target: ArticleSummary;
}

/** Type brut de la réponse JSON du backend (avant parsing) */
interface DailyChallengeApiResponse {
  date: string;
  start: ArticleSummary;
  target: ArticleSummary;
}

// ─────────────────────────────────────────────────────────────────────────────
// fetchDailyChallenge
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Appelle GET /api/game/daily?lang={lang} et retourne la paire du jour.
 *
 * Gestion d'erreur :
 *   - Timeout 10s → retourne null
 *   - Erreur réseau → retourne null
 *   - HTTP non-200 (4xx, 5xx) → retourne null
 *
 * Pas de throw : le composant appelant gère le null avec un Alert.
 *
 * @param lang - Langue du défi ('fr' ou 'en')
 * @returns DailyChallengeResponse | null
 */
export async function fetchDailyChallenge(
  lang: Language,
): Promise<DailyChallengeResponse | null> {
  const url = `${BACKEND_BASE_URL}/api/game/daily?lang=${lang}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DAILY_CHALLENGE_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as DailyChallengeApiResponse;

    return {
      date: data.date,
      start: data.start,
      target: data.target,
    };
  } catch (error: unknown) {
    // AbortError (timeout) ou erreur réseau → null
    if (error instanceof Error) {
      // eslint-disable-next-line no-console
      console.warn('[DailyChallengeService] fetchDailyChallenge erreur :', error.message);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
