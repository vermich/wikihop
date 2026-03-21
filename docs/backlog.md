# WikiHop — Tableau de bord du backlog

**PM** : Gauderic | **Mis à jour** : 2026-03-21 | **Version** : 5.8

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
| [F-01](stories/phase-1/✅-F-01-monorepo-init.md) | Initialisation du monorepo | Must | Tech Lead | ✅ done |
| [F-02](stories/phase-1/✅-F-02-typescript-strict.md) | Configuration TypeScript strict | Must | Tech Lead | ✅ done |
| [F-03](stories/phase-1/✅-F-03-eslint-prettier.md) | Configuration ESLint + Prettier | Must | Tech Lead | ✅ done |
| [F-04](stories/phase-1/✅-F-04-expo-app-init.md) | Initialisation de l'application Expo | Must | Tech Lead, Frontend Dev | ✅ done |
| [F-05](stories/phase-1/✅-F-05-fastify-backend-init.md) | Initialisation du backend Fastify | Must | Tech Lead, Backend Dev | ✅ done |
| [F-06](stories/phase-1/✅-F-06-postgresql-setup.md) | Configuration de la base de données PostgreSQL | Must | Tech Lead, Backend Dev | ✅ done |
| [F-07](stories/phase-1/✅-F-07-github-actions-ci.md) | Pipeline CI/CD GitHub Actions (lint + tests) | Must | Tech Lead | ✅ done |
| [F-08](stories/phase-1/✅-F-08-jest-config.md) | Configuration Jest (mobile + backend) | Must | Tech Lead, QA | ✅ done |
| [F-09](stories/phase-1/✅-F-09-adr-architecture.md) | ADR — Décisions d'architecture initiales | Must | Tech Lead | ✅ done |
| [F-10](stories/phase-1/✅-F-10-git-conventions.md) | Stratégie de branches et conventions de commits | Must | Tech Lead, Orchestrateur | ✅ done |
| [F-11](stories/phase-1/✅-F-11-docker-compose.md) | Docker Compose pour l'environnement local | Should | Tech Lead, Backend Dev | ✅ done |
| [F-12](stories/phase-1/✅-F-12-expo-eas-config.md) | Configuration Expo EAS (build cloud) | Should | Tech Lead, Frontend Dev | ✅ done |

---

## Phase 2 — MVP

> Objectif : Version jouable de bout en bout. Le joueur navigue entre articles Wikipedia et voit son score.

| ID | Titre | Priorité | Agent(s) | Statut |
|----|-------|----------|----------|--------|
| [M-01](stories/phase-2/✅-M-01-home-screen.md) | Écran d'accueil — affichage départ et destination | Must | Frontend Dev, UX/UI, Backend Dev | ✅ done |
| [M-02](stories/phase-2/✅-M-02-random-pair-api.md) | Génération d'une paire d'articles aléatoires (backend) | Must | Backend Dev | ✅ done |
| [M-03](stories/phase-2/✅-M-03-article-content-display.md) | Récupération et affichage du contenu d'un article Wikipedia | Must | Frontend Dev, Backend Dev | ✅ done |
| [M-04](stories/phase-2/✅-M-04-article-navigation.md) | Navigation entre articles (tap sur un lien) | Must | Frontend Dev | ✅ done |
| [M-05](stories/phase-2/✅-M-05-jumps-timer.md) | Compteur de sauts et timer en temps réel | Must | Frontend Dev | ✅ done |
| [M-06](stories/phase-2/✅-M-06-victory-screen.md) | Détection de victoire et écran de résultat | Must | Frontend Dev, UX/UI | ✅ done |
| [M-07](stories/phase-2/✅-M-07-game-session-model.md) | Modèle de données GameSession (local) | Must | Frontend Dev, Tech Lead | ✅ done |
| [M-08](stories/phase-2/✅-M-08-wikipedia-service.md) | Service Wikipedia API (client mobile) | Must | Frontend Dev, Backend Dev | ✅ done |
| [M-09](stories/phase-2/✅-M-09-unit-tests-game-logic.md) | Tests unitaires — logique de jeu | Must | QA, Frontend Dev, Backend Dev | ✅ done |
| [M-10](stories/phase-2/✅-M-10-abandon-game.md) | Abandon de partie | Should | Frontend Dev, UX/UI | ✅ done |
| [M-11](stories/phase-4/⬜-M-11-offline-mode.md) | Gestion du mode hors-ligne | Should | Frontend Dev | ↪ Phase 4 |
| [M-12](stories/phase-2/✅-M-12-language-support.md) | Support de la langue (français par défaut, configurable) | Should | Frontend Dev, Backend Dev | ✅ done |
| [M-13](stories/phase-4/⬜-M-13-accessibility.md) | Accessibilité de base (WCAG 2.1 AA) | Should | Frontend Dev, UX/UI | ↪ Phase 4 |
| [M-14](stories/wont/🚫-M-14-article-thumbnail.md) | Affichage de l'image de résumé de l'article | Could | Frontend Dev | 🚫 won't |
| [M-15](stories/phase-2/✅-M-15-webview-css-injection.md) | WebView Wikipedia avec injection CSS mobile | Must | Frontend Dev | ✅ done |
| [M-16](stories/phase-2/✅-M-16-popular-pages-strategy.md) | Pages populaires — stratégie hybride API + cache + fallback JSON | Must | Frontend Dev, Backend Dev | ✅ done |
| [M-17](stories/wont/🚫-M-17-change-objective.md) | Bouton "Changer l'objectif" pendant le jeu | Should | Frontend Dev, UX/UI | 🚫 won't |
| [M-18](stories/phase-2/✅-M-18-happy-path-physical-device.md) | Validation happy path complet sur device physique | Must | QA | ✅ done |

