/**
 * Tests DonationScreen — F3-04
 *
 * Tests alongside (écrits en parallèle de l'implémentation) :
 *   - Linking.openURL appelé avec l'URL Wikimedia lors du tap sur le CTA
 *   - navigation.goBack() appelé lors du tap sur le bouton retour
 *   - Rendu correct du contenu statique
 *
 * Stratégie de mock Linking :
 *   jest.spyOn sur les méthodes Linking après import (jest-expo mocke react-native).
 */

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Linking } from 'react-native';

import { DonationScreen } from '../src/screens/DonationScreen';

// ─────────────────────────────────────────────────────────────────────────────
// Mock navigation
// ─────────────────────────────────────────────────────────────────────────────

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual<typeof import('@react-navigation/native')>('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ goBack: mockGoBack }),
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper render
// ─────────────────────────────────────────────────────────────────────────────

function renderDonationScreen(): ReturnType<typeof render> {
  const navigation = {
    goBack: mockGoBack,
    navigate: jest.fn(),
    replace: jest.fn(),
    push: jest.fn(),
    pop: jest.fn(),
    popToTop: jest.fn(),
    dispatch: jest.fn(),
    reset: jest.fn(),
    setOptions: jest.fn(),
    isFocused: jest.fn(),
    canGoBack: jest.fn(),
    getId: jest.fn(),
    getParent: jest.fn(),
    getState: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
  } as unknown as Parameters<typeof DonationScreen>[0]['navigation'];

  const route = {
    key: 'Donation-key',
    name: 'Donation' as const,
    params: undefined,
  } as unknown as Parameters<typeof DonationScreen>[0]['route'];

  return render(<DonationScreen navigation={navigation} route={route} />);
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('DonationScreen', () => {
  let canOpenURLSpy: jest.SpyInstance<Promise<boolean>, [string]>;
  let openURLSpy: jest.SpyInstance<Promise<void>, [string]>;

  beforeEach(() => {
    jest.clearAllMocks();
    canOpenURLSpy = jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  afterEach(() => {
    canOpenURLSpy.mockRestore();
    openURLSpy.mockRestore();
  });

  it('affiche le titre "Soutenir Wikipedia"', () => {
    const { getByText } = renderDonationScreen();
    expect(getByText('Soutenir Wikipedia')).toBeTruthy();
  });

  it('affiche le bouton CTA "Faire un don à Wikipedia"', () => {
    const { getByText } = renderDonationScreen();
    expect(getByText('Faire un don à Wikipedia')).toBeTruthy();
  });

  it('affiche l\'URL de référence donate.wikimedia.org', () => {
    const { getByText } = renderDonationScreen();
    expect(getByText('donate.wikimedia.org')).toBeTruthy();
  });

  it('appelle Linking.openURL avec https://donate.wikimedia.org lors du tap sur le CTA', async () => {
    const { getByText } = renderDonationScreen();
    const ctaButton = getByText('Faire un don à Wikipedia');

    fireEvent.press(ctaButton);

    await waitFor(() => {
      expect(openURLSpy).toHaveBeenCalledWith('https://donate.wikimedia.org');
    });
  });

  it('appelle Linking.canOpenURL avant d\'ouvrir l\'URL', async () => {
    const { getByText } = renderDonationScreen();
    const ctaButton = getByText('Faire un don à Wikipedia');

    fireEvent.press(ctaButton);

    await waitFor(() => {
      expect(canOpenURLSpy).toHaveBeenCalledWith('https://donate.wikimedia.org');
    });
  });

  it('n\'appelle pas Linking.openURL si canOpenURL retourne false', async () => {
    canOpenURLSpy.mockResolvedValue(false);

    const { getByText } = renderDonationScreen();
    const ctaButton = getByText('Faire un don à Wikipedia');

    fireEvent.press(ctaButton);

    await waitFor(() => {
      expect(canOpenURLSpy).toHaveBeenCalled();
    });

    expect(openURLSpy).not.toHaveBeenCalled();
  });

  it('appelle navigation.goBack() lors du tap sur le bouton retour', () => {
    const { getByLabelText } = renderDonationScreen();
    // Le label a11y est t('donation.back_button_a11y') = 'Retour à l\'accueil' (F3-26 i18n)
    const backButton = getByLabelText("Retour à l'accueil");

    fireEvent.press(backButton);

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
