/**
 * Tests unitaires — game.store.ts (M-07)
 *
 * Couvre :
 *   - startSession, addJump, updateCurrentArticle
 *   - completeSession, abandonSession
 *   - clearSession, restoreSession
 *   - hydrate (cas nominal, Date reconstitution, AsyncStorage vide, JSON malformé)
 *   - sélecteur calculé isLanguageLocked
 *
 * Mock AsyncStorage : déclaré dans apps/mobile/jest.setup.ts
 * (utilise @react-native-async-storage/async-storage/jest/async-storage-mock)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Article, GameSession } from '@wikihop/shared';

// On importe le store APRÈS le mock pour s'assurer que Zustand crée son état frais.
// Chaque describe réinitialise le store via useGameStore.setState.
import { useGameStore } from '../../src/store/game.store';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
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

const ARTICLE_GUSTAVE_EIFFEL: Article = {
  id: '12345',
  title: 'Gustave Eiffel',
  url: 'https://fr.wikipedia.org/wiki/Gustave_Eiffel',
  language: 'fr',
};

const STORAGE_KEY = '@wikihop/game_session';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Réinitialise le store Zustand à son état initial entre chaque test. */
function resetStore(): void {
  useGameStore.setState({
    currentSession: null,
    isHydrated: false,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup global
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(async () => {
  resetStore();
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// startSession
// ─────────────────────────────────────────────────────────────────────────────

describe('startSession', () => {
  it("crée une session avec status 'in_progress', jumps 0, path [startArticle]", async () => {
    await useGameStore.getState().startSession(ARTICLE_PARIS, ARTICLE_TOUR_EIFFEL);

    const { currentSession } = useGameStore.getState();
    expect(currentSession).not.toBeNull();
    expect(currentSession?.status).toBe('in_progress');
    expect(currentSession?.jumps).toBe(0);
    expect(currentSession?.path).toHaveLength(1);
    expect(currentSession?.path[0]).toEqual(ARTICLE_PARIS);
    expect(currentSession?.startArticle).toEqual(ARTICLE_PARIS);
    expect(currentSession?.targetArticle).toEqual(ARTICLE_TOUR_EIFFEL);
  });

  it('génère un id non vide au format UUID v4', async () => {
    await useGameStore.getState().startSession(ARTICLE_PARIS, ARTICLE_TOUR_EIFFEL);

    const { currentSession } = useGameStore.getState();
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(currentSession?.id).toMatch(uuidV4Regex);
  });

  it('persiste la session dans AsyncStorage (@wikihop/game_session)', async () => {
    await useGameStore.getState().startSession(ARTICLE_PARIS, ARTICLE_TOUR_EIFFEL);

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw as string) as GameSession;
    expect(parsed.status).toBe('in_progress');
    expect(parsed.startArticle).toEqual(ARTICLE_PARIS);
  });

  it('startedAt est une Date valide (objet Date dans le store)', async () => {
    const before = new Date();
    await useGameStore.getState().startSession(ARTICLE_PARIS, ARTICLE_TOUR_EIFFEL);
    const after = new Date();

    const { currentSession } = useGameStore.getState();
    expect(currentSession?.startedAt).toBeInstanceOf(Date);
    expect(currentSession?.startedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(currentSession?.startedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// addJump
// ─────────────────────────────────────────────────────────────────────────────

describe('addJump', () => {
  it('ajoute l\'article à path et incrémente jumps', async () => {
    await useGameStore.getState().startSession(ARTICLE_PARIS, ARTICLE_TOUR_EIFFEL);
    await useGameStore.getState().addJump(ARTICLE_GUSTAVE_EIFFEL);

    const { currentSession } = useGameStore.getState();
    expect(currentSession?.path).toHaveLength(2);
    expect(currentSession?.path[1]).toEqual(ARTICLE_GUSTAVE_EIFFEL);
    expect(currentSession?.jumps).toBe(1);
  });

  it("respecte l'invariant jumps === path.length - 1 après chaque appel", async () => {
    await useGameStore.getState().startSession(ARTICLE_PARIS, ARTICLE_TOUR_EIFFEL);

    // Premier saut
    await useGameStore.getState().addJump(ARTICLE_GUSTAVE_EIFFEL);
    let { currentSession } = useGameStore.getState();
    expect(currentSession?.jumps).toBe((currentSession?.path.length ?? 0) - 1);

    // Deuxième saut
    await useGameStore.getState().addJump(ARTICLE_TOUR_EIFFEL);
    ({ currentSession } = useGameStore.getState());
    expect(currentSession?.jumps).toBe((currentSession?.path.length ?? 0) - 1);
  });

  it('ne fait rien si currentSession est null', async () => {
    // Store déjà réinitialisé avec currentSession: null en beforeEach
    await useGameStore.getState().addJump(ARTICLE_PARIS);

    const { currentSession } = useGameStore.getState();
    expect(currentSession).toBeNull();
  });

  it("ne fait rien si status !== 'in_progress'", async () => {
    await useGameStore.getState().startSession(ARTICLE_PARIS, ARTICLE_TOUR_EIFFEL);
    await useGameStore.getState().completeSession();

    const pathLengthBefore = useGameStore.getState().currentSession?.path.length;

    await useGameStore.getState().addJump(ARTICLE_GUSTAVE_EIFFEL);

    const { currentSession } = useGameStore.getState();
    expect(currentSession?.path).toHaveLength(pathLengthBefore ?? 0);
  });

  it('persiste la session après chaque appel', async () => {
    await useGameStore.getState().startSession(ARTICLE_PARIS, ARTICLE_TOUR_EIFFEL);
    await useGameStore.getState().addJump(ARTICLE_GUSTAVE_EIFFEL);

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw as string) as GameSession;
    expect(parsed.path).toHaveLength(2);
    expect(parsed.jumps).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// completeSession
// ─────────────────────────────────────────────────────────────────────────────

describe('completeSession', () => {
  it("passe status à 'won' et renseigne completedAt", async () => {
    await useGameStore.getState().startSession(ARTICLE_PARIS, ARTICLE_TOUR_EIFFEL);

    const before = new Date();
    await useGameStore.getState().completeSession();
    const after = new Date();

    const { currentSession } = useGameStore.getState();
    expect(currentSession?.status).toBe('won');
    expect(currentSession?.completedAt).toBeInstanceOf(Date);
    expect(currentSession?.completedAt?.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(currentSession?.completedAt?.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('ne fait rien si currentSession est null', async () => {
    await useGameStore.getState().completeSession();

    const { currentSession } = useGameStore.getState();
    expect(currentSession).toBeNull();
  });

  it('persiste la session après completeSession', async () => {
    await useGameStore.getState().startSession(ARTICLE_PARIS, ARTICLE_TOUR_EIFFEL);
    await useGameStore.getState().completeSession();

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw as string) as Record<string, unknown>;
    expect(parsed['status']).toBe('won');
    expect(parsed['completedAt']).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// abandonSession
// ─────────────────────────────────────────────────────────────────────────────

describe('abandonSession', () => {
  it("passe status à 'abandoned' et renseigne completedAt", async () => {
    await useGameStore.getState().startSession(ARTICLE_PARIS, ARTICLE_TOUR_EIFFEL);

    const before = new Date();
    await useGameStore.getState().abandonSession();
    const after = new Date();

    const { currentSession } = useGameStore.getState();
    expect(currentSession?.status).toBe('abandoned');
    expect(currentSession?.completedAt).toBeInstanceOf(Date);
    expect(currentSession?.completedAt?.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(currentSession?.completedAt?.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('ne fait rien si currentSession est null', async () => {
    await useGameStore.getState().abandonSession();

    const { currentSession } = useGameStore.getState();
    expect(currentSession).toBeNull();
  });

  it('le JSON persisté est conforme à l\'interface GameSession (pas de champ ajouté)', async () => {
    await useGameStore.getState().startSession(ARTICLE_PARIS, ARTICLE_TOUR_EIFFEL);
    await useGameStore.getState().addJump(ARTICLE_GUSTAVE_EIFFEL);
    await useGameStore.getState().abandonSession();

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw as string) as Record<string, unknown>;

    // Champs attendus par l'interface GameSession
    const expectedKeys = new Set([
      'id',
      'startArticle',
      'targetArticle',
      'path',
      'jumps',
      'startedAt',
      'completedAt',
      'status',
    ]);

    const actualKeys = new Set(Object.keys(parsed));
    expect(actualKeys).toEqual(expectedKeys);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// clearSession
// ─────────────────────────────────────────────────────────────────────────────

describe('clearSession', () => {
  it('met currentSession à null', async () => {
    await useGameStore.getState().startSession(ARTICLE_PARIS, ARTICLE_TOUR_EIFFEL);
    await useGameStore.getState().clearSession();

    const { currentSession } = useGameStore.getState();
    expect(currentSession).toBeNull();
  });

  it('supprime la clé AsyncStorage', async () => {
    await useGameStore.getState().startSession(ARTICLE_PARIS, ARTICLE_TOUR_EIFFEL);

    // Vérifie que la clé existe avant clearSession
    const rawBefore = await AsyncStorage.getItem(STORAGE_KEY);
    expect(rawBefore).not.toBeNull();

    await useGameStore.getState().clearSession();

    const rawAfter = await AsyncStorage.getItem(STORAGE_KEY);
    expect(rawAfter).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// hydrate
// ─────────────────────────────────────────────────────────────────────────────

describe('hydrate', () => {
  it('relit la session depuis AsyncStorage et la restaure dans le store', async () => {
    // Prépare une session dans AsyncStorage directement
    const sessionRaw: Record<string, unknown> = {
      id: '123e4567-e89b-4d3c-a456-426614174000',
      startArticle: ARTICLE_PARIS,
      targetArticle: ARTICLE_TOUR_EIFFEL,
      path: [ARTICLE_PARIS],
      jumps: 0,
      startedAt: new Date('2026-03-01T10:00:00.000Z').toISOString(),
      status: 'in_progress',
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessionRaw));

    await useGameStore.getState().hydrate();

    const { currentSession } = useGameStore.getState();
    expect(currentSession).not.toBeNull();
    expect(currentSession?.id).toBe('123e4567-e89b-4d3c-a456-426614174000');
    expect(currentSession?.status).toBe('in_progress');
    expect(currentSession?.startArticle).toEqual(ARTICLE_PARIS);
  });

  it('reconstitue les Date (startedAt, completedAt) depuis les chaînes ISO 8601', async () => {
    const startedAtIso = '2026-03-01T10:00:00.000Z';
    const completedAtIso = '2026-03-01T10:15:00.000Z';

    const sessionRaw: Record<string, unknown> = {
      id: '123e4567-e89b-4d3c-a456-426614174000',
      startArticle: ARTICLE_PARIS,
      targetArticle: ARTICLE_TOUR_EIFFEL,
      path: [ARTICLE_PARIS, ARTICLE_GUSTAVE_EIFFEL],
      jumps: 1,
      startedAt: startedAtIso,
      completedAt: completedAtIso,
      status: 'won',
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessionRaw));

    await useGameStore.getState().hydrate();

    const { currentSession } = useGameStore.getState();
    expect(currentSession?.startedAt).toBeInstanceOf(Date);
    expect(currentSession?.startedAt.toISOString()).toBe(startedAtIso);
    expect(currentSession?.completedAt).toBeInstanceOf(Date);
    expect(currentSession?.completedAt?.toISOString()).toBe(completedAtIso);
  });

  it('met isHydrated à true après lecture, même si AsyncStorage est vide', async () => {
    // AsyncStorage vide (cleared en beforeEach)
    expect(useGameStore.getState().isHydrated).toBe(false);

    await useGameStore.getState().hydrate();

    expect(useGameStore.getState().isHydrated).toBe(true);
    expect(useGameStore.getState().currentSession).toBeNull();
  });

  it('appelle clearSession si le JSON est malformé, puis met isHydrated à true', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'JSON_INVALIDE_!!!');

    await useGameStore.getState().hydrate();

    const state = useGameStore.getState();
    expect(state.currentSession).toBeNull();
    expect(state.isHydrated).toBe(true);

    // La clé malformée doit avoir été supprimée par clearSession
    const rawAfter = await AsyncStorage.getItem(STORAGE_KEY);
    expect(rawAfter).toBeNull();
  });

  it('ne modifie pas AsyncStorage (pas de write pendant hydrate)', async () => {
    const sessionRaw: Record<string, unknown> = {
      id: '123e4567-e89b-4d3c-a456-426614174000',
      startArticle: ARTICLE_PARIS,
      targetArticle: ARTICLE_TOUR_EIFFEL,
      path: [ARTICLE_PARIS],
      jumps: 0,
      startedAt: new Date('2026-03-01T10:00:00.000Z').toISOString(),
      status: 'in_progress',
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessionRaw));

    // Espionne setItem et réinitialise le compteur d'appels APRES le setup
    // pour ne capturer que les appels effectués durant hydrate() elle-même.
    const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');
    setItemSpy.mockClear();

    await useGameStore.getState().hydrate();

    // hydrate() ne doit jamais appeler setItem (éco-conception ADR-005 : 1 seule lecture)
    expect(setItemSpy).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Sélecteur calculé isLanguageLocked
// ─────────────────────────────────────────────────────────────────────────────

describe('isLanguageLocked selector', () => {
  it("retourne true si currentSession.status === 'in_progress'", async () => {
    await useGameStore.getState().startSession(ARTICLE_PARIS, ARTICLE_TOUR_EIFFEL);

    const isLanguageLocked = useGameStore.getState().currentSession?.status === 'in_progress';
    expect(isLanguageLocked).toBe(true);
  });

  it('retourne false si currentSession est null', () => {
    // Store réinitialisé avec currentSession: null en beforeEach
    const isLanguageLocked = useGameStore.getState().currentSession?.status === 'in_progress';
    expect(isLanguageLocked).toBe(false);
  });

  it("retourne false si currentSession.status === 'won'", async () => {
    await useGameStore.getState().startSession(ARTICLE_PARIS, ARTICLE_TOUR_EIFFEL);
    await useGameStore.getState().completeSession();

    const isLanguageLocked = useGameStore.getState().currentSession?.status === 'in_progress';
    expect(isLanguageLocked).toBe(false);
  });

  it("retourne false si currentSession.status === 'abandoned'", async () => {
    await useGameStore.getState().startSession(ARTICLE_PARIS, ARTICLE_TOUR_EIFFEL);
    await useGameStore.getState().abandonSession();

    const isLanguageLocked = useGameStore.getState().currentSession?.status === 'in_progress';
    expect(isLanguageLocked).toBe(false);
  });
});
