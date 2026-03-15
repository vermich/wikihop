/**
 * Tests — MultiplayerSetupScreen.tsx (F3-12, F3-28, F3-32)
 *
 * Couvre :
 *   - Rendu de base : header, section JOUEURS, MANCHES, PAIRES
 *   - N slots PairSlot affichés selon roundCount
 *   - Bouton "Commencer" disabled si une paire est en loading (slot null)
 *   - Bouton "Renouveler" par slot : présent et appelable en état success
 *   - Stepper manches : augmenter / diminuer roundCount
 *   - Ajout/suppression de joueurs
 *   - Navigation vers PassPhone après validation
 *
 * Architecture F3-32 :
 *   - useRefreshablePair est mockée (pas useRandomPair)
 *   - setupSession reçoit (names, pairs, roundCount) où pairs est un tableau
 *   - Le bouton Commencer est conditionné sur hasUnreadyPair (tableau readyPairs)
 *
 * Stratégie de mock :
 *   - useRefreshablePair mockée globalement (comportement configurable par test)
 *   - useGameStore mocké
 *   - useMultiplayerStore mocké
 *   - useLanguageStore mocké (requis par useRefreshablePair)
 *   - navigation mocké manuellement
 */

import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

import { MultiplayerSetupScreen } from '../../src/screens/MultiplayerSetupScreen';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks stores
// ─────────────────────────────────────────────────────────────────────────────

const mockSetupSession = jest.fn();
const mockClearSession = jest.fn().mockResolvedValue(undefined);
const mockStartSession = jest.fn().mockResolvedValue(undefined);

jest.mock('../../src/store/multiplayer.store', () => ({
  useMultiplayerStore: jest.fn((selector: (state: {
    setupSession: jest.Mock;
  }) => unknown) =>
    selector({
      setupSession: mockSetupSession,
    }),
  ),
}));

jest.mock('../../src/store/game.store', () => ({
  useGameStore: jest.fn((selector: (state: {
    clearSession: jest.Mock;
    startSession: jest.Mock;
  }) => unknown) =>
    selector({
      clearSession: mockClearSession,
      startSession: mockStartSession,
    }),
  ),
}));

