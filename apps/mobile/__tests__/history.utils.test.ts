/**
 * Tests TDD — history.utils.ts (F3-02)
 *
 * Couvre :
 *   - formatDuration : conversion ms → chaîne lisible
 *   - formatRecordDate : ISO 8601 → date locale fr
 *   - buildGameRecord : GameSession → GameRecord | null
 *
 * IMPORTANT : Ce fichier doit être commité AVANT l'implémentation (règle TDD).
 * Les tests sont écrits ici avec les specs du Tech Lead (section 8 de F3-02).
 */

import type { Article, GameSession } from '@wikihop/shared';

import {
  buildGameRecord,
  formatDuration,
  formatRecordDate,
} from '../src/utils/history.utils';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures communes
// ─────────────────────────────────────────────────────────────────────────────

const ARTICLE_PARIS: Article = {
  id: '681',
  title: 'Paris',
  url: 'https://fr.wikipedia.org/wiki/Paris',
  language: 'fr',
};

const ARTICLE_TOUR_EIFFEL: Article = {
  id: '1359684',
  title: 'Tour Eiffel',
  url: 'https://fr.wikipedia.org/wiki/Tour_Eiffel',
  language: 'fr',
};

const START_DATE = new Date('2026-03-06T12:00:00.000Z');
const COMPLETED_DATE = new Date('2026-03-06T12:02:05.000Z'); // 2 min 05 s après

type GameSessionOverrides = Omit<Partial<GameSession>, 'completedAt'> & {
  completedAt?: Date;
  omitCompletedAt?: boolean;
};

