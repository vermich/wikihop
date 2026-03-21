# Configuration monitoring — WikiHop

Guide de mise en place du monitoring de production.
Le endpoint `/health` retourne `{ status: 'ok'|'degraded', db: { status, latencyMs } }`.

---

## 1. Uptime Robot — monitoring HTTP

Uptime Robot surveille la disponibilité de l'API en appelant `/health` toutes les 5 minutes.

**Configuration :**

1. Créer un compte sur [uptimerobot.com](https://uptimerobot.com) (plan gratuit : 50 monitors, check toutes les 5 min)
2. Ajouter un monitor de type **HTTP(S)**
3. Paramètres :
   - URL : `https://api.wikihop.app/health`
   - Méthode : `GET`
   - Interval : 5 minutes
   - Timeout : 30 secondes
   - Alerte si : code HTTP != 200 pendant 5 minutes consécutives (1 check raté = possible faux positif, 2 checks = incident réel)
4. Ajouter une alerte email vers l'adresse infra de l'équipe
5. Optionnel : activer la **Status Page** publique (URL partageable avec les utilisateurs)

**Limites Uptime Robot gratuit :**
- Vérification toutes les 5 min (pas en temps réel)
- Alertes email uniquement (pas Slack/webhook sur plan gratuit)
- Pas de vérification du corps de la réponse (uniquement le code HTTP)

**Pour surveiller l'état DB dans le corps JSON :** envisager le plan "Pro" (keyword monitoring) ou Betteruptime qui inclut cette fonctionnalité sur le plan gratuit.

---

## 2. Betteruptime / Logtail — logs structurés

### Option A — Betteruptime (recommandée)

[Betteruptime](https://betteruptime.com) est une alternative à Uptime Robot qui supporte :
- Keyword monitoring (vérifier `"status":"ok"` dans le corps JSON)
- Alertes Slack natives (plan gratuit)
- On-call scheduling

Configuration similaire à Uptime Robot. Préférer cette option si alertes Slack disponibles.

### Option B — Logtail (logs Pino)

[Logtail](https://betterstack.com/logtail) (Better Stack) centralise les logs Pino.

**Configuration côté backend :**

Pino supporte les transports. Ajouter un transport Logtail via `@logtail/pino` :

```bash
# apps/backend
npm install @logtail/pino
```

Dans `apps/backend/src/server.ts`, configurer le transport :

```typescript
// En production uniquement
const transport = process.env['LOGTAIL_SOURCE_TOKEN']
  ? {
      target: '@logtail/pino',
      options: { sourceToken: process.env['LOGTAIL_SOURCE_TOKEN'] },
    }
  : undefined;
```

Variable d'environnement à ajouter : `LOGTAIL_SOURCE_TOKEN` (depuis le dashboard Logtail).

**Logs utiles à surveiller :**
- Erreurs 5xx (tags Fastify automatiques)
- Temps de réponse > 2s
- Erreurs pool PostgreSQL (`[wikihop:db] Pool error`)

---

## 3. Tableau de bord minimal

Métriques de base disponibles sans outillage supplémentaire :

| Métrique | Source | Comment consulter |
|----------|--------|-------------------|
| Uptime / disponibilité | Uptime Robot dashboard | URL publique status page |
| Latence DB | `GET /health` → `db.latencyMs` | Manuellement ou keyword monitor |
| Logs applicatifs | Logtail / stdout serveur | Dashboard Logtail ou `pm2 logs` |
| Builds EAS | EAS Dashboard | expo.dev/accounts/[org]/projects/wikihop/builds |

**URL à bookmarker :**
- Health check : `https://api.wikihop.app/health`
- Uptime Robot status page : (à compléter après configuration)
- EAS Dashboard : https://expo.dev

---

## 4. Procédure d'alerte

Quand Uptime Robot envoie une alerte :

1. Vérifier manuellement : `curl https://api.wikihop.app/health`
2. Si `db.status: 'error'` → vérifier PostgreSQL sur le serveur : `pm2 logs wikihop-backend --lines 50`
3. Si le processus est down : `pm2 restart wikihop-backend`
4. Si la DB est inaccessible : vérifier la connexion réseau serveur → base
5. Si non résolu en 15 min → activer la procédure de rollback : `docs/ops/rollback-procedure.md`
