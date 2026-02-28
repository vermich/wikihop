# WikiHop — Backlog produit

**Rédigé par** : Gauderic, Product Manager senior
**Date** : 2026-02-28
**Version** : 1.0

---

## Légende

| Champ | Valeurs |
|-------|---------|
| Priorité | Must / Should / Could / Won't (MoSCoW) |
| Phase | 1-Fondations / 2-MVP / 3-Features / 4-Production |
| Agent(s) | Responsable(s) de la story |

---

## Phase 1 — Fondations

> Objectif : Mettre en place les bases techniques du projet. Rien n'est jouable à la fin de cette phase, mais tout le monde peut travailler sans se bloquer mutuellement.

---

### Must

---

[F-01] Initialisation du monorepo
  Priorité : Must
  Phase     : 1-Fondations
  Agent(s)  : Tech Lead
  US        : En tant que développeur de l'équipe, je veux un monorepo structuré avec les workspaces configurés, afin de pouvoir travailler sur le mobile, le backend et les packages partagés sans conflits.
  Critères  :
    - [ ] Structure de dossiers conforme au plan (`apps/mobile`, `apps/backend`, `packages/shared`)
    - [ ] Workspace npm/yarn configuré à la racine
    - [ ] Fichier `package.json` racine avec scripts globaux (`lint`, `test`, `build`)
    - [ ] `.gitignore` couvre `node_modules`, `.env`, builds Expo et artefacts CI
    - [ ] `CLAUDE.md` présent avec les instructions globales de l'orchestrateur
    - [ ] README.md racine décrit comment démarrer le projet localement

---

[F-02] Configuration TypeScript strict (partagé, mobile, backend)
  Priorité : Must
  Phase     : 1-Fondations
  Agent(s)  : Tech Lead
  US        : En tant que développeur, je veux TypeScript en mode strict activé partout, afin de détecter les erreurs au plus tôt et éviter les bugs en production.
  Critères  :
    - [ ] `tsconfig.json` racine avec `strict: true`, `noImplicitAny: true`, `exactOptionalPropertyTypes: true`
    - [ ] `tsconfig` spécifique dans `apps/mobile`, `apps/backend` et `packages/shared` qui étend la config racine
    - [ ] Les types partagés (`GameSession`, `Article`) sont définis dans `packages/shared` et compilent sans erreur
    - [ ] La commande `tsc --noEmit` passe sans erreur sur tout le monorepo

---

[F-03] Configuration ESLint + Prettier
  Priorité : Must
  Phase     : 1-Fondations
  Agent(s)  : Tech Lead
  US        : En tant que développeur, je veux un linter et un formateur configurés de manière uniforme, afin de maintenir la cohérence du code entre tous les agents.
  Critères  :
    - [ ] ESLint configuré avec les règles TypeScript, React Native et les imports
    - [ ] Prettier configuré (single quotes, trailing comma, 2 espaces)
    - [ ] `.eslintrc` et `.prettierrc` à la racine, hérités dans les sous-projets
    - [ ] Script `lint` disponible à la racine et dans chaque workspace
    - [ ] Aucun fichier du projet ne produit d'erreur ou d'avertissement ESLint à l'initialisation

---

[F-04] Initialisation de l'application Expo (React Native + TypeScript)
  Priorité : Must
  Phase     : 1-Fondations
  Agent(s)  : Tech Lead, Frontend Dev
  US        : En tant que développeur frontend, je veux une application Expo fonctionnelle et typée, afin de pouvoir démarrer l'implémentation des écrans.
  Critères  :
    - [ ] Application Expo créée dans `apps/mobile` avec le template TypeScript
    - [ ] Navigation de base configurée (React Navigation ou Expo Router — décision ADR)
    - [ ] L'application compile et s'affiche sur simulateur iOS et Android
    - [ ] Structure de dossiers `screens/`, `components/`, `services/`, `store/`, `utils/` créée
    - [ ] Zustand installé et un store vide opérationnel

---

[F-05] Initialisation du backend Fastify (Node.js + TypeScript)
  Priorité : Must
  Phase     : 1-Fondations
  Agent(s)  : Tech Lead, Backend Dev
  US        : En tant que développeur backend, je veux un serveur Fastify fonctionnel et typé, afin de pouvoir implémenter les routes API.
  Critères  :
    - [ ] Serveur Fastify initialisé dans `apps/backend` avec TypeScript
    - [ ] Route de santé `GET /health` retourne `{ status: "ok" }` avec code 200
    - [ ] Variables d'environnement gérées via un fichier `.env` (exemple `.env.example` commité)
    - [ ] Structure `routes/`, `services/`, `plugins/`, `db/` créée
    - [ ] Le serveur démarre localement sans erreur avec `npm run dev`

---

[F-06] Configuration de la base de données PostgreSQL
  Priorité : Must
  Phase     : 1-Fondations
  Agent(s)  : Tech Lead, Backend Dev
  US        : En tant que développeur backend, je veux une base de données PostgreSQL connectée au serveur, afin de pouvoir persister les données de jeu.
  Critères  :
    - [ ] PostgreSQL accessible localement (Docker Compose recommandé)
    - [ ] Client de base de données configuré (pg ou Prisma — décision ADR)
    - [ ] Système de migrations en place (schéma versionné)
    - [ ] Connexion testée et validée au démarrage du serveur
    - [ ] Variables d'environnement `DATABASE_URL` documentées dans `.env.example`

---

