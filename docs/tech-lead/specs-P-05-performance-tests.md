# Specs techniques — P-05 : Tests de performance et de charge (backend)

**Story :** `docs/stories/phase-4/P-05-performance-tests.md`
**Destinataire :** Julien (Backend Dev)
**Date :** 2026-03-22

---

## 1. Contexte

La story P-05 valide que le backend WikiHop tient sa promesse de qualité de service sous charge avant la mise en production. Deux routes sont concernées :

- `GET /api/game/random-pair` — sélection aléatoire dans le pool d'articles populaires + 2 appels Wikipedia en parallèle
- `GET /api/game/daily` — défi quotidien : priorité cache DB (`daily_challenges`), fallback hash+pageviews + Wikipedia si manquant

Les tests tournent en local contre `npm run dev` (pas de backend déployé en Phase 4).

---

## 2. Périmètre

**Dans le scope :**
- Scripts k6 pour les deux routes, avec scénarios de montée en charge
- Configuration des seuils pass/fail dans les scripts
- Commande `npm run load-test` dans `apps/backend/package.json`
- Plan de mise à l'échelle dans `docs/ops/scaling-plan.md`
- ADR-010 documentant le choix de l'outil

**Hors scope :**
- Tests de charge sur les autres routes (`/health`, `/api/game/daily` admin, etc.)
- Benchmarks de base de données isolés
- Tests de charge en environnement CI (les tests de charge ne s'exécutent pas dans le pipeline GitHub Actions — trop lents et dépendants d'un état local)

---

## 3. Choix de l'outil — k6

**k6** est retenu. Justification à documenter dans ADR-010 :

