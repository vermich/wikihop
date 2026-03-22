# ADR-010 — Choix de k6 comme outil de test de charge

| Champ | Valeur |
|-------|--------|
| **ID** | ADR-010 |
| **Date** | 2026-03-22 |
| **Statut** | Accepté |
| **Décideurs** | Maxime (Tech Lead), Julien (Backend Dev) |
| **Story** | P-05 — Tests de performance et de charge |

---

## Contexte

WikiHop nécessite des tests de charge pour valider les performances du backend avant la mise en production (Phase 4). Deux endpoints sont critiques :

- `GET /api/game/random-pair` — appelé à chaque démarrage de partie (100 VUs simultanés comme cible)
- `GET /api/game/daily` — potentiellement sollicité par tous les joueurs actifs au même moment chaque matin (1 000 VUs comme cible)

Il fallait choisir un outil de test de charge adapté à l'écosystème Node.js/TypeScript du projet.

---

## Alternatives évaluées

### k6 (retenu)

**Description :** Outil open source de Grafana Labs. Scripts en JavaScript. Binaire standalone.

**Avantages :**
- Scripts JS natifs — syntaxe familière pour l'équipe Node.js
- Binaire standalone (`brew install k6`) — zéro dépendance npm, pas de pollution du `package.json` de production
- Métriques intégrées riches : percentiles, taux d'erreur, checks personnalisés
- Seuils (`thresholds`) configurables directement dans le script — CI-friendly (exit code non-zéro si dépassé)
- Support des scénarios complexes (rampe, plateau, descente) via `stages`
- Variable d'environnement `__ENV` pour surcharger l'URL de base (staging, production)
- Export JSON des résultats pour archivage

**Inconvénients :**
- Scripts en JS (pas TypeScript natif) — acceptable car les scripts de test ne font pas partie du code de production
- Nécessite une installation système (`brew install k6`) — pas automatisable en CI sans image Docker spécifique

### autocannon

**Description :** Module npm de l'écosystème Fastify. Intégration Node.js native.

**Avantages :**
- Dépendance npm — installation via `npm install`
- Intégration programmatique dans des scripts Node.js
- Maintenu par l'équipe Fastify

**Inconvénients :**
- Moins de flexibilité pour les scénarios complexes (rampe/plateau)
- Métriques moins granulaires — pas de checks personnalisés sur le corps de réponse
- Pas de support natif des seuils avec exit code non-zéro
- Pollution des `devDependencies` avec un outil de test de charge (différent des tests Jest)

### Artillery

**Description :** Outil open source de test de charge avec configuration YAML.

**Avantages :**
- Configuration YAML lisible
- Plugin Playwright pour tests E2E sous charge

**Inconvénients :**
- Configuration YAML moins flexible que des scripts JS pour les logiques conditionnelles
- Installation npm (même inconvénient qu'autocannon)
- Courbe d'apprentissage plus importante

---

## Décision

**k6 est retenu.**

La combinaison binaire standalone + scripts JS + seuils CI-friendly l'emporte sur les alternatives. Le seul inconvénient (scripts en JS non TypeScript) est acceptable car ces scripts ne font pas partie du code backend compilé — ils ne sont pas soumis à `tsc --noEmit`.

Les scripts sont placés dans `apps/backend/load-tests/` (hors `src/`) pour signaler explicitement qu'ils ne sont pas compilés par TypeScript.

---

## Conséquences

- `brew install k6` documenté dans `apps/backend/load-tests/README.md`
- Commandes npm ajoutées : `load-test`, `load-test:daily`, `load-test:all`
- Les résultats JSON (`results-*.json`) sont ignorés par git via `.gitignore`
- Le rate limiter `@fastify/rate-limit` doit être désactivé lors des tests : `RATE_LIMIT_MAX=10000`
- Pour la CI future : utiliser l'image Docker officielle `grafana/k6` si les tests de charge sont intégrés dans le pipeline

---

## Références

- Documentation k6 : https://k6.io/docs/
- `apps/backend/load-tests/README.md`
- `docs/ops/scaling-plan.md`
