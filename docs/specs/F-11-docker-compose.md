# Spec technique — F-11 : Docker Compose — Environnement local

**Destinataire :** Backend Dev — Julien
**Story :** [F-11](../stories/F-11-docker-compose.md)
**Références ADR :** ADR-002 (PostgreSQL 15+)
**Branche à créer :** `feat/backend-docker-compose`
**PR cible :** `develop`
**Prérequis :** F-05 et F-06 doivent être complétés

---

## Contexte

Les développeurs doivent pouvoir démarrer l'environnement local complet (PostgreSQL) en une seule commande. Docker Compose est l'outil retenu. La V1 du projet n'avait pas de Docker — c'est une nouveauté de la V2.

---

## Périmètre

### Dans le scope de F-11
- `docker-compose.yml` à la racine du monorepo : PostgreSQL 15
- `docker-compose.override.yml` : personnalisations locales (ports custom, volumes)
- `.env.example` à la racine du monorepo avec les variables Docker
- Mise à jour du README avec les instructions de démarrage
- Volume persistant pour les données PostgreSQL en développement

### Hors scope de F-11
- Conteneurisation du backend Fastify (Phase 4)
- Déploiement Docker en production (Phase 4)
- pgAdmin ou outil de visualisation BDD (optionnel, dans override)

---

## Fichiers à créer

```
wikihop/                        ← racine du monorepo
├── docker-compose.yml          ← commité, config de base
├── docker-compose.override.yml ← commité mais ignoré en CI, pour persos locales
└── .env.example                ← variables docker (commité)
```

---

## `docker-compose.yml` — Configuration de base

```yaml
services:
  postgres:
    image: postgres:15-alpine
    container_name: wikihop-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-wikihop}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-wikihop}
      POSTGRES_DB: ${POSTGRES_DB:-wikihop_dev}
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./apps/backend/src/db/migrations:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-wikihop} -d ${POSTGRES_DB:-wikihop_dev}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

volumes:
  postgres_data:
    name: wikihop-postgres-data
```

**Note sur le volume d'init** : le dossier `migrations/` est monté dans `/docker-entrypoint-initdb.d/`. PostgreSQL exécute automatiquement les fichiers `.sql` de ce dossier lors de la première initialisation d'un volume vide. Cela initialise le schéma sans avoir à lancer `npm run db:migrate` manuellement après un `docker compose up`.

---

## `docker-compose.override.yml` — Personnalisations locales

```yaml
# Ce fichier permet les personnalisations locales sans modifier docker-compose.yml.
# Il est commité avec des valeurs par défaut raisonnables.
# Chaque développeur peut le modifier localement — il est dans .gitignore pour
# les versions personnalisées (.override.local.yml).

services:
  postgres:
    environment:
      POSTGRES_USER: wikihop
      POSTGRES_PASSWORD: wikihop_local
      POSTGRES_DB: wikihop_dev

  # Décommenter pour accéder à PostgreSQL via un outil graphique (Adminer)
  # adminer:
  #   image: adminer:latest
  #   restart: unless-stopped
  #   ports:
  #     - "8080:8080"
  #   depends_on:
  #     postgres:
  #       condition: service_healthy
```

---

## `.env.example` à la racine du monorepo

```bash
# Docker Compose — WikiHop
# Copier ce fichier en .env et adapter les valeurs

# PostgreSQL
POSTGRES_USER=wikihop
POSTGRES_PASSWORD=wikihop
POSTGRES_DB=wikihop_dev
POSTGRES_PORT=5432

# URL de connexion pour apps/backend (construite depuis les variables ci-dessus)
# DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}
DATABASE_URL=postgresql://wikihop:wikihop@localhost:5432/wikihop_dev
```

---

## Scripts npm à la racine (`package.json`)

Ajouter dans le `package.json` racine existant :

```json
{
  "scripts": {
    "db:up": "docker compose up postgres -d",
    "db:down": "docker compose down",
    "db:reset": "docker compose down -v && docker compose up postgres -d",
    "db:logs": "docker compose logs postgres -f"
  }
}
```

---

## Mise à jour du `.gitignore` racine

```gitignore
# Docker — surcharges locales (personnalisées par développeur)
docker-compose.override.local.yml

# Données PostgreSQL locales (si pas de volume Docker nommé)
postgres-data/
```

---

## Critères de qualité (checklist PR)

- [ ] `docker compose up -d` démarre PostgreSQL sans erreur
- [ ] `docker compose ps` montre le container `wikihop-postgres` en état `healthy`
- [ ] La `DATABASE_URL` du `.env.example` se connecte au PostgreSQL Docker
- [ ] `npm run db:migrate` (depuis `apps/backend/`) fonctionne avec le PostgreSQL Docker
- [ ] `npm run db:up` et `npm run db:down` fonctionnent depuis la racine
- [ ] `docker-compose.override.yml` est commité mais extensible localement
- [ ] Le README est mis à jour avec les instructions de démarrage

---

## Points de vigilance

1. **Volume nommé** (`wikihop-postgres-data`) : les données sont persistées entre les `docker compose down`/`up`. Pour repartir d'une base vide, utiliser `npm run db:reset` (qui passe `--volumes` à `docker compose down`).

2. **`/docker-entrypoint-initdb.d/`** : fonctionne uniquement à la première initialisation du volume. Si le volume existe déjà, les migrations ne s'exécutent pas. Utiliser `npm run db:migrate` pour les migrations incrémentales.

3. **Ports en conflit** : si le port 5432 est déjà utilisé (PostgreSQL local), modifier `POSTGRES_PORT` dans le `.env` local. La variable `${POSTGRES_PORT:-5432}` dans `docker-compose.yml` utilise 5432 par défaut.

4. **Healthcheck** : le service backend (quand il sera conteneurisé en Phase 4) doit déclarer `depends_on: postgres: condition: service_healthy`. En Phase 1/2, le hook `onReady` de Fastify suffit.

5. **Apple Silicon (M1/M2/M3)** : l'image `postgres:15-alpine` est multi-platform et fonctionne nativement sur ARM64. Pas de configuration supplémentaire nécessaire.
