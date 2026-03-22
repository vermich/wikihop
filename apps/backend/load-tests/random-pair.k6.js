/**
 * Test de charge — GET /api/game/random-pair
 *
 * Scénario : rampe 0→100 VUs en 30s, plateau 60s, descente 30s
 *
 * Pré-requis :
 *   - k6 installé : brew install k6
 *   - Backend démarré avec rate limiter désactivé :
 *     RATE_LIMIT_MAX=10000 npm run dev
 *
 * Exécution :
 *   k6 run load-tests/random-pair.k6.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '60s', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};

const LANGS = ['fr', 'en', 'es'];
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const lang = LANGS[Math.floor(Math.random() * LANGS.length)];
  const url = `${BASE_URL}/api/game/random-pair?lang=${lang}`;

  const response = http.get(url, {
    tags: { endpoint: 'random-pair', lang },
  });

  check(response, {
    'status is 200': (r) => r.status === 200,
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
