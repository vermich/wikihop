import type { ErrorEvent } from '@sentry/react-native';

/**
 * Filtre les événements Sentry avant envoi.
 * Supprime tout champ pouvant contenir une donnée personnelle.
 *
 * WikiHop n'a pas de compte utilisateur — aucune PII structurelle attendue.
 * Cette fonction est un filet de sécurité contre les fuites accidentelles.
 *
 * Exigences DPO (rapport docs/dpo/P-14-sentry-validation.md) :
 * - request.url et request.query_string supprimés car les URLs Wikipedia
 *   peuvent être considérées comme données personnelles dans certains contextes.
 *
 * @param event - L'événement Sentry à filtrer
 * @returns L'événement nettoyé, ou null si l'environnement n'est pas production
 */
export function filterSentryEvent(event: ErrorEvent): ErrorEvent | null {
  // Robustesse : null/undefined en entrée (guard contre les appels JS runtime imprévus)
  if (event === null || event === undefined) return null;

  // Double garde avec `enabled: false` en développement
  if (event.environment !== 'production') return null;

  // Supprimer l'identifiant utilisateur (ne doit jamais être renseigné, mais par précaution)
  if (event.user !== undefined) {
    delete event.user;
  }

  // Nettoyer les champs request potentiellement personnels
  if (event.request !== undefined) {
    if (event.request.cookies !== undefined) {
      delete event.request.cookies;
    }
    if (event.request.headers !== undefined) {
      delete event.request.headers;
    }
    // Exigence DPO : les URLs Wikipedia peuvent identifier un parcours de navigation
    if (event.request.url !== undefined) {
      delete event.request.url;
    }
    if (event.request.query_string !== undefined) {
      delete event.request.query_string;
    }
  }

  return event;
}
