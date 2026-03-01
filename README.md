# WikiHop

Un jeu mobile de type Wikirace — reliez deux articles Wikipedia en naviguant uniquement via les liens internes.

[![CI](https://github.com/vermich/wikihop/actions/workflows/ci.yml/badge.svg)](https://github.com/vermich/wikihop/actions/workflows/ci.yml)

## Prérequis

- [Node.js](https://nodejs.org/) >= 20.0.0
- [npm](https://www.npmjs.com/) >= 10.0.0
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (pour PostgreSQL)

## Démarrage rapide

```bash
# 1. Installer les dépendances
npm install

# 2. Démarrer la base de données + le backend
npm run dev

# 3. Dans un autre terminal — démarrer l'application mobile
cd apps/mobile && npx expo start
```

## Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Démarre PostgreSQL (Docker) + backend Fastify |
| `npm run dev:backend` | Démarre uniquement le backend |
| `npm run db:up` | Démarre PostgreSQL via Docker Compose |
| `npm run db:down` | Arrête PostgreSQL |
| `npm run db:reset` | Remet la base de données à zéro |
| `npm run lint` | Vérifie le code (ESLint) dans tous les workspaces |
| `npm run typecheck` | Vérifie les types TypeScript dans tous les workspaces |
| `npm test` | Lance tous les tests Jest |
| `npm run build` | Compile les workspaces (shared + backend) |

## Structure du projet

```
wikihop/
├── apps/
│   ├── mobile/     ← Application React Native (Expo)
│   └── backend/    ← API Fastify + PostgreSQL
├── packages/
│   └── shared/     ← Types TypeScript partagés
└── docs/
    ├── context.md  ← Description du projet
    ├── backlog.md  ← Tableau de bord des stories
    ├── adr/        ← Décisions d'architecture
    └── stories/    ← User stories détaillées
```

## Variables d'environnement

Copier le fichier exemple avant de démarrer le backend :

```bash
cp apps/backend/.env.example apps/backend/.env
```

## Documentation

- [Contexte et architecture](docs/context.md)
- [Backlog et stories](docs/backlog.md)
- [Conventions Git](docs/git-conventions.md)
- [Décisions d'architecture (ADR)](docs/adr/)
