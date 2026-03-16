/**
 * Tests — MultiplayerHistoryScreen.tsx (F3-31)
 *
 * Couvre :
 *   - Liste vide : affiche le message "Aucune partie multijoueur pour l'instant"
 *   - Liste avec 2 items : affiche les 2 items avec les bonnes informations
 *   - Gagnant null : affiche "Égalité"
 *   - Bouton retour : appelle navigation.goBack()
 *
 * Stratégie de mock :
 *   - useFocusEffect mocké (@react-navigation/native) pour éviter le crash navigation context
 *   - loadAll mocké (multiplayer-score-storage.service)
 *   - navigation mocké manuellement
 *
 * Note : useFocusEffect appelle useNavigation en interne → crash sans NavigationContainer.
 * Pattern identique à la mémoire persistante (piège connu F3-16).
 */

import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

import { MultiplayerHistoryScreen } from '../../src/screens/MultiplayerHistoryScreen';

// ─────────────────────────────────────────────────────────────────────────────
// Mock @react-navigation/native — useFocusEffect exécuté immédiatement
// ─────────────────────────────────────────────────────────────────────────────

// Utilise jest.requireActual pour les autres exports, et remplace useFocusEffect
// par une implémentation qui utilise useEffect directement (pas de référence externe).
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native') as Record<string, unknown>;
  return {
    ...actual,
    useFocusEffect: (callback: () => (() => void) | void): void => {
      // useEffect est accessible via require car c'est un module résolu au runtime
      const { useEffect } = require('react') as { useEffect: typeof import('react').useEffect };
      useEffect(() => {
        const cleanup = callback();
        return cleanup ?? undefined;
      }, []);
    },
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// Mock multiplayer-score-storage.service
// ─────────────────────────────────────────────────────────────────────────────

jest.mock('../../src/services/multiplayer-score-storage.service');

// Référence au mock pour la reconfiguration dans les tests
// eslint-disable-next-line @typescript-eslint/no-require-imports
const MultiplayerStorage = jest.requireMock(
  '../../src/services/multiplayer-score-storage.service',
) as { loadAll: jest.Mock; save: jest.Mock };

// Alias pour la lisibilité dans les tests
const mockLoadAll = MultiplayerStorage.loadAll;

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces locales (évite les imports de type)
// ─────────────────────────────────────────────────────────────────────────────

interface RoundResult {
  jumps: number | null;
  durationMs: number | null;
  won: boolean;
}

interface MultiplayerRecord {
  id: string;
  date: string;
  playerNames: string[];
  roundCount: number;
  roundHistory: RoundResult[][];
  winner: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

function makeRecord(id: string, winner: string | null = 'Alice'): MultiplayerRecord {
  return {
    id,
    date: new Date(2026, 2, 15, 12, 0, 0).toISOString(), // 15 mars 2026 12:00 (local)
    playerNames: ['Alice', 'Bob'],
    roundCount: 2,
    roundHistory: [
      [
        { jumps: 3, durationMs: 10000, won: true },
        { jumps: null, durationMs: null, won: false },
      ],
      [
        { jumps: 2, durationMs: 8000, won: true },
        { jumps: null, durationMs: null, won: false },
      ],
    ],
    winner,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock navigation
// ─────────────────────────────────────────────────────────────────────────────

const mockGoBack = jest.fn();
const mockNavigation = {
  goBack: mockGoBack,
  navigate: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
  reset: jest.fn(),
  canGoBack: jest.fn(() => true),
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function renderScreen(): ReturnType<typeof render> {
  return render(
    <MultiplayerHistoryScreen
      navigation={mockNavigation as never}
      route={{ key: 'MultiplayerHistory', name: 'MultiplayerHistory', params: undefined } as never}
    />,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Réinitialiser le comportement par défaut après clearAllMocks
  mockLoadAll.mockResolvedValue([]);
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('MultiplayerHistoryScreen', () => {
  describe('état vide', () => {
    it('affiche le message "Aucune partie multijoueur pour l\'instant" quand aucune entrée', async () => {
      mockLoadAll.mockResolvedValue([]);

      const { getByText } = renderScreen();

      await waitFor(() => {
        expect(getByText("Aucune partie multijoueur pour l'instant")).toBeTruthy();
      });
    });

    it('appelle loadAll au montage', async () => {
      mockLoadAll.mockResolvedValue([]);

      renderScreen();

      await waitFor(() => {
        expect(mockLoadAll).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('liste avec items', () => {
    it('affiche les 2 items avec les joueurs', async () => {
      const records = [makeRecord('id-1'), makeRecord('id-2', null)];
      mockLoadAll.mockResolvedValue(records);

      const { getAllByText } = renderScreen();

      await waitFor(() => {
        // Les deux items affichent "Alice vs Bob"
        const playerTexts = getAllByText('Alice vs Bob');
        expect(playerTexts).toHaveLength(2);
      });
    });

    it('affiche le nombre de manches correctement', async () => {
      const records = [makeRecord('id-1')];
      mockLoadAll.mockResolvedValue(records);

      const { getByText } = renderScreen();

      await waitFor(() => {
        expect(getByText('2 manches')).toBeTruthy();
      });
    });

    it('affiche le badge gagnant avec le nom du gagnant', async () => {
      const records = [makeRecord('id-1', 'Alice')];
      mockLoadAll.mockResolvedValue(records);

      const { getByText } = renderScreen();

      await waitFor(() => {
        expect(getByText('Gagnant : Alice')).toBeTruthy();
      });
    });

    it('affiche "Égalité" quand winner est null', async () => {
      const records = [makeRecord('id-1', null)];
      mockLoadAll.mockResolvedValue(records);

      const { getByText } = renderScreen();

      await waitFor(() => {
        expect(getByText('Égalité')).toBeTruthy();
      });
    });

    it('affiche le titre de l\'écran', async () => {
      mockLoadAll.mockResolvedValue([]);

      const { getByText } = renderScreen();

      await act(async () => {
        await waitFor(() => {
          expect(getByText('Historique multijoueur')).toBeTruthy();
        });
      });
    });
  });

  describe('navigation', () => {
    it('appelle goBack au clic sur le bouton retour', async () => {
      mockLoadAll.mockResolvedValue([]);

      const { getByLabelText } = renderScreen();

      await waitFor(() => {
        expect(getByLabelText('Retour')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByLabelText('Retour'));
      });

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });
});
