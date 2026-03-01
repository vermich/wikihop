# ADR-002 : Stack technique complète WikiHop

## Statut
Accepté

## Contexte
WikiHop est une application mobile jeu qui consomme l'API publique Wikipedia et persiste des données de session. Il faut figer la stack technique pour l'ensemble du projet afin d'éviter des décisions disparates entre agents et de garantir la cohérence architecturale.

Les contraintes structurantes sont :
- Cible : iOS et Android (un seul codebase)
- Pas de compte utilisateur obligatoire en V1 (données locales)
- Wikipedia REST API publique et gratuite
- Équipe multi-agents : les choix doivent être documentés et reproductibles
- TypeScript strict partout : zéro `any` non justifié

## Décision

### Mobile — `apps/mobile`
| Couche | Technologie | Version | Justification |
|--------|-------------|---------|---------------|
| Framework | Expo SDK (managed workflow) | 52+ | Builds cloud EAS, pas d'environnement natif local requis |
| Runtime | React Native | 0.76+ | Inclus avec Expo 52 |
| Langage | TypeScript | 5.3+ | Strict mode activé |
| Navigation | @react-navigation/native-stack | v7 | Intégration native (UINavigationController / Fragment), performances supérieures à JS stack |
| State management | Zustand | 4+ | API minimaliste, pas de boilerplate Redux, DevTools disponibles |
| Persistance locale | @react-native-async-storage/async-storage | 1.23+ | Standard Expo/RN pour la persistance clé-valeur |
| Tests | Jest + @testing-library/react-native | latest | Standard communauté React Native |
| Build cloud | Expo EAS Build | latest | Génère les .ipa/.apk sans Xcode/Android Studio local |

Note sur la navigation : React Navigation v7 est retenu face à Expo Router. Expo Router impose une organisation de fichiers basée sur le filesystem (file-based routing) qui convient aux apps "classiques" mais contraint la structure de navigation d'un jeu où les transitions sont imprévisibles. React Navigation v7 avec `native-stack` offre plus de flexibilité pour les transitions custom de GameScreen.

### Backend — `apps/backend`
| Couche | Technologie | Version | Justification |
|--------|-------------|---------|---------------|
| Framework | Fastify | v5 | Performances HTTP supérieures à Express, support TypeScript natif, schéma JSON validé par défaut |
| Langage | TypeScript | 5.3+ | Strict mode, cohérence avec le mobile |
| Validation | Zod | 3+ | Typage inféré à la compilation, intégration avec Fastify via fastify-type-provider-zod |
| Logs | Pino | Inclus Fastify | Logs JSON structurés, performant |
| Base de données | PostgreSQL | 15+ | ACID, JSON natif, écosystème Node.js mature |
| Client BDD | node-postgres (pg) | 8+ | Client bas niveau sans ORM, contrôle total des requêtes |
| Migrations | node-pg-migrate | latest | Migrations SQL versionnées sans ORM |
| Tests | Jest + Supertest | latest | Tests d'intégration HTTP sur les routes Fastify |
| Runtime | Node.js | 20 LTS | Version stable LTS, compatibilité Fastify v5 |

Note sur le client BDD : `pg` direct plutôt que Prisma. WikiHop V1 a un modèle de données simple (sessions, daily challenges). Prisma apporte une complexité de configuration (schema.prisma, migrations Prisma) injustifiée. Un ORM complet sera reconsidéré si le modèle de données évolue significativement en Phase 4.

### Packages partagés — `packages/shared`
- Types TypeScript uniquement (`GameSession`, `Article`, `Language`)
- Pas de logique métier dans le package partagé
- Pas de dépendances runtime

### CI/CD
- GitHub Actions pour lint, typecheck, tests sur chaque PR
- Expo EAS Build pour les builds mobiles (trigger sur `main`)
- Pas de déploiement backend automatisé en Phase 1 (configuré en Phase 4)

## Conséquences positives
- Stack homogène TypeScript strict du mobile au backend
- Expo managed workflow : zéro configuration Xcode/Android Studio pour l'équipe
- Fastify v5 avec Zod : contrats d'API validés à l'entrée et typés en sortie
- Zustand : state management mobile sans boilerplate, testable unitairement
- `pg` direct : requêtes SQL explicites, pas de magie ORM

## Conséquences négatives
- Expo managed workflow impose des restrictions sur les modules natifs custom (acceptable pour WikiHop qui n'en a pas besoin)
- `pg` sans ORM : les requêtes SQL sont écrites à la main — discipline requise pour éviter les injections (mitigation : requêtes paramétrées obligatoires)
- Pas de déploiement backend automatisé en Phase 1 : les développeurs doivent déployer manuellement

## Alternatives considérées
- **Expo Router** (navigation) — voir note dans section Mobile ci-dessus
- **Redux Toolkit** (state) — boilerplate excessif, slices, reducers, selectors pour un jeu avec un état simple. Zustand couvre le besoin avec 10x moins de code.
- **Express** (backend) — pas de validation de schéma intégrée, performances inférieures à Fastify, pas de TypeScript first.
- **Prisma** (ORM) — puissant mais lourd pour un modèle de données simple. À réévaluer en Phase 4 si le schéma s'enrichit.
- **Supabase** — Backend-as-a-Service séduisant mais introduit une dépendance externe critique et complique les tests locaux.