[F-07] Pipeline CI/CD GitHub Actions (lint + tests)
  Priorité : Must
  Phase     : 1-Fondations
  Agent(s)  : Tech Lead
  US        : En tant qu'équipe, nous voulons un pipeline CI qui valide chaque Pull Request, afin de détecter les régressions avant qu'elles atteignent la branche `main`.
  Critères  :
    - [ ] Workflow déclenché sur `push` et `pull_request` vers `main` et `develop`
    - [ ] Étapes : install dépendances → lint → tests unitaires → build TypeScript
    - [ ] Le pipeline échoue si ESLint remonte des erreurs
    - [ ] Le pipeline échoue si un test Jest échoue
    - [ ] Durée d'exécution inférieure à 5 minutes sur un projet vide
    - [ ] Badge de statut CI affiché dans le README

---

[F-08] Configuration Jest (mobile + backend)
  Priorité : Must
  Phase     : 1-Fondations
  Agent(s)  : Tech Lead, QA
  US        : En tant que développeur, je veux Jest configuré avec React Native Testing Library, afin d'écrire et exécuter des tests dès la phase MVP.
  Critères  :
    - [ ] Jest configuré dans `apps/mobile` avec `@testing-library/react-native`
    - [ ] Jest configuré dans `apps/backend` pour tester les routes Fastify
    - [ ] Script `test` disponible dans chaque workspace et à la racine
    - [ ] Un test factice ("smoke test") passe dans chaque workspace pour valider la configuration
    - [ ] Coverage activé avec seuil minimum défini (ex : 70% lignes)

---

[F-09] ADR — Décisions d'architecture initiales
  Priorité : Must
  Phase     : 1-Fondations
  Agent(s)  : Tech Lead
  US        : En tant qu'équipe, nous voulons les décisions d'architecture documentées, afin d'éviter les discussions répétitives et d'aligner tous les agents.
  Critères  :
    - [ ] ADR-001 : Choix du système de navigation mobile (React Navigation vs Expo Router)
    - [ ] ADR-002 : Choix du client PostgreSQL (pg brut vs Prisma vs Drizzle)
    - [ ] ADR-003 : Stratégie de gestion du state (Zustand confirmé ou alternative)
    - [ ] ADR-004 : Stratégie de cache Wikipedia (client-side vs backend proxy)
    - [ ] Chaque ADR suit le format : Contexte / Décision / Conséquences
    - [ ] ADR stockés dans `docs/adr/`

---

[F-10] Stratégie de branches et conventions de commits
  Priorité : Must
  Phase     : 1-Fondations
  Agent(s)  : Tech Lead, Orchestrateur
  US        : En tant qu'équipe, nous voulons des conventions de travail Git établies, afin de coordonner le travail entre agents sans conflits.
  Critères  :
    - [ ] Branches `main` et `develop` créées et protégées (pas de push direct sur `main`)
    - [ ] Convention de nommage documentée : `feat/[agent]-[feature]`, `fix/[description]`
    - [ ] Conventional Commits configuré (optionnel : commitlint + husky)
    - [ ] Template de Pull Request créé dans `.github/`
    - [ ] Document de conventions accessible dans le README ou `docs/`

---

### Should

---

[F-11] Docker Compose pour l'environnement de développement local
  Priorité : Should
  Phase     : 1-Fondations
  Agent(s)  : Tech Lead, Backend Dev
  US        : En tant que développeur, je veux démarrer l'environnement complet en une seule commande, afin de ne pas perdre de temps en configuration.
  Critères  :
    - [ ] `docker-compose.yml` à la racine démarre PostgreSQL
    - [ ] `npm run dev` (ou équivalent) démarre le backend et la base de données
    - [ ] Un fichier `docker-compose.override.yml` permet les personnalisations locales sans modifier le fichier principal
    - [ ] Le README explique comment utiliser Docker Compose

---

[F-12] Configuration Expo EAS (build cloud)
  Priorité : Should
  Phase     : 1-Fondations
  Agent(s)  : Tech Lead, Frontend Dev
  US        : En tant que développeur, je veux Expo EAS configuré, afin de pouvoir générer des builds de preview sans environnement natif local.
  Critères  :
    - [ ] `eas.json` configuré avec les profils `development`, `preview` et `production`
    - [ ] Le profil `preview` génère un build installable sur device physique
    - [ ] Les secrets EAS (tokens, credentials) sont documentés (pas commités)
    - [ ] La commande `eas build --profile preview` s'exécute sans erreur sur la CI

---

## Phase 2 — MVP

> Objectif : Produire une version jouable de bout en bout. Le joueur peut démarrer une partie, naviguer entre articles Wikipedia et voir son score à la fin.

---

### Must

---

[M-01] Écran d'accueil : affichage départ et destination
  Priorité : Must
  Phase     : 2-MVP
  Agent(s)  : Frontend Dev, UX/UI, Backend Dev
  US        : En tant que joueur, je veux voir clairement les articles de départ et de destination au lancement d'une partie, afin de comprendre immédiatement mon objectif.
  Critères  :
    - [ ] L'écran affiche le titre de l'article de départ et de l'article destination
    - [ ] Un extrait (résumé Wikipedia) de chaque article est affiché
    - [ ] Un bouton "Jouer" démarre la partie
    - [ ] Un bouton "Nouvelles articles" tire une nouvelle paire aléatoire
    - [ ] Le chargement d'une paire affiche un indicateur visuel (spinner)
    - [ ] En cas d'erreur de chargement, un message clair est affiché avec un bouton de retry
    - [ ] Le design est conforme aux maquettes UX/UI validées

---

[M-02] Génération d'une paire d'articles aléatoires (backend)
  Priorité : Must
  Phase     : 2-MVP
  Agent(s)  : Backend Dev
  US        : En tant que joueur, je veux recevoir deux articles Wikipedia aléatoires et différents pour chaque nouvelle partie, afin de toujours avoir un défi unique.
  Critères  :
    - [ ] Endpoint `GET /api/game/random-pair` retourne `{ start: Article, target: Article }`
    - [ ] Les deux articles sont distincts
    - [ ] Les articles sont des articles encyclopédiques (pas des pages de catégorie, portail, aide)
    - [ ] Les articles ont un contenu suffisant (non-ébauche) — critère à définir avec Tech Lead
    - [ ] Le temps de réponse est inférieur à 2 secondes (p95)
    - [ ] L'endpoint gère les erreurs Wikipedia API (timeout, 404) et retourne un code d'erreur approprié

