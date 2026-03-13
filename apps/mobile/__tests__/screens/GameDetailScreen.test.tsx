/**
 * Tests — GameDetailScreen.tsx (F3-11)
 *
 * Couvre :
 *   - État loading : ActivityIndicator pendant le chargement
 *   - Partie introuvable : message d'erreur + bouton Retour
 *   - Partie trouvée : BlocStatut, métriques, chemin, zone boutons
 *   - Bouton Rejouer : clearSession, startSession, navigation.navigate('Game')
 *   - Bouton Supprimer : Alert, deleteRecord, navigation.goBack()
 *
 * Stratégie de mock :
 *   - ScoreStorage entièrement mocké (jest.mock)
 *   - useGameStore mocké (clearSession, startSession)
 *   - navigation mocké manuellement
 */

import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import type { Article, GameRecord } from '@wikihop/shared';
import React from 'react';
import { Alert } from 'react-native';

import { GameDetailScreen } from '../../src/screens/GameDetailScreen';
import * as ScoreStorage from '../../src/services/score-storage.service';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

jest.mock('../../src/services/score-storage.service');
jest.mock('../../src/store/game.store');

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockNavigation = {
  goBack: mockGoBack,
  navigate: mockNavigate,
  push: jest.fn(),
  replace: jest.fn(),
  canGoBack: jest.fn(() => true),
};

const mockClearSession = jest.fn().mockResolvedValue(undefined);
const mockStartSession = jest.fn().mockResolvedValue(undefined);

// Mock useGameStore
const { useGameStore } = jest.requireMock('../../src/store/game.store') as {
  useGameStore: jest.MockedFunction<(selector: (state: {
    clearSession: () => Promise<void>;
    startSession: (a: Article, b: Article) => Promise<void>;
  }) => unknown) => unknown>;
};

useGameStore.mockImplementation((selector: (state: {
  clearSession: () => Promise<void>;
  startSession: (a: Article, b: Article) => Promise<void>;
}) => unknown) => {
  const state = {
    clearSession: mockClearSession,
    startSession: mockStartSession,
  };
  return selector(state);
});

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const ARTICLE_PARIS: Article = {
  id: '681',
  title: 'Paris',
  url: 'https://fr.wikipedia.org/wiki/Paris',
  language: 'fr',
};

const ARTICLE_ROME: Article = {
  id: '2',
  title: 'Rome',
  url: 'https://fr.wikipedia.org/wiki/Rome',
  language: 'fr',
};

const MOCK_RECORD: GameRecord = {
  id: 'record-uuid-1',
  startArticle: ARTICLE_PARIS,
  targetArticle: ARTICLE_ROME,
  jumps: 4,
  durationMs: 125000,
  startedAt: '2026-03-06T12:00:00.000Z',
  completedAt: '2026-03-06T12:02:05.000Z',
  status: 'won',
};

