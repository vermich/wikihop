# ADR-011 : Infrastructure Phase 5 — Cloud Run / Cloud SQL + Migration Firebase Crashlytics

## Statut
Proposé

## Contexte

WikiHop entre en Phase 5. Deux décisions d'infrastructure sont à prendre conjointement car elles partagent la même contrainte structurante : la centralisation sur l'écosystème Google Workspace du Client.

**Situation actuelle — Backend**

Le backend Fastify est dockerisé (Dockerfile présent) et tourne uniquement en local via Docker Compose. La CI/CD GitHub Actions est opérationnelle (ADR-004, story P-06 done) : lint, typecheck, tests automatisés sur chaque PR. L'endpoint `/health` est implémenté (`apps/backend/src/routes/health.route.ts`). Aucun déploiement cloud n'est configuré à ce jour.

La story P-09 (monitoring) a quatre critères non encore implémentés : Logtail, Uptime Robot, alerting, dashboard. Ces critères reposaient sur des outils tiers qui peuvent être remplacés nativement par la stack Google Cloud.

**Situation actuelle — Crash reporting mobile**

`@sentry/react-native` est intégré dans `apps/mobile` (story P-14 done) : initialisation dans `App.tsx`, DSN via secret EAS `EXPO_PUBLIC_SENTRY_DSN`. La DPO (Maïté) a validé P-14 avec la contrainte explicite de **stockage EU des données**. `AboutScreen.tsx` et les 8 fichiers i18n (`fr`, `en`, `es`, `de`, `pt`, `it`, `nl`, `pl`) mentionnent "Sentry" par son nom. Le projet Sentry dashboard (DSN, alerting) n'a pas encore été créé côté Client — c'était un prérequis listé dans P-18.

---

## Décision

### Décision 1 — Déploiement backend : Google Cloud Run + Cloud SQL

Le backend Fastify est déployé sur **Google Cloud Run** (région `europe-west1`). La base de données PostgreSQL est hébergée sur **Google Cloud SQL** (PostgreSQL 15, région `europe-west1`).

**Connexion Cloud Run → Cloud SQL**

La connexion s'effectue via le **Cloud SQL Auth Proxy** intégré comme sidecar dans Cloud Run (annotation `run.googleapis.com/cloudsql-instances`). Ce mode est retenu face à la connexion directe SSL pour les raisons suivantes :
- Rotation automatique des certificats TLS sans intervention
- Authentification via IAM Service Account (pas de credentials réseau à gérer)
- La connexion directe SSL requiert un CA certificate managé manuellement et une IP publique Cloud SQL exposée

**Variables d'environnement et secrets**

Les secrets applicatifs (`DATABASE_URL`, `NODE_ENV`, futures clés API) sont stockés dans **Google Secret Manager** et injectés dans Cloud Run au démarrage du conteneur. Ce choix est cohérent avec la décision P-04 (gestion des secrets via Secret Manager). Aucun secret n'est stocké dans les variables d'environnement du dépôt GitHub.

**Impact sur la CI/CD GitHub Actions**

Un job de déploiement est ajouté au workflow existant, déclenché uniquement sur merge vers `main` :

```
jobs:
  deploy-backend:
    needs: [ci-success]
    if: github.ref == 'refs/heads/main'
    steps:
      - Authenticate to Google Cloud (Workload Identity Federation)
      - Build & push image to Artifact Registry
      - gcloud run deploy wikihop-backend --image ...
```

L'authentification GitHub → GCP utilise **Workload Identity Federation** (OIDC), sans clé de service account JSON stockée dans les secrets GitHub — plus sécurisé et aligné avec les recommandations GCP actuelles.

**Monitoring — remplacement des outils tiers P-09**

Les quatre critères non implémentés de P-09 (Logtail, Uptime Robot, alerting, dashboard) sont couverts nativement par la stack Google Cloud :

