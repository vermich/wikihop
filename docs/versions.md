# Versions des composants — WikiHop

Tableau de référence des versions installées dans le projet.
Mis à jour manuellement à chaque changement de version significatif.

**Dernière mise à jour :** 2026-03-01

---

## Environnement

| Composant | Version installée | Version déclarée | Notes |
|-----------|:-----------------:|:----------------:|-------|
| Node.js | v24.14.0 | ≥ 20.0.0 | Installé sur la machine — `engines` à mettre à jour |
| npm | 10.9.2 | ≥ 10.0.0 | Gestionnaire de paquets |

> ⚠️ La contrainte `engines` dans `package.json` déclare `>=20.0.0` — compatible avec Node v24.

---

## Infrastructure & Outillage

| Composant | Version installée | Rôle |
|-----------|:-----------------:|------|
| TypeScript | 5.9.3 | Langage — strict mode |
| ESLint | 8.57.1 | Linter — format `.eslintrc.js` (v8) |
| Jest | 29.7.0 | Tests unitaires et d'intégration |
| ts-jest | 29.4.6 | Transpilation TypeScript pour Jest |
| tsx | 4.21.0 | Exécution TypeScript en dev |

---

## Backend (`apps/backend`)

| Composant | Version installée | Rôle |
|-----------|:-----------------:|------|
| Fastify | 5.7.4 | Framework HTTP |
| fastify-type-provider-zod | 6.1.0 | Provider Zod pour Fastify v5 |
| @fastify/cors | 10.1.0 | Plugin CORS (compatible Fastify v5) |
| Zod | 3.25.76 | Validation schemas (imports `zod/v4`) |
| pg | 8.19.0 | Client PostgreSQL |
| node-pg-migrate | 7.9.1 | Migrations SQL versionnées |
| pino-pretty | 13.1.3 | Formattage logs en développement |
| Supertest | 7.2.2 | Tests d'intégration HTTP |
| @types/node | 25.3.3 | Types Node.js |

---

## Mobile (`apps/mobile`)

| Composant | Version installée | Rôle |
|-----------|:-----------------:|------|
| React Native | 0.76.9 | Framework mobile |
| React | 18.3.1 | Bibliothèque UI |
| Expo SDK | 52.0.49 | Plateforme managed workflow |
| @react-navigation/native | 7.1.31 | Navigation — core |
| @react-navigation/native-stack | 7.14.2 | Navigation — stack natif |
| Zustand | 4.5.7 | State management global |

---

## Base de données

| Composant | Version | Rôle |
|-----------|:-------:|------|
| PostgreSQL | 15-alpine | Base de données (via Docker) |

---

## Vulnérabilités connues — à traiter en Phase 4

| Dépendance | CVE | Sévérité | Fix | Impact réel | Planifié |
|------------|-----|:--------:|-----|-------------|---------|
| `node-pg-migrate` 7.9.1 | GHSA-5j98-mcp5-4vw2 (glob CLI) | High | Upgrade → v8.x | Nul — outil CLI interne uniquement | Phase 4 |
| `expo` SDK 52 / `tar` | GHSA-r6q2-hw4h-w, GHSA-34x7… | High | Upgrade → Expo SDK 55 | Nul — extraction d'archives signées Expo uniquement | Phase 4 |

> Ces alertes apparaissent à chaque `npm install`. Elles concernent des outils de développement, pas le code de l'application finale. Elles seront auditées et corrigées par Security — Frédéric avant la mise en production.

---

## Notes de compatibilité

- **Zod v3 + `zod/v4`** : `fastify-type-provider-zod` v6 utilise l'API interne Zod v4. Les imports doivent utiliser `'zod/v4'` (disponible depuis Zod 3.25.0).
- **ESLint v8** : le format `.eslintrc.js` est incompatible avec ESLint v9. Rester sur v8.x jusqu'à migration vers `eslint.config.js`.
- **@fastify/cors v10** : requis pour Fastify v5 (v9 était prévu pour Fastify v4).
- **Node v24** : la contrainte `engines.node` dans `package.json` (`>=20.0.0`) reste valide — aucune mise à jour requise.
