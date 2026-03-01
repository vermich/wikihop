/**
 * Jest Configuration — WikiHop Mobile
 *
 * Étend la config de base du monorepo.
 * Utilise jest-expo comme preset pour la compatibilité Expo SDK 52.
 *
 * Note : setupFilesAfterFramework dans la spec est une typo —
 * le nom correct Jest est setupFilesAfterEnv.
 *
 * ADR-003 : Tests unitaires avec React Native Testing Library
 */

const baseConfig = require('../../jest.config.base.js');

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  preset: 'jest-expo',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  setupFiles: ['./jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  moduleNameMapper: {
    '@wikihop/shared': '<rootDir>/../../packages/shared/src/types/index.ts',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/navigation/**', // Navigation est du wiring, pas de logique métier
  ],
};
