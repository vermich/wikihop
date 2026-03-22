/**
 * Test de charge — GET /api/game/daily
 *
 * Scénario : rampe 0→1000 VUs en 60s, plateau 120s, descente 30s
 *
 * PRÉ-CONDITION OBLIGATOIRE :
 *   Une ligne doit exister dans la table daily_challenges pour la date du jour (lang=fr).
 *   Sans ça, le test mesure le fallback Wikipedia, pas le cache DB.
 *
 *   Commande pour insérer la pré-condition :
 *     psql $DATABASE_URL -c "
 *       INSERT INTO daily_challenges (date, lang, start_article, target_article, source)
 *       VALUES (
 *         CURRENT_DATE, 'fr',
 *         '{\"id\": \"Paris\", \"title\": \"Paris\", \"url\": \"https://fr.wikipedia.org/wiki/Paris\", \"language\": \"fr\"}',
 *         '{\"id\": \"Tour_Eiffel\", \"title\": \"Tour Eiffel\", \"url\": \"https://fr.wikipedia.org/wiki/Tour_Eiffel\", \"language\": \"fr\"}',
 *         'manual'
 *       )
 *       ON CONFLICT (date, lang) DO NOTHING;
 *     "
 *   Voir README.md pour la commande complète.
 *
 * Pré-requis :
 *   - k6 installé : brew install k6
 *   - Backend démarré avec rate limiter désactivé :
 *     RATE_LIMIT_MAX=10000 npm run dev
 *   - Pré-condition daily_challenges insérée (voir ci-dessus)
 *
 * Exécution :
 *   k6 run load-tests/daily.k6.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '60s', target: 1000 },
    { duration: '120s', target: 1000 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const url = `${BASE_URL}/api/game/daily?lang=fr`;

  const response = http.get(url, {
    tags: { endpoint: 'daily' },
  });

  check(response, {
    'status is 200': (r) => r.status === 200,
    'body contains date': (r) => {
      try {
        const body = JSON.parse(r.body);
        return typeof body.date === 'string' && body.date.length > 0;
      } catch {
        return false;
      }
    },
    'body contains start.title': (r) => {
      try {
        const body = JSON.parse(r.body);
        return typeof body.start === 'object' && typeof body.start.title === 'string' && body.start.title.length > 0;
      } catch {
        return false;
      }
    },
    'body contains target.title': (r) => {
      try {
        const body = JSON.parse(r.body);
        return typeof body.target === 'object' && typeof body.target.title === 'string' && body.target.title.length > 0;
      } catch {
        return false;
      }
    },
    'duration under 2000ms': (r) => r.timings.duration < 2000,
  });

  sleep(1);
}
