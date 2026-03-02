/**
 * GameHUD Tests — WikiHop Mobile — Wave 3 (M-05)
 *
 * Teste le composant GameHUD :
 *   - Rendu correct avec les props
 *   - Pluriel "saut" / "sauts"
 *   - accessibilityLabel du conteneur
 *
 * useGameTimer est mocké pour isoler le composant.
 *
 * ADR-003 : React Native Testing Library pour les tests de composants
 */

import { render, screen } from '@testing-library/react-native';
import React from 'react';

// Mock useGameTimer pour isoler GameHUD du store et du timer
jest.mock('../src/hooks/useGameTimer', () => ({
  useGameTimer: jest.fn(),
  formatSeconds: jest.requireActual('../src/hooks/useGameTimer').formatSeconds,
}));

import { GameHUD } from '../src/components/game/GameHUD';
import { useGameTimer } from '../src/hooks/useGameTimer';

const mockUseGameTimer = useGameTimer as jest.MockedFunction<typeof useGameTimer>;

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('GameHUD', () => {
  beforeEach(() => {
    mockUseGameTimer.mockReturnValue({
      formattedTime: '01:24',
      elapsedSeconds: 84,
    });
  });

  describe('Rendu de base', () => {
    it('rend sans crash', () => {
      expect(() =>
        render(<GameHUD jumps={3} targetTitle="Tour Eiffel" />),
      ).not.toThrow();
    });

    it('affiche le compteur de sauts', () => {
      render(<GameHUD jumps={3} targetTitle="Tour Eiffel" />);
      expect(screen.getByText('3 sauts')).toBeTruthy();
    });

    it('affiche le timer issu du hook', () => {
      render(<GameHUD jumps={3} targetTitle="Tour Eiffel" />);
      expect(screen.getByText('01:24')).toBeTruthy();
    });

    it('affiche le titre cible', () => {
      render(<GameHUD jumps={3} targetTitle="Tour Eiffel" />);
      expect(screen.getByText('Tour Eiffel')).toBeTruthy();
    });
  });

  describe('Pluriel saut/sauts', () => {
    it('affiche "0 saut" au singulier pour 0 saut', () => {
      render(<GameHUD jumps={0} targetTitle="Louvre" />);
      expect(screen.getByText('0 saut')).toBeTruthy();
    });

    it('affiche "1 saut" au singulier pour 1 saut', () => {
      render(<GameHUD jumps={1} targetTitle="Louvre" />);
      expect(screen.getByText('1 saut')).toBeTruthy();
    });

    it('affiche "2 sauts" au pluriel pour 2 sauts', () => {
      render(<GameHUD jumps={2} targetTitle="Louvre" />);
      expect(screen.getByText('2 sauts')).toBeTruthy();
    });

    it('affiche "10 sauts" au pluriel pour 10 sauts', () => {
      render(<GameHUD jumps={10} targetTitle="Louvre" />);
      expect(screen.getByText('10 sauts')).toBeTruthy();
    });
  });

  describe('Timer à zéro', () => {
    it('affiche "00:00" quand le timer retourne 0', () => {
      mockUseGameTimer.mockReturnValue({
        formattedTime: '00:00',
        elapsedSeconds: 0,
      });
      render(<GameHUD jumps={0} targetTitle="Louvre" />);
      expect(screen.getByText('00:00')).toBeTruthy();
    });
  });

  describe('Accessibilité', () => {
    it('a un accessibilityLabel sur le conteneur avec les informations complètes', () => {
      const { UNSAFE_getByProps } = render(
        <GameHUD jumps={3} targetTitle="Tour Eiffel" />,
      );

      // Récupérer le conteneur via ses props d'accessibilité
      const hudElement = UNSAFE_getByProps({ accessibilityRole: 'text' });
      const label = hudElement.props.accessibilityLabel as string;

      expect(label).toContain('3 sauts');
      expect(label).toContain('Tour Eiffel');
      // Le temps est exprimé en label accessible (pas "01:24" mais "minutes secondes")
      expect(label).toMatch(/minute|seconde/);
    });

    it('a un accessibilityLabel correct avec 0 saut et 0 secondes', () => {
      mockUseGameTimer.mockReturnValue({
        formattedTime: '00:00',
        elapsedSeconds: 0,
      });
      const { UNSAFE_getByProps } = render(
        <GameHUD jumps={0} targetTitle="Louvre" />,
      );

      const hudElement = UNSAFE_getByProps({ accessibilityRole: 'text' });
      const label = hudElement.props.accessibilityLabel as string;

      expect(label).toContain('0 saut');
      expect(label).toContain('Louvre');
    });
  });

  describe('Titre cible vide', () => {
    it('gère un titre cible vide sans crash', () => {
      expect(() =>
        render(<GameHUD jumps={0} targetTitle="" />),
      ).not.toThrow();
    });
  });
});
