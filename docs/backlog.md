# WikiHop — Tableau de bord du backlog

**PM** : Gauderic | **Mis à jour** : 2026-03-01 | **Version** : 2.2

> Index des user stories. Chaque story est détaillée dans son fichier individuel dans `docs/stories/`.

---

## Légende

| Icône | Statut |
|-------|--------|
| ⬜ | `pending` — à faire |
| 🔄 | `in-progress` — en cours |
| ✅ | `done` — implémenté et validé QA |
| 🚫 | `won't` — hors scope |

| Priorité | Signification |
|----------|--------------|
| Must | Indispensable (MoSCoW) |
| Should | Important mais pas bloquant |
| Could | Souhaitable si le temps le permet |
| Won't | Hors scope documenté |

---

## Phase 1 — Fondations

> Objectif : Bases techniques du projet. Rien n'est jouable, mais tout le monde peut travailler sans se bloquer.

| ID | Titre | Priorité | Agent(s) | Statut |
|----|-------|----------|----------|--------|
| [F-01](stories/F-01-monorepo-init.md) | Initialisation du monorepo | Must | Tech Lead | 🔄 in-progress |
| [F-02](stories/F-02-typescript-strict.md) | Configuration TypeScript strict | Must | Tech Lead | 🔄 in-progress |
| [F-03](stories/F-03-eslint-prettier.md) | Configuration ESLint + Prettier | Must | Tech Lead | 🔄 in-progress |
| [F-04](stories/F-04-expo-app-init.md) | Initialisation de l'application Expo | Must | Tech Lead, Frontend Dev | 🔄 in-progress |
| [F-05](stories/F-05-fastify-backend-init.md) | Initialisation du backend Fastify | Must | Tech Lead, Backend Dev | 🔄 in-progress |
| [F-06](stories/F-06-postgresql-setup.md) | Configuration de la base de données PostgreSQL | Must | Tech Lead, Backend Dev | 🔄 in-progress |
| [F-07](stories/F-07-github-actions-ci.md) | Pipeline CI/CD GitHub Actions (lint + tests) | Must | Tech Lead | 🔄 in-progress |
| [F-08](stories/F-08-jest-config.md) | Configuration Jest (mobile + backend) | Must | Tech Lead, QA | 🔄 in-progress |
| [F-09](stories/F-09-adr-architecture.md) | ADR — Décisions d'architecture initiales | Must | Tech Lead | 🔄 in-progress |
| [F-10](stories/F-10-git-conventions.md) | Stratégie de branches et conventions de commits | Must | Tech Lead, Orchestrateur | 🔄 in-progress |
| [F-11](stories/F-11-docker-compose.md) | Docker Compose pour l'environnement local | Should | Tech Lead, Backend Dev | 🔄 in-progress |
| [F-12](stories/F-12-expo-eas-config.md) | Configuration Expo EAS (build cloud) | Should | Tech Lead, Frontend Dev | 🔄 in-progress |

---

## Phase 2 — MVP

> Objectif : Version jouable de bout en bout. Le joueur navigue entre articles Wikipedia et voit son score.

| ID | Titre | Priorité | Agent(s) | Statut |
|----|-------|----------|----------|--------|
| [M-01](stories/M-01-home-screen.md) | Écran d'accueil — affichage départ et destination | Must | Frontend Dev, UX/UI, Backend Dev | ⬜ pending |
| [M-02](stories/M-02-random-pair-api.md) | Génération d'une paire d'articles aléatoires (backend) | Must | Backend Dev | ⬜ pending |
| [M-03](stories/M-03-article-content-display.md) | Récupération et affichage du contenu d'un article Wikipedia | Must | Frontend Dev, Backend Dev | ⬜ pending |
| [M-04](stories/M-04-article-navigation.md) | Navigation entre articles (tap sur un lien) | Must | Frontend Dev | ⬜ pending |
| [M-05](stories/M-05-jumps-timer.md) | Compteur de sauts et timer en temps réel | Must | Frontend Dev | ⬜ pending |
| [M-06](stories/M-06-victory-screen.md) | Détection de victoire et écran de résultat | Must | Frontend Dev, UX/UI | ⬜ pending |
| [M-07](stories/M-07-game-session-model.md) | Modèle de données GameSession (local) | Must | Frontend Dev, Tech Lead | ⬜ pending |
| [M-08](stories/M-08-wikipedia-service.md) | Service Wikipedia API (client mobile) | Must | Frontend Dev, Backend Dev | ⬜ pending |
| [M-09](stories/M-09-unit-tests-game-logic.md) | Tests unitaires — logique de jeu | Must | QA, Frontend Dev, Backend Dev | ⬜ pending |
| [M-10](stories/M-10-abandon-game.md) | Abandon de partie | Should | Frontend Dev, UX/UI | ⬜ pending |
| [M-11](stories/M-11-offline-mode.md) | Gestion du mode hors-ligne | Should | Frontend Dev | ⬜ pending |
| [M-12](stories/M-12-language-support.md) | Support de la langue (français par défaut, configurable) | Should | Frontend Dev, Backend Dev | ⬜ pending |
| [M-13](stories/M-13-accessibility.md) | Accessibilité de base (WCAG 2.1 AA) | Should | Frontend Dev, UX/UI | ⬜ pending |
| [M-14](stories/M-14-article-thumbnail.md) | Affichage de l'image de résumé de l'article | Could | Frontend Dev | ⬜ pending |
| [M-15](stories/M-15-webview-css-injection.md) | WebView Wikipedia avec injection CSS mobile | Must | Frontend Dev | ⬜ pending |
| [M-16](stories/M-16-popular-pages-strategy.md) | Pages populaires — stratégie hybride API + cache + fallback JSON | Must | Frontend Dev, Backend Dev | ⬜ pending |
| [M-17](stories/M-17-change-objective.md) | Bouton "Changer l'objectif" pendant le jeu | Should | Frontend Dev, UX/UI | ⬜ pending |

