# Spec technique — P-06 : Pipeline CI/CD Production

## Contexte

Story : `docs/stories/P-06-cicd-pipeline.md`
Phase 4 — Infrastructure de production.

Le workflow `release.yml` existant déclenche un build EAS en `preview` sur push `main` et contient un job `deploy-backend` vide (placeholder). Cette spec définit le pipeline de release production complet : déclenchement sur tag sémantique, build EAS production, déploiement backend SSH, et procédure de rollback documentée.

EAS est déjà configuré dans `apps/mobile/eas.json` — aucune modification mobile hors workflow.

---

## Périmètre

### Dans scope

- Réécriture de `.github/workflows/release.yml` : déclencheur tag `v*.*.*`, jobs production
- Création de `docs/ops/rollback-procedure.md`
- Documentation des secrets GitHub Actions requis

### Hors scope

- Configuration des secrets sur GitHub (action manuelle du responsable infra)
- Choix de l'hébergeur backend (la spec fournit le squelette SSH générique, à adapter)
- Submission automatique aux stores (EAS Submit — prévu P-XX ultérieur)

---

## Architecture proposée

### Déclencheur

Le workflow doit se déclencher **uniquement sur push de tag** respectant la convention `v*.*.*` (semver). Le déclencheur actuel `push: branches: [main]` est à remplacer.

```yaml
on:
  push:
    tags:
      - 'v*.*.*'
```

Avantage : la release est un acte intentionnel (création de tag), pas un effet de bord d'un push sur `main`.

### Graphe des jobs

```
build-mobile
     └── deploy-backend
               └── notify-failure (si échec)
```

`deploy-backend` dépend de `build-mobile` via `needs: [build-mobile]`. La notification d'échec surveille les deux via `if: failure()`.

### Job `build-mobile`

- Runner : `ubuntu-latest`
- Node.js : `24` (cohérence avec `ci.yml`)
- Action Expo : `expo/expo-github-action@v8`, `eas-version: latest`
- Installation dépendances : `npm ci` depuis `apps/mobile/` (lockfile workspace)
- Commande : `eas build --platform all --profile production --non-interactive`
- Secret requis : `EXPO_TOKEN`

Le profil `production` est déjà défini dans `eas.json` (`distribution: store`, `buildType: app-bundle` pour Android).

### Job `deploy-backend`

```
needs: [build-mobile]
environment: production
```

Séquence d'étapes :

1. Checkout du tag (automatique via `actions/checkout@v4`)
2. Setup Node.js 24
3. Configuration de la clé SSH via `webfactory/ssh-agent@v0` (action standard)
4. `npm ci --omit=dev` dans `apps/backend/`
5. `npm run db:migrate` dans `apps/backend/` — exécute `tsx src/db/migrate.ts` (direction `up` par défaut)
6. Restart du service applicatif

**Paramétrage SSH :**

```yaml
env:
  DEPLOY_HOST: ${{ secrets.DEPLOY_HOST }}
  DEPLOY_USER: ${{ secrets.DEPLOY_USER }}
```

La commande SSH agrège les étapes distantes en un seul appel :

```bash
ssh -o StrictHostKeyChecking=no $DEPLOY_USER@$DEPLOY_HOST \
  "cd /opt/wikihop && \
   git fetch --tags && \
   git checkout ${{ github.ref_name }} && \
   cd apps/backend && \
   npm ci --omit=dev && \
   npm run db:migrate && \
   pm2 restart wikihop-backend"
```

**Note :** `pm2 restart wikihop-backend` est la commande par défaut. Si le serveur utilise `systemctl`, remplacer par `sudo systemctl restart wikihop`. Adapter au gestionnaire de processus effectivement en place sur le serveur de production.

Secrets requis : `DEPLOY_SSH_KEY`, `DEPLOY_HOST`, `DEPLOY_USER`.

### Job `notify-failure`

```yaml
needs: [build-mobile, deploy-backend]
if: failure()
```

Deux options (choisir selon la disponibilité des intégrations) :

**Option A — GitHub Issue automatique** (sans dépendance externe) :

