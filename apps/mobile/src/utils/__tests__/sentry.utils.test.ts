/**
 * Tests TDD — filterSentryEvent
 *
 * Ces tests ont été écrits AVANT l'implémentation (TDD strict).
 * Voir : apps/mobile/src/utils/sentry.utils.ts
 *
 * Exigences DPO (rapport docs/dpo/P-14-sentry-validation.md) :
 * - Supprimer event.user, request.cookies, request.headers
 * - Supprimer request.url et request.query_string (URLs Wikipedia = données potentiellement personnelles)
 * - Retourner null si environnement non-production
 */

import type { ErrorEvent } from '@sentry/react-native';
import { filterSentryEvent } from '../sentry.utils';

/** Helper pour construire un ErrorEvent minimal valide en production */
function makeProductionEvent(overrides: Partial<ErrorEvent> = {}): ErrorEvent {
  return {
    type: undefined,
    environment: 'production',
    ...overrides,
  };
}

describe('filterSentryEvent', () => {
  // Cas 1 : événement en production sans données sensibles → retourné tel quel
  it("retourne l'événement inchangé si aucune donnée sensible n'est présente", () => {
    const event = makeProductionEvent({
      message: 'Une erreur générique',
      release: '1.0.0',
    });

    const result = filterSentryEvent(event);

    expect(result).not.toBeNull();
    expect(result?.message).toBe('Une erreur générique');
    expect(result?.release).toBe('1.0.0');
    expect(result?.environment).toBe('production');
  });

  // Cas 2 : événement avec `user` → user supprimé
  it("supprime event.user si présent", () => {
    const event = makeProductionEvent({
      user: { id: 'user-123', email: 'test@example.com' },
    });

    const result = filterSentryEvent(event);

    expect(result).not.toBeNull();
    expect(result?.user).toBeUndefined();
  });

  // Cas 3 : événement avec request.cookies → cookies supprimés
  it("supprime event.request.cookies si présent", () => {
    const event = makeProductionEvent({
      request: {
        method: 'GET',
        cookies: { session: 'abc123' },
      },
    });

    const result = filterSentryEvent(event);

    expect(result).not.toBeNull();
    expect(result?.request?.cookies).toBeUndefined();
    // Les autres champs request doivent rester
    expect(result?.request?.method).toBe('GET');
  });

  // Cas 4 : événement avec request.headers → headers supprimés
  it("supprime event.request.headers si présent", () => {
    const event = makeProductionEvent({
      request: {
        method: 'GET',
        headers: { Authorization: 'Bearer token123', 'Content-Type': 'application/json' },
      },
    });

    const result = filterSentryEvent(event);

    expect(result).not.toBeNull();
    expect(result?.request?.headers).toBeUndefined();
    // Les autres champs request doivent rester
    expect(result?.request?.method).toBe('GET');
  });

  // Cas 5 : environnement non-production → retourne null
  it("retourne null si l'environnement n'est pas production", () => {
    const event = makeProductionEvent({ environment: 'development' });
    expect(filterSentryEvent(event)).toBeNull();
  });

  it("retourne null si l'environnement est staging", () => {
    const event = makeProductionEvent({ environment: 'staging' });
    expect(filterSentryEvent(event)).toBeNull();
  });

  it("retourne null si event.environment est absent", () => {
    const event: ErrorEvent = { type: undefined };
    expect(filterSentryEvent(event)).toBeNull();
  });

  // Cas 6 : event null / undefined → ne plante pas, retourne null
  it("ne plante pas si l'événement est null", () => {
    // La signature TypeScript n'accepte pas null, mais en JavaScript runtime
    // un beforeSend peut recevoir n'importe quoi — on teste la robustesse
    expect(filterSentryEvent(null as unknown as ErrorEvent)).toBeNull();
  });

  it("ne plante pas si l'événement est undefined", () => {
    expect(filterSentryEvent(undefined as unknown as ErrorEvent)).toBeNull();
  });

  // Cas 7 (exigence DPO) : événement avec request.url → url supprimée
  it("supprime event.request.url si présent (exigence DPO — URLs Wikipedia)", () => {
    const event = makeProductionEvent({
      request: {
        url: 'https://fr.wikipedia.org/wiki/Aristote',
        method: 'GET',
      },
    });

    const result = filterSentryEvent(event);

    expect(result).not.toBeNull();
    expect(result?.request?.url).toBeUndefined();
    // Les autres champs request doivent rester
    expect(result?.request?.method).toBe('GET');
  });

  // Cas 8 (exigence DPO) : événement avec request.query_string → query_string supprimé
  it("supprime event.request.query_string si présent (exigence DPO)", () => {
    const event = makeProductionEvent({
      request: {
        url: 'https://fr.wikipedia.org/wiki/Aristote',
        query_string: 'action=query&titles=Aristote',
        method: 'GET',
      },
    });

    const result = filterSentryEvent(event);

    expect(result).not.toBeNull();
    expect(result?.request?.query_string).toBeUndefined();
  });

  // Cas combiné : tous les champs sensibles en même temps
  it("supprime tous les champs sensibles simultanément", () => {
    const event = makeProductionEvent({
      user: { id: 'abc' },
      request: {
        url: 'https://fr.wikipedia.org/wiki/Platon',
        query_string: 'lang=fr',
        cookies: { session: 'xyz' },
        headers: { Authorization: 'Bearer tok' },
        method: 'GET',
      },
    });

    const result = filterSentryEvent(event);

    expect(result).not.toBeNull();
    expect(result?.user).toBeUndefined();
    expect(result?.request?.url).toBeUndefined();
    expect(result?.request?.query_string).toBeUndefined();
    expect(result?.request?.cookies).toBeUndefined();
    expect(result?.request?.headers).toBeUndefined();
    // Champ non sensible conservé
    expect(result?.request?.method).toBe('GET');
  });
});