---

## Phase 3 — Features

> Objectif : Enrichir l'expérience avec les fonctionnalités de rétention et de communauté.

| ID | Titre | Priorité | Agent(s) | Statut |
|----|-------|----------|----------|--------|
| [F3-01](stories/F3-01-daily-challenge.md) | Défi quotidien (même paire pour tous les joueurs) | Must | Backend Dev, Frontend Dev, UX/UI | ⬜ pending |
| [F3-02](stories/F3-02-game-history.md) | Historique des parties (stockage local) | Must | Frontend Dev, UX/UI | ⬜ pending |
| [F3-03](stories/F3-03-share-result.md) | Partage du résultat | Must | Frontend Dev | ⬜ pending |
| [F3-04](stories/F3-04-donation-page.md) | Page donation Wikipedia | Must | Frontend Dev, UX/UI, DPO | ⬜ pending |
| [F3-05](stories/F3-05-hard-mode.md) | Mode difficile (articles sans liens évidents) | Should | Backend Dev, Frontend Dev, UX/UI | ⬜ pending |
| [F3-06](stories/F3-06-about-screen.md) | Écran "À propos" et crédits | Should | Frontend Dev, UX/UI, DPO | ⬜ pending |
| [F3-07](stories/F3-07-integration-tests.md) | Tests d'intégration — parcours de jeu complet | Should | QA | ⬜ pending |
| [F3-08](stories/F3-08-personal-stats.md) | Statistiques personnelles | Could | Frontend Dev, UX/UI | ⬜ pending |
| [F3-09](stories/F3-09-animations-haptics.md) | Animations et feedback haptique | Could | Frontend Dev, UX/UI | ⬜ pending |
| [F3-10](stories/F3-10-history-sort.md) | Tri multi-critères dans l'historique des parties | Should | Frontend Dev, UX/UI | ⬜ pending |
| [F3-11](stories/F3-11-game-detail-screen.md) | Vue détail d'une partie — parcours, suppression et rejouer | Should | Frontend Dev, UX/UI | ⬜ pending |
| [F3-12](stories/F3-12-local-multiplayer.md) | Multijoueur local hot-seat (passage du téléphone) | Should | Frontend Dev, UX/UI | ⬜ pending |
| [F3-13](stories/F3-13-dev-mode.md) | Mode développeur — toggle affichage de l'article cible | Could | Frontend Dev | ⬜ pending |
| [F3-14](stories/F3-14-contact-feedback.md) | Formulaire de feedback in-app (ContactScreen) | Could | Frontend Dev, UX/UI, DPO, Backend Dev | ⬜ pending |
| [F3-15](stories/F3-15-firebase-analytics.md) | Firebase Analytics — intégration skeleton (événements de base) | Could | Frontend Dev, DPO | ⬜ pending |

---

## Phase 4 — Production

> Objectif : Application conforme, sécurisée et publiée sur les stores.

