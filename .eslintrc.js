/**
 * ESLint configuration racine — WikiHop
 *
 * Cette config est étendue par chaque workspace.
 * Les workspaces mobile et backend ajoutent leurs plugins spécifiques.
 *
 * ADR-002 : TypeScript strict, zéro `any` non justifié
 */

'use strict';

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier', // Doit être en dernier — désactive les règles conflictuelles avec Prettier
  ],
  rules: {
    // TypeScript strict — aucun `any` sans justification explicite
    '@typescript-eslint/no-explicit-any': 'error',

    // Retour de type explicite sur les fonctions publiques
    '@typescript-eslint/explicit-function-return-type': [
      'error',
      {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
        allowHigherOrderFunctions: true,
      },
    ],
    '@typescript-eslint/explicit-module-boundary-types': 'error',

    // Pas de variables ou imports non utilisés
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],

    // Exports nommés obligatoires (sauf navigateurs React Navigation — défaut autorisé)
    // Note : default export autorisé dans les fichiers de navigation uniquement
    // Cette règle est commentée car elle n'est pas applicable universellement :
    // Expo exige un default export pour le composant racine App
    // 'import/no-default-export': 'error',

    // Imports ordonnés
    'import/order': [
      'warn',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],

    // Qualité générale
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-alert': 'error',
    eqeqeq: ['error', 'always'],
    'prefer-const': 'error',
    'no-var': 'error',

    // Interdit les `any` en cast sans commentaire explicite
    '@typescript-eslint/consistent-type-assertions': [
      'error',
      {
        assertionStyle: 'as',
        objectLiteralTypeAssertions: 'never',
      },
    ],

    // Types dans des fichiers dédiés si réutilisés — rappel documentaire (pas enforced automatiquement)
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
    ],
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
      },
    },
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    '.expo/',
    '*.config.js',
    '*.config.ts',
    'jest.config.*',
    'babel.config.*',
    'metro.config.*',
  ],
};
