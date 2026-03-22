---
id: P-09
title: Monitoring et alerting en production
phase: 5-Services managés
priority: Must
agents: [Tech Lead, Backend Dev]
status: in-progress
created: 2026-02-28
completed:
---

# P-09 — Monitoring et alerting en production

## User Story
En tant qu'éditeur, je veux être alerté en cas d'incident en production, afin de réagir rapidement et minimiser l'impact sur les joueurs.

## Critères d'acceptance
- [x] Endpoint de santé `GET /health` retournant l'état de la base de données
- [ ] Monitoring de disponibilité configuré (Uptime Robot, Better Stack ou équivalent gratuit)
- [ ] Alerting par email ou notification en cas d'indisponibilité supérieure à 5 minutes
- [ ] Logs d'erreur backend agrégés (Logtail, Papertrail ou équivalent)
- [ ] Tableau de bord de métriques de base (requêtes/minute, taux d'erreur, latence)

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim

**Date :** 2026-03-22
**Statut :** PARTIAL — critère code validé, 4 critères nécessitent une configuration ops externe non vérifiable en local.

### Critères vérifiés

- **Endpoint `/health` (code) :** `apps/backend/src/routes/health.route.ts` — `GET /health` appelle `checkDb()` (SELECT 1 sur le pool), calcule la latence, retourne `{ status: 'ok'|'degraded', timestamp, version, db: { status, latencyMs } }`. Seuil de dégradation 500ms. Schéma Zod sur la sortie. tsc sans erreur. Conforme au critère.
- **Monitoring Uptime Robot / Better Stack :** guide de configuration détaillé dans `docs/ops/monitoring-setup.md`. Mais la configuration du compte Uptime Robot / Betteruptime elle-même est une opération externe — non vérifiable localement. Non coché.
- **Alerting 5 minutes :** documenté dans `docs/ops/monitoring-setup.md` (Uptime Robot : alerte si 2 checks consécutifs ratés = 10 min — note : le critère demande 5 min, Uptime Robot gratuit vérifie toutes les 5 min donc 2 échecs = 10 min maximum avant alerte). La configuration réelle n'a pas été vérifiée. Non coché.
- **Logs agrégés Logtail :** procédure documentée dans `docs/ops/monitoring-setup.md` (transport Pino + `@logtail/pino`). Le package n'est pas installé dans `apps/backend/package.json` — la configuration Logtail n'est pas implémentée dans `server.ts`. Non coché.
- **Tableau de bord métriques :** documenté comme accessible via Uptime Robot Dashboard + Logtail + `GET /health`. Sans activation des services externes, pas de tableau de bord opérationnel. Non coché.

### Observation sur le critère alerting
La spec demande "indisponibilité supérieure à 5 minutes". Uptime Robot gratuit vérifie toutes les 5 minutes. Avec 1 check raté (faux positif possible) + 1 check raté confirmé = 10 minutes maximum avant alerte. Betteruptime (plan gratuit) offre des checks plus fréquents. Ce point mérite une clarification ops.

## Statut
pending → in-progress → done
