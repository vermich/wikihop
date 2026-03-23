# Guide — Démarrer un nouveau projet avec l'équipe WikiHop

> Ce guide explique comment réutiliser l'équipe d'agents et la méthodologie WikiHop sur un nouveau projet dans Cursor (Claude Code).

---

## Ce qui est réutilisable tel quel

### Les 8 agents — déjà globaux

Les agents sont stockés dans `~/.claude/agents/` — ce répertoire est **global** à ta machine, pas lié au projet WikiHop. Ils sont déjà disponibles dans n'importe quel projet Cursor.

```
~/.claude/agents/
├── pm-gauderic.md          ← Backlog, stories, suivi
├── tech-lead-maxime.md     ← Architecture, ADR, code review
├── uxui-benjamin.md        ← Design, maquettes, accessibilité
├── frontend-dev.md         ← React Native / web (mobile)
├── backend-dev.md          ← API, base de données
├── qa-halim.md             ← Tests, validation, rapports
├── security-frederic.md    ← Audit OWASP, sécurité
└── dpo-maite.md            ← RGPD, conformité, textes légaux
```

**Ces agents contiennent des références à WikiHop dans leur corps de texte** (exemples, conventions). Ils fonctionnent sur tout projet — les exemples sont illustratifs, pas contraignants. Si tu veux des agents totalement génériques, voir section "Adapter les agents".

### Les settings Claude Code — déjà globaux

`~/.claude/settings.json` contient les permissions pré-approuvées (ls, mv, rm, find, etc.) et la configuration. Rien à faire.

### La mémoire Claude Code — liée au projet

La mémoire dans `~/.claude/projects/[chemin-projet]/memory/` est **spécifique à chaque projet**. Sur un nouveau projet, la mémoire repart de zéro — c'est normal et souhaitable.

---

## Ce qu'il faut créer pour chaque nouveau projet

### 1. `CLAUDE.md` à la racine du projet

C'est **le fichier le plus important**. Il définit le rôle de l'orchestrateur et les règles du projet.

**Option A — Copier et adapter le CLAUDE.md WikiHop**

```bash
cp /Users/vermich/Projets/developpement/wikihop/CLAUDE.md /ton/nouveau/projet/CLAUDE.md
```

Puis adapter les sections suivantes :

| Section | Ce qu'il faut changer |
|---------|----------------------|
| `## Structure du projet` | Adapter les commandes (`npm run dev`, etc.) à ta stack |
| `## Workflow standard` | Retirer UX/UI si pas d'interface, DPO si pas de données perso |
| `## Conventions Git` | Adapter si tu utilises d'autres préfixes de branches |
| Exemples dans les règles | Les exemples sont optionnels, pas les règles |

**Ce qu'il ne faut PAS changer** (ces règles ont prouvé leur valeur) :
- Workflow séquentiel PM → Tech Lead → (UX/UI) → Dev → Review → QA
- TDD ciblé (fonctions pures = TDD strict, composants = alongside)
- Code mort = bloquant
- Specs commitées avant lancement agents dev
- Gate acceptance utilisateur = Client (pas QA seul)

**Option B — CLAUDE.md minimal pour démarrer vite**

Voir le template en annexe de ce document.

### 2. Structure de documentation

```
docs/
├── backlog.md          ← Index des stories (copier le format WikiHop)
├── stories/            ← Stories par phase
│   └── phase-1/
├── adr/                ← Décisions d'architecture
├── context.md          ← Description du projet (stack, architecture)
└── rex.md              ← Retour d'expérience (copier le format WikiHop)
```

**Créer `docs/context.md` en premier** — c'est le fichier que tous les agents lisent pour comprendre le projet.

### 3. Story de bootstrap (optionnelle mais recommandée)

Créer une story F-01 qui couvre la configuration du projet :
- Monorepo init
- TypeScript strict
- ESLint + Prettier
- CI/CD de base

Cela donne une base saine avant d'attaquer les fonctionnalités.

---

## Démarrer un sprint avec Claude Code

### Dans Cursor, ouvrir le nouveau projet

```bash
cursor /ton/nouveau/projet
```

### Première commande

```
/sprint [description de ce qu'on veut construire]
```

Exemple : `/sprint authentification utilisateur avec email et mot de passe`

L'agent PM (Gauderic) va :
1. Lire `docs/context.md` et `docs/backlog.md`
2. Vérifier si des stories couvrent la demande
3. Créer les stories manquantes dans `docs/stories/`
4. Proposer un plan de sprint

L'orchestrateur enchaîne ensuite automatiquement le workflow.

---

## Adapter les agents pour un nouveau projet

Les corps des agents contiennent des références WikiHop (React Native, Fastify, etc.). Pour un projet différent (Next.js, Django, etc.), deux options :

### Option A — Ne pas changer (recommandé pour commencer)

Les agents adaptent leur comportement au projet grâce à `docs/context.md`. Les exemples WikiHop dans les corps d'agents ne les empêchent pas de travailler sur autre chose — ce sont des illustrations du workflow, pas des contraintes technologiques.