- Scripts en JavaScript natif (pas besoin d'une nouvelle dépendance npm dans le workspace)
- Seuils (`thresholds`) configurables directement dans le script — le script échoue avec exit code 1 si un seuil est dépassé
- Rapport HTML générable via `k6 run --out json=results.json` + post-processing, ou via l'extension `k6-reporter`
- Pas de service externe requis (contrairement à Locust ou JMeter)
- Installation système via `brew install k6` — à documenter dans `docs/INSTALLATION.md`

**autocannon écarté** : intégration npm séduisante mais absence de seuils natifs, pas de scénarios de rampe, moins expressif pour les scénarios multi-routes.

---

## 4. Contraintes techniques bloquantes à résoudre dans les scripts

### 4.1 Rate limiting

Le plugin `@fastify/rate-limit` est configuré à **60 req/min par IP** (variable `RATE_LIMIT_MAX`, défaut `60`). Un test de charge standard va déclencher des 429 avant d'atteindre le plateau cible, rendant les mesures inexploitables.

**Solution retenue : variable d'environnement dédiée pour les tests de charge**

Lancer le backend avec `RATE_LIMIT_MAX=10000` avant d'exécuter les scripts k6. Cette valeur doit être documentée dans le script et dans le `README` des load-tests.

La commande `npm run load-test` doit inclure cette instruction en commentaire (le script k6 ne peut pas modifier l'environnement du backend — c'est le dev qui démarre le backend avec la bonne valeur).

### 4.2 Appels Wikipedia externes dans `random-pair`

La route `GET /api/game/random-pair` appelle l'API Wikipedia externe (`fetchArticleSummary`). Martelez Wikipedia avec 100 utilisateurs simultanés est inacceptable (risque de ban IP, résultats non reproductibles).

**Solution retenue : paramètre `lang=fr` + observation du fallback statique**

Le service `popular-pages.service.ts` utilise un fallback JSON embarqué quand Wikimedia est indisponible. En pratique lors du test :
- Le test de charge sera exécuté avec le fallback actif (couper l'accès réseau du process Node.js n'est pas réaliste localement).
- Les appels Wikipedia réels seront absorbés via le mécanisme retry de la route (max 5 tentatives, timeout 3s par appel).
- Les résultats p95 mesurés **incluent** la latence Wikipedia réelle — c'est le comportement production, c'est voulu.

**Note dans le script k6** : les latences mesurées dépendent de la qualité du réseau local. Le seuil p95 < 2s est contraignant : si le réseau est dégradé lors du run, les résultats ne sont pas représentatifs. Documenter ce point dans le rapport.

### 4.3 Route `/api/game/daily` — pré-calcul obligatoire

La route `GET /api/game/daily` vérifie d'abord la table `daily_challenges` en base. Si aucune ligne n'existe pour la date du jour (cas le plus fréquent en Phase 4), elle bascule sur le fallback hash+pageviews + Wikipedia.

**Le test de charge de `/api/game/daily` doit être exécuté avec une ligne pré-calculée en base** pour mesurer le cas nominal (cache DB hit). Sans cela, on mesure le fallback Wikipedia, pas le comportement production.

Dans le script k6 de setup (hook `setup()`), inclure une note expliquant la pré-condition. La commande `npm run load-test:daily` sera conditionnée à l'existence de la ligne (vérifier avec `psql` avant de lancer).

---

## 5. Structure des fichiers

```
apps/backend/
└── load-tests/
    ├── README.md              ← Instructions de lancement, pré-conditions
    ├── random-pair.k6.js      ← Script k6 pour GET /api/game/random-pair
    └── daily.k6.js            ← Script k6 pour GET /api/game/daily
```

---

## 6. Spécification des scénarios k6

### 6.1 `random-pair.k6.js` — 100 utilisateurs simultanés

**Objectif :** valider p95 < 2s et taux d'erreur < 1% sous 100 VUs.

**Scénario de montée :**

```
Phases :
  0 → 30s : rampe de 0 → 100 VUs (montée progressive)
  30s → 90s : plateau à 100 VUs
  90s → 120s : descente de 100 → 0 VUs
```

**Paramètres de la requête :**
- URL : `http://localhost:3000/api/game/random-pair?lang=fr`
- Méthode : GET
- Headers : `Accept: application/json`

**Variantes** : k6 doit faire varier `lang` parmi `['fr', 'en', 'es']` à chaque itération pour simuler des requêtes réalistes.

**Seuils (`thresholds`) obligatoires :**

```javascript
thresholds: {
  // Temps de réponse p95 < 2 secondes
  'http_req_duration': ['p(95)<2000'],
  // Taux d'erreur HTTP < 1%
  'http_req_failed': ['rate<0.01'],
  // Taux de réponses 200 > 99%
  'checks': ['rate>0.99'],
},
```

**Checks dans chaque itération :**
- `response.status === 200`
- Le corps JSON contient `start.title` et `target.title` (vérification structurelle minimale)
- `response.timings.duration < 2000` (redondant avec threshold mais visible dans le rapport)

### 6.2 `daily.k6.js` — 1 000 utilisateurs simultanés

**Objectif :** valider p95 < 2s et taux d'erreur < 1% sous 1 000 VUs avec cache DB.

**Pré-condition obligatoire** (documenter en commentaire dans le script) :
```
PRÉ-CONDITION : une ligne doit exister dans daily_challenges pour la date du jour et la langue fr.
Insérer via : psql $DATABASE_URL -c "INSERT INTO daily_challenges ..."
Voir README.md pour la commande complète.
```

**Scénario de montée :**

```
Phases :
  0 → 60s  : rampe de 0 → 1000 VUs
  60s → 180s : plateau à 1000 VUs
  180s → 210s : descente de 1000 → 0 VUs
```

**Paramètres de la requête :**
- URL : `http://localhost:3000/api/game/daily?lang=fr`
- Méthode : GET

**Seuils identiques à `random-pair.k6.js`** : p95 < 2000ms, taux d'erreur < 1%, checks > 99%.

**Checks dans chaque itération :**
- `response.status === 200`
- Le corps JSON contient `date`, `start.title`, `target.title`

---

## 7. Commandes npm à ajouter dans `apps/backend/package.json`

```json
"load-test": "k6 run load-tests/random-pair.k6.js",
"load-test:daily": "k6 run load-tests/daily.k6.js",
"load-test:all": "k6 run load-tests/random-pair.k6.js && k6 run load-tests/daily.k6.js"
```

**Note dans le README des load-tests** : lancer le backend avec `RATE_LIMIT_MAX=10000 npm run dev` avant d'exécuter les scripts.

---

## 8. Rapport de test

k6 produit un résumé textuel dans le terminal à la fin de chaque run. Ce résumé doit être copié-collé dans le rapport de test de la story P-05.

Pour générer un rapport JSON exploitable :

```bash
k6 run --out json=load-tests/results-random-pair.json load-tests/random-pair.k6.js
```

Le fichier JSON n'est pas commité (ajouter `load-tests/results-*.json` dans `.gitignore`).

**Contenu minimum du rapport de test (à inclure dans le fichier story P-05) :**
- Version du backend testée (git SHA court)
- Date et heure du test
- Environnement machine (RAM, CPU)
- Résumé k6 : VUs max, durée totale, p50/p95/p99, taux d'erreur
- Verdict : PASS ou FAIL par seuil
- Observations qualitatives (comportement sous charge, erreurs observées, logs Pino)

---

## 9. Plan de mise à l'échelle — `docs/ops/scaling-plan.md`

Si les seuils ne sont pas atteints, Julien crée ce fichier avec le plan suivant (à adapter selon les observations réelles).

**Structure attendue du fichier :**

```markdown
# Plan de mise à l'échelle — WikiHop Backend

## Résultats observés
[Copier les métriques k6 ici]

## Goulots identifiés
[ex. : latence Wikipedia p95 > 2s, connexions PG épuisées, CPU saturé]

## Axes d'amélioration prioritaires

### Vertical (machine)
- Augmenter la RAM / CPU du serveur
- Augmenter le pool de connexions PostgreSQL (`pg.Pool` — `max` actuel : non configuré → défaut 10)

### Horizontal (architecture)
- Cache Redis devant `getPopularPages` (TTL = 1h) — évite les appels Wikimedia répétés
- Cache applicatif en mémoire (Map<lang, result> avec TTL) pour `daily_challenges` — une seule requête DB par langue par jour
- CDN ou reverse proxy (Nginx) devant le backend pour absorber les requêtes statiques

### Réduction de la latence Wikipedia
- Pré-calcul `random-pair` via job CRON (similaire à `daily_challenges`) — pool préchauffé en DB
- Timeout Wikipedia réduit à 1.5s avec retry agressif si les appels parallèles sont fiables

## Seuil de déclenchement recommandé
[ex. : déclencher la mise à l'échelle si p95 > 1.5s en production sur 7 jours glissants]
```

---

## 10. TDD — fonctions pures à tester

P-05 est une story de tests de performance, pas d'implémentation de logique métier. Il n'y a pas de fonctions pures nouvelles à créer côté application.

Les scripts k6 sont des fichiers JS non TypeScript — ils ne sont pas soumis aux règles TDD du projet. Cependant, les **checks k6** (assertions dans les scripts) sont l'équivalent fonctionnel des tests — ils doivent couvrir les cas suivants :

- Réponse 200 avec corps valide (cas nominal)
- Réponse 503 avec corps `{ success: false, error: { code, message } }` (cas d'erreur — simulé en coupant la DB)

---

## 11. Critères de qualité pour la PR

- [ ] Les deux scripts k6 existent dans `apps/backend/load-tests/`
- [ ] Les scripts contiennent les seuils (`thresholds`) tels que spécifiés
- [ ] Un `README.md` dans `load-tests/` explique les pré-conditions et la procédure de lancement
- [ ] Les commandes npm sont ajoutées dans `apps/backend/package.json`
- [ ] `docs/ops/scaling-plan.md` existe (même si les seuils sont atteints — documenter les observations)
- [ ] ADR-010 créé dans `docs/adr/` documentant le choix k6
- [ ] `load-tests/results-*.json` ajouté dans `.gitignore`
- [ ] `tsc --noEmit` passe (les scripts k6 étant en JS, pas de typecheck requis sur eux)
- [ ] `npm run lint` passe

---

## 12. Points de vigilance

1. **PostgreSQL sous charge** : le pool `pg.Pool` a un `max` non configuré (défaut Node.js = 10 connexions). Avec 1 000 VUs sur `/daily`, les requêtes DB vont se mettre en file. Observer les métriques `pg` dans les logs Pino pendant le test.

2. **Rate limiting** : ne pas oublier `RATE_LIMIT_MAX=10000` avant de lancer le backend pour le test. Sans ça, le test échouera sur des 429 avant même d'atteindre le plateau.

3. **Réseau local** : les appels Wikipedia réels depuis un réseau domestique ont une latence variable. Si les résultats p95 sont proches du seuil (1.8–2.2s), relancer le test depuis un réseau câblé ou en désactivant temporairement Wikimedia (couper le DNS) pour mesurer la latence "pur backend+DB".

4. **k6 et le process Node.js sur la même machine** : k6 consomme des ressources CPU/mémoire. Sur une machine de développement, les résultats seront moins bons qu'en production. Le rapport doit mentionner les specs de la machine de test.

5. **Isolation du test** : fermer tout autre processus consommateur de ressources (IDE, navigateur) pendant le plateau de charge.