| Critère P-09 (initial) | Remplacement GCP |
|------------------------|-----------------|
| Logtail (log shipping) | Cloud Logging — Pino produit du JSON structuré, natif Cloud Run sans agent |
| Uptime Robot (health check) | Cloud Monitoring Uptime Check sur `/health` |
| Alerting e-mail | Cloud Monitoring Alerting Policies (notification e-mail ou PagerDuty) |
| Dashboard métriques | Cloud Monitoring Dashboard (latence, error rate, instances actives) |

Ce remplacement est une conséquence directe du choix Cloud Run et ne requiert pas de facturation additionnelle au niveau actuel de trafic WikiHop (tier gratuit Cloud Monitoring suffisant pour la Phase 5).

---

### Décision 2 — Migration crash reporting : Sentry → Firebase Crashlytics

Le SDK `@sentry/react-native` est remplacé par `@react-native-firebase/crashlytics` dans `apps/mobile`.

**Justification**

- Centralisation sur Google Workspace (cohérence avec la Décision 1)
- `@react-native-firebase/crashlytics` est le SDK React Native le plus mature pour Firebase — maintenance active, compatibilité documentée avec Expo SDK 52
- Firebase Crashlytics est gratuit (plan Spark) pour les fonctionnalités de crash reporting
- Le projet Sentry dashboard n'ayant pas encore été créé côté Client, le coût de migration est minimal : aucune configuration Sentry à défaire, aucun historique de crashes à migrer

**Compatibilité Expo SDK 52 — managed workflow**

`@react-native-firebase` nécessite `google-services.json` (Android) et `GoogleService-Info.plist` (iOS). Ces fichiers sont compatibles avec le **managed workflow Expo** via :
- Le plugin `@react-native-firebase/app` déclaré dans `app.json` (`plugins` array)
- `expo-build-properties` pour configurer les options Gradle/CocoaPods requises par Firebase
- Aucun éjection vers bare workflow requis

Les builds EAS génèrent le code natif à la volée avec les plugins Expo — cette architecture est inchangée.

**Périmètre de la migration**

La migration est limitée à `apps/mobile`. Le backend (`apps/backend`) n'est pas concerné : il utilise Pino pour les logs structurés, qui seront routés vers Cloud Logging (Décision 1).

Fichiers impactés :
- `apps/mobile/package.json` — remplacement `@sentry/react-native` par `@react-native-firebase/app` + `@react-native-firebase/crashlytics`
- `apps/mobile/app.json` — ajout des plugins Firebase
- `apps/mobile/App.tsx` — remplacement de l'initialisation Sentry par Firebase Crashlytics
- `apps/mobile/src/screens/AboutScreen.tsx` — retrait de la mention "Sentry"
- `apps/mobile/src/i18n/locales/{fr,en,es,de,pt,it,nl,pl}.json` — retrait des 8 mentions "Sentry"
- Secrets EAS — suppression de `EXPO_PUBLIC_SENTRY_DSN`, ajout des fichiers `google-services.json` / `GoogleService-Info.plist` via EAS secrets ou assets

---

## Conséquences positives

- Infrastructure entièrement sur Google Cloud : une seule console, une seule facturation, IAM unifié
- Scale-to-zero Cloud Run : coût nul en dehors des requêtes (adapté au trafic actuel de WikiHop)
- Cloud SQL managé : backups automatiques, failover, compatibilité exacte PostgreSQL 15 avec l'environnement local Docker
- Pino JSON → Cloud Logging : zéro configuration de log shipping, les logs sont directement interrogeables et filtrables
- Cloud Monitoring remplace deux outils tiers (Logtail + Uptime Robot) sans surcoût
- Firebase Crashlytics : SDK mature, console Google, coût zéro sur plan Spark
- Migration Sentry → Firebase à coût minimal (projet Sentry jamais configuré)

## Conséquences négatives