### Option B — Créer des agents spécifiques au projet

Si tu veux des agents dédiés à un projet spécifique (ex: une équipe "Projet Alpha"), créer des copies :

```bash
cp ~/.claude/agents/frontend-dev.md ~/.claude/agents/frontend-dev-alpha.md
```

Puis modifier le frontmatter `name:` et le corps pour refléter le nouveau projet.

**Attention** : les agents sont chargés dans Claude Code via leur `name` dans le frontmatter. Si deux agents ont le même nom, le comportement est imprévisible. Utiliser des noms distincts.

---

## Commandes disponibles dans tout projet

La commande `/sprint` est définie dans `~/.claude/commands/sprint.md` — elle est **globale**, disponible dans tout projet Cursor.

Si tu as créé d'autres commandes dans `.claude/commands/` dans WikiHop et que tu veux les réutiliser, les copier dans `~/.claude/commands/` (niveau global).

---

## Checklist de démarrage d'un nouveau projet

```
[ ] Créer le dépôt Git et initialiser la structure de base
[ ] Créer docs/context.md (stack, architecture, objectif du projet)
[ ] Copier et adapter CLAUDE.md depuis WikiHop
[ ] Créer docs/backlog.md vide (copier le header du format WikiHop)
[ ] Créer docs/stories/phase-1/ vide
[ ] Créer docs/rex.md vide (copier le header du format WikiHop)
[ ] Vérifier que les 8 agents sont dans ~/.claude/agents/ (ls ~/.claude/agents/)
[ ] Lancer /sprint [description] pour démarrer
```

---

## Règles de travail à conserver absolument

Ces règles ont été validées sur 4 phases et ~70 stories. Elles s'appliquent à tout projet avec cette équipe.

### Règle 1 — Specs avant code, toujours

```
PM commit → Tech Lead commit → UX/UI commit → DEV commence
```

Jamais l'inverse. Les specs dans le dépôt avant la première ligne de code.

### Règle 2 — TDD ciblé

- **Fonctions pures / hooks / services** → tests écrits AVANT l'implémentation
- **Composants UI** → tests écrits EN MÊME TEMPS que le code

### Règle 3 — Code mort = bloquant en code review

Variable non lue, import non utilisé, ref jamais consultée → la PR ne passe pas.

### Règle 4 — Gate acceptance = Client

Les tests d'acceptance utilisateur (notamment sur device physique) ne peuvent pas être validés par l'équipe technique seule. Le Client est le seul décisionnaire.

### Règle 5 — Classifier les stories par dépendances externes

En début de phase, identifier les stories qui nécessitent un service en production (hébergement, comptes tiers, API keys payantes). Les déplacer en phase suivante si ces dépendances ne sont pas confirmées.

### Règle 6 — Protocole de débogage

Sur tout bug de régression, fiche hypothèse avant chaque tentative. Après 2 échecs, checkpoint obligatoire avant la 3e tentative.

### Règle 7 — Nettoyage branches en fin de phase

```bash
git branch --merged develop | grep -v "develop\|main\|\*" | xargs git branch -d
git branch -r | grep -v "HEAD\|develop\|main" | sed 's/origin\///' | xargs -I{} git push origin --delete {}
```

---

## Annexe — Template CLAUDE.md minimal

```markdown
# Orchestrateur — [NOM DU PROJET]

Tu es l'orchestrateur de l'équipe de développement du projet [NOM].
Lis `docs/context.md` pour comprendre le projet et `docs/backlog.md` pour l'avancement.

## Ton rôle

Tu coordonnes une équipe de 8 agents spécialisés. Tu agis de manière autonome.

**Avant chaque tâche :**
1. Vérifie si une user story couvre la demande dans `docs/stories/`
2. Identifie les agents compétents et leur ordre d'intervention
3. Délègue via l'outil `Agent`
4. Met à jour le statut de la story

## Workflow standard

1. PM → vérifie/crée la story, statut pending → in-progress
2. Tech Lead → ADR si nécessaire, specs techniques
3. UX/UI → maquettes (si écrans concernés)
4. Backend Dev + Frontend Dev → implémentation en parallèle, PR vers develop
5. Tech Lead → code review, approbation PR
6. QA → validation critères d'acceptance
7. Security + DPO → si données ou sécurité concernées
8. PM → story en done

## Règles non négociables

- Specs commitées AVANT lancement des agents dev
- TDD strict pour fonctions pures et hooks
- Code mort = bloquant en code review
- Gate acceptance utilisateur = Client (pas QA seul)
- 8-10 stories max par lot, 15 max par phase

## Conventions Git

- Branches : feat/[agent]-[feature], fix/[description]
- Commits : Conventional Commits (feat:, fix:, docs:, test:, refactor:)
- Toujours PR vers develop, jamais push direct
- main = production stable

## Structure du projet

[Adapter selon la stack]
```

---

*Guide créé le 2026-03-23 — à partir de l'expérience WikiHop (4 phases, ~70 stories, 699 tests).*