---

[M-03] Récupération et affichage du contenu d'un article Wikipedia
  Priorité : Must
  Phase     : 2-MVP
  Agent(s)  : Frontend Dev, Backend Dev
  US        : En tant que joueur, je veux lire le contenu d'un article Wikipedia dans l'application, afin de trouver les liens vers l'article destination.
  Critères  :
    - [ ] Le contenu de l'article est affiché (texte + liens internes cliquables)
    - [ ] Les liens vers des catégories, portails, pages d'aide et pages spéciales sont filtrés et non affichés comme liens navigables
    - [ ] Les liens internes Wikipedia sont visuellement distingués du texte (couleur, soulignement)
    - [ ] L'article est scrollable verticalement
    - [ ] Le titre de l'article en cours est affiché en haut de l'écran
    - [ ] Le chargement d'un article affiche un indicateur visuel
    - [ ] En cas d'article inexistant ou d'erreur API, un message est affiché

---

[M-04] Navigation entre articles (tap sur un lien)
  Priorité : Must
  Phase     : 2-MVP
  Agent(s)  : Frontend Dev
  US        : En tant que joueur, je veux naviguer vers un autre article en tapant sur un lien interne, afin d'avancer vers la destination.
  Critères  :
    - [ ] Taper sur un lien interne charge et affiche le nouvel article
    - [ ] Chaque navigation incrémente le compteur de sauts de 1
    - [ ] L'article visité est ajouté au chemin de la session (`path[]`)
    - [ ] Un bouton "Retour" permet de revenir à l'article précédent dans le chemin (sans décrémenter les sauts)
    - [ ] La navigation en arrière ne recharge pas l'article depuis l'API (utilisation du cache)
    - [ ] L'état de scroll de l'article précédent n'est pas conservé (l'article s'affiche depuis le début)

---

[M-05] Compteur de sauts et timer en temps réel
  Priorité : Must
  Phase     : 2-MVP
  Agent(s)  : Frontend Dev
  US        : En tant que joueur, je veux voir le nombre de sauts effectués et le temps écoulé pendant ma partie, afin de mesurer ma performance en cours de jeu.
  Critères  :
    - [ ] Le compteur de sauts est visible à tout moment pendant la partie (header ou bandeau fixe)
    - [ ] Le timer démarre quand le joueur appuie sur "Jouer" et s'arrête quand il atteint la destination
    - [ ] Le timer affiche le format `mm:ss`
    - [ ] Le timer et le compteur se mettent à jour en temps réel sans affecter les performances de scroll
    - [ ] En cas de mise en arrière-plan de l'app, le timer continue (ou est mis en pause — décision UX à documenter)

---

[M-06] Détection de victoire et écran de résultat
  Priorité : Must
  Phase     : 2-MVP
  Agent(s)  : Frontend Dev, UX/UI
  US        : En tant que joueur, je veux être notifié immédiatement quand j'atteins la destination et voir mon score final, afin de ressentir la satisfaction d'avoir réussi.
  Critères  :
    - [ ] Quand le joueur navigue vers l'article destination, la victoire est détectée automatiquement
    - [ ] L'écran de victoire affiche : nombre de sauts, temps total, article de départ, article destination
    - [ ] Le chemin complet parcouru est affiché (liste des articles visités)
    - [ ] Un bouton "Rejouer" lance une nouvelle partie avec une nouvelle paire aléatoire
    - [ ] Un bouton "Menu" retourne à l'écran d'accueil
    - [ ] L'animation de victoire est satisfaisante sans être excessive

---

[M-07] Modèle de données GameSession (local)
  Priorité : Must
  Phase     : 2-MVP
  Agent(s)  : Frontend Dev, Tech Lead
  US        : En tant qu'application, je veux stocker la session de jeu en cours localement, afin de ne pas perdre la progression si l'app est mise en arrière-plan.
  Critères  :
    - [ ] Le type `GameSession` est implémenté tel que défini dans `context.md` (dans `packages/shared`)
    - [ ] La session en cours est persistée dans AsyncStorage
    - [ ] Si l'app est fermée puis rouverte, la session en cours est restaurée avec le bon article affiché
    - [ ] Une session terminée (`won` ou `abandoned`) est marquée comme telle avant d'être écrasée
    - [ ] La session est initialisée proprement au démarrage d'une nouvelle partie (pas de données de la partie précédente)

---

[M-08] Service Wikipedia API (client mobile)
  Priorité : Must
  Phase     : 2-MVP
  Agent(s)  : Frontend Dev, Backend Dev
  US        : En tant que développeur, je veux un service centralisé pour appeler l'API Wikipedia, afin de gérer les erreurs, le cache et les timeouts de manière cohérente.
  Critères  :
    - [ ] Service `WikipediaService` dans `apps/mobile/src/services/`
    - [ ] Méthodes : `getArticleSummary(title)`, `getArticleContent(title)`, `extractInternalLinks(html)`
    - [ ] Timeout configuré (ex : 10 secondes) avec message d'erreur explicite
    - [ ] Cache en mémoire des articles déjà chargés pendant la session (évite les appels redondants)
    - [ ] Les appels respectent le `User-Agent` recommandé par Wikimedia (`WikiHop/1.0`)
    - [ ] Les erreurs 404 (article non trouvé) sont distinguées des erreurs réseau

---

