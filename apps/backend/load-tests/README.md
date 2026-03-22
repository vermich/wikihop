# Tests de charge — WikiHop Backend

Scripts k6 pour valider les performances du backend sous charge.

---

## 1. Pré-requis

### Installer k6

```bash
brew install k6
```

k6 est un outil externe — il n'est pas une dépendance npm du projet.

### Démarrer le backend avec rate limiter désactivé

Le rate limiter `@fastify/rate-limit` est configuré à 60 req/min par défaut.
Les tests de charge génèrent plusieurs milliers de requêtes — il faut désactiver la limite :

```bash
cd apps/backend
RATE_LIMIT_MAX=10000 npm run dev
```

---

## 2. Pré-condition pour `daily.k6.js`

Le test `daily.k6.js` mesure les performances du cache DB, pas du fallback Wikipedia.
Sans ligne en base pour la date du jour, chaque requête irait chercher Wikipedia → les seuils ne seraient pas représentatifs.

Insérer la pré-condition avant de lancer le test :

```bash
psql $DATABASE_URL -c "
  INSERT INTO daily_challenges (date, lang, start_article, target_article, source)
  VALUES (
    CURRENT_DATE,
    'fr',
    '{\"id\": \"Paris\", \"title\": \"Paris\", \"url\": \"https://fr.wikipedia.org/wiki/Paris\", \"language\": \"fr\"}',
    '{\"id\": \"Tour_Eiffel\", \"title\": \"Tour Eiffel\", \"url\": \"https://fr.wikipedia.org/wiki/Tour_Eiffel\", \"language\": \"fr\"}',
    'manual'
  )
  ON CONFLICT (date, lang) DO NOTHING;
"
```

Pour vérifier que la ligne existe :

```bash
psql $DATABASE_URL -c "SELECT date, lang, start_article->>'title', target_article->>'title' FROM daily_challenges WHERE date = CURRENT_DATE AND lang = 'fr';"
```

---

## 3. Commandes d'exécution

### Test random-pair (100 VUs)

```bash
cd apps/backend
k6 run load-tests/random-pair.k6.js
```

Ou via npm :

```bash
npm run load-test
```

### Test daily challenge (1 000 VUs)

```bash
cd apps/backend
k6 run load-tests/daily.k6.js
```

Ou via npm :

```bash
npm run load-test:daily
```

### Tous les tests en séquence

```bash
npm run load-test:all
```

### Surcharger l'URL de base (staging, etc.)

```bash
k6 run --env BASE_URL=https://api.wikihop.example.com load-tests/random-pair.k6.js
```

### Exporter les résultats en JSON

```bash
k6 run --out json=load-tests/results-$(date +%Y%m%d-%H%M%S).json load-tests/random-pair.k6.js
```

Les fichiers `load-tests/results-*.json` sont ignorés par git (voir `.gitignore`).

---

## 4. Explication des seuils

| Seuil | Valeur | Justification |
|-------|--------|---------------|
| `http_req_duration p(95) < 2000` | 2 000 ms au 95e percentile | SLA acceptable pour un jeu mobile — 95 % des requêtes sous 2 s |
| `http_req_failed rate < 0.01` | Moins de 1 % d'erreurs HTTP | Tolérance quasi-zéro sur les erreurs réseau/serveur |
| `checks rate > 0.99` | Plus de 99 % des checks passants | Corps de réponse valide sur la quasi-totalité des requêtes |

Si un seuil n'est pas atteint, k6 retourne un code de sortie non-zéro — utilisable en CI.

---

## 5. Scénarios de charge

### `random-pair.k6.js`

- Rampe 0 → 100 VUs en 30 s
- Plateau 100 VUs pendant 60 s
- Descente 100 → 0 VUs en 30 s
- Durée totale : ~2 min
- Langues variées aléatoirement : `fr`, `en`, `es`

### `daily.k6.js`

- Rampe 0 → 1 000 VUs en 60 s
- Plateau 1 000 VUs pendant 120 s
- Descente 1 000 → 0 VUs en 30 s
- Durée totale : ~3,5 min
- Langue fixe : `fr` (scénario pic du matin — tous les joueurs chargent le défi du jour simultanément)

Le daily challenge bénéficie du cache DB (`daily_challenges`) contrairement au random-pair qui appelle Wikipedia à chaque fois — d'où la charge cible 10× supérieure.