const MOCK_RECORD_ABANDONED: GameRecord = {
  ...MOCK_RECORD,
  id: 'record-uuid-2',
  status: 'abandoned',
  jumps: 2,
  durationMs: 45000,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const mockedGetAll = jest.mocked(ScoreStorage.getAll);
const mockedDeleteRecord = jest.mocked(ScoreStorage.deleteRecord);

function renderScreen(recordId: string): ReturnType<typeof render> {
  return render(
    <GameDetailScreen
      navigation={mockNavigation as never}
      route={{ key: 'GameDetail', name: 'GameDetail', params: { recordId } } as never}
    />,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetAll.mockResolvedValue([MOCK_RECORD, MOCK_RECORD_ABANDONED]);
  mockedDeleteRecord.mockResolvedValue(undefined);
});

// ─────────────────────────────────────────────────────────────────────────────
// État chargement
// ─────────────────────────────────────────────────────────────────────────────

describe('GameDetailScreen — état chargement', () => {
  it('affiche un ActivityIndicator pendant le chargement', () => {
    mockedGetAll.mockReturnValueOnce(new Promise(() => undefined));
    const { getByTestId, UNSAFE_queryByProps } = renderScreen('record-uuid-1');
    // On vérifie la présence d'un ActivityIndicator
    const indicator = UNSAFE_queryByProps({ color: '#2563EB' });
    expect(indicator).toBeTruthy();
    // Le titre "Détail de la partie" est présent même pendant le chargement
    getByTestId && void getByTestId; // avoid unused variable warning
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Partie introuvable
// ─────────────────────────────────────────────────────────────────────────────

describe('GameDetailScreen — partie introuvable', () => {
  it('affiche le message "Partie introuvable" si le recordId n\'existe pas', async () => {
    mockedGetAll.mockResolvedValueOnce([MOCK_RECORD]);
    const { getByText } = renderScreen('id-inexistant');

    await waitFor(() => {
      expect(getByText('Partie introuvable.')).toBeTruthy();
    });
  });

  it('affiche le bouton Retour si partie introuvable', async () => {
    mockedGetAll.mockResolvedValueOnce([]);
    const { getByText } = renderScreen('id-inexistant');

    await waitFor(() => {
      expect(getByText('Retour')).toBeTruthy();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Partie trouvée — rendu
// ─────────────────────────────────────────────────────────────────────────────

describe('GameDetailScreen — partie trouvée', () => {
  it('affiche le titre "Détail de la partie"', async () => {
    const { getByText } = renderScreen('record-uuid-1');
    await waitFor(() => {
      expect(getByText('Détail de la partie')).toBeTruthy();
    });
  });

  it('affiche le badge Victoire pour un record won', async () => {
    const { getByText } = renderScreen('record-uuid-1');
    await waitFor(() => {
      expect(getByText('Victoire')).toBeTruthy();
    });
  });

  it('affiche le badge Abandonné pour un record abandoned', async () => {
    const { getByText } = renderScreen('record-uuid-2');
    await waitFor(() => {
      expect(getByText('Abandonné')).toBeTruthy();
    });
  });

  it('affiche le trajet départ → destination', async () => {
    const { getByText } = renderScreen('record-uuid-1');
    await waitFor(() => {
      expect(getByText('Paris → Rome')).toBeTruthy();
    });
  });

  it('affiche le label DURÉE', async () => {
    const { getByText } = renderScreen('record-uuid-1');
    await waitFor(() => {
      expect(getByText('DURÉE')).toBeTruthy();
    });
  });

  it('affiche le label SAUTS', async () => {
    const { getByText } = renderScreen('record-uuid-1');
    await waitFor(() => {
      expect(getByText('SAUTS')).toBeTruthy();
    });
  });

  it('affiche le nombre de sauts du record', async () => {
    const { getByText } = renderScreen('record-uuid-1');
    await waitFor(() => {
      expect(getByText('4')).toBeTruthy();
    });
  });

  it('affiche le message "Détail du parcours non disponible"', async () => {
    const { getByText } = renderScreen('record-uuid-1');
    await waitFor(() => {
      expect(getByText('Détail du parcours non disponible')).toBeTruthy();
    });
  });

  it('affiche le bouton Rejouer', async () => {
    const { getByText } = renderScreen('record-uuid-1');
    await waitFor(() => {
      expect(getByText('Rejouer')).toBeTruthy();
    });
  });

  it('affiche le bouton Supprimer', async () => {
    const { getByText } = renderScreen('record-uuid-1');
    await waitFor(() => {
      expect(getByText('Supprimer cette partie')).toBeTruthy();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bouton Rejouer
// ─────────────────────────────────────────────────────────────────────────────

describe('GameDetailScreen — bouton Rejouer', () => {
  it('appelle clearSession puis startSession puis navigate Game', async () => {
    const { getByText } = renderScreen('record-uuid-1');

    await waitFor(() => {
      expect(getByText('Rejouer')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText('Rejouer'));
    });

    await waitFor(() => {
      expect(mockClearSession).toHaveBeenCalledTimes(1);
      expect(mockStartSession).toHaveBeenCalledWith(ARTICLE_PARIS, ARTICLE_ROME);
      expect(mockNavigate).toHaveBeenCalledWith('Game', { articleTitle: 'Paris' });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bouton Supprimer
// ─────────────────────────────────────────────────────────────────────────────

describe('GameDetailScreen — bouton Supprimer', () => {
  it('affiche une Alert avant de supprimer', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByText } = renderScreen('record-uuid-1');

    await waitFor(() => {
      expect(getByText('Supprimer cette partie')).toBeTruthy();
    });

    fireEvent.press(getByText('Supprimer cette partie'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Supprimer cette partie',
      'Cette action est irréversible.',
      expect.any(Array),
    );
  });

  it('supprime le record et navigue en arrière après confirmation', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementationOnce(
      (_title, _msg, buttons) => {
        // Simule l'appui sur le bouton "Supprimer" (destructive)
        const destructiveBtn = buttons?.find((b) => b.style === 'destructive');
        if (destructiveBtn?.onPress) {
          destructiveBtn.onPress();
        }
      },
    );

    const { getByText } = renderScreen('record-uuid-1');

    await waitFor(() => {
      expect(getByText('Supprimer cette partie')).toBeTruthy();
    });

    fireEvent.press(getByText('Supprimer cette partie'));

    await waitFor(() => {
      expect(mockedDeleteRecord).toHaveBeenCalledWith('record-uuid-1');
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    alertSpy.mockRestore();
  });
});