[M-09] Tests unitaires — logique de jeu (Phase 2)
  Priorité : Must
  Phase     : 2-MVP
  Agent(s)  : QA, Frontend Dev, Backend Dev
  US        : En tant qu'équipe, nous voulons les règles métier couvertes par des tests unitaires, afin de prévenir les régressions sur la logique de jeu.
  Critères  :
    - [ ] Tests unitaires du compteur de sauts (incrémentation, non-décrémentation au retour)
    - [ ] Tests du filtre de liens (catégories, portails, spéciaux exclus)
    - [ ] Tests de la détection de victoire (article cible atteint)
    - [ ] Tests du service WikipediaService (mocks des appels API)
    - [ ] Tests de l'endpoint `GET /api/game/random-pair` (réponse valide, gestion d'erreur)
    - [ ] Couverture de code supérieure à 70% sur les modules testés

---

### Should

---

[M-10] Abandon de partie
  Priorité : Should
  Phase     : 2-MVP
  Agent(s)  : Frontend Dev, UX/UI
  US        : En tant que joueur, je veux pouvoir abandonner une partie en cours, afin de recommencer ou quitter le jeu sans être bloqué.
  Critères  :
    - [ ] Un bouton ou geste permet d'abandonner la partie (avec confirmation)
    - [ ] La session est marquée `abandoned` dans le store
    - [ ] Le joueur est redirigé vers l'écran d'accueil après confirmation
    - [ ] Aucune donnée corrompue n'est laissée dans AsyncStorage après abandon

---

[M-11] Gestion du mode hors-ligne
  Priorité : Should
  Phase     : 2-MVP
  Agent(s)  : Frontend Dev
  US        : En tant que joueur en zone sans réseau, je veux être informé clairement que le jeu nécessite une connexion, afin de ne pas rester bloqué sur un écran de chargement infini.
  Critères  :
    - [ ] L'application détecte l'absence de connexion réseau
    - [ ] Un message clair indique que le jeu nécessite une connexion Internet
    - [ ] Quand la connexion est rétablie, le joueur peut reprendre normalement
    - [ ] Les articles déjà chargés pendant la session restent accessibles hors-ligne (cache en mémoire)

---

[M-12] Support de la langue (français par défaut, configurable)
  Priorité : Should
  Phase     : 2-MVP
  Agent(s)  : Frontend Dev, Backend Dev
  US        : En tant que joueur, je veux jouer en français par défaut, afin d'avoir une expérience dans ma langue.
  Critères  :
    - [ ] La langue Wikipedia par défaut est `fr`
    - [ ] Le code est conçu pour supporter d'autres langues (`en`, `es`, etc.) sans refactoring majeur
    - [ ] La langue est stockée dans le store Zustand et persistée
    - [ ] L'URL Wikipedia s'adapte à la langue sélectionnée (`fr.wikipedia.org`, `en.wikipedia.org`, etc.)
    - [ ] Note : l'interface de l'app elle-même n'est pas traduite en phase 2 (français uniquement)

---

[M-13] Accessibilité de base (WCAG 2.1 AA)
  Priorité : Should
  Phase     : 2-MVP
  Agent(s)  : Frontend Dev, UX/UI
  US        : En tant que joueur avec une déficience visuelle, je veux que l'application soit utilisable avec les outils d'accessibilité du système, afin de ne pas être exclu du jeu.
  Critères  :
    - [ ] Tous les éléments interactifs ont un label accessible (`accessibilityLabel`)
    - [ ] Le contraste des couleurs respecte WCAG 2.1 AA (ratio 4.5:1 minimum pour le texte)
    - [ ] La taille minimale des zones tactiles est de 44x44 points
    - [ ] Le lecteur d'écran (VoiceOver iOS / TalkBack Android) peut naviguer dans les écrans principaux
    - [ ] Les liens Wikipedia cliquables sont annoncés comme "lien" par le lecteur d'écran

---

### Could

---

