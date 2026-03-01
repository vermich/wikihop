/**
 * Configuration Jest — @wikihop/backend
 * Étend la config de base du monorepo.
 */

'use strict';

const baseConfig = require('../../jest.config.base.js');

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '@wikihop/shared': '<rootDir>/../../packages/shared/src/types/index.ts',
  },
  globals: {
    'ts-jest': {
      tsconfig: './tsconfig.json',
    },
  },
  // Les tests de BDD nécessitent DATABASE_URL — skippés si absente
  testPathIgnorePatterns: [
    ...(baseConfig.testPathIgnorePatterns ?? []),
    // db.test.ts est conditionnel (nécessite PostgreSQL)
  ],
  setupFiles: ['./jest.setup.ts'],
};