---

## Phase 3 — Features

> Objectif : Enrichir l'expérience avec les fonctionnalités de rétention et de communauté.

| ID | Titre | Priorité | Agent(s) | Statut |
|----|-------|----------|----------|--------|
| [F3-01](stories/phase-3/✅-F3-01-daily-challenge.md) | Défi quotidien (même paire pour tous les joueurs) | Must | Backend Dev, Frontend Dev, UX/UI | ✅ done |
| [F3-02](stories/phase-3/✅-F3-02-game-history.md) | Historique des parties (stockage local) | Must | Frontend Dev, UX/UI | ✅ done |
| [F3-03](stories/phase-3/✅-F3-03-share-result.md) | Partage du résultat | Must | Frontend Dev | ✅ done |
| [F3-04](stories/phase-3/✅-F3-04-donation-page.md) | Page donation Wikipedia | Must | Frontend Dev, UX/UI, DPO | ✅ done |
| [F3-05](stories/phase-3/✅-F3-05-hard-mode.md) | Mode difficile (articles sans liens évidents) | Should | Backend Dev, Frontend Dev, UX/UI | ✅ done |
| [F3-06](stories/phase-3/✅-F3-06-about-screen.md) | Écran "À propos" et crédits | Should | Frontend Dev, UX/UI, DPO | ✅ done |
| [F3-07](stories/phase-3/✅-F3-07-integration-tests.md) | Tests d'intégration — parcours de jeu complet | Should | QA | ✅ done |
| [F3-08](stories/phase-3/✅-F3-08-personal-stats.md) | Statistiques personnelles | Could | Frontend Dev, UX/UI | ✅ done |
| [F3-09](stories/phase-3/✅-F3-09-animations-haptics.md) | Animations et feedback haptique | Could | Frontend Dev, UX/UI | ✅ done |
| [F3-10](stories/phase-3/✅-F3-10-history-sort.md) | Tri multi-critères dans l'historique des parties | Should | Frontend Dev, UX/UI | ✅ done |
| [F3-11](stories/phase-3/✅-F3-11-game-detail-screen.md) | Vue détail d'une partie — parcours, suppression et rejouer | Should | Frontend Dev, UX/UI | ✅ done |
| [F3-12](stories/phase-3/✅-F3-12-local-multiplayer.md) | Multijoueur local hot-seat (passage du téléphone) | Should | Frontend Dev, UX/UI | ✅ done |
| [F3-13](stories/phase-3/🚫-F3-13-dev-mode.md) | Mode développeur — toggle affichage de l'article cible | Could | Frontend Dev | 🚫 won't |
| [F3-14](stories/wont/🚫-F3-14-contact-feedback.md) | Formulaire de feedback in-app (ContactScreen) | Could | Frontend Dev, UX/UI, DPO, Backend Dev | 🚫 won't |
| [F3-15](stories/wont/🚫-F3-15-firebase-analytics.md) | Firebase Analytics — intégration skeleton (événements de base) | Could | Frontend Dev, DPO | 🚫 won't |
| [F3-16](stories/phase-3/✅-F3-16-daily-challenge-completion-indicator.md) | Indicateur de complétion du défi quotidien | Should | Frontend Dev, UX/UI | ✅ done |
| [F3-17](stories/phase-3/✅-F3-17-daily-challenge-once-only.md) | Défi quotidien — une seule tentative par jour | Should | Frontend Dev | ✅ done |
| [F3-19](stories/phase-3/✅-F3-19-daily-challenge-new-badge.md) | Badge « New » sur le défi non encore réalisé | Could | Frontend Dev, UX/UI | ✅ done |
| [F3-20](stories/phase-3/✅-F3-20-fix-history-duplicate-keys.md) | Fix doublon de clés dans HistoryScreen | Must | Frontend Dev | ✅ done |
| [F3-21](stories/phase-3/✅-F3-21-fix-daily-challenge-button-visual-state.md) | Fix état visuel bouton défi du jour complété | Must | Frontend Dev | ✅ done |
| [F3-22](stories/phase-3/✅-F3-22-fix-back-navigation-article.md) | Fix retour arrière dans la partie | Must | Frontend Dev | ✅ done |
| [F3-23](stories/phase-3/✅-F3-23-daily-challenge-badge-history.md) | Badge "défi du jour" dans l'historique des parties | Should | Frontend Dev, UX/UI | ✅ done |
| [F3-24](stories/phase-3/✅-F3-24-game-detail-full-path.md) | Parcours complet dans GameDetailScreen | Could | Tech Lead, Frontend Dev | ✅ done |
| [F3-25](stories/phase-3/✅-F3-25-ux-ui-global-rework.md) | Refonte UX/UI globale (vague dédiée) | Should | UX/UI, Frontend Dev | ✅ done |
| [F3-26](stories/phase-3/✅-F3-26-internationalization.md) | Internationalisation des interfaces | Should | Tech Lead, Frontend Dev, Backend Dev | ✅ done |
| [F3-27](stories/phase-3/✅-F3-27-fix-back-navigation-regression.md) | Fix retour arrière — régression F3-22 | Must | Tech Lead, Frontend Dev | ✅ done |
| [F3-28](stories/phase-3/✅-F3-28-multiplayer-configurable-rounds.md) | Multijoueur — nombre de manches configurable | Should | Tech Lead, Frontend Dev | ✅ done |
| [F3-29](stories/phase-3/✅-F3-29-multiplayer-replay-button.md) | Multijoueur — bouton Rejouer sur l'écran résultats | Should | Frontend Dev | ✅ done |
| [F3-30](stories/phase-3/✅-F3-30-fix-multiplayer-history-isolation.md) | Fix — parties multijoueur exclues de l'historique solo | Must | Tech Lead, Frontend Dev | ✅ done |
| [F3-31](stories/phase-3/✅-F3-31-multiplayer-history.md) | Historique des parties multijoueur | Could | Tech Lead, UX/UI, Frontend Dev | ✅ done |
| [F3-32](stories/phase-3/✅-F3-32-multiplayer-pairs-per-round.md) | Multijoueur — paires préchargées par manche | Should | Tech Lead, UX/UI, Frontend Dev | ✅ done |
| [F3-33](stories/phase-3/✅-F3-33-multiplayer-results-per-round.md) | Multijoueur — résultats par manche + médaille partagée | Should | Tech Lead, UX/UI, Frontend Dev | ✅ done |
| [F3-34](stories/phase-3/✅-F3-34-fix-back-navigation-webview.md) | Fix retour arrière WebView — régression persistante après F3-27 | Must | Tech Lead, Frontend Dev | ✅ done |
| [F3-35](stories/phase-3/✅-F3-35-hard-mode-badge-history.md) | Badge "Mode difficile" dans l'historique des parties | Should | Frontend Dev, UX/UI | ✅ done |
| [F3-36](stories/phase-3/✅-F3-36-fix-multiplayer-result-ranking.md) | Fix — Classement MultiplayerResultScreen incorrect (dernière manche exclue) | Must | Frontend Dev | ✅ done |
| [F3-37](stories/phase-3/🔄-F3-37-fix-daily-challenge-button-contrast.md) | Fix — Contraste bouton défi du jour (texte blanc sur fond gris, locale FR) | Must | Frontend Dev | ✅ done |
| [F3-38](stories/phase-3/🔄-F3-38-fix-articles-not-loading-non-en-fr.md) | Fix — Articles non chargés pour les langues ES/DE/PT/IT/NL/PL | Must | Frontend Dev, Backend Dev | ✅ done |
| [F3-39](stories/phase-3/🔄-F3-39-remove-diff-pill-gamehud.md) | UX — Retirer la pillule "DIFF" du GameHUD dans ArticleScreen | Should | Frontend Dev | ✅ done |
| [F3-40](stories/phase-3/🔄-F3-40-fix-article-header-title-centering.md) | UX — Titre article centré dans le header ArticleScreen (sans bouton retour) | Should | Frontend Dev | ✅ done |
| [F3-41](stories/phase-3/🔄-F3-41-victory-share-icon-button.md) | UX — Bouton de partage VictoryScreen : icône standard dans l'encadré statistiques | Should | Frontend Dev, UX/UI | ✅ done |
| [F3-42](stories/phase-3/🔄-F3-42-remove-congratulations-victory-screen.md) | UX — Retirer "Félicitations !" de VictoryScreen (doublon avec "Victoire !") | Should | Frontend Dev | ✅ done |
| [F3-43](stories/phase-3/🔄-F3-43-hard-mode-label-home-toggle.md) | UX — Ajouter le libellé "Difficile" à côté du toggle mode difficile sur HomeScreen | Should | Frontend Dev | ✅ done |
| [F3-44](stories/phase-3/🔄-F3-44-history-link-to-button-home.md) | UX — Transformer le lien "Historique des parties" en bouton sur HomeScreen | Should | Frontend Dev, UX/UI | ✅ done |
| [F3-45](stories/phase-3/✅-F3-45-home-bottom-action-row.md) | UX — Ligne de 3 boutons en bas de HomeScreen (Wikipedia / Recharger / À propos) | Should | Frontend Dev, UX/UI | ✅ done |
| [F3-46](stories/phase-3/✅-F3-46-fix-daily-challenge-button-display.md) | Fix — Affichage bouton défi du jour (FR/IT incorrect, délai autres langues) | Must | Frontend Dev | ✅ done |
| [F3-47](stories/phase-3/✅-F3-47-fix-share-button-position-victory-screen.md) | Fix — Bouton partage mal positionné sur VictoryScreen (chevauchement texte) | Must | Frontend Dev | ✅ done |
| [F3-48](stories/phase-3/✅-F3-48-fix-back-button-missing-first-jumps.md) | Fix — Bouton retour absent sur les premiers sauts dans ArticleScreen | Must | Frontend Dev | ✅ done |
| [F3-49](stories/phase-3/✅-F3-49-fix-multiplayer-forfeit-handling.md) | Fix — Multijoueur : abandon d'un joueur passe incorrectement au joueur suivant | Must | Frontend Dev, Backend Dev | ✅ done |
| [F3-50](stories/phase-3/✅-F3-50-ux-refresh-button-label-loader.md) | UX — Renommer "Changer articles" + loader dynamique sur le bouton Recharger | Should | Frontend Dev | ✅ done |
| [F3-51](stories/phase-3/✅-F3-51-daily-challenge-news-based-precalculated.md) | Défi du jour basé sur l'actualité Wikipedia (pré-calculé J-1) | Should | Backend Dev, Tech Lead | ✅ done |

