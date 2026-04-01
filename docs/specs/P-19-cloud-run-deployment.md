# Specs techniques — P-19 : Déploiement backend Cloud Run + Cloud SQL

**Destinataire :** Julien (Backend Dev)
**Story :** docs/stories/P-19-cloud-run-deployment.md
**ADR de référence :** ADR-011 (Décision 1 — Cloud Run / Cloud SQL)
**Date de rédaction :** 2026-04-01

---

## 1. Contexte

Le backend Fastify tourne actuellement uniquement en local via Docker Compose. Le release workflow GitHub Actions (`release.yml`) déployait via SSH + PM2 vers un VPS — ce job est remplacé par un déploiement Cloud Run. L'ADR-011 (Décision 1) a acté : Cloud Run (europe-west1), Cloud SQL PostgreSQL 15, authentification GCP via Workload Identity Federation (OIDC), secrets via Secret Manager.

Infrastructure GCP déjà provisionnée par le Client :
- Project ID : `wikihop-prod` / Project Number : `518388457741`
- Cloud SQL connection name : `wikihop-prod:europe-west1:wikihop-prod`
- Service Account : `wikihop-backend@wikihop-prod.iam.gserviceaccount.com`
- Workload Identity Pool : `github-actions`, repo autorisé : `vermich/wikihop`
- Région cible : `europe-west1`

**Action Client requise avant validation CI :** le Client doit fournir le `PROVIDER_ID` du Workload Identity provider. Ce paramètre est visible dans Console GCP > IAM & Admin > Workload Identity Federation > pool `github-actions` > onglet "Providers". Il a la forme d'un identifiant court (ex : `github`). Sans ce `PROVIDER_ID`, le champ `workload_identity_provider` dans le workflow sera incomplet et l'authentification GCP échouera.

---

## 2. Périmètre

**Dans scope :**
- Dockerfile multi-stage à créer (`apps/backend/Dockerfile`)
- `.dockerignore` à créer à la racine du monorepo
- Modification du script `start` dans `apps/backend/package.json`
- Remplacement du job `deploy-backend` dans `.github/workflows/release.yml`
- Documentation des secrets à créer dans Secret Manager (action Client, pas Julien)

**Hors scope :**
- Provisionnement de l'infrastructure GCP (Client)
- Création des secrets dans Secret Manager (Client)
- Fourniture du `PROVIDER_ID` Workload Identity (Client)
- Migration Firebase Crashlytics (ADR-011 Décision 2 — suspendue en attente avis DPO)
- Configuration Cloud Monitoring / Uptime Check (hors P-19)

---

## 3. Fichiers à créer / modifier

### 3.1 `.dockerignore` (à créer à la racine du monorepo)

Ce fichier doit exister à la racine car le build Docker se lance depuis la racine (voir section 3.2).

```
node_modules
.git
apps/mobile
*.md
.env*
coverage
dist
.DS_Store
```

**Explication des exclusions :**
- `apps/mobile` : inutile dans l'image backend, réduit significativement le build context Docker
- `dist` : généré par le build stage, ne pas copier la version locale
- `.env*` : jamais dans une image Docker — les variables viennent de Secret Manager

---

### 3.2 `apps/backend/Dockerfile` (à créer)

Le Dockerfile utilise un build **multi-stage** pour produire une image de production minimale.

**Point critique — monorepo :** Le package `@wikihop/shared` est référencé comme workspace (`"@wikihop/shared": "*"` dans `package.json`). La résolution npm workspaces nécessite l'accès à `packages/shared/` au moment du build. Le Dockerfile doit donc être **buildé depuis la racine du monorepo**, pas depuis `apps/backend/`.

