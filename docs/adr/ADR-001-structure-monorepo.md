# ADR-001 : Structure monorepo — npm workspaces

## Statut
Accepté

## Contexte
WikiHop est composé de trois artefacts distincts qui partagent des types TypeScript communs : une application mobile React Native/Expo, un serveur API Fastify, et un package de types partagés. Il faut décider comment organiser ces trois unités dans le dépôt Git et gérer leurs dépendances croisées.

Les critères de choix sont :
- Complexité d'outillage minimale pour une équipe dont c'est le premier monorepo
- Partage de types TypeScript sans publication npm
- Support natif par npm (pas d'outil tiers obligatoire)
- Compatibilité avec les outils existants : Expo EAS, GitHub Actions

## Décision
Le monorepo sera géré via **npm workspaces** natifs (npm >= 7). Aucun outil de build orchestration (Turborepo, Nx, Lerna) n'est ajouté en Phase 1.

Structure retenue :
```
/wikihop/
├── package.json             ← workspace root (workspaces: ["apps/*", "packages/*"])
├── tsconfig.base.json       ← config TypeScript partagée
├── .eslintrc.js             ← config ESLint partagée
├── .prettierrc              ← config Prettier
├── .gitignore
├── apps/
│   ├── mobile/              ← Application Expo (géré par Frontend Dev)
│   └── backend/             ← API Fastify (géré par Backend Dev)
└── packages/
    └── shared/              ← Types TypeScript partagés
        ├── package.json
        ├── tsconfig.json
        └── src/types/index.ts
```

Le `package.json` racine déclare les workspaces et expose les scripts globaux (`lint`, `test`, `typecheck`). Chaque workspace conserve son propre `package.json` et ses propres scripts.

## Conséquences positives
- Aucune dépendance à un outil tiers — npm workspaces est natif depuis npm v7
- `packages/shared` est résolu en local sans `npm link` ni publication
- Scripts globaux exécutables depuis la racine via `npm run -w apps/backend test`
- Structure extensible : ajout futur de Turborepo possible sans refactoring majeur
- Compatible nativement avec GitHub Actions (cache npm standard)

## Conséquences négatives
- Pas d'orchestration de build parallèle (Turborepo) — acceptable en Phase 1
- `npm install` à la racine installe toutes les dépendances de tous les workspaces : `node_modules` plus volumineux
- Expo nécessite une attention particulière : le Metro bundler doit être configuré pour remonter dans le monorepo (watchFolders dans `metro.config.js`)

## Alternatives considérées
- **Turborepo** — apporte le cache de build et l'orchestration parallèle, mais ajoute une couche de configuration (turbo.json) non nécessaire en Phase 1 avec seulement 3 workspaces. À reconsidérer si les temps de CI dépassent 5 minutes.
- **Nx** — outil puissant mais courbe d'apprentissage élevée, génération de code couplée à l'outillage Nx. Hors scope pour une équipe qui démarre.
- **Dépôts séparés (polyrepo)** — maximise l'isolation mais impose la publication de `packages/shared` sur npm ou un registre privé pour partager les types. Complexité opérationnelle injustifiée.
- **Yarn workspaces** — fonctionnellement équivalent à npm workspaces, mais introduit une dépendance supplémentaire (Yarn) sans bénéfice différenciant. npm est déjà présent dans l'environnement Node.js standard.