---

## Phase 4 — Production

> Objectif : Application conforme, sécurisée et publiée sur les stores.

| ID | Titre | Priorité | Agent(s) | Statut |
|----|-------|----------|----------|--------|
| [P-01](stories/phase-4/⬜-P-01-privacy-policy.md) | Politique de confidentialité (RGPD) | Must | DPO, Frontend Dev | ⬜ pending |
| [P-02](stories/phase-4/⬜-P-02-owasp-audit.md) | Audit de sécurité — OWASP Mobile Top 10 | Must | Security | ⬜ pending |
| [P-03](stories/phase-4/⬜-P-03-backend-security.md) | Sécurisation du backend — Headers, CORS, Rate limiting | Must | Security, Backend Dev | ⬜ pending |
| [P-04](stories/phase-4/⬜-P-04-secrets-management.md) | Secrets et variables d'environnement (production) | Must | Security, Tech Lead | ⬜ pending |
| [P-05](stories/phase-4/⬜-P-05-performance-tests.md) | Tests de performance et de charge (backend) | Must | QA, Backend Dev | ⬜ pending |
| [P-06](stories/phase-4/⬜-P-06-cicd-deployment.md) | Pipeline CI/CD — Build et déploiement automatisé | Must | Tech Lead | ⬜ pending |
| [P-07](stories/phase-4/⬜-P-07-appstore-ios.md) | Soumission App Store (iOS) | Must | Tech Lead, Frontend Dev, DPO | ⬜ pending |
| [P-08](stories/phase-4/⬜-P-08-playstore-android.md) | Soumission Google Play Store (Android) | Must | Tech Lead, Frontend Dev, DPO | ⬜ pending |
| [P-09](stories/phase-4/⬜-P-09-monitoring-alerting.md) | Monitoring et alerting en production | Must | Tech Lead, Backend Dev | ⬜ pending |
| [P-10](stories/phase-4/⬜-P-10-rgpd-compliance.md) | Conformité RGPD complète — Registre de traitement | Should | DPO | ⬜ pending |
| [P-11](stories/phase-4/⬜-P-11-device-compatibility.md) | Tests de compatibilité appareils (iOS et Android) | Should | QA | ⬜ pending |
| [M-11](stories/phase-4/⬜-M-11-offline-mode.md) | Gestion du mode hors-ligne | Should | Frontend Dev | ⬜ pending |
| [M-13](stories/phase-4/⬜-M-13-accessibility.md) | Accessibilité de base (WCAG 2.1 AA) | Should | Frontend Dev, UX/UI | ⬜ pending |
| [P-12](stories/phase-4/⬜-P-12-ota-updates.md) | Stratégie de mise à jour OTA (Over The Air) | Should | Tech Lead, Frontend Dev | ⬜ pending |
| [P-13](stories/phase-4/⬜-P-13-legal-texts.md) | Textes légaux in-app (CGU simplifiées) | Should | DPO, Frontend Dev | ⬜ pending |
| [P-14](stories/phase-4/⬜-P-14-crash-reporting.md) | Traçabilité des erreurs côté mobile (crash reporting) | Could | Frontend Dev, DPO | ⬜ pending |
| [P-15](stories/phase-4/⬜-P-15-sast-security.md) | Tests de sécurité automatisés (SAST) | Could | Security | ⬜ pending |
| [P-16](stories/phase-4/🔄-P-16-fix-daily-challenge-button-disabled-fr-it.md) | Fix — Bouton défi du jour grisé en FR et IT | Must | Frontend Dev, Backend Dev | 🔄 in-progress |
| [P-17](stories/phase-4/🔄-P-17-remove-back-button-daily-challenge.md) | UX — Supprimer le bouton retour sur l'écran défi du jour | Should | Frontend Dev | 🔄 in-progress |