```dockerfile
# ─────────────────────────────────────────────────────────────
# Stage 1 : BUILD
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Copier les manifestes du monorepo en premier (cache Docker optimal)
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/

# Installer toutes les dépendances (dev incluses — nécessaires pour tsc)
RUN npm ci --workspace=apps/backend --workspace=packages/shared --include-workspace-root

# Copier les sources
COPY packages/shared/ ./packages/shared/
COPY apps/backend/ ./apps/backend/

# Compiler le backend (outDir = apps/backend/dist)
WORKDIR /app/apps/backend
RUN npm run build

# ─────────────────────────────────────────────────────────────
# Stage 2 : PRODUCTION
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Copier les manifestes
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/

# Installer les dépendances de production uniquement
RUN npm ci --workspace=apps/backend --workspace=packages/shared --include-workspace-root --omit=dev

# Copier le build compilé
COPY --from=build /app/apps/backend/dist ./apps/backend/dist

# Copier les sources shared compilées (si shared a un build step — sinon juste les types)
# Note : @wikihop/shared ne contient que des types TypeScript purs (interfaces, types)
# sans code runtime. Les imports sont résolus à la compilation ; l'image production
# n'a pas besoin du source .ts de shared, uniquement du dist du backend.
COPY --from=build /app/packages/shared/ ./packages/shared/

# Cloud Run injecte PORT automatiquement — env.ts le lit via process.env.PORT
# Le défaut dans env.ts est 3000, aligné avec le port exposé ici.
EXPOSE 3000

# Pas de --env-file : les variables sont injectées par Cloud Run depuis Secret Manager
CMD ["node", "apps/backend/dist/server.js"]
```

**Point de vigilance — `packages/shared` :**
Vérifier si `packages/shared` a un `tsconfig.json` avec compilation propre ou si ce sont des fichiers TypeScript purs importés directement via `ts-jest` / path aliases. Si `@wikihop/shared` est résolu via le champ `"main"` dans son `package.json`, Julien doit s'assurer que ce champ pointe vers un fichier `.js` valide en production (ou vers les `.d.ts` + `.js` compilés). Si ce n'est pas le cas, ajouter un `npm run build` dans `packages/shared` avant le build du backend.

**Commande de build locale pour tester :**
```bash
# Depuis la racine du monorepo
docker build -f apps/backend/Dockerfile -t wikihop-backend:local .
docker run --rm -e DATABASE_URL="postgresql://test:test@localhost/test" -e PORT=3000 -p 3000:3000 wikihop-backend:local
```

---

### 3.3 `apps/backend/package.json` — modification du script `start`

**Changement unique et minimal :**

```json
// Avant
"start": "node --env-file=.env dist/server.js"

// Après
"start": "node dist/server.js"
```

**Justification :** Le flag `--env-file` de Node.js charge un fichier `.env` depuis le système de fichiers local. Sur Cloud Run, aucun fichier `.env` n'est présent — les variables sont injectées directement dans `process.env` par Cloud Run depuis Secret Manager. Supprimer `--env-file` rend le script compatible à la fois avec Cloud Run (production) et les environnements locaux où les variables sont déjà dans l'environnement shell.

**Note sur le script `dev` :** `"dev": "tsx watch --env-file=.env src/server.ts"` — le `--env-file` sur `dev` est conservé, il sert uniquement en développement local avec tsx.

---

### 3.4 Secrets à créer dans Secret Manager GCP (action Client)

Julien **ne crée pas** ces secrets. Il les documente ici pour que le Client puisse les créer avant la première exécution du workflow.

Les secrets doivent être créés dans le projet `wikihop-prod`, région `europe-west1` :

| Nom du secret GCP | Valeur | Description |
|-------------------|--------|-------------|
| `WIKIHOP_DATABASE_URL` | `postgresql://USER:PASSWORD@localhost/wikihop?host=/cloudsql/wikihop-prod:europe-west1:wikihop-prod` | Connection string PostgreSQL via Cloud SQL Auth Proxy sidecar (socket Unix) |
| `WIKIHOP_NODE_ENV` | `production` | Valeur injectée comme `NODE_ENV` dans le conteneur |

**Format de la DATABASE_URL — explication :**
Avec l'Auth Proxy sidecar de Cloud Run, la connexion PostgreSQL transite par un socket Unix, pas TCP. La librairie `pg` supporte ce mode via le paramètre `host` dans la query string. La variable `DATABASE_URL` a la forme :
```
postgresql://USER:PASSWORD@localhost/wikihop?host=/cloudsql/wikihop-prod:europe-west1:wikihop-prod
```
- `USER` et `PASSWORD` : credentials du user PostgreSQL sur Cloud SQL
- `localhost` dans l'URL est un placeholder — c'est le paramètre `?host=` qui prime sur `pg`
- `/cloudsql/wikihop-prod:europe-west1:wikihop-prod` : chemin du socket Unix injecté par le sidecar Auth Proxy

