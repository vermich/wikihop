# Conventions Git — WikiHop

> Document de référence pour tous les agents. Toute contribution au projet doit respecter ces règles.
> Tech Lead (Maxime) peut rejeter une PR si ces conventions ne sont pas respectées.

---

## Branches

### Branches permanentes

| Branche | Rôle | Protection |
|---------|------|-----------|
| `main` | Production stable | Push direct interdit — PR obligatoire depuis `develop` |
| `develop` | Intégration continue | Branch protection active — CI doit passer |

### Branches de travail

Toutes les branches de travail sont créées depuis `develop` et ciblées vers `develop`.

| Pattern | Utilisation | Exemple |
|---------|------------|---------|
| `feat/[agent]-[feature]` | Nouvelle fonctionnalité | `feat/frontend-game-screen` |
| `fix/[description]` | Correction de bug | `fix/session-timer-reset` |
| `test/[description]` | Ajout de tests uniquement | `test/article-service-coverage` |
| `docs/[description]` | Documentation uniquement | `docs/api-contracts` |
| `refactor/[description]` | Refactoring sans changement fonctionnel | `refactor/store-architecture` |
| `chore/[description]` | Maintenance (CI, dépendances) | `chore/update-eslint` |

**Règles de nommage :**
- Tout en minuscules
- Tirets pour séparer les mots (kebab-case)
- Pas d'underscores, pas d'espaces
- Longueur maximale : 60 caractères

---

## Conventional Commits

Format obligatoire : `type(scope): description`

```
type(scope): description courte en français ou anglais

Corps optionnel (séparé par une ligne vide).
Explication du pourquoi, pas du quoi.

Closes #42
```

### Types autorisés

| Type | Quand l'utiliser |
|------|-----------------|
| `feat` | Nouvelle fonctionnalité visible par l'utilisateur |
| `fix` | Correction de bug |
| `refactor` | Refactoring sans changement de comportement |
| `test` | Ajout ou modification de tests |
| `docs` | Documentation uniquement |
| `chore` | Maintenance : CI, dépendances, config |
| `perf` | Amélioration de performance |
| `style` | Formatage uniquement (pas de changement logique) |
| `revert` | Annulation d'un commit précédent |

### Scopes courants

| Scope | Zone concernée |
|-------|---------------|
| `mobile` | Application React Native |
| `backend` | API Fastify |
| `shared` | Package types partagés |
| `ci` | GitHub Actions workflows |
| `db` | Base de données, migrations |
| `auth` | Authentification (Phase 4) |
| `api` | Contrats d'API |
| `deps` | Mises à jour de dépendances |

### Exemples valides

```bash
feat(mobile): add article navigation screen
fix(backend): handle Wikipedia 404 response gracefully
refactor(shared): extract GameStatus as separate type
test(backend): add coverage for health route
docs(ci): document EXPO_TOKEN secret requirement
chore(deps): update fastify to v5.1.0
```

### Exemples invalides

```bash
update stuff                     # pas de type
feat: fix the thing              # description trop vague
FEAT(mobile): Add Screen         # majuscules interdites dans le type
feat(mobile): ajout du screen.   # pas de point final sur la description
```

---

## Pull Requests

### Règles impératives

1. **Toujours vers `develop`** — jamais de PR directement vers `main`
2. **Une PR = une story** (ou sous-tâche) — pas de PR fourre-tout
3. **CI doit passer** avant de demander une review
4. **Tech Lead (Maxime) doit approuver** avant tout merge

### Processus complet

```
1. Créer la branche depuis develop
   git checkout develop && git pull
   git checkout -b feat/frontend-game-screen

2. Développer, commiter régulièrement
   git add src/screens/GameScreen.tsx
   git commit -m "feat(mobile): add game screen skeleton"

3. Pousser la branche
   git push -u origin feat/frontend-game-screen

4. Ouvrir la PR sur GitHub
   - Utiliser le template de PR (.github/PULL_REQUEST_TEMPLATE.md)
   - Lier la story (Closes #XX ou référence docs/stories/F-XX.md)
   - Remplir tous les champs du template

5. Attendre que la CI passe

6. Demander la review au Tech Lead

7. Intégrer les corrections demandées en nouveaux commits
   (NE PAS force-push sur une PR en review)

8. Tech Lead approuve → merge dans develop
```

### Taille recommandée des PRs

- Moins de 400 lignes modifiées (hors fichiers générés et lockfiles)
- Si une story nécessite plus, découper en sous-PRs thématiques

### Ce qui bloque l'approbation Tech Lead

- `tsc --noEmit` échoue
- `npm run lint` produit des erreurs
- Tests manquants sur la logique métier nouvelle
- Usage de `any` sans commentaire justificatif
- Console.log oubliés en production
- PR cible `main` au lieu de `develop`

---

## Gestion des branches distantes

```bash
# Synchroniser develop avant de créer une branche
git checkout develop
git pull origin develop

# Supprimer la branche locale après merge
git branch -d feat/mon-feature

# Nettoyer les branches distantes supprimées
git remote prune origin
```

---

## Merge Strategy

- **Squash merge** pour les PRs feature (un commit propre dans `develop`)
- **Merge commit** pour les merges `develop` → `main` (traçabilité des releases)
- **Rebase interdit** sur les branches partagées (`develop`, `main`)

---

## Hotfixes

En cas de bug critique en production :

```
1. Créer fix/ depuis main (exceptionnellement)
   git checkout main && git pull
   git checkout -b fix/critical-session-crash

2. Corriger et tester

3. PR vers main (approuvée par Tech Lead)
4. PR vers develop (cherry-pick ou merge)
```

---

## Références

- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- ADR-004 : Stratégie CI/CD (`docs/adr/ADR-004-cicd-github-actions.md`)
- Template PR : `.github/PULL_REQUEST_TEMPLATE.md`
