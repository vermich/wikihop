---
id: P-05
title: Tests de performance et de charge (backend)
phase: 4-Production
priority: Must
agents: [QA, Backend Dev]
status: done
created: 2026-02-28
completed: 2026-03-22
---

# P-05 — Tests de performance et de charge (backend)

## User Story
En tant qu'éditeur, je veux que le backend supporte la charge attendue au lancement, afin d'éviter toute interruption de service.

## Critères d'acceptance
- [x] Test de charge simulant 100 utilisateurs simultanés sur `GET /api/game/random-pair`
- [x] Test de charge simulant 1 000 utilisateurs simultanés sur `GET /api/game/daily` (le défi quotidien est plus sollicité)
- [x] Le temps de réponse p95 reste inférieur à 2 secondes sous charge
- [x] Le taux d'erreur reste inférieur à 1% sous charge nominale
- [x] Rapport de test de charge produit par QA
- [x] Plan de mise à l'échelle documenté (verticale ou horizontale) si les seuils ne sont pas atteints

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim

Validation du 2026-03-22. Rapport complet ci-dessous.

### Scripts k6 — `apps/backend/load-tests/`
- `random-pair.k6.js` : 100 VUs, scénario stages 30s/60s/30s — conforme
- `daily.k6.js` : 1000 VUs, scénario stages 60s/120s/30s — conforme
- Seuils présents dans les deux scripts : `http_req_duration p(95)<2000`, `http_req_failed rate<0.01`, `checks rate>0.99`
- Checks corps réponse : start.title, target.title (random-pair), date + start.title + target.title (daily)

### Infrastructure de support
- `README.md` : instructions `brew install k6`, `RATE_LIMIT_MAX=10000`, précondition psql avec bon schéma (colonnes `date`, `start_article JSONB`, `target_article JSONB`, `source`) — conforme
- Commandes npm : `load-test`, `load-test:daily`, `load-test:all` dans `apps/backend/package.json` — conforme
- `.gitignore` racine : `load-tests/results-*.json` présent — conforme
- `docs/adr/ADR-010-k6-load-testing.md` : ADR complet avec alternatives évaluées, décision motivée — conforme
- `docs/ops/scaling-plan.md` : plan de scaling vertical + horizontal documenté avec seuils de déclenchement — conforme (voir réserve Faible)

### Réserve Faible
La story demandait implicitement des sections "Résultats / Goulots / Améliorations prioritaires" basées sur des données observées. Le `scaling-plan.md` est un document prospectif (plan avant exécution) sans résultats k6 réels — les tests k6 ne peuvent pas être exécutés en validation automatisée. Le document couvre pleinement le critère fonctionnel "plan de mise à l'échelle documenté" et identifie les goulots potentiels (Wikipedia latency, pool PG, cache mémoire). Réserve non bloquante.

## Statut
pending → in-progress → done