**Point de vigilance — validation Zod dans `env.ts` :**
Le module `env.ts` valide `DATABASE_URL` via `z.string().url()`. La chaîne `postgresql://USER:PASSWORD@localhost/wikihop?host=/cloudsql/...` est une URL valide au sens RFC 3986 — la validation Zod passera. Julien doit tester ce point localement avec la vraie connection string avant de pousser.

**Comment créer les secrets (commandes gcloud à exécuter par le Client) :**
```bash
echo -n "postgresql://USER:PASSWORD@localhost/wikihop?host=/cloudsql/wikihop-prod:europe-west1:wikihop-prod" \
  | gcloud secrets create WIKIHOP_DATABASE_URL \
    --data-file=- \
    --project=wikihop-prod \
    --replication-policy=user-managed \
    --locations=europe-west1

echo -n "production" \
  | gcloud secrets create WIKIHOP_NODE_ENV \
    --data-file=- \
    --project=wikihop-prod \
    --replication-policy=user-managed \
    --locations=europe-west1
```

---

### 3.5 `.github/workflows/release.yml` — remplacement du job `deploy-backend`

Le déclencheur `on: push: tags: v*.*.*` est **conservé** — cohérent avec le workflow existant et le processus de release GitFlow du projet.

Le job `deploy-backend` SSH + PM2 est intégralement remplacé. Le job `build-mobile` et le job `notify-failure` sont inchangés.

**Nouveau job `deploy-backend` complet :**

```yaml
deploy-backend:
  name: Deploy Backend to Cloud Run
  needs: [build-mobile]
  runs-on: ubuntu-latest
  environment: production
  concurrency:
    group: production-deploy
    cancel-in-progress: false
  permissions:
    contents: read
    id-token: write  # Requis pour Workload Identity Federation (OIDC)
  steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Authenticate to Google Cloud
      uses: google-github-actions/auth@v2
      with:
        workload_identity_provider: projects/518388457741/locations/global/workloadIdentityPools/github-actions/providers/[PROVIDER_ID]
        service_account: wikihop-backend@wikihop-prod.iam.gserviceaccount.com

    - name: Set up Cloud SDK
      uses: google-github-actions/setup-gcloud@v2

    - name: Configure Docker for Artifact Registry
      run: gcloud auth configure-docker europe-west1-docker.pkg.dev --quiet

    - name: Build Docker image
      run: |
        docker build \
          -f apps/backend/Dockerfile \
          -t europe-west1-docker.pkg.dev/wikihop-prod/wikihop/backend:${{ github.sha }} \
          -t europe-west1-docker.pkg.dev/wikihop-prod/wikihop/backend:latest \
          .

    - name: Push to Artifact Registry
      run: |
        docker push europe-west1-docker.pkg.dev/wikihop-prod/wikihop/backend:${{ github.sha }}
        docker push europe-west1-docker.pkg.dev/wikihop-prod/wikihop/backend:latest

    - name: Deploy to Cloud Run
      run: |
        gcloud run deploy wikihop-backend \
          --image europe-west1-docker.pkg.dev/wikihop-prod/wikihop/backend:${{ github.sha }} \
          --region europe-west1 \
          --platform managed \
          --add-cloudsql-instances wikihop-prod:europe-west1:wikihop-prod \
          --set-secrets DATABASE_URL=WIKIHOP_DATABASE_URL:latest,NODE_ENV=WIKIHOP_NODE_ENV:latest \
          --allow-unauthenticated \
          --port 3000 \
          --project wikihop-prod

    - name: Verify health check
      run: |
        SERVICE_URL=$(gcloud run services describe wikihop-backend \
          --region europe-west1 \
          --project wikihop-prod \
          --format 'value(status.url)')
        echo "Service URL: $SERVICE_URL"
        curl --fail --silent --show-error "$SERVICE_URL/health"
        echo "Health check passed"
```

**Placeholder `[PROVIDER_ID]` :** Julien doit remplacer `[PROVIDER_ID]` par la valeur fournie par le Client. Ne pas committer le workflow avec `[PROVIDER_ID]` littéral — le job échouera à l'authentification GCP.

**Secrets GitHub à retirer** (devenus inutiles après le switch Cloud Run) :
- `DEPLOY_SSH_KEY`
- `DEPLOY_HOST`
- `DEPLOY_USER`

Ces secrets ne sont plus référencés dans le workflow mais il est conseillé de les supprimer dans Settings > Secrets and variables > Actions pour maintenir l'inventaire propre. Action à signaler au Client.

---