---

## Phase 5 — Services managés (décision différée)

> Fonctionnalités nécessitant des services backend en mode RUN (hébergement, base de données, maintenance continue). Mises de côté jusqu'à décision explicite du PO.

| ID | Titre | Priorité | Agent(s) | Statut |
|----|-------|----------|----------|--------|
| [P5-01](stories/phase-5/⬜-P5-01-daily-challenge-leaderboard.md) | Tableau des scores du défi quotidien — classement multijoueur | Should | Backend Dev, Frontend Dev, UX/UI, Tech Lead | ⬜ pending |

---

## Won't — Hors scope (documenté)

> Ces fonctionnalités sont délibérément hors scope. Elles sont documentées pour éviter les dérives futures.

| ID | Titre | Raison |
|----|-------|--------|
| [WNT-01](stories/wont/🚫-WNT-01-user-account.md) | Compte utilisateur et authentification | Obligations RGPD incompatibles avec le positionnement |
| [WNT-02](stories/wont/🚫-WNT-02-in-app-ads.md) | Publicité in-app | Contraire aux valeurs du projet (sans pub, sans tracker) |
| [WNT-03](stories/wont/🚫-WNT-03-multiplayer.md) | Multijoueur en temps réel (race) | Complexité disproportionnée (WebSockets, matchmaking) |
| [WNT-04](stories/wont/🚫-WNT-04-push-notifications.md) | Notifications push | Valeur insuffisante vs complexité au lancement |

