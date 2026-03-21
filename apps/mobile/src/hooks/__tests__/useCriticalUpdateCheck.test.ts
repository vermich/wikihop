/**
 * Tests TDD — useCriticalUpdateCheck
 *
 * Écrits AVANT l'implémentation du hook (TDD strict).
 * Le hook vérifie les mises à jour critiques au démarrage de l'app.
 *
 * Pattern RNTL v12 :
 * - renderHook() en dehors de act() — RNTL le wrap automatiquement
 * - flushPromises() pour vider la micro-task queue après le montage
 * - Mutations de `isEmbeddedLaunch` directement sur le module mocké
 */

import { renderHook } from '@testing-library/react-native';
import * as Updates from 'expo-updates';

jest.mock('expo-updates', () => ({
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
  isEmbeddedLaunch: false,
  channel: 'production',
}));

// Référence typée au module mocké pour les mutations de propriétés
const mockUpdates = Updates as jest.Mocked<typeof Updates> & {
  isEmbeddedLaunch: boolean;
};

// Helper : vider la micro-task queue pour laisser les promesses se résoudre
const flushPromises = (): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, 0));

// Import direct du hook (pas de réimport — isEmbeddedLaunch est muté sur l'objet module)
import { useCriticalUpdateCheck } from '../useCriticalUpdateCheck';

describe('useCriticalUpdateCheck()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdates.isEmbeddedLaunch = false;
    (Updates.checkForUpdateAsync as jest.Mock).mockResolvedValue({ isAvailable: false });
  });

  it('ne fait rien si Updates.isEmbeddedLaunch est true (Expo Go / simulateur)', async () => {
    mockUpdates.isEmbeddedLaunch = true;

    renderHook(() => useCriticalUpdateCheck());
    await flushPromises();

    expect(Updates.checkForUpdateAsync).not.toHaveBeenCalled();
    expect(Updates.fetchUpdateAsync).not.toHaveBeenCalled();
    expect(Updates.reloadAsync).not.toHaveBeenCalled();
  });

  it('appelle checkForUpdateAsync au montage', async () => {
    (Updates.checkForUpdateAsync as jest.Mock).mockResolvedValue({ isAvailable: false });

    renderHook(() => useCriticalUpdateCheck());
    await flushPromises();

    expect(Updates.checkForUpdateAsync).toHaveBeenCalledTimes(1);
  });

  it('appelle fetchUpdateAsync si une update est disponible', async () => {
    (Updates.checkForUpdateAsync as jest.Mock).mockResolvedValue({ isAvailable: true });
    (Updates.fetchUpdateAsync as jest.Mock).mockResolvedValue({
      isNew: true,
      manifest: { metadata: { message: 'fix: correction mineure' } },
      isRollBackToEmbedded: false,
    });

    renderHook(() => useCriticalUpdateCheck());
    await flushPromises();

    expect(Updates.fetchUpdateAsync).toHaveBeenCalledTimes(1);
  });

  it('appelle reloadAsync uniquement si le message commence par [CRITICAL]', async () => {
    (Updates.checkForUpdateAsync as jest.Mock).mockResolvedValue({ isAvailable: true });
    (Updates.fetchUpdateAsync as jest.Mock).mockResolvedValue({
      isNew: true,
      manifest: { metadata: { message: '[CRITICAL] fix: patch de sécurité critique' } },
      isRollBackToEmbedded: false,
    });

    renderHook(() => useCriticalUpdateCheck());
    await flushPromises();

    expect(Updates.reloadAsync).toHaveBeenCalledTimes(1);
  });

  it('ne appelle pas reloadAsync si update disponible mais non critique', async () => {
    (Updates.checkForUpdateAsync as jest.Mock).mockResolvedValue({ isAvailable: true });
    (Updates.fetchUpdateAsync as jest.Mock).mockResolvedValue({
      isNew: true,
      manifest: { metadata: { message: 'fix: correction affichage scores' } },
      isRollBackToEmbedded: false,
    });

    renderHook(() => useCriticalUpdateCheck());
    await flushPromises();

    expect(Updates.reloadAsync).not.toHaveBeenCalled();
  });

  it('absorbe les erreurs de checkForUpdateAsync sans crash (réseau indisponible)', async () => {
    (Updates.checkForUpdateAsync as jest.Mock).mockRejectedValue(
      new Error('Network request failed'),
    );

    renderHook(() => useCriticalUpdateCheck());
    await flushPromises();

    // Si le hook crashait, le test échouerait — on vérifie aussi que les autres
    // fonctions n'ont pas été appelées
    expect(Updates.fetchUpdateAsync).not.toHaveBeenCalled();
    expect(Updates.reloadAsync).not.toHaveBeenCalled();
  });

  it('absorbe les erreurs de fetchUpdateAsync sans crash', async () => {
    (Updates.checkForUpdateAsync as jest.Mock).mockResolvedValue({ isAvailable: true });
    (Updates.fetchUpdateAsync as jest.Mock).mockRejectedValue(
      new Error('Download failed'),
    );

    renderHook(() => useCriticalUpdateCheck());
    await flushPromises();

    // Si le hook crashait, le test échouerait
    expect(Updates.reloadAsync).not.toHaveBeenCalled();
  });
});