## 4. Ordre d'implémentation recommandé

1. Créer `.dockerignore` à la racine
2. Modifier `apps/backend/package.json` (script `start`)
3. Créer `apps/backend/Dockerfile`
4. Tester le build Docker en local depuis la racine (commande fournie en section 3.2)
5. Vérifier que `node apps/backend/dist/server.js` démarre sans erreur avec les variables d'env injectées manuellement
6. Attendre la confirmation du `PROVIDER_ID` par le Client
7. Mettre à jour `release.yml` avec le nouveau job `deploy-backend`
8. Ouvrir la PR — le workflow de CI ne déclenchera le déploiement que sur push de tag, pas sur PR

---

## 5. TDD — pas de logique métier dans cette story

Cette story est infrastructure pure (Dockerfile, workflow CI/CD, configuration). Aucune fonction pure ni hook custom n'est introduit. Aucun test unitaire n'est requis.

Validation fonctionnelle : le health check `GET /health` répond 200 sur l'URL publique Cloud Run après déploiement.

---

## 6. Critères de qualité — checklist PR

- [ ] `.dockerignore` présent à la racine
- [ ] `Dockerfile` buildé depuis la racine : `docker build -f apps/backend/Dockerfile .` fonctionne sans erreur
- [ ] `npm run start` dans `apps/backend` ne contient plus `--env-file`
- [ ] Le workflow `release.yml` ne contient plus de références SSH (`webfactory/ssh-agent`, `DEPLOY_SSH_KEY`, `DEPLOY_HOST`, `DEPLOY_USER`)
- [ ] `[PROVIDER_ID]` remplacé par la valeur réelle fournie par le Client (ou ticket ouvert pour blocker le merge si le Client n'a pas encore fourni la valeur)
- [ ] `permissions: id-token: write` présent sur le job `deploy-backend`
- [ ] Aucune clé JSON GCP dans les secrets GitHub — l'auth se fait exclusivement via Workload Identity Federation
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur

---

## 7. Points de vigilance

**1. `packages/shared` en production**
Vérifier le `main` field dans `packages/shared/package.json`. Si `@wikihop/shared` n'a pas de compilation TypeScript propre (pas de `tsconfig.json` + `build` script), le stage production du Dockerfile peut échouer à résoudre les imports. Dans ce cas, ajouter la compilation de `packages/shared` dans le stage build avant `npm run build` du backend.

**2. Connexion socket Unix PostgreSQL**
La connection string avec `?host=/cloudsql/...` est non standard par rapport à l'URL locale. Si `env.ts` rejette la chaîne à la validation Zod, vérifier que la URL est bien formée au sens RFC 3986. Alternative : passer `DATABASE_URL` sous la forme `postgresql://USER:PASSWORD@/wikihop?host=/cloudsql/...` (host vide = socket Unix natif pg).

**3. Migrations base de données**
Le script `db:migrate` n'est **pas** inclus dans le Dockerfile ni dans le workflow de déploiement Cloud Run. Les migrations doivent être jouées manuellement ou via un job séparé avant le déploiement d'une nouvelle version. Cette décision est hors scope P-19 — à traiter dans une story dédiée si besoin. Ne pas ajouter de logique de migration automatique au démarrage du conteneur sans story Tech Lead.

**4. Variable `PORT` sur Cloud Run**
Cloud Run injecte `PORT` automatiquement dans l'environnement du conteneur (valeur `8080` par défaut sur Cloud Run, mais `--port 3000` dans le `gcloud run deploy` force le port exposé à 3000). `env.ts` lit `PORT` depuis `process.env` avec défaut 3000 — le comportement est cohérent. Le flag `--port` dans la commande `gcloud run deploy` doit correspondre au port sur lequel le serveur écoute réellement.

**5. Tag Docker `latest`**
Le tag `latest` est poussé en complément du tag `${{ github.sha }}`. Ce choix est délibéré pour faciliter les débogage manuels (`gcloud run services describe`). Le tag `sha` est celui utilisé dans le `gcloud run deploy` pour garantir la traçabilité de la version déployée.

**6. `concurrency: cancel-in-progress: false`**
Conservé du workflow original. Sur Cloud Run, deux déploiements concurrents peuvent coexister sans risque (Cloud Run gère le trafic via revisions), mais `cancel-in-progress: false` garantit que deux releases quasi-simultanées ne s'interrompent pas mutuellement.
