# Plan de mise à l'échelle — WikiHop Backend

Document de référence pour les décisions de scaling en production.
Basé sur les résultats des tests de charge k6 (voir `apps/backend/load-tests/`).

---

## Seuils de déclenchement recommandés

| Indicateur | Seuil d'alerte | Seuil critique | Action |
|------------|---------------|----------------|--------|
| p(95) latence | > 1 500 ms | > 2 000 ms | Scaling horizontal ou vertical |
| Taux d'erreur HTTP | > 0,5 % | > 1 % | Investigation immédiate |
| CPU serveur | > 70 % | > 85 % | Scaling vertical ou horizontal |
| Connexions pool PG | > 8/10 | 10/10 (saturation) | Augmenter `PG_POOL_MAX` ou ajouter un replica |
| Mémoire heap Node.js | > 400 MB | > 600 MB | Scaling vertical ou redémarrage planifié |

---

## Axe vertical — Ressources serveur

### RAM et CPU

- Instance de départ recommandée : 2 vCPU / 2 GB RAM (1 000 req/s environ)
- Passage à 4 vCPU / 4 GB RAM si le p(95) dépasse 1 500 ms en charge soutenue
- Node.js est single-threaded : au-delà de 4 vCPU, préférer le scaling horizontal (cluster ou plusieurs instances)

### Pool PostgreSQL

- Valeur actuelle : `PG_POOL_MAX=10` (défaut dans `apps/backend/src/db/index.ts`)
- Rendre configurable via la variable d'environnement `PG_POOL_MAX`
- Augmenter progressivement : 10 → 20 → 50 selon la charge observée
- Ne pas dépasser `max_connections` de PostgreSQL (défaut : 100 pour PostgreSQL 15)
- Pour 3 instances Node.js avec `PG_POOL_MAX=20` : 60 connexions actives max — prévoir un PgBouncer si > 5 instances

---

## Axe horizontal — Mise à l'échelle des instances

### Cache Redis pour popular-pages

- Situation actuelle : le service `popular-pages` utilise un cache mémoire in-process (invalidé à chaque redémarrage)
- En multi-instances : chaque instance a son propre cache → requêtes Wikipedia redondantes
- Solution : externaliser le cache dans Redis avec le TTL `CACHE_TTL_SECONDS` (défaut : 3 600 s)
- Priorité : haute dès le passage à 2 instances

### Cache mémoire daily_challenges

- Situation actuelle : la route `/api/game/daily` fait une requête SQL à chaque appel
- Le daily challenge ne change qu'une fois par jour par (date, lang)
- Solution : ajouter un cache in-process avec invalidation à minuit UTC, ou externaliser dans Redis
- Ce cache réduit la charge PostgreSQL de ~95 % lors des pics matinaux (1 000 VUs simultanés)
- Priorité : haute avant mise en production

### Nginx en frontal

- Nginx comme reverse proxy devant les instances Node.js :
  - Load balancing round-robin ou least-connections
  - Terminaison TLS (décharge Node.js)
  - Rate limiting au niveau réseau (avant d'atteindre Fastify)
  - Compression gzip/brotli pour les réponses > 1 Ko (si `@fastify/compress` n'est pas suffisant)
- Configuration minimale pour 2 instances :

```nginx
upstream wikihop_backend {
    least_conn;
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    keepalive 32;
}
```

---

## Réduction de la latence Wikipedia

### Pré-calcul random-pair en CRON

- Situation actuelle : `/api/game/random-pair` appelle Wikipedia en temps réel → latence 300-800 ms par requête
- Solution : job CRON toutes les 15 minutes qui pré-calcule N paires (ex. 100) et les stocke en base
- La route tire une paire au hasard depuis le cache DB → latence < 10 ms
- Schéma suggéré :
  ```sql
  CREATE TABLE random_pair_cache (
    id SERIAL PRIMARY KEY,
    lang VARCHAR(5) NOT NULL,
    start_title TEXT NOT NULL,
    target_title TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    used_at TIMESTAMPTZ
  );
  ```
- Priorité : moyenne (améliore le p(95) de ~60 % mais nécessite un scheduler)

### Timeout et circuit breaker Wikipedia

- Timeout actuel : 5 s par appel Wikipedia (via `AbortController`)
- En charge élevée, les timeouts s'accumulent et saturent le pool de connexions sortantes
- Ajouter un circuit breaker (ex. `opossum`) : si 10 % des appels échouent sur 30 s, ouvrir le circuit pendant 60 s et retourner immédiatement une erreur 503
- Priorité : basse en phase initiale, haute en production

---

## Décisions prises

| Décision | Justification |
|----------|---------------|
| Pool PG max=10 en dev/test | Suffisant pour < 200 req/s, configurable via `PG_POOL_MAX` |
| Cache mémoire par défaut | Pas de dépendance Redis en phase 1 — acceptable pour 1 instance |
| Compression `@fastify/compress` activée | Réduit la bande passante de ~70 % sur les réponses JSON Wikipedia |
| Rate limit 60 req/min par IP | Protection contre les abus — désactivable via `RATE_LIMIT_MAX` en test |

---

## Références

- Tests de charge : `apps/backend/load-tests/`
- ADR-010 : choix de k6 comme outil de test de charge
- ADR-002 : stack technique (Node.js, Fastify, PostgreSQL)
- Monitoring : `docs/ops/monitoring-setup.md`
