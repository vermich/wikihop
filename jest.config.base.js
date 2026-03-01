/**
 * Configuration Jest partagée — WikiHop
 *
 * Étendue par apps/mobile/jest.config.js et apps/backend/jest.config.js
 * ADR-003 : Seuil de couverture 70% sur la logique métier
 */

'use strict';

/** @type {import('jest').Config} */
const baseConfig = {
  // Extensions de fichiers à considérer
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // TypeScript transformé via ts-jest (backend) ou babel-jest (mobile)
  // Chaque workspace surcharge cette section

  // Couverture de code
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/index.ts', // Barrels exclus de la couverture
    '!src/**/*.stories.{ts,tsx}', // Storybook (Phase 3+)
  ],
  coverageThreshold: {
    global: {
      lines: 70,
      branches: 70,
      functions: 70,
      statements: 70,
    },
  },
  coverageReporters: ['text', 'lcov', 'json-summary'],
  coverageDirectory: 'coverage',

  // Timeout par test (10s — augmenter si besoin d'appels réseau mockés)
  testTimeout: 10000,

  // Verbosité
  verbose: true,

  // Patterns d'exclusion
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/', '/.expo/'],

  // Variables d'environnement pour les tests
  testEnvironmentOptions: {
    url: 'http://localhost',
  },
};

module.exports = baseConfig;