---

## Récapitulatif

| Phase | Must | Should | Could | Total |
|-------|------|--------|-------|-------|
| 1-Fondations | 10 | 2 | 0 | 12 |
| 2-MVP | 12 | 5 | 1 | 18 |
| 3-Features | 16 | 21 | 7 | 44 |
| 5-Services managés | 0 | 1 | 0 | 1 |
| 4-Production | 10 | 5 | 2 | 17 |
| Won't | — | — | — | 4 |
| **Total** | **48** | **34** | **10** | **96** |

> Phase 5 non incluse dans le total — décision différée.

---

## Récapitulatif par agent

| Agent | Stories |
|-------|---------|
| Tech Lead | F-01, F-02, F-03, F-04, F-05, F-06, F-07, F-08, F-09, F-10, F-12, F3-51, P-06, P-12 |
| Frontend Dev | F-04, M-01, M-03, M-04, M-05, M-06, M-07, M-08, M-10, M-11, M-12, M-13, M-14, M-15, M-16, M-17, F3-02, F3-03, F3-04, F3-05, F3-06, F3-08, F3-09, F3-10, F3-11, F3-12, F3-13, F3-14, F3-15, F3-20, F3-21, F3-22, F3-23, F3-24, F3-25, F3-26, F3-27, F3-28, F3-29, F3-30, F3-31, F3-35, F3-46, F3-47, F3-48, F3-49, F3-50, P-07, P-08, P-12, P-13, P-14, P-16, P-17 |
| Backend Dev | F-05, F-06, F-11, M-02, M-08, M-12, M-16, F3-01, F3-05, F3-14, F3-26, F3-49, F3-51, P-03, P-05, P-06, P-09, P-16 |
| UX/UI | M-01, M-06, M-13, M-14, M-17, F3-01, F3-02, F3-04, F3-05, F3-06, F3-08, F3-09, F3-10, F3-11, F3-12, F3-14, F3-16, F3-23, F3-25, F3-35 |
| QA | F-08, M-09, M-18, F3-07, P-05, P-11 |
| Security | P-02, P-03, P-04, P-15 |
| DPO | F3-04, F3-06, F3-14, F3-15, P-01, P-10, P-13, P-14 |

