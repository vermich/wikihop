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
  // Exclusions du coverage : fichiers infrastructure non-testables par design
  // ADR-003 : seuil 70% sur la logique métier — les fichiers de config/setup en sont exclus
  collectCoverageFrom: [
    ...(baseConfig.collectCoverageFrom ?? ['src/**/*.{ts,tsx}']),
    '!src/server.ts',      // Point d'entrée (listen) — pas de logique métier
    '!src/db/migrate.ts',  // Script de migration — requiert une vraie DB
    '!src/app.ts',         // Setup Fastify + plugins — branches infra (onReady DB hook)
    '!src/env.ts',         // Validation env Zod — branche process.exit(1) non-testable sans mock process
  ],
  setupFiles: ['./jest.setup.ts'],
};
