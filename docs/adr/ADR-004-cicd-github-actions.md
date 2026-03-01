# ADR-004 : Stratégie CI/CD — GitHub Actions

## Statut
Accepté

## Contexte
Le projet nécessite une validation automatisée de chaque contribution avant merge sur `develop`, et un processus de build/déploiement sur `main`. Trois workflows distincts ont été identifiés : validation continue (CI), builds mobiles (EAS), et audit de sécurité.

Les contraintes sont :
- Monorepo npm workspaces : les jobs doivent cibler les workspaces pertinents
- Expo EAS Build pour les artefacts mobiles (nécessite EXPO_TOKEN)
- Durée CI inférieure à 5 minutes sur un projet de démarrage (critère story F-07)
- Pas de déploiement backend automatisé en Phase 1

## Décision

### Trois workflows GitHub Actions

#### 1. `ci.yml` — Validation sur chaque PR
Déclenché sur : `push` vers `develop`/`main` et `pull_request` vers `develop`/`main`

Jobs parallèles :
- **backend** : `npm ci` → lint → typecheck → `jest --coverage`
- **mobile** : `npm ci` → lint → typecheck → `jest --coverage`
- **shared** : `npm ci` → typecheck
- **ci-success** (gate) : dépend de tous les jobs, échoue si l'un échoue

Optimisations :
- `concurrency` avec `cancel-in-progress: true` pour annuler les runs obsolètes
- Cache npm via `actions/setup-node@v4` avec `cache-dependency-path` par workspace
- Node.js 20 LTS

#### 2. `release.yml` — Builds et déploiement sur `main`
Déclenché sur : `push` vers `main` uniquement (paths filtrant `apps/` et `packages/`)

Jobs :
- **build-mobile** : `expo/expo-github-action@v8` → `eas build --platform all --profile preview --non-interactive`
- **deploy-backend** : placeholder documenté (Railway/Render/Fly.io à configurer en Phase 4)

#### 3. `security.yml` — Audit de dépendances
Déclenché sur : `push` vers `develop`/`main` + schedule hebdomadaire (lundi 8h00 UTC)

Jobs :
- `npm audit --audit-level=high` sur backend et mobile
- Gestion gracieuse si `package.json` absent (Phase 1)

### Secrets GitHub requis
- `EXPO_TOKEN` : token EAS pour les builds cloud (configuré dans les settings du repo)

### Règle de protection de branches
- `main` : PR obligatoire, review obligatoire, CI doit passer
- `develop` : CI doit passer (pas de push direct recommandé)

## Conséquences positives
- CI parallèle par workspace : chaque job est indépendant et rapide
- `cancel-in-progress` évite les files d'attente lors des pushes successifs
- Gate `ci-success` simplifie la configuration des branch protection rules (un seul check à surveiller)
- Audit de sécurité hebdomadaire automatique sans intervention humaine
- Workflows extensibles : ajout de jobs (tests E2E, deploy) sans refactoring

## Conséquences négatives
- Sans Turborepo, pas de cache de build entre runs — chaque job réinstalle toutes les dépendances
- `contains(github.event.pull_request.changed_files, ...)` pour le filtrage par workspace n'est pas supporté nativement dans les conditions `if` GitHub Actions : les jobs s'exécutent systématiquement sur tous les PRs. À optimiser avec `dorny/paths-filter` si les temps de CI augmentent.
- Le déploiement backend est un placeholder en Phase 1 — à implémenter en Phase 4

## Alternatives considérées
- **Turborepo + cache distribué** — pertinent si les builds deviennent lents, mais surcouche d'outillage non nécessaire en Phase 1.
- **CircleCI / GitLab CI** — GitHub Actions est natif au dépôt GitHub, pas de compte supplémentaire.
- **Nx Cloud** — cache distribué puissant mais couplé à Nx (écarté en ADR-001).
- **Workflow unique (monolithique)** — impossible de paralléliser et difficile à maintenir quand le monorepo s'étend.
