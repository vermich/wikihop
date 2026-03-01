/**
 * Jest Setup — WikiHop Mobile
 *
 * Mocks globaux pour l'environnement de test React Native.
 * Ce fichier est chargé avant chaque suite de tests (setupFiles).
 */

// Mock de @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Mock de react-native-screens (évite les erreurs natives en test)
jest.mock('react-native-screens', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RealComponent = jest.requireActual<typeof import('react-native-screens')>('react-native-screens');
  return {
    ...RealComponent,
    enableScreens: jest.fn(),
  };
});
