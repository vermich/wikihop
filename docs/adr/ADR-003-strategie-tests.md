# ADR-003 : Stratégie de tests

## Statut
Accepté

## Contexte
WikiHop implique plusieurs couches de code qui nécessitent des stratégies de tests différentes :
- Logique métier pure (calcul de score, validation de session) — testable unitairement
- Composants React Native (UI) — testable avec React Native Testing Library
- Routes Fastify (API HTTP) — testable avec Supertest
- Intégrations Wikipedia API — à mocker

La couverture minimale doit être définie dès la Phase 1 pour que les développeurs et la CI appliquent une règle uniforme.

## Décision

### Framework de test : Jest (unique pour tout le monorepo)
Jest est utilisé dans les trois workspaces (`apps/mobile`, `apps/backend`, `packages/shared`). Chaque workspace a sa propre configuration Jest adaptée à son contexte.

### Seuil de couverture : 70% sur la logique métier
- Seuil appliqué sur les lignes, branches et fonctions
- Configuré dans le `jest.config.js` de chaque workspace (`coverageThreshold`)
- La couverture est calculée uniquement sur `src/` (hors fichiers de config, mocks, types purs)

### Organisation des tests par couche

#### `apps/mobile`
- **Tests unitaires** : logique Zustand stores, utils, services (hors appels réseau)
- **Tests composants** : avec `@testing-library/react-native`, rendu et interactions
- **Mocking** : `@react-navigation/native` mocké, Wikipedia API mockée via `jest.mock`
- **Fichier de setup** : `jest.setup.ts` avec les mocks globaux (navigation, AsyncStorage)
- **Transform** : via `babel-jest` avec le preset Expo (`babel-preset-expo`)
- Emplacement : fichiers `__tests__/` dans chaque dossier feature, ou `*.test.tsx` colocalisé

#### `apps/backend`
- **Tests d'intégration routes** : Supertest sur l'instance Fastify, base de données mockée ou en mémoire
- **Tests unitaires services** : logique métier isolée (calcul de score, validation)
- **Mocking BDD** : module `db/` mocké en tests unitaires ; base de données réelle (PostgreSQL de test) pour les tests d'intégration si nécessaire
- **Fichier de setup** : `jest.setup.ts` pour l'initialisation/teardown du serveur Fastify
- Emplacement : `__tests__/` à la racine du workspace ou colocalisé avec les modules

#### `packages/shared`
- **Tests de types** : `tsc --noEmit` suffit — les types purs n'ont pas de logique testable
- Pas de tests Jest requis en Phase 1

### Convention de nommage des tests
- Fichiers : `*.test.ts` ou `*.test.tsx`
- `describe` → nom du module ou composant
- `it` → comportement attendu formulé en français ou anglais (cohérence dans chaque fichier)
- Exemple : `it('should return 3 jumps when path has 4 articles')`

### Smoke tests obligatoires en Phase 1
Chaque workspace doit avoir au minimum un test "smoke" qui valide que la configuration Jest fonctionne, avant l'implémentation des features.

### CI
- `npm test -- --coverage` exécuté sur chaque PR
- Échec de CI si le seuil de couverture n'est pas atteint
- Rapports de couverture uploadés comme artefacts GitHub Actions (rétention 7 jours)

## Conséquences positives
- Un seul framework (Jest) pour toute l'équipe : courbe d'apprentissage minimale
- `@testing-library/react-native` suit le principe "tester le comportement, pas l'implémentation" — les tests résistent aux refactors d'UI
- Supertest permet de tester les routes Fastify sans démarrer un vrai serveur HTTP
- Le seuil 70% est suffisamment exigeant sans bloquer le développement rapide en Phase 1

## Conséquences négatives
- Jest avec Expo nécessite une configuration de transform spécifique (babel-jest + babel-preset-expo) — légèrement plus complexe qu'un projet Node.js pur
- Les tests d'intégration backend avec vraie BDD nécessitent une base PostgreSQL de test dans la CI (ajout d'un service Docker dans le workflow)
- Pas de tests end-to-end (E2E) en Phase 1 — à adresser en Phase 3 (Detox ou Maestro)

## Alternatives considérées
- **Vitest** — plus rapide que Jest, natif ES modules, mais l'écosystème React Native teste majoritairement avec Jest. Incompatibilité potentielle avec certains mocks Expo.
- **Mocha + Chai** (backend) — plus verbeux que Jest, pas d'avantage fonctionnel pour notre stack.
- **Seuil 80%** — trop contraignant pour la Phase 1 où beaucoup de code est de la configuration. Réévaluer en Phase 2 MVP.
- **Tests E2E dès Phase 1** (Detox) — Detox nécessite un environnement natif complet. Incompatible avec le managed workflow Expo en Phase 1.