| ID | Titre | Priorité | Agent(s) | Statut |
|----|-------|----------|----------|--------|
| [P-01](stories/P-01-privacy-policy.md) | Politique de confidentialité (RGPD) | Must | DPO, Frontend Dev | ⬜ pending |
| [P-02](stories/P-02-owasp-audit.md) | Audit de sécurité — OWASP Mobile Top 10 | Must | Security | ⬜ pending |
| [P-03](stories/P-03-backend-security.md) | Sécurisation du backend — Headers, CORS, Rate limiting | Must | Security, Backend Dev | ⬜ pending |
| [P-04](stories/P-04-secrets-management.md) | Secrets et variables d'environnement (production) | Must | Security, Tech Lead | ⬜ pending |
| [P-05](stories/P-05-performance-tests.md) | Tests de performance et de charge (backend) | Must | QA, Backend Dev | ⬜ pending |
| [P-06](stories/P-06-cicd-deployment.md) | Pipeline CI/CD — Build et déploiement automatisé | Must | Tech Lead | ⬜ pending |
| [P-07](stories/P-07-appstore-ios.md) | Soumission App Store (iOS) | Must | Tech Lead, Frontend Dev, DPO | ⬜ pending |
| [P-08](stories/P-08-playstore-android.md) | Soumission Google Play Store (Android) | Must | Tech Lead, Frontend Dev, DPO | ⬜ pending |
| [P-09](stories/P-09-monitoring-alerting.md) | Monitoring et alerting en production | Must | Tech Lead, Backend Dev | ⬜ pending |
| [P-10](stories/P-10-rgpd-compliance.md) | Conformité RGPD complète — Registre de traitement | Should | DPO | ⬜ pending |
| [P-11](stories/P-11-device-compatibility.md) | Tests de compatibilité appareils (iOS et Android) | Should | QA | ⬜ pending |
| [P-12](stories/P-12-ota-updates.md) | Stratégie de mise à jour OTA (Over The Air) | Should | Tech Lead, Frontend Dev | ⬜ pending |
| [P-13](stories/P-13-legal-texts.md) | Textes légaux in-app (CGU simplifiées) | Should | DPO, Frontend Dev | ⬜ pending |
| [P-14](stories/P-14-crash-reporting.md) | Traçabilité des erreurs côté mobile (crash reporting) | Could | Frontend Dev, DPO | ⬜ pending |
| [P-15](stories/P-15-sast-security.md) | Tests de sécurité automatisés (SAST) | Could | Security | ⬜ pending |

---

## Won't — Hors scope (documenté)

> Ces fonctionnalités sont délibérément hors scope. Elles sont documentées pour éviter les dérives futures.

| ID | Titre | Raison |
|----|-------|--------|
| [WNT-01](stories/WNT-01-user-account.md) | Compte utilisateur et authentification | Obligations RGPD incompatibles avec le positionnement |
| [WNT-02](stories/WNT-02-in-app-ads.md) | Publicité in-app | Contraire aux valeurs du projet (sans pub, sans tracker) |
| [WNT-03](stories/WNT-03-multiplayer.md) | Multijoueur en temps réel (race) | Complexité disproportionnée (WebSockets, matchmaking) |
| [WNT-04](stories/WNT-04-push-notifications.md) | Notifications push | Valeur insuffisante vs complexité au lancement |

---

## Récapitulatif

| Phase | Must | Should | Could | Total |
|-------|------|--------|-------|-------|
| 1-Fondations | 10 | 2 | 0 | 12 |
| 2-MVP | 11 | 5 | 1 | 17 |
| 3-Features | 4 | 6 | 5 | 15 |
| 4-Production | 9 | 4 | 2 | 15 |
| Won't | — | — | — | 4 |
| **Total** | **34** | **17** | **8** | **63** |

---

## Récapitulatif par agent

| Agent | Stories |
|-------|---------|
| Tech Lead | F-01, F-02, F-03, F-04, F-05, F-06, F-07, F-08, F-09, F-10, F-12, P-06, P-12 |
| Frontend Dev | F-04, M-01, M-03, M-04, M-05, M-06, M-07, M-08, M-10, M-11, M-12, M-13, M-14, M-15, M-16, M-17, F3-02, F3-03, F3-04, F3-05, F3-06, F3-08, F3-09, F3-10, F3-11, F3-12, F3-13, F3-14, F3-15, P-07, P-08, P-12, P-13, P-14 |
| Backend Dev | F-05, F-06, F-11, M-02, M-08, M-12, M-16, F3-01, F3-05, F3-14, P-03, P-05, P-06, P-09 |
| UX/UI | M-01, M-06, M-13, M-14, M-17, F3-01, F3-02, F3-04, F3-05, F3-06, F3-08, F3-09, F3-10, F3-11, F3-12, F3-14 |
| QA | F-08, M-09, F3-07, P-05, P-11 |
| Security | P-02, P-03, P-04, P-15 |
| DPO | F3-04, F3-06, F3-14, F3-15, P-01, P-10, P-13, P-14 |

---

*Backlog géré par Gauderic, PM WikiHop — 2026-03-01*
*v2.1 : +9 stories créées (M-15 à M-17, F3-10 à F3-15) suite à l'analyse des fonctionnalités V1*
*Pour créer les stories d'une nouvelle fonctionnalité : `/sprint [description]`*