jest.mock('../../src/store/language.store', () => ({
  useLanguageStore: jest.fn((selector: (state: { language: string }) => unknown) =>
    selector({ language: 'fr' }),
  ),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Mock useRefreshablePair (F3-32 — PairSlot utilise ce hook)
// ─────────────────────────────────────────────────────────────────────────────

type PairStatus = 'loading' | 'success' | 'error';

let mockPairStatus: PairStatus = 'success';
const mockPairStart = {
  id: '1',
  title: 'Paris',
  url: 'https://fr.wikipedia.org/wiki/Paris',
  language: 'fr' as const,
  extract: 'Capitale de la France',
};
const mockPairTarget = {
  id: '2',
  title: 'Rome',
  url: 'https://fr.wikipedia.org/wiki/Rome',
  language: 'fr' as const,
  extract: 'Capitale de l\'Italie',
};
const mockRefresh = jest.fn();

jest.mock('../../src/hooks/useRefreshablePair', () => ({
  useRefreshablePair: jest.fn(() => {
    if (mockPairStatus === 'success') {
      return {
        state: { status: 'success', start: mockPairStart, target: mockPairTarget },
        refresh: mockRefresh,
      };
    }
    if (mockPairStatus === 'loading') {
      return {
        state: { status: 'loading' },
        refresh: mockRefresh,
      };
    }
    return {
      state: { status: 'error', message: 'Erreur réseau' },
      refresh: mockRefresh,
    };
  }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Mock navigation
// ─────────────────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: mockGoBack,
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
    <MultiplayerSetupScreen
      navigation={mockNavigation as never}
      route={{ key: 'MultiplayerSetup', name: 'MultiplayerSetup', params: undefined } as never}
    />,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockPairStatus = 'success';
  mockClearSession.mockResolvedValue(undefined);
  mockStartSession.mockResolvedValue(undefined);
});

// ─────────────────────────────────────────────────────────────────────────────
// Rendu de base
// ─────────────────────────────────────────────────────────────────────────────

describe('MultiplayerSetupScreen — rendu de base', () => {
  it('rend sans crash', () => {
    expect(() => renderScreen()).not.toThrow();
  });

  it('affiche le header "Multijoueur"', () => {
    const { getByText } = renderScreen();
    expect(getByText('Multijoueur')).toBeTruthy();
  });

  it('affiche la section JOUEURS', () => {
    const { getByText } = renderScreen();
    expect(getByText('JOUEURS')).toBeTruthy();
  });

  it('affiche la section MANCHES', () => {
    const { getByText } = renderScreen();
    expect(getByText('MANCHES')).toBeTruthy();
  });

  it('affiche la section PAIRES', () => {
    const { getByText } = renderScreen();
    expect(getByText('PAIRES')).toBeTruthy();
  });

  it('affiche 2 slots joueurs par défaut', () => {
    const { getByLabelText } = renderScreen();
    expect(getByLabelText('Nom du joueur 1')).toBeTruthy();
    expect(getByLabelText('Nom du joueur 2')).toBeTruthy();
  });

  it('affiche le bouton Commencer', () => {
    const { getByText } = renderScreen();
    expect(getByText('Commencer')).toBeTruthy();
  });

  it('affiche le bouton + Ajouter un joueur', () => {
    const { getByText } = renderScreen();
    expect(getByText('+ Ajouter un joueur')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Slots PairSlot — N paires selon roundCount
// ─────────────────────────────────────────────────────────────────────────────

describe('MultiplayerSetupScreen — slots PairSlot', () => {
  it('affiche 1 slot MANCHE par défaut (roundCount = 1)', () => {
    const { getByText } = renderScreen();
    expect(getByText('MANCHE 1')).toBeTruthy();
  });

  it('affiche 2 slots MANCHE après incrémentation du stepper', () => {
    const { getByLabelText, getByText } = renderScreen();
    fireEvent.press(getByLabelText('Augmenter le nombre de manches — 1 actuellement'));
    expect(getByText('MANCHE 1')).toBeTruthy();
    expect(getByText('MANCHE 2')).toBeTruthy();
  });

  it('affiche les titres de la paire en état success', () => {
    mockPairStatus = 'success';
    const { getByText } = renderScreen();
    expect(getByText('Paris')).toBeTruthy();
    expect(getByText('Rome')).toBeTruthy();
  });

  it('affiche le bouton Renouveler en état success', () => {
    mockPairStatus = 'success';
    const { getByLabelText } = renderScreen();
    expect(getByLabelText('Renouveler la paire de la manche 1')).toBeTruthy();
  });

  it('le bouton Renouveler appelle refresh()', () => {
    mockPairStatus = 'success';
    const { getByLabelText } = renderScreen();
    fireEvent.press(getByLabelText('Renouveler la paire de la manche 1'));
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('affiche le bouton Réessayer en état error', () => {
    mockPairStatus = 'error';
    const { getByLabelText } = renderScreen();
    expect(getByLabelText('Réessayer de charger la paire de la manche 1')).toBeTruthy();
  });

  it('le bouton Réessayer appelle refresh()', () => {
    mockPairStatus = 'error';
    const { getByLabelText } = renderScreen();
    fireEvent.press(getByLabelText('Réessayer de charger la paire de la manche 1'));
    expect(mockRefresh).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Stepper manches
// ─────────────────────────────────────────────────────────────────────────────

describe('MultiplayerSetupScreen — stepper manches', () => {
  it('affiche "1" comme valeur initiale des manches', () => {
    const { getByLabelText } = renderScreen();
    expect(getByLabelText('1 manche')).toBeTruthy();
  });

  it('augmente le nombre de manches au clic sur "+"', () => {
    const { getByLabelText } = renderScreen();
    fireEvent.press(getByLabelText('Augmenter le nombre de manches — 1 actuellement'));
    expect(getByLabelText('2 manches')).toBeTruthy();
  });

  it('diminue le nombre de manches au clic sur "−"', () => {
    const { getByLabelText } = renderScreen();
    // D'abord augmenter
    fireEvent.press(getByLabelText('Augmenter le nombre de manches — 1 actuellement'));
    expect(getByLabelText('2 manches')).toBeTruthy();
    // Puis diminuer
    fireEvent.press(getByLabelText('Réduire le nombre de manches — 2 actuellement'));
    expect(getByLabelText('1 manche')).toBeTruthy();
  });

  it('le bouton "−" est disabled à 1 manche (minimum)', () => {
    const { getByLabelText } = renderScreen();
    const decrementBtn = getByLabelText('Réduire le nombre de manches — 1 actuellement');
    expect(decrementBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('le bouton "+" est disabled à 5 manches (maximum)', () => {
    const { getByLabelText } = renderScreen();
    // Monter à 5
    fireEvent.press(getByLabelText('Augmenter le nombre de manches — 1 actuellement'));
    fireEvent.press(getByLabelText('Augmenter le nombre de manches — 2 actuellement'));
    fireEvent.press(getByLabelText('Augmenter le nombre de manches — 3 actuellement'));
    fireEvent.press(getByLabelText('Augmenter le nombre de manches — 4 actuellement'));
    expect(getByLabelText('Augmenter le nombre de manches — 5 actuellement').props.accessibilityState?.disabled).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Gestion des slots joueurs
// ─────────────────────────────────────────────────────────────────────────────

describe('MultiplayerSetupScreen — gestion des slots joueurs', () => {
  it('ajoute un slot joueur au clic sur "+ Ajouter un joueur"', () => {
    const { getByText, getByLabelText } = renderScreen();
    fireEvent.press(getByText('+ Ajouter un joueur'));
    expect(getByLabelText('Nom du joueur 3')).toBeTruthy();
  });

  it('supprime un slot via le bouton Supprimer si > 2 joueurs', () => {
    const { getByText, queryByLabelText, getAllByLabelText } = renderScreen();
    // Ajouter un 3e joueur d'abord
    fireEvent.press(getByText('+ Ajouter un joueur'));
    // Les 3 boutons Supprimer sont maintenant accessibles
    const allRemoveBtns = getAllByLabelText(/Supprimer le joueur/);
    // Supprimer le 3e joueur
    fireEvent.press(allRemoveBtns[2] as ReturnType<typeof getByText>);
    expect(queryByLabelText('Nom du joueur 3')).toBeNull();
  });

  it('le bouton Supprimer est disabled quand il y a exactement 2 joueurs', () => {
    const { getAllByLabelText } = renderScreen();
    const removeBtns = getAllByLabelText(/Supprimer le joueur/);
    expect(removeBtns[0]?.props.accessibilityState?.disabled).toBe(true);
    expect(removeBtns[1]?.props.accessibilityState?.disabled).toBe(true);
  });

  it('le bouton "+ Ajouter un joueur" est disabled quand il y a 6 joueurs', () => {
    const { getByText, getByLabelText } = renderScreen();
    fireEvent.press(getByText('+ Ajouter un joueur')); // 3
    fireEvent.press(getByText('+ Ajouter un joueur')); // 4
    fireEvent.press(getByText('+ Ajouter un joueur')); // 5
    fireEvent.press(getByText('+ Ajouter un joueur')); // 6
    expect(getByLabelText('Ajouter un joueur').props.accessibilityState?.disabled).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bouton Commencer — état disabled
// ─────────────────────────────────────────────────────────────────────────────

describe('MultiplayerSetupScreen — bouton Commencer', () => {
  it('est disabled si une paire est en loading (slot null dans readyPairs)', async () => {
    // F3-32 : isStartDisabled si hasUnreadyPair (au moins un null dans readyPairs)
    // Quand pairStatus = 'loading', PairSlot appelle onPairNotReady → readyPairs[0] = null
    mockPairStatus = 'loading';
    const { getByLabelText } = renderScreen();
    // Attendre que useEffect dans PairSlot ait notifié le parent
    await act(async () => { await Promise.resolve(); });
    const btn = getByLabelText('Commencer la partie');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
  });

  it('est disabled si une paire est en erreur', async () => {
    mockPairStatus = 'error';
    const { getByLabelText } = renderScreen();
    await act(async () => { await Promise.resolve(); });
    const btn = getByLabelText('Commencer la partie');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
  });

  it('est disabled si un nom est vide (même si paire chargée)', async () => {
    mockPairStatus = 'success';
    const { getByLabelText } = renderScreen();
    await act(async () => { await Promise.resolve(); });
    // Les noms sont vides par défaut → hasEmptyName = true
    const btn = getByLabelText('Commencer la partie');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
  });

  it('est activé si la paire est chargée et tous les noms sont remplis', async () => {
    mockPairStatus = 'success';
    const { getByLabelText } = renderScreen();
    await act(async () => { await Promise.resolve(); });
    fireEvent.changeText(getByLabelText('Nom du joueur 1'), 'Alice');
    fireEvent.changeText(getByLabelText('Nom du joueur 2'), 'Bob');
    await act(async () => { await Promise.resolve(); });
    const btn = getByLabelText('Commencer la partie');
    expect(btn.props.accessibilityState?.disabled).toBe(false);
  });

  it('navigue vers PassPhone après validation réussie', async () => {
    mockPairStatus = 'success';
    const { getByLabelText } = renderScreen();
    await act(async () => { await Promise.resolve(); });

    fireEvent.changeText(getByLabelText('Nom du joueur 1'), 'Alice');
    fireEvent.changeText(getByLabelText('Nom du joueur 2'), 'Bob');
    await act(async () => { await Promise.resolve(); });

    await act(async () => {
      fireEvent.press(getByLabelText('Commencer la partie'));
    });

    await waitFor(() => {
      expect(mockSetupSession).toHaveBeenCalledWith(
        ['Alice', 'Bob'],
        expect.arrayContaining([
          expect.objectContaining({
            start: expect.objectContaining({ title: 'Paris' }),
            target: expect.objectContaining({ title: 'Rome' }),
          }),
        ]),
        1, // roundCount par défaut
      );
      expect(mockClearSession).toHaveBeenCalled();
      expect(mockStartSession).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('PassPhone', { playerName: 'Alice' });
    });
  });

  it('passe le roundCount correct à setupSession', async () => {
    mockPairStatus = 'success';
    const { getByLabelText } = renderScreen();
    await act(async () => { await Promise.resolve(); });

    fireEvent.changeText(getByLabelText('Nom du joueur 1'), 'Alice');
    fireEvent.changeText(getByLabelText('Nom du joueur 2'), 'Bob');

    // Augmenter à 2 manches
    fireEvent.press(getByLabelText('Augmenter le nombre de manches — 1 actuellement'));
    await act(async () => { await Promise.resolve(); });

    await act(async () => {
      fireEvent.press(getByLabelText('Commencer la partie'));
    });

    await waitFor(() => {
      expect(mockSetupSession).toHaveBeenCalledWith(
        ['Alice', 'Bob'],
        expect.any(Array),
        2, // 2 manches
      );
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bouton Retour
// ─────────────────────────────────────────────────────────────────────────────

describe('MultiplayerSetupScreen — navigation retour', () => {
  it('appelle navigation.goBack() au clic sur le bouton retour', () => {
    const { getByLabelText } = renderScreen();
    fireEvent.press(getByLabelText('Retour'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