[M-14] Affichage de l'image de résumé de l'article
  Priorité : Could
  Phase     : 2-MVP
  Agent(s)  : Frontend Dev
  US        : En tant que joueur, je veux voir l'image principale d'un article Wikipedia, afin de mieux m'orienter visuellement.
  Critères  :
    - [ ] Si l'article a une image de résumé (champ `thumbnail` de l'API summary), elle est affichée
    - [ ] L'image se charge de manière asynchrone sans bloquer l'affichage du texte
    - [ ] Si l'image n'est pas disponible, un placeholder neutre s'affiche
    - [ ] Les images sont optimisées (taille adaptée à l'écran)

---

## Phase 3 — Features

> Objectif : Enrichir l'expérience avec les fonctionnalités de rétention et de communauté. Le jeu devient plus engageant sans introduire de dark patterns.

---

### Must

---

[F3-01] Défi quotidien (même paire pour tous les joueurs)
  Priorité : Must
  Phase     : 3-Features
  Agent(s)  : Backend Dev, Frontend Dev, UX/UI
  US        : En tant que joueur régulier, je veux un défi quotidien avec la même paire d'articles pour tous, afin de pouvoir comparer mes résultats avec d'autres joueurs.
  Critères  :
    - [ ] Endpoint `GET /api/game/daily` retourne la paire du jour (identique pour tous les appels de la journée)
    - [ ] La paire quotidienne change automatiquement à minuit UTC
    - [ ] Les paires sont générées à l'avance et stockées en base de données
    - [ ] Un joueur ne peut jouer le défi quotidien qu'une seule fois par jour (contrôle local)
    - [ ] L'écran d'accueil affiche clairement le défi du jour avec une indication visuelle distincte
    - [ ] Si le joueur a déjà joué le défi du jour, son résultat est affiché à la place du bouton "Jouer"

---

[F3-02] Historique des parties (stockage local)
  Priorité : Must
  Phase     : 3-Features
  Agent(s)  : Frontend Dev, UX/UI
  US        : En tant que joueur, je veux revoir mes parties passées, afin de suivre ma progression et me souvenir de mes meilleurs trajets.
  Critères  :
    - [ ] L'historique affiche les 20 dernières parties (terminées ou abandonnées)
    - [ ] Pour chaque partie : date, articles de départ et destination, nombre de sauts, temps, statut
    - [ ] L'historique est stocké dans AsyncStorage (local uniquement)
    - [ ] Le joueur peut supprimer une entrée ou effacer tout l'historique
    - [ ] L'historique est accessible depuis le menu principal
    - [ ] L'écran de résultat propose d'aller voir l'historique

---

[F3-03] Partage du résultat
  Priorité : Must
  Phase     : 3-Features
  Agent(s)  : Frontend Dev
  US        : En tant que joueur fier de mon score, je veux partager mon résultat avec mes amis, afin de les inviter à essayer de faire mieux.
  Critères  :
    - [ ] Un bouton "Partager" est disponible sur l'écran de résultat
    - [ ] Le partage utilise l'API native de partage du système (Share API de React Native)
    - [ ] Le texte partagé contient : articles de départ et destination, nombre de sauts, temps, et un lien vers l'app
    - [ ] Le format est lisible et engageant sans être encombrant
    - [ ] Aucune donnée personnelle n'est incluse dans le message partagé
    - [ ] Le partage fonctionne sur iOS et Android

---

[F3-04] Page donation Wikipedia
  Priorité : Must
  Phase     : 3-Features
  Agent(s)  : Frontend Dev, UX/UI, DPO
  US        : En tant que joueur qui apprécie Wikipedia, je veux pouvoir soutenir la Fondation Wikimedia depuis l'application, afin de contribuer au maintien de la ressource que le jeu utilise.
  Critères  :
    - [ ] Une page "Soutenir Wikipedia" est accessible depuis le menu
    - [ ] La page explique le lien entre WikiHop et Wikipedia (données ouvertes, API gratuite)
    - [ ] Un bouton ouvre le lien `https://donate.wikimedia.org` dans le navigateur externe
    - [ ] L'app ne collecte aucune information sur le don (le don est géré par Wikimedia)
    - [ ] Le texte est validé par le DPO pour s'assurer qu'il n'induit pas en erreur sur la nature de l'app

---

### Should

---

[F3-05] Mode difficile (articles sans liens évidents)
  Priorité : Should
  Phase     : 3-Features
  Agent(s)  : Backend Dev, Frontend Dev, UX/UI
  US        : En tant que joueur expert, je veux un mode difficile avec des paires d'articles thématiquement éloignées, afin d'augmenter le défi intellectuel.
  Critères  :
    - [ ] Le mode difficile est sélectionnable depuis l'écran d'accueil
    - [ ] Les paires sont générées avec un algorithme qui maximise la distance sémantique (à définir en ADR)
    - [ ] Un indicateur visuel distingue les parties en mode difficile
    - [ ] Le score en mode difficile est affiché séparément dans l'historique
    - [ ] La définition technique du "mode difficile" est documentée dans un ADR

---

[F3-06] Écran "À propos" et crédits
  Priorité : Should
  Phase     : 3-Features
  Agent(s)  : Frontend Dev, UX/UI, DPO
  US        : En tant que joueur curieux, je veux savoir qui a créé ce jeu et comprendre son fonctionnement, afin de lui faire confiance.
  Critères  :
    - [ ] Page "À propos" accessible depuis le menu
    - [ ] Contient : description du jeu, utilisation de l'API Wikipedia, lien vers la politique de confidentialité
    - [ ] Lien vers le dépôt GitHub du projet (open source)
    - [ ] Version de l'application affichée
    - [ ] Validé par le DPO pour la conformité RGPD

---

[F3-07] Tests d'intégration — parcours de jeu complet
  Priorité : Should
  Phase     : 3-Features
  Agent(s)  : QA
  US        : En tant qu'équipe, nous voulons un test de bout en bout validant le parcours de jeu principal, afin de détecter les régressions sur le flux critique.
  Critères  :
    - [ ] Test E2E : démarrer une partie → naviguer 3 articles → atteindre la destination → voir le résultat
    - [ ] Test E2E : abandonner une partie en cours
    - [ ] Test E2E : jouer le défi quotidien → vérifier qu'il ne peut pas être rejoué
    - [ ] Tests d'intégration API : paire aléatoire, défi quotidien, gestion des erreurs Wikipedia
    - [ ] Les tests E2E s'exécutent dans la CI (Detox ou Maestro — décision Tech Lead)

---

### Could

---

[F3-08] Statistiques personnelles
  Priorité : Could
  Phase     : 3-Features
  Agent(s)  : Frontend Dev, UX/UI
  US        : En tant que joueur régulier, je veux voir mes statistiques globales, afin de mesurer ma progression sur la durée.
  Critères  :
    - [ ] Écran "Mes stats" affichant : nombre total de parties, meilleur score, moyenne de sauts, taux de victoire
    - [ ] Les statistiques sont calculées depuis l'historique local
    - [ ] Un graphique simple (barres ou ligne) montre l'évolution du nombre de sauts sur les 7 dernières parties
    - [ ] Toutes les données restent locales (aucun envoi au serveur)

---

[F3-09] Animations et feedback haptique
  Priorité : Could
  Phase     : 3-Features
  Agent(s)  : Frontend Dev, UX/UI
  US        : En tant que joueur, je veux des animations fluides et des retours haptiques sur les interactions clés, afin de rendre l'expérience plus agréable et satisfaisante.
  Critères  :
    - [ ] Animation de transition entre les articles (slide ou fade)
    - [ ] Feedback haptique lors de la victoire (vibration légère)
    - [ ] Animation de chargement cohérente dans toute l'application
    - [ ] Les animations respectent la préférence système "Réduire les animations" (accessibilité)
    - [ ] Aucune animation ne dépasse 300ms pour ne pas ralentir la navigation

---

## Phase 4 — Production

> Objectif : Rendre l'application conforme, sécurisée et publiée sur les stores. Cette phase inclut la conformité RGPD, la sécurité, les tests de charge et les démarches de publication.

---

### Must

---

[P-01] Politique de confidentialité (RGPD)
  Priorité : Must
  Phase     : 4-Production
  Agent(s)  : DPO, Frontend Dev
  US        : En tant que joueur, je veux lire la politique de confidentialité de l'application, afin de comprendre quelles données sont collectées et comment elles sont utilisées.
  Critères  :
    - [ ] La politique de confidentialité est rédigée par le DPO
    - [ ] Elle couvre : données collectées (aucune en version anonyme), stockage local, API Wikipedia, analytics (aucun)
    - [ ] Elle est accessible depuis l'app (page "À propos") et depuis une URL publique (ex: wikihop.app/privacy)
    - [ ] Elle est disponible en français
    - [ ] Elle est mise à jour avant la soumission sur les stores
    - [ ] Elle respecte les exigences RGPD (CNIL) et les exigences Apple/Google

---

[P-02] Audit de sécurité — OWASP Mobile Top 10
  Priorité : Must
  Phase     : 4-Production
  Agent(s)  : Security
  US        : En tant qu'éditeur de l'application, je veux que l'app soit auditée selon OWASP Mobile Top 10, afin de protéger les utilisateurs et éviter le rejet des stores.
  Critères  :
    - [ ] M1 — Credential usage impropre : aucune clé API ou secret dans le code client
    - [ ] M2 — Sécurité chaîne de confiance inadéquate : certificats validés, pas de bypass SSL
    - [ ] M3 — Authentification/autorisation : pas de route backend accessible sans validation
    - [ ] M4 — Validation des entrées insuffisante : tous les paramètres API validés côté backend
    - [ ] M5 — Communication non sécurisée : toutes les communications en HTTPS
    - [ ] M6 — Contrôles de vie privée inadéquats : aucune PII stockée ou transmise
    - [ ] M7 — Protections binaires insuffisantes : builds de production sans code de debug
    - [ ] M8 — Falsification de sécurité : vérification de l'intégrité des données de jeu
    - [ ] M9 — Reverse engineering : obfuscation du code de production (optionnel, à décider)
    - [ ] M10 — Fonctionnalité superflue : suppression des logs de debug en production
    - [ ] Rapport d'audit produit par Security, corrections appliquées avant soumission

---

[P-03] Sécurisation du backend — Headers, CORS, Rate limiting
  Priorité : Must
  Phase     : 4-Production
  Agent(s)  : Security, Backend Dev
  US        : En tant qu'éditeur, je veux que le backend soit protégé contre les abus et les attaques courantes, afin de garantir la disponibilité et la sécurité du service.
  Critères  :
    - [ ] Headers de sécurité HTTP configurés (Helmet.js ou équivalent Fastify) : CSP, HSTS, X-Frame-Options, etc.
    - [ ] CORS configuré pour n'autoriser que les origines légitimes
    - [ ] Rate limiting sur toutes les routes API (ex : 60 requêtes/minute par IP)
    - [ ] Validation des paramètres d'entrée avec un schéma Fastify/Zod sur chaque route
    - [ ] Logs d'accès et d'erreurs configurés (sans données personnelles)
    - [ ] Pas de stack trace exposée en réponse d'erreur en production

---

[P-04] Secrets et variables d'environnement (production)
  Priorité : Must
  Phase     : 4-Production
  Agent(s)  : Security, Tech Lead
  US        : En tant qu'équipe, nous voulons que les secrets de production soient gérés de manière sécurisée, afin d'éviter toute fuite de credentials.
  Critères  :
    - [ ] Aucun secret n'est commité dans le dépôt Git (vérification via `git-secrets` ou équivalent)
    - [ ] Les secrets CI/CD sont stockés dans GitHub Actions Secrets
    - [ ] Les secrets de production backend sont gérés via variables d'environnement (pas de fichier `.env` en production)
    - [ ] Les credentials Expo EAS (App Store Connect, Google Play) sont documentés et stockés en dehors du dépôt
    - [ ] Un audit de l'historique Git est effectué pour s'assurer qu'aucun secret n'a été commité par erreur

---

[P-05] Tests de performance et de charge (backend)
  Priorité : Must
  Phase     : 4-Production
  Agent(s)  : QA, Backend Dev
  US        : En tant qu'éditeur, je veux que le backend supporte la charge attendue au lancement, afin d'éviter toute interruption de service.
  Critères  :
    - [ ] Test de charge simulant 100 utilisateurs simultanés sur `GET /api/game/random-pair`
    - [ ] Test de charge simulant 1 000 utilisateurs simultanés sur `GET /api/game/daily` (le défi quotidien est plus sollicité)
    - [ ] Le temps de réponse p95 reste inférieur à 2 secondes sous charge
    - [ ] Le taux d'erreur reste inférieur à 1% sous charge nominale
    - [ ] Rapport de test de charge produit par QA
    - [ ] Plan de mise à l'échelle documenté (verticale ou horizontale) si les seuils ne sont pas atteints

---

[P-06] Pipeline CI/CD — Build et déploiement automatisé
  Priorité : Must
  Phase     : 4-Production
  Agent(s)  : Tech Lead
  US        : En tant qu'équipe, nous voulons que les builds de production soient générés et déployés automatiquement, afin d'éviter les erreurs manuelles lors des releases.
  Critères  :
    - [ ] Pipeline `release` déclenché sur les tags Git `v*.*.*`
    - [ ] Build Expo EAS `production` déclenché automatiquement sur tag
    - [ ] Déploiement backend en production automatisé (via GitHub Actions)
    - [ ] Les migrations de base de données s'exécutent automatiquement lors du déploiement
    - [ ] Rollback documenté et testable en cas d'échec du déploiement
    - [ ] Notifications (Slack, email ou autre) en cas d'échec du pipeline

---

[P-07] Soumission App Store (iOS)
  Priorité : Must
  Phase     : 4-Production
  Agent(s)  : Tech Lead, Frontend Dev, DPO
  US        : En tant qu'éditeur, je veux soumettre WikiHop sur l'App Store Apple, afin que les utilisateurs iOS puissent télécharger le jeu.
  Critères  :
    - [ ] Compte Apple Developer Program actif
    - [ ] `app.json` / `app.config.js` Expo configuré : `bundleIdentifier`, version, icône, splash screen
    - [ ] Build Expo EAS `production` signé avec les certificats Apple valides
    - [ ] Métadonnées App Store complètes : description (fr), captures d'écran (toutes tailles requises), catégorie, âge
    - [ ] Politique de confidentialité accessible via URL publique
    - [ ] Questionnaire App Privacy d'Apple rempli (pas de collecte de données)
    - [ ] Review Guidelines Apple vérifiées (pas de guideline 3.2.2 violation — pas de raison de rejet évident)
    - [ ] Soumission initiale en mode "Manuel" (pas de publication automatique)

---

[P-08] Soumission Google Play Store (Android)
  Priorité : Must
  Phase     : 4-Production
  Agent(s)  : Tech Lead, Frontend Dev, DPO
  US        : En tant qu'éditeur, je veux soumettre WikiHop sur le Google Play Store, afin que les utilisateurs Android puissent télécharger le jeu.
  Critères  :
    - [ ] Compte Google Play Console actif (frais uniques)
    - [ ] `app.json` / `app.config.js` Expo configuré : `package` Android, `versionCode`, icône adaptative, splash screen
    - [ ] Build Expo EAS `production` signé avec la keystore Android (stockée en dehors du dépôt)
    - [ ] Métadonnées Play Store complètes : description (fr), captures d'écran (téléphone + tablette), catégorie, classification PEGI
    - [ ] Politique de confidentialité accessible via URL publique (obligatoire pour toute app)
    - [ ] Formulaire "Data Safety" Google Play rempli (aucune donnée collectée)
    - [ ] Classification de contenu obtenue (questionnaire IARC)
    - [ ] Soumission initiale en mode "Révision interne" (tracks Google Play)

---

[P-09] Monitoring et alerting en production
  Priorité : Must
  Phase     : 4-Production
  Agent(s)  : Tech Lead, Backend Dev
  US        : En tant qu'éditeur, je veux être alerté en cas d'incident en production, afin de réagir rapidement et minimiser l'impact sur les joueurs.
  Critères  :
    - [ ] Endpoint de santé `GET /health` retournant l'état de la base de données
    - [ ] Monitoring de disponibilité configuré (Uptime Robot, Better Stack ou équivalent gratuit)
    - [ ] Alerting par email ou notification en cas d'indisponibilité supérieure à 5 minutes
    - [ ] Logs d'erreur backend agrégés (Logtail, Papertrail ou équivalent)
    - [ ] Tableau de bord de métriques de base (requêtes/minute, taux d'erreur, latence)

---

### Should

---

[P-10] Conformité RGPD complète — Registre de traitement
  Priorité : Should
  Phase     : 4-Production
  Agent(s)  : DPO
  US        : En tant qu'éditeur, je veux documenter les traitements de données effectués par WikiHop, afin d'être en conformité avec le RGPD en cas de contrôle CNIL.
  Critères  :
    - [ ] Registre de traitement documenté : finalité, base légale, données traitées, durée de conservation
    - [ ] Analyse de risque réalisée (les appels Wikipedia API génèrent-ils des logs IP ?)
    - [ ] Contact DPO / responsable de traitement identifié et documenté
    - [ ] Procédure de réponse aux demandes d'exercice de droits (effacement, accès) documentée
    - [ ] Le DPO valide que l'app peut fonctionner sans bannière cookie (aucun tracker, aucune PII)

---

[P-11] Tests de compatibilité appareils (iOS et Android)
  Priorité : Should
  Phase     : 4-Production
  Agent(s)  : QA
  US        : En tant que joueur, je veux que l'application fonctionne correctement sur mon téléphone, quelle que soit sa version.
  Critères  :
    - [ ] Tests sur iOS 16, 17 et 18 (simulateur + device physique si possible)
    - [ ] Tests sur Android 12, 13 et 14 (émulateur + device physique si possible)
    - [ ] Tests sur des résolutions d'écran variées : petit écran (375pt), grand écran (430pt), tablette
    - [ ] Rapport de compatibilité produit par QA avec les éventuels problèmes identifiés
    - [ ] Aucun crash sur les versions cibles

---

[P-12] Stratégie de mise à jour OTA (Over The Air)
  Priorité : Should
  Phase     : 4-Production
  Agent(s)  : Tech Lead, Frontend Dev
  US        : En tant qu'éditeur, je veux pouvoir déployer des corrections mineures sans passer par la validation des stores, afin de réagir rapidement aux bugs en production.
  Critères  :
    - [ ] Expo Updates configuré en mode `manual` ou `on-launch`
    - [ ] La politique de mise à jour OTA est documentée (quels types de changements sont éligibles)
    - [ ] Les mises à jour critiques (correctifs de sécurité) peuvent être forcées
    - [ ] La compatibilité OTA avec la version du runtime Expo est vérifiée à chaque release
    - [ ] Les mises à jour OTA ne contournent pas les politiques Apple (pas de changement de fonctionnalité majeur sans review)

---

[P-13] Textes légaux in-app (CGU simplifiées)
  Priorité : Should
  Phase     : 4-Production
  Agent(s)  : DPO, Frontend Dev
  US        : En tant que joueur, je veux accéder aux conditions générales et mentions légales depuis l'application, afin de connaître mes droits.
  Critères  :
    - [ ] Mentions légales accessibles depuis l'écran "À propos" : éditeur, hébergeur
    - [ ] Lien vers la politique de confidentialité complète (URL externe)
    - [ ] Lien vers les conditions d'utilisation de l'API Wikipedia (Wikimedia Terms of Use)
    - [ ] Le texte est rédigé en français simple, sans jargon juridique excessif
    - [ ] Validé par le DPO

---

### Could

---

[P-14] Traçabilité des erreurs côté mobile (crash reporting)
  Priorité : Could
  Phase     : 4-Production
  Agent(s)  : Frontend Dev, DPO
  US        : En tant qu'éditeur, je veux être informé des crashes de l'application mobile, afin de corriger les bugs qui affectent les joueurs.
  Critères  :
    - [ ] Outil de crash reporting intégré (Sentry, Expo Insights ou équivalent)
    - [ ] Les rapports de crash ne contiennent aucune donnée personnelle (validé par DPO)
    - [ ] Les rapports incluent : version de l'app, OS, version OS, stack trace
    - [ ] Alerting configuré pour les nouveaux types de crash
    - [ ] La collecte de crash reports est mentionnée dans la politique de confidentialité

---

[P-15] Tests de sécurité automatisés (SAST)
  Priorité : Could
  Phase     : 4-Production
  Agent(s)  : Security
  US        : En tant qu'équipe, nous voulons une analyse de sécurité statique automatisée dans la CI, afin de détecter les vulnérabilités au plus tôt.
  Critères  :
    - [ ] Outil SAST intégré dans la CI (ex : Snyk, CodeQL, ou `npm audit`)
    - [ ] `npm audit` s'exécute à chaque build et échoue si des vulnérabilités critiques sont détectées
    - [ ] Les dépendances sont mises à jour régulièrement (Dependabot ou équivalent)
    - [ ] Les faux positifs sont documentés et justifiés

---

### Won't (hors scope — documenté pour éviter les dérives)

---

[WNT-01] Compte utilisateur et authentification
  Priorité : Won't
  Phase     : 4-Production
  Agent(s)  : N/A
  US        : En tant que joueur, je veux créer un compte pour sauvegarder ma progression en ligne.
  Critères  :
    - Note : Hors scope. L'application est délibérément sans compte obligatoire. La création de comptes introduirait des obligations RGPD complexes (droits d'accès, d'effacement, etc.) incompatibles avec le positionnement de l'app. Ce sujet peut être réouvert pour une version future avec une analyse RGPD complète.

---

[WNT-02] Publicité in-app
  Priorité : Won't
  Phase     : 4-Production
  Agent(s)  : N/A
  US        : En tant qu'éditeur, je veux afficher de la publicité pour monétiser l'application.
  Critères  :
    - Note : Hors scope. Le modèle de WikiHop est délibérément sans publicité, conformément aux valeurs du projet (cf. context.md). La publicité introduirait des trackers et violerait la promesse RGPD de l'app.

---

[WNT-03] Multijoueur en temps réel (race)
  Priorité : Won't
  Phase     : 4-Production
  Agent(s)  : N/A
  US        : En tant que joueur, je veux jouer contre un autre joueur en temps réel.
  Critères  :
    - Note : Identifié dans le context.md comme "Phase 4 (futur)" mais hors scope du backlog actuel. Nécessiterait WebSockets, infrastructure de matchmaking, gestion de pseudos — complexité disproportionnée par rapport à la valeur MVP.

---

[WNT-04] Notifications push
  Priorité : Won't
  Phase     : 4-Production
  Agent(s)  : N/A
  US        : En tant que joueur, je veux recevoir une notification quotidienne pour m'inviter à jouer le défi du jour.
  Critères  :
    - Note : Hors scope en phase initiale. Les notifications push nécessitent une permission utilisateur, un service de push (Expo Notifications + FCM/APNs), et un backend dédié. La valeur ne justifie pas la complexité au lancement.

---

## Récapitulatif par phase

| Phase | Items Must | Items Should | Items Could | Total |
|-------|-----------|-------------|-------------|-------|
| 1-Fondations | 10 | 2 | 0 | 12 |
| 2-MVP | 9 | 4 | 1 | 14 |
| 3-Features | 4 | 3 | 2 | 9 |
| 4-Production | 9 | 4 | 2 | 15 |
| Won't | — | — | — | 4 |
| **Total** | **32** | **13** | **5** | **54** |

---

## Récapitulatif par agent

| Agent | Items |
|-------|-------|
| Tech Lead | F-01, F-02, F-03, F-04, F-05, F-06, F-07, F-08, F-09, F-10, F-12, P-06, P-12 |
| Frontend Dev | F-04, M-01, M-03, M-04, M-05, M-06, M-07, M-08, M-10, M-11, M-12, M-13, M-14, F3-02, F3-03, F3-04, F3-05, F3-06, F3-08, F3-09, P-07, P-08, P-12, P-13, P-14 |
| Backend Dev | F-05, F-06, F-11, M-02, M-08, M-12, F3-01, F3-05, P-03, P-05, P-06, P-09 |
| UX/UI | M-01, M-06, M-13, M-14, F3-01, F3-02, F3-04, F3-05, F3-06, F3-08, F3-09 |
| QA | F-08, M-09, F3-07, P-05, P-11 |
| Security | P-02, P-03, P-04, P-15 |
| DPO | F3-04, F3-06, P-01, P-10, P-13, P-14 |

---

*Backlog généré par Gauderic, PM WikiHop — 2026-02-28*