- **Vendor lock-in Google Cloud** accru : Cloud Run, Cloud SQL, Secret Manager, Cloud Monitoring, Firebase sont tous liés à GCP. Une migration future vers un autre cloud sera coûteuse.
- **Cloud SQL Auth Proxy** ajoute un composant sidecar dans Cloud Run — légère complexité opérationnelle, mais sans risque pour le niveau de trafic de WikiHop.
- **Workload Identity Federation** demande une configuration initiale GCP non triviale (Service Account, binding IAM, OIDC provider) — à documenter dans le runbook de déploiement.
- **Firebase Crashlytics — résidence EU non garantie sur plan Spark** : voir section "Conditions et dépendances". C'est le risque principal de la Décision 2.
- **8 fichiers i18n à mettre à jour** pour retirer la mention "Sentry" — charge de travail mécanique mais non nulle pour Laurent.

## Alternatives considérées

### Décision 1 — Hébergement backend

- **Railway / Render** — déploiement Docker simplifié, expérience développeur supérieure, mais facturation à la minute sans scale-to-zero aussi efficace. Écartés : le Client souhaite rester sur Google Workspace et Railway/Render ne s'intègrent pas à GCP IAM.
- **Google Kubernetes Engine (GKE)** — puissant mais sur-dimensionné pour un backend à faible trafic mono-service. Complexité opérationnelle injustifiée en Phase 5.
- **VPS (GCE Compute Engine ou Hetzner)** — contrôle total, mais gestion manuelle du scaling, des certificats TLS, des mises à jour OS. Coût opérationnel élevé pour une équipe de développement.
- **Connexion Cloud SQL directe SSL** — écarté au profit du Cloud SQL Auth Proxy (voir justification dans la section Décision).
- **Logtail + Uptime Robot maintenus** — écarté : ces outils deviennent redondants dès lors que Cloud Run + Cloud Monitoring sont en place. Maintenir les deux augmenterait les coûts et la surface de configuration sans bénéfice.

### Décision 2 — Crash reporting

- **Maintien de Sentry** — valide techniquement. Écarté parce que : (a) le projet Sentry n'a jamais été configuré côté Client, (b) Sentry est un service tiers supplémentaire hors écosystème Google, (c) la résidence EU sur Sentry est disponible sur le plan Team (payant) — même contrainte financière que Firebase Blaze. À iso-coût, Firebase offre la centralisation Google en plus.
- **Bugsnag** — SDK React Native mature, résidence EU disponible. Écarté : hors écosystème Google, coût non négligeable, aucune valeur ajoutée sur Firebase Crashlytics pour WikiHop.
- **Datadog Mobile RUM** — trop complet et coûteux pour les besoins de crash reporting seul. Écarté.

---

## Conditions et dépendances

### Condition suspensive — Décision 2 (Firebase Crashlytics)

**Firebase Crashlytics stocke les données de crash aux États-Unis par défaut.** La résidence EU des données Firebase est disponible uniquement sur le **plan Blaze (payant)**. La DPO Maïté a validé P-14 avec la contrainte explicite de stockage EU.

**La migration Firebase Crashlytics ne peut être lancée qu'après :**

1. Confirmation par la DPO (Maïté) que l'une des options suivantes est acceptable :
   - Activation du plan Firebase Blaze avec EU data residency
   - Ou levée de la contrainte EU pour les données de crash anonymisées (données techniques sans PII)
2. Validation écrite de Maïté dans le fichier story correspondant

**Tant que cette confirmation n'est pas obtenue, le SDK `@sentry/react-native` reste en place.** Le projet Sentry devra être configuré côté Client (DSN, alerting) comme prévu dans P-18.

### Prérequis Client — Décision 1 (Cloud Run / Cloud SQL)

Avant que Julien (Backend Dev) puisse implémenter le déploiement :

1. **Projet GCP créé** avec le compte Google Workspace du Client
2. **APIs activées** : Cloud Run, Cloud SQL, Artifact Registry, Secret Manager, Cloud Monitoring
3. **Service Account** créé avec les rôles : `roles/run.admin`, `roles/cloudsql.client`, `roles/secretmanager.secretAccessor`
4. **Workload Identity Pool** configuré pour le dépôt GitHub `vermich/wikihop`
5. **Instance Cloud SQL** PostgreSQL 15 créée en `europe-west1`

Ces prérequis sont à la charge du Client — l'équipe technique ne dispose pas des accès GCP pour les configurer.