---

*Backlog géré par Gauderic, PM WikiHop — 2026-03-01*
*v2.1 : +9 stories créées (M-15 à M-17, F3-10 à F3-15) suite à l'analyse des fonctionnalités V1*
*v2.3 : Phase 1 — Fondations clôturée (F-01 à F-12 passées en done, validées par QA — Halim et approuvées par Tech Lead — Maxime)*
*v2.4 : Wave 3 démarrée — M-03, M-04, M-05, M-15 passées en in-progress (2026-03-02)*
*v2.5 : Wave 3 clôturée — M-03, M-04, M-05, M-15 validées QA et passées en done (2026-03-02)*
*v2.6 : Wave 4 démarrée — M-01, M-06 passées en in-progress (2026-03-02)*
*v2.7 : Wave 4 clôturée — M-01, M-06 validées QA et passées en done (2026-03-02). MVP Phase 2 Must complet.*
*v2.8 : M-18 créée — gate bloquant validation happy path device physique (2026-03-03)*
*v2.9 : Sprint Phase 3 démarré — F3-02 et F3-04 passées en in-progress (2026-03-06)*
*v3.0 : Vagues 1 et 3 activées — F3-01, F3-03, F3-05, F3-06, F3-13 passées en in-progress (2026-03-08)*
*v3.1 : F3-04 done — page donation Wikipedia validée QA (2026-03-09)*
*v3.2 : F3-02, F3-03, F3-06, F3-13 done — historique, partage, à propos, mode dev validés QA (2026-03-10)*
*v3.3 : F3-08, F3-10, F3-11 done — stats perso, tri historique, vue détail validés QA (2026-03-13)*
*v3.4 : F3-20 à F3-26 créées — retours tests PO vague B (3 bugs Must + 4 features) (2026-03-14)*
*v3.5 : Vague C démarrée — F3-09, F3-12, F3-23 passées en in-progress (2026-03-14)*
*v3.6 : F3-12, F3-21 passées en done — F3-22 régression confirmée — F3-27 à F3-31 créées (vague D) (2026-03-14)*
*v3.7 : Vague D mergée PR #25 — F3-27/28/29/30 in-progress (2026-03-14)*
*v3.8 : F3-32/33/34 créées — vague E lancée (2026-03-15)*
*v3.9 : Vague E mergée PR #26 — F3-32/33 done (QA Halim 2026-03-15) — F3-34 in-progress (gate device requis) (2026-03-15)*
*v4.0 : Gate device physique confirmé par le Client — F3-27/28/29/30/34 passées en done (2026-03-15)*
*v4.1 : Cohérence backlog — F3-20/22/23 passées en done (frontmatter + icônes corrigés) (2026-03-15)*
*v4.2 : F3-09 done (rétro), F3-01/F3-05 in-progress — lancement vague F (2026-03-15)*
*v4.3 : F3-01/F3-05 passées en done — gate device physique confirmé par le Client (2026-03-15)*
*v4.4 : F3-35 créée — badge "Mode difficile" dans l'historique des parties (Should / Frontend Dev, UX/UI) (2026-03-15)*
*v4.5 : Vague G lancée — F3-35/F3-24/F3-07 in-progress (2026-03-15)*
*v4.6 : Vague G done — F3-35/F3-24/F3-07 validés QA (2026-03-15)*
*v4.7 : Vague H lancée — F3-25/F3-31 in-progress (2026-03-15)*
*v4.8 : F3-36 créée — bug classement MultiplayerResultScreen (dernière manche exclue de rankedPlayers) détecté en code review F3-31 (2026-03-16)*
*v4.9 : F3-36 in-progress — fix classement dernière manche (2026-03-16)*
*v5.0 : F3-36 done — 18/18 tests passants, tsc et lint propres, tests obsolètes mis à jour (2026-03-16)*
*v5.1 : F3-26 passée en in-progress — langues cibles validées par le PO (fr, en, es, de, pt, it, nl, pl) (2026-03-16)*
*v5.2 : F3-26 done — internationalisation validée QA (678 tests passants, 8 langues, tsc + lint propres) (2026-03-16)*
*v5.3 : Phase 3B Recette — 9 stories créées (F3-37 à F3-45) suite aux tests d'acceptance Client (2 bugs Must + 7 UX Should) (2026-03-18)*
*v5.4 : F3-37 à F3-45 passées in-progress — Phase 3B vague UX lancée (2026-03-20)*
*v5.5 : Phase 3C — 5 stories créées (F3-46 à F3-50) suite aux retours de tests Phase 3B du Client (4 bugs Must + 1 UX Should) (2026-03-21)*
*v5.7 : Phase 3C partielle — F3-46/47/50/51 passées en done (2026-03-21) — F3-48/F3-49 restent in-progress (gate device physique Client en attente)*
*v5.8 : Phase 3 clôturée — F3-48/F3-49 passées en done (gate device physique confirmé par le Client — 2026-03-21) — P-16/P-17 créées en Phase 4 (2026-03-21)*
*Pour créer les stories d'une nouvelle fonctionnalité : `/sprint [description]`*
