/**
 * HomeScreen Tests — WikiHop Mobile
 *
 * Teste le rendu du composant HomeScreen Phase 1.
 * Smoke test : vérifie que le composant rend sans crash
 * et affiche les éléments attendus.
 *
 * ADR-003 : React Native Testing Library pour les tests de composants
 */

import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { HomeScreen } from '../src/screens/HomeScreen';

describe('HomeScreen', () => {
  it('renders without crashing', () => {
    expect(() => render(<HomeScreen />)).not.toThrow();
  });

  it('displays the WikiHop title', () => {
    render(<HomeScreen />);
    expect(screen.getByText('WikiHop')).toBeTruthy();
  });

  it('displays the coming soon subtitle', () => {
    render(<HomeScreen />);
    expect(screen.getByText('Coming soon')).toBeTruthy();
  });
});