```yaml
- uses: actions/github-script@v7
  with:
    script: |
      github.rest.issues.create({
        owner: context.repo.owner,
        repo: context.repo.repo,
        title: `Release failed: ${context.ref}`,
        body: `Run: ${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`,
        labels: ['bug', 'release']
      })
```

**Option B — Email via `dawidd6/action-send-mail@v3`** : nécessite `MAIL_SERVER`, `MAIL_USERNAME`, `MAIL_PASSWORD` dans les secrets. À privilégier si une adresse d'alerte infra est disponible.

Retenir l'Option A par défaut — zéro dépendance externe, traçabilité dans les Issues.

---

## Secrets GitHub Actions à déclarer

| Secret | Usage | Où créer |
|--------|-------|----------|
| `EXPO_TOKEN` | Authentification EAS CLI | Settings → Secrets → Actions |
| `DEPLOY_SSH_KEY` | Clé privée SSH pour le serveur de production | idem |
| `DEPLOY_HOST` | IP ou hostname du serveur | idem |
| `DEPLOY_USER` | Utilisateur SSH sur le serveur | idem |

Ces secrets doivent être déclarés dans l'**environment `production`** GitHub Actions (Settings → Environments → production) pour bénéficier des règles de protection (reviewers requis, délai, etc.).

---

## Fichier à créer : `docs/ops/rollback-procedure.md`

Voir section dédiée ci-dessous. Julien crée ce fichier en même temps que le workflow.

---

## TDD — fonctions pures et hooks à tester en premier

Aucune logique métier n'est introduite par cette story. Les jobs GitHub Actions ne sont pas testables unitairement. La validation se fait par exécution réelle du workflow sur un tag de test (`v0.0.1-test`).

**Critère de validation fonctionnel :**
- Créer un tag `v0.0.1-rc` sur `develop` (pas `main`) pour valider le déclencheur sans déclencher la chaîne complète. Observer que les jobs apparaissent dans l'onglet Actions.
- Validation complète uniquement sur tag final avec secrets configurés.

---

## Critères de qualité (code review)

- [ ] Déclencheur `push.tags: ['v*.*.*']` — pas de déclencheur `branches`
- [ ] `deploy-backend` a bien `needs: [build-mobile]`
- [ ] `notify-failure` a bien `if: failure()`
- [ ] Aucune valeur de secret en dur dans le YAML — uniquement `${{ secrets.XXX }}`
- [ ] `npm ci --omit=dev` (pas `--production` qui est l'ancienne syntaxe npm v6)
- [ ] `npm run db:migrate` est bien appelé avant le restart du service
- [ ] Node.js version `24` cohérent avec `ci.yml`
- [ ] `docs/ops/rollback-procedure.md` créé et versionné dans le même commit

---

## Points de vigilance

1. **`StrictHostKeyChecking=no`** : acceptable en CI car l'host est un secret connu. Alternativement, pré-peupler `known_hosts` via `ssh-keyscan` pour plus de rigueur.
2. **Migrations irréversibles** : `npm run db:migrate` applique toutes les migrations pending en `up`. Si une migration ajoute une colonne `NOT NULL` sans valeur par défaut, le rollback `migrate:down` peut échouer si des données ont été insérées. Documenter les migrations destructives dans `rollback-procedure.md`.
3. **`pm2 restart` vs `reload`** : `restart` tue le process puis le relance (quelques secondes de downtime). `pm2 reload` fait un graceful reload zero-downtime. Préférer `reload` si le backend gère des connexions longues.
4. **Concurrence de déploiements** : si deux tags sont poussés rapidement, deux runs peuvent se chevaucher. Ajouter `concurrency: group: production-deploy / cancel-in-progress: false` pour mettre en file d'attente (pas annuler).
5. **Expo build time** : un build EAS production prend 10-20 min. Le job `deploy-backend` attendra ce temps. Acceptable pour une release, pas pour un hotfix. Envisager un workflow séparé `hotfix.yml` qui ne déclenche que `deploy-backend` pour les correctifs urgents.

---

## Branche

`feat/julien-P06-cicd`
