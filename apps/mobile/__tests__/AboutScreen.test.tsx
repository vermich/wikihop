/**
 * AboutScreen Tests — WikiHop Mobile — Phase 3 (F3-06)
 *
 * Teste le composant AboutScreen :
 *   - Rendu sans crash
 *   - Version affichée depuis Constants.expoConfig
 *   - Fallback "—" si Constants.expoConfig est null
 *   - Titre "À propos" visible
 *   - Nom "WikiHop" visible
 *   - Bouton retour présent et fonctionnel (goBack)
 *   - Liens présents avec accessibilityRole="link"
 *   - Liens appellent Linking.openURL avec la bonne URL
 *
 * Conventions :
 *   - Mocks via jest.mock (Constants, Linking)
 *   - Navigation mockée
 *   - NativeStackScreenProps simulé minimalement
 */

import { render, screen, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { Linking } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

// Mock expo-constants — version configurable par test
let mockVersion: string | undefined = '1.2.3';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return mockVersion !== undefined ? { version: mockVersion } : null;
    },
  },
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

const mockGoBack = jest.fn();
const mockNavigation = {
  goBack: mockGoBack,
  navigate: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
  canGoBack: jest.fn(() => true),
};

const mockRoute = {
  key: 'About-test',
  name: 'About' as const,
  params: undefined,
};

// ─────────────────────────────────────────────────────────────────────────────
// Import du composant (après les mocks)
// ─────────────────────────────────────────────────────────────────────────────

import { AboutScreen } from '../src/screens/AboutScreen';

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

function renderAboutScreen(): ReturnType<typeof render> {
  return render(
    <AboutScreen
      navigation={mockNavigation as never}
      route={mockRoute as never}
    />,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('AboutScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVersion = '1.2.3';
  });

  it('se rend sans crash', () => {
    expect(() => { renderAboutScreen(); }).not.toThrow();
  });

  it('affiche le titre "À propos"', () => {
    renderAboutScreen();
    expect(screen.getByText('À propos')).toBeTruthy();
  });

  it('affiche le nom de l\'application "WikiHop"', () => {
    renderAboutScreen();
    // Le nom apparaît dans le corps du contenu (pas le header)
    const elements = screen.getAllByText('WikiHop');
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it('affiche la version depuis Constants.expoConfig', () => {
    mockVersion = '2.5.0';
    renderAboutScreen();
    expect(screen.getByText('Version 2.5.0')).toBeTruthy();
  });

  it('affiche "—" comme version si Constants.expoConfig est null', () => {
    mockVersion = undefined;
    renderAboutScreen();
    expect(screen.getByText('Version —')).toBeTruthy();
  });

  it('appelle navigation.goBack() quand le bouton retour est pressé', () => {
    renderAboutScreen();
    // Le label a11y est t('about.back_button_a11y') = 'Retour à l\'accueil' (F3-26 i18n)
    fireEvent.press(screen.getByLabelText("Retour à l'accueil"));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('affiche le lien API MediaWiki', () => {
    renderAboutScreen();
    expect(screen.getByLabelText("Voir les conditions d'utilisation de l'API MediaWiki")).toBeTruthy();
  });

  it('affiche le lien politique de confidentialité', () => {
    renderAboutScreen();
    expect(screen.getByLabelText('Consulter la politique de confidentialité de WikiHop')).toBeTruthy();
  });

  it('affiche le lien GitHub', () => {
    renderAboutScreen();
    expect(screen.getByLabelText('Voir le code source de WikiHop sur GitHub')).toBeTruthy();
  });

  it('appelle Linking.openURL avec l\'URL MediaWiki quand le lien est pressé', () => {
    const spy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    renderAboutScreen();
    fireEvent.press(screen.getByLabelText("Voir les conditions d'utilisation de l'API MediaWiki"));
    expect(spy).toHaveBeenCalledWith('https://www.mediawiki.org/wiki/API:Main_page');
    spy.mockRestore();
  });

  it('appelle Linking.openURL avec l\'URL privacy quand le lien légal est pressé', () => {
    const spy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    renderAboutScreen();
    fireEvent.press(screen.getByLabelText('Consulter la politique de confidentialité de WikiHop'));
    expect(spy).toHaveBeenCalledWith('https://wikihop.app/privacy');
    spy.mockRestore();
  });

  it('appelle Linking.openURL avec l\'URL GitHub quand le lien est pressé', () => {
    const spy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    renderAboutScreen();
    fireEvent.press(screen.getByLabelText('Voir le code source de WikiHop sur GitHub'));
    expect(spy).toHaveBeenCalledWith('https://github.com/wikihop/wikihop');
    spy.mockRestore();
  });

  it('affiche le texte de description DPO-validé', () => {
    renderAboutScreen();
    expect(
      screen.getByText(/WikiHop est un jeu de navigation/),
    ).toBeTruthy();
  });

  it('affiche la mention CC BY-SA 4.0', () => {
    renderAboutScreen();
    expect(screen.getByText(/CC\s+BY-SA\s+4\.0/)).toBeTruthy();
  });
});
