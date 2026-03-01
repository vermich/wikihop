'use strict';

module.exports = {
  extends: ['../../.eslintrc.js'],
  plugins: ['react', 'react-native'],
  parserOptions: {
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
  env: {
    'react-native/react-native': true,
  },
  rules: {
    'react/jsx-uses-react': 'off', // React 17+ JSX transform
    'react/react-in-jsx-scope': 'off',
    'react-native/no-unused-styles': 'warn',
    'react-native/no-inline-styles': 'warn',
  },
  settings: {
    react: {
      version: 'detect',
    },
    // react-native contient des fichiers Flow non parsables par @typescript-eslint
    'import/ignore': ['react-native'],
  },
};
