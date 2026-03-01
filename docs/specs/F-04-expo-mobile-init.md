# Spec technique — F-04 : Initialisation Expo (React Native + TypeScript)

**Destinataire :** Frontend Dev — Laurent
**Story :** [F-04](../stories/F-04-expo-app-init.md)
**Références ADR :** ADR-001 (monorepo), ADR-002 (stack), ADR-003 (tests)
**Branche à créer :** `feat/frontend-expo-init`
**PR cible :** `develop`

---

## Contexte

Le monorepo est initialisé (package.json racine, workspaces npm, tsconfig.base.json, ESLint/Prettier). Tu dois initialiser l'application Expo dans `apps/mobile/` avec la configuration TypeScript strict qui étend la base commune, React Navigation v7 natif stack, et Zustand pour le state management.

Le dossier `apps/mobile/` est actuellement vide. L'application Expo sera créée dans ce répertoire.

---

## Périmètre

### Dans le scope de F-04
- Initialisation Expo SDK 52 en managed workflow
- Configuration TypeScript étendant `tsconfig.base.json` racine
- Navigation de base avec React Navigation v7 native-stack
- Structure de dossiers : `screens/`, `components/`, `services/`, `store/`, `utils/`
- Zustand installé avec un store vide opérationnel
- ESLint et Prettier configurés (extend la config racine)
- Jest + React Native Testing Library configurés avec un smoke test
- Script `npm run dev` (alias `expo start`)

### Hors scope de F-04
- Implémentation des écrans (Phase 2)
- Services Wikipedia API (Phase 2)
- Expo EAS configuration (F-12, story séparée)
- Tests d'intégration (Phase 3)

---

## Structure de fichiers attendue

```
apps/mobile/
├── package.json
├── tsconfig.json              ← étend ../../tsconfig.base.json
├── .eslintrc.js               ← étend le .eslintrc.js racine
├── app.json                   ← config Expo (name, slug, version)
├── babel.config.js            ← babel-preset-expo
├── metro.config.js            ← watchFolders pour monorepo
├── jest.config.js             ← étend jest.config.base.js racine
├── jest.setup.ts              ← mocks globaux
├── index.ts                   ← entrypoint Expo
├── App.tsx                    ← root component
├── src/
│   ├── navigation/
│   │   └── RootNavigator.tsx  ← NavigationContainer + Stack.Navigator
│   ├── screens/
│   │   └── HomeScreen.tsx     ← écran placeholder (Phase 2)
│   ├── components/            ← dossier vide (prêt Phase 2)
│   ├── services/              ← dossier vide (prêt Phase 2)
│   ├── store/
│   │   └── game.store.ts      ← store Zustand vide
│   └── utils/                 ← dossier vide (prêt Phase 2)
└── __tests__/
    └── smoke.test.ts          ← test de smoke Jest
```

---

## `package.json` — dépendances à installer

```json
{
  "name": "@wikihop/mobile",
  "version": "0.1.0",
  "private": true,
  "main": "index.ts",
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "dev": "expo start",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "dependencies": {
    "expo": "~52.0.0",
    "expo-status-bar": "~2.0.0",
    "react": "18.3.1",
    "react-native": "0.76.x",
    "@react-navigation/native": "^7.0.0",
    "@react-navigation/native-stack": "^7.0.0",
    "react-native-screens": "~4.4.0",
    "react-native-safe-area-context": "4.12.0",
    "react-native-gesture-handler": "~2.20.0",
    "@react-native-async-storage/async-storage": "1.23.1",
    "zustand": "^4.5.0",
    "@wikihop/shared": "*"
  },
  "devDependencies": {
    "@babel/core": "^7.25.0",
    "@types/react": "~18.3.12",
    "@types/react-native": "~0.72.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "babel-jest": "^29.0.0",
    "eslint": "^9.0.0",
    "eslint-plugin-react": "^7.37.0",
    "eslint-plugin-react-native": "^4.1.0",
    "jest": "^29.0.0",
    "jest-expo": "~52.0.0",
    "@testing-library/react-native": "^12.0.0",
    "@testing-library/jest-native": "^5.0.0",
    "typescript": "^5.5.0"
  }
}
```

**Note sur `@wikihop/shared` :** Le workspace npm résout ce package localement depuis `packages/shared/`. Pas de publication npm nécessaire.

---

