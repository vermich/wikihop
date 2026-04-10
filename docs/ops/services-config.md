# État de configuration des services externes — WikiHop

**Source de vérité unique pour les services externes.**
Consulter ce fichier EN PREMIER avant de proposer toute action de configuration au Client.
Mettre à jour immédiatement dès qu'un service est configuré (ne pas attendre la fin de la story).

---

## Règle d'optimisation des ressources

> Tout nouveau process (document, checklist, workflow) doit désigner un **point d'entrée unique** et préciser **quand le mettre à jour** (immédiatement après chaque action, pas en fin de story). Un document consulté mais jamais maintenu devient rapidement une source d'erreur plus coûteuse que l'absence de document.

---

## Sentry — Crash Reporting

**Statut : ✅ Entièrement configuré** (P-14, confirmé P-18 — 2026-04-10)

| Élément | Valeur | Où | Story |
|---------|--------|----|-------|
| Projet | `wikihop` | sentry.io | P-14 |
| Organisation slug | `the-regular-guy` | `app.json` › `hooks.sentry.organization` | P-14 |
| Région données | EU (`ingest.de.sentry.io`) | Hébergement Sentry | P-14 (requis DPO) |
| DSN | `https://9ed7cd9...@o451...ingest.de.sentry.io/451...` | EAS env `production` › `EXPO_PUBLIC_SENTRY_DSN` | P-14 |
| Auth Token CI | configuré | GitHub Secret › `SENTRY_AUTH_TOKEN` | P-14 |
| Alerte crash | configurée | sentry.io › Alerts | P-14 |
| Notification email crash | configurée | sentry.io › Alerts | P-14 |

---

## Google Cloud Platform (GCP)

**Statut : ✅ Infrastructure déployée** (P-19 — 2026-04-10)

| Élément | Valeur | Où | Story |
|---------|--------|----|-------|
| Projet | `wikihop-prod` (n° `518388457741`) | console.cloud.google.com | P-19 |
| Région | `europe-west1` | GCP | P-19 |
| Cloud SQL | `wikihop-prod:europe-west1:wikihop-prod` (PostgreSQL 15) | GCP › Cloud SQL | P-19 |
| Service Account | `wikihop-backend@wikihop-prod.iam.gserviceaccount.com` | GCP › IAM | P-19 |
| Workload Identity Pool | `github-actions`, provider `github`, repo `vermich/wikihop` | GCP › IAM › Workload Identity | P-19 |
| Artifact Registry | `europe-west1-docker.pkg.dev/wikihop-prod/wikihop/backend` | GCP › Artifact Registry | P-19 |
| Secret Manager — DATABASE_URL | Connection string PostgreSQL Cloud SQL (socket Unix) | GCP › Secret Manager › `WIKIHOP_DATABASE_URL` | P-19 |
| Secret Manager — NODE_ENV | `production` | GCP › Secret Manager › `WIKIHOP_NODE_ENV` | P-19 |
| Service Cloud Run | `wikihop-backend` (europe-west1) | GCP › Cloud Run | P-19 |

---

## EAS (Expo Application Services)

**Statut : ✅ Configuré** (P-14 + P-19)

| Élément | Valeur | Où | Story |
|---------|--------|----|-------|
| Project ID | `aea912e3-0f65-4fc4-a55f-c82545233670` | `app.json` › `extra.eas.projectId` | setup initial |
| App slug | `wikihop` | `app.json` › `slug` | setup initial |
| Env `production` › `EXPO_PUBLIC_SENTRY_DSN` | DSN Sentry EU | EAS env | P-14 |

---

## GitHub Actions — Secrets

**Statut : ✅ Configuré** (P-14 + P-19)

| Secret | Usage | Story |
|--------|-------|-------|
| `SENTRY_AUTH_TOKEN` | Upload source maps Sentry en CI | P-14 |
| ~~`DEPLOY_SSH_KEY`~~ | ~~SSH VPS~~ — supprimé | P-19 |
| ~~`DEPLOY_HOST`~~ | ~~SSH VPS~~ — supprimé | P-19 |
| ~~`DEPLOY_USER`~~ | ~~SSH VPS~~ — supprimé | P-19 |

> Note : l'authentification GCP se fait via Workload Identity Federation (OIDC) — aucune clé JSON GCP dans les secrets GitHub.

---

## Application mobile — Identifiants

| Élément | Valeur | Où |
|---------|--------|----|
| Nom | `WikiHop` | `app.json` › `name` |
| Slug Expo | `wikihop` | `app.json` › `slug` |
| Bundle ID iOS | non configuré | — (P-07 différé Phase 6) |
| Package Android | `com.wikihop.app` | `app.json` › `android.package` |

---

## Google Play Console

**Statut : ⬜ Non configuré** (requis pour P-08)

| Élément | Valeur | Où | Story |
|---------|--------|----|-------|
| Compte | — | play.google.com/console | P-18 |
| Application | — | — | P-18 |
| Package Name | `com.wikihop.app` (à confirmer) | — | P-18 |

---

## Apple Developer — App Store iOS

**Statut : ⏸ Différé Phase 6** (décision Client 2026-04-10 — financement non disponible)

| Élément | Statut |
|---------|--------|
| Compte Apple Developer | non créé |
| App ID / Bundle ID | non créé |
| App Store Connect | non configuré |

---

## Historique des mises à jour

| Date | Modification |
|------|-------------|
| 2026-04-10 | Création du document — état consolidé P-14 + P-19 |
