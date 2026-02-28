# WikiHop — Context du projet

## Vue d'ensemble

**WikiHop** est un jeu mobile cross-platform (iOS + Android) de type Wikirace. L'objectif est de relier deux articles Wikipedia en naviguant uniquement via les liens internes des pages. Le joueur part d'un article de départ et doit atteindre l'article cible en un minimum de sauts.

L'application est **gratuite**, **sans publicité**, **sans compte obligatoire**. Une page dédiée invite les joueurs à faire un don à Wikipedia.

---

## Principe du jeu

1. Le joueur voit deux articles : **Départ** et **Destination**
2. Il lit l'article de départ et clique sur un lien interne Wikipedia
3. Il navigue de page en page jusqu'à atteindre la destination
4. Son score est basé sur le **nombre de sauts** et le **temps**
5. Il peut partager son résultat

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Mobile | React Native + Expo (TypeScript) |
| Backend | Node.js + Fastify (TypeScript) |
| Base de données | PostgreSQL |
| Wikipedia | Wikipedia REST API (gratuite, sans clé) |
| CI/CD | GitHub Actions |
| Builds mobiles | Expo EAS |
| Tests | Jest + React Native Testing Library |
| Qualité code | ESLint + Prettier + TypeScript strict |

---

## Architecture du dépôt

```
/wikihop (monorepo)
├── CLAUDE.md                    ← Orchestrateur : instructions globales
├── .claude/
│   └── agents/                  ← Profils des agents de l'équipe
│       ├── pm.md
│       ├── tech-lead.md
│       ├── uxui.md
│       ├── frontend.md
│       ├── backend.md
│       ├── qa.md
│       ├── security.md
│       └── dpo.md
├── docs/
│   ├── context.md               ← Ce fichier
│   ├── architecture.md          ← Décisions d'architecture
│   └── adr/                     ← Architecture Decision Records
├── apps/
│   ├── mobile/                  ← Application React Native + Expo
│   │   ├── src/
│   │   │   ├── screens/
│   │   │   ├── components/
│   │   │   ├── services/        ← Appels Wikipedia API
│   │   │   ├── store/           ← State management (Zustand)
│   │   │   └── utils/
│   │   └── __tests__/
│   └── backend/                 ← API Fastify
│       ├── src/
│       │   ├── routes/
│       │   ├── services/
│       │   ├── plugins/
│       │   └── db/
│       └── __tests__/
├── .github/
│   └── workflows/               ← GitHub Actions CI/CD
└── packages/
    └── shared/                  ← Types TypeScript partagés
```

---

## Fonctionnalités

### MVP (Phase 2)
- [ ] Ecran d'accueil : affichage article départ + destination
- [ ] Récupération article Wikipedia (texte + liens internes)
- [ ] Navigation entre articles (scroll + tap sur liens)
- [ ] Compteur de sauts + timer
- [ ] Ecran de victoire avec score

### Phase 3
- [ ] Défi quotidien (même paire d'articles pour tous les joueurs)
- [ ] Historique des parties (stocké localement)
- [ ] Partage du résultat (screenshot ou lien)
- [ ] Page donation Wikipedia
- [ ] Mode "difficile" (articles sans liens communs évidents)

### Phase 4 (futur)
- [ ] Pseudo optionnel pour leaderboard global
- [ ] Multijoueur en temps réel (race)

---

## Règles métier

- Un "saut" = cliquer sur un lien interne Wikipedia vers une autre page
- L'article de départ et de destination sont **imposés** (ou tirés aléatoirement)
- Les liens vers des catégories/portails sont **exclus** (navigation sur les articles uniquement)
- La langue par défaut est le **français**, configurable
- Aucune donnée personnelle collectée en version anonyme

---

## Modèle de données (MVP)

### Session de jeu (locale)
```typescript
interface GameSession {
  id: string;
  startArticle: Article;
  targetArticle: Article;
  path: Article[];       // Articles visités dans l'ordre
  jumps: number;
  startedAt: Date;
  completedAt?: Date;
  status: 'in_progress' | 'won' | 'abandoned';
}

interface Article {
  id: string;
  title: string;
  url: string;
  language: string;
}
```

---

## Wikipedia API

Endpoint de base : `https://fr.wikipedia.org/api/rest_v1/`

| Usage | Endpoint |
|-------|----------|
| Contenu d'un article | `GET /page/summary/{title}` |
| Contenu complet (HTML) | `GET /page/html/{title}` |
| Article aléatoire | `GET /page/random/summary` |
| Liens internes | Extraits du HTML de l'article |

---

## CI/CD Pipeline

```
Push / Pull Request
      │
      ├── Lint (ESLint + TypeScript)
      ├── Tests unitaires (Jest)
      ├── Tests intégration (API)
      │
      └── main branch uniquement
            ├── Build Expo EAS (preview)
            └── Deploy backend (staging)
```

### Branches
- `main` : production stable
- `develop` : intégration continue
- `feat/[agent]-[feature]` : branches de travail des agents
- `fix/[description]` : corrections de bugs

---

## Equipe d'agents

| Agent | Fichier | Rôle principal |
|-------|---------|----------------|
| Orchestrateur | `CLAUDE.md` | Coordination, décisions, délégation |
| PM | `.claude/agents/pm.md` | Backlog, specs, user stories |
| Tech Lead | `.claude/agents/tech-lead.md` | Architecture, revues, ADR |
| UX/UI | `.claude/agents/uxui.md` | Design, composants visuels, accessibilité |
| Frontend Dev | `.claude/agents/frontend.md` | React Native, navigation, UI |
| Backend Dev | `.claude/agents/backend.md` | Fastify API, Wikipedia, PostgreSQL |
| QA | `.claude/agents/qa.md` | Tests, scénarios, rapports de bugs |
| Security | `.claude/agents/security.md` | Audit sécurité, OWASP |
| DPO | `.claude/agents/dpo.md` | RGPD, privacy, conformité |

---

## Conventions

### Commits (Conventional Commits)
```
feat(mobile): add article navigation screen
fix(api): handle Wikipedia 404 response
test(qa): add game session unit tests
docs(dpo): update privacy policy
```

### Nommage
- Composants React : `PascalCase`
- Fichiers : `kebab-case`
- Variables/fonctions : `camelCase`
- Types TypeScript : `PascalCase`
- Constantes : `UPPER_SNAKE_CASE`

---

## RGPD & Vie privée (version anonyme)

- Aucun compte, aucun email collecté
- Les données de jeu restent sur l'appareil (AsyncStorage)
- Aucun tracker publicitaire
- Aucun cookie de traçage
- Les appels API Wikipedia sont directs depuis le client
- Privacy policy obligatoire pour App Store / Play Store

---

## Donation Wikipedia

Une page dédiée dans l'app explique la démarche open source du jeu et invite les joueurs à soutenir la Fondation Wikimedia via le lien officiel : `https://donate.wikimedia.org`
