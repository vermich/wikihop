/**
 * ESLint configuration — @wikihop/backend
 * Étend la configuration racine du monorepo.
 */

'use strict';

module.exports = {
  extends: ['../../.eslintrc.js'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  rules: {
    // En contexte de migration DB, console est acceptable (script CLI)
    // Le reste du code utilise Pino exclusivement
    'no-console': ['warn', { allow: ['error'] }],
  },
};