## `tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-native",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "paths": {
      "@wikihop/shared": ["../../packages/shared/src/types/index.ts"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "App.tsx", "index.ts", "__tests__/**/*.ts"],
  "exclude": ["node_modules", ".expo", "dist"]
}
```

**Important :** Ne pas copier la config Expo par défaut (`"extends": "expo/tsconfig.base"`). Elle doit étendre la config racine WikiHop pour hériter du mode strict.

---

## `metro.config.js` — Configuration critique pour le monorepo

```javascript
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Permettre à Metro de remonter dans le monorepo
config.watchFolders = [workspaceRoot];

// Résolution des packages du workspace
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
```

**Ce fichier est critique.** Sans lui, Metro ne peut pas résoudre `@wikihop/shared`.

---

## Navigation — `src/navigation/RootNavigator.tsx`

```typescript
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { HomeScreen } from '../screens/HomeScreen';

export type RootStackParamList = {
  Home: undefined;
  // Les écrans Phase 2 seront ajoutés ici (Game, Victory, etc.)
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator(): React.JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

**Important :** `RootNavigator` est un export nommé. `default export` autorisé uniquement pour le composant racine `App.tsx` (requis par Expo).

---

## Store Zustand — `src/store/game.store.ts`

```typescript
import { create } from 'zustand';

import type { GameSession } from '@wikihop/shared';

interface GameState {
  currentSession: GameSession | null;
  // Actions — à implémenter en Phase 2
  setCurrentSession: (session: GameSession | null) => void;
  resetSession: () => void;
}

export const useGameStore = create<GameState>()((set) => ({
  currentSession: null,
  setCurrentSession: (session) => set({ currentSession: session }),
  resetSession: () => set({ currentSession: null }),
}));
```

---

## Jest — `jest.config.js`

```javascript
const baseConfig = require('../../jest.config.base.js');

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  preset: 'jest-expo',
  setupFilesAfterFramework: ['@testing-library/jest-native/extend-expect'],
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
    '!src/navigation/**',  // Navigation est du wiring, pas de logique métier
  ],
};
```

---

## Test de smoke — `__tests__/smoke.test.ts`

```typescript
describe('Mobile workspace', () => {
  it('should import shared types without error', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { isApiResponse } = require('@wikihop/shared');
    expect(typeof isApiResponse).toBe('function');
  });

  it('should confirm jest is configured correctly', () => {
    expect(1 + 1).toBe(2);
  });
});
```

---

## `.eslintrc.js` workspace mobile

```javascript
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
    'react/jsx-uses-react': 'off',  // React 17+ JSX transform
    'react/react-in-jsx-scope': 'off',
    'react-native/no-unused-styles': 'warn',
    'react-native/no-inline-styles': 'warn',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
```

---

## Critères de qualité (checklist PR)

- [ ] `npm run typecheck` passe sans erreur depuis `apps/mobile/`
- [ ] `npm run lint` passe sans erreur
- [ ] `npm test` passe avec le smoke test
- [ ] Metro démarre sans erreur (`npm run dev`)
- [ ] L'application s'affiche sur simulateur iOS ou Android (screenshot dans la PR)
- [ ] `RootNavigator` est un export nommé (pas default)
- [ ] Le store Zustand est typé (zéro `any`)
- [ ] `metro.config.js` est présent avec la config `watchFolders`

---

## Points de vigilance

1. **Metro et monorepo** : sans `watchFolders` dans `metro.config.js`, `@wikihop/shared` ne sera pas résolu. C'est l'erreur la plus courante.

2. **`transformIgnorePatterns` Jest** : la liste des packages à transformer est longue et fragile. Utiliser exactement le pattern fourni ci-dessus — il couvre tous les packages Expo et React Navigation.

3. **TypeScript strict + Expo** : Expo génère parfois du code non-strict. `skipLibCheck: true` est déjà dans `tsconfig.base.json` pour éviter les faux positifs des `.d.ts` tiers.

4. **`exactOptionalPropertyTypes`** : activé dans `tsconfig.base.json`. Signifie que `{ prop?: string }` n'accepte pas `{ prop: undefined }`. Attention lors des spreads d'objets.

5. **Navigation v7** : l'API de `createNativeStackNavigator` a légèrement changé par rapport à v6. Se référer à la [doc officielle React Navigation v7](https://reactnavigation.org/).