function makeWonSession(overrides: GameSessionOverrides = {}): GameSession {
  const { omitCompletedAt, ...rest } = overrides;

  const base: GameSession = {
    id: 'session-uuid-1',
    startArticle: ARTICLE_PARIS,
    targetArticle: ARTICLE_TOUR_EIFFEL,
    path: [ARTICLE_PARIS, ARTICLE_TOUR_EIFFEL],
    jumps: 1,
    startedAt: START_DATE,
    completedAt: COMPLETED_DATE,
    status: 'won',
  };

  if (omitCompletedAt === true) {
    // Sans completedAt — pour tester les guards de buildGameRecord
    return {
      id: rest.id ?? base.id,
      startArticle: rest.startArticle ?? base.startArticle,
      targetArticle: rest.targetArticle ?? base.targetArticle,
      path: rest.path ?? base.path,
      jumps: rest.jumps ?? base.jumps,
      startedAt: rest.startedAt ?? base.startedAt,
      status: rest.status ?? base.status,
    };
  }

  // Avec completedAt — branche normale
  const completedAt: Date = rest.completedAt !== undefined ? rest.completedAt : COMPLETED_DATE;

  return {
    id: rest.id ?? base.id,
    startArticle: rest.startArticle ?? base.startArticle,
    targetArticle: rest.targetArticle ?? base.targetArticle,
    path: rest.path ?? base.path,
    jumps: rest.jumps ?? base.jumps,
    startedAt: rest.startedAt ?? base.startedAt,
    completedAt,
    status: rest.status ?? base.status,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// formatDuration
// ─────────────────────────────────────────────────────────────────────────────

describe('formatDuration', () => {
  it('0 ms → "0 s"', () => {
    expect(formatDuration(0)).toBe('0 s');
  });

  it('999 ms → "0 s" (arrondi vers le bas)', () => {
    expect(formatDuration(999)).toBe('0 s');
  });

  it('1000 ms → "1 s"', () => {
    expect(formatDuration(1000)).toBe('1 s');
  });

  it('45000 ms → "45 s"', () => {
    expect(formatDuration(45000)).toBe('45 s');
  });

  it('60000 ms → "1 min 00 s"', () => {
    expect(formatDuration(60000)).toBe('1 min 00 s');
  });

  it('125000 ms → "2 min 05 s"', () => {
    expect(formatDuration(125000)).toBe('2 min 05 s');
  });

  it('3665000 ms → "61 min 05 s" (format plat sans heures)', () => {
    expect(formatDuration(3665000)).toBe('61 min 05 s');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatRecordDate
// ─────────────────────────────────────────────────────────────────────────────

describe('formatRecordDate', () => {
  it('retourne une chaîne non vide pour un ISO 8601 valide', () => {
    const result = formatRecordDate('2026-03-06T14:30:00.000Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('contient le jour 06 pour une date du 6 mars 2026', () => {
    const result = formatRecordDate('2026-03-06T14:30:00.000Z');
    expect(result).toContain('06');
  });

  it('contient l\'année 2026', () => {
    const result = formatRecordDate('2026-03-06T14:30:00.000Z');
    expect(result).toContain('2026');
  });

  it('contient "mars" (format fr) ou "03" pour le mois de mars 2026', () => {
    const result = formatRecordDate('2026-03-06T14:30:00.000Z');
    // Accepte soit le nom du mois (mars), soit le numéro (03)
    const hasMars = result.toLowerCase().includes('mars') || result.includes('03');
    expect(hasMars).toBe(true);
  });

  it('retourne un format cohérent pour deux dates différentes', () => {
    const result1 = formatRecordDate('2026-01-01T00:00:00.000Z');
    const result2 = formatRecordDate('2026-12-31T23:59:59.000Z');
    // Les deux doivent être des chaînes non vides
    expect(typeof result1).toBe('string');
    expect(typeof result2).toBe('string');
    expect(result1).not.toBe(result2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildGameRecord
// ─────────────────────────────────────────────────────────────────────────────

describe('buildGameRecord', () => {
  it('session in_progress → retourne null', () => {
    const session = makeWonSession({ status: 'in_progress', omitCompletedAt: true });
    const result = buildGameRecord(session);
    expect(result).toBeNull();
  });

  it('session won sans completedAt → retourne null', () => {
    const session = makeWonSession({ omitCompletedAt: true });
    const result = buildGameRecord(session);
    expect(result).toBeNull();
  });

  it('session won avec completedAt → retourne GameRecord avec status: "won"', () => {
    const session = makeWonSession();
    const result = buildGameRecord(session);
    expect(result).not.toBeNull();
    expect(result?.status).toBe('won');
  });

  it('session abandoned avec completedAt → retourne GameRecord avec status: "abandoned"', () => {
    const session = makeWonSession({ status: 'abandoned' });
    const result = buildGameRecord(session);
    expect(result).not.toBeNull();
    expect(result?.status).toBe('abandoned');
  });

  it('durationMs = completedAt.getTime() - startedAt.getTime()', () => {
    const session = makeWonSession();
    const expectedDuration = COMPLETED_DATE.getTime() - START_DATE.getTime();
    const result = buildGameRecord(session);
    expect(result?.durationMs).toBe(expectedDuration);
  });

  it('le GameRecord copie les infos de la session : id, startArticle, targetArticle, jumps', () => {
    const session = makeWonSession();
    const result = buildGameRecord(session);

    expect(result?.id).toBe(session.id);
    expect(result?.startArticle).toEqual(session.startArticle);
    expect(result?.targetArticle).toEqual(session.targetArticle);
    expect(result?.jumps).toBe(session.jumps);
  });

  it('les dates sont sérialisées en ISO 8601 (string)', () => {
    const session = makeWonSession();
    const result = buildGameRecord(session);

    expect(typeof result?.startedAt).toBe('string');
    expect(typeof result?.completedAt).toBe('string');
    // Doit pouvoir être reparsé en Date valide
    expect(new Date(result?.startedAt ?? '').getTime()).not.toBeNaN();
    expect(new Date(result?.completedAt ?? '').getTime()).not.toBeNaN();
  });

  it('startedAt et completedAt correspondent aux dates de la session', () => {
    const session = makeWonSession();
    const result = buildGameRecord(session);

    expect(result?.startedAt).toBe(START_DATE.toISOString());
    expect(result?.completedAt).toBe(COMPLETED_DATE.toISOString());
  });
});
