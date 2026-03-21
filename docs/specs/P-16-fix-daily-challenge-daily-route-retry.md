# Spec technique — P-16 : Fix bouton défi grisé (FR / IT) — Retry fallback daily route

## Contexte

Story : pas de fichier story individuel créé — correctif Phase 4 Lot 1.

La route `GET /api/game/daily` dispose d'une boucle de retry dans son chemin fallback
(lignes 329–343 de `game.route.ts`), mais cette boucle ré-essaie **les mêmes titres
déterministes** (`titleStart`, `titleTarget`) à chaque tentative. Si Wikipedia retourne
`null` pour ces deux titres précis (extract trop court, article inaccessible), les 5
tentatives échouent toutes sur la même paire et la route renvoie un 503.

Le frontend reçoit `null` depuis `fetchDailyChallenge`, le hook `useDailyChallenge` passe
à `status: 'error'`, et le bouton défi reste grisé pour tous les joueurs de la langue
concernée (FR, IT notamment, dont le pool Wikipedia présente parfois des articles trop
courts le même jour).

## Périmètre

**Dans scope :**
- Modifier le handler `GET /api/game/daily` dans `apps/backend/src/routes/game.route.ts`
- Chemin fallback hash+pageviews uniquement (le chemin DB reste inchangé)
- Tentative 0 : indices déterministes (`computeDailyIndices`) — cohérence inter-joueurs garantie
- Tentatives 1+ : indices aléatoires (`pickTwoDistinctIndices`) — paires différentes à chaque retry
- Ajout d'un test unitaire couvrant la logique de sélection d'indices

**Hors scope :**
- Chemin DB (`daily_challenges`) — inchangé
- Route `GET /api/game/random-pair` — inchangée
- Frontend — aucune modification nécessaire

## Diagnostic précis du bug

Code actuel (lignes 309–343) :

```typescript
const [idxStart, idxTarget] = computeDailyIndices(hash, articles.length);
const titleStart = articles[idxStart];   // ← calculé UNE FOIS avant la boucle
const titleTarget = articles[idxTarget]; // ← idem

// [guard titleStart/titleTarget undefined]

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  const [start, target] = await Promise.all([
    fetchArticleSummary(titleStart, lang),  // ← même titre à chaque tentative
    fetchArticleSummary(titleTarget, lang), // ← idem
  ]);
  if (start !== null && target !== null) { return reply.code(200).send(...); }
  // ← si null, on réessaie les MÊMES titres → inutile
}
```

Le retry est sémantiquement un retry réseau (passage de Wikipedia), pas un retry sur une
paire différente. Si l'article lui-même est trop court (extract ≤ 200 caractères),
`fetchArticleSummary` retournera toujours `null` pour ce titre.

## Modification à apporter

### Fichier : `apps/backend/src/routes/game.route.ts`

Remplacer la section fallback (après le guard `articles.length < 2`) par la logique
suivante. L'objectif est de calculer les indices **à l'intérieur de la boucle**, avec
`computeDailyIndices` uniquement pour `attempt === 0` et `pickTwoDistinctIndices` pour
les tentatives suivantes.

**Avant (lignes 308–343 environ) :**
```typescript
// Indices déterministes basés sur la date — idempotent
const [idxStart, idxTarget] = computeDailyIndices(hash, articles.length);
const titleStart = articles[idxStart];
const titleTarget = articles[idxTarget];

// noUncheckedIndexedAccess : vérification explicite
if (titleStart === undefined || titleTarget === undefined) {
  request.log.error(
    { lang, date, idxStart, idxTarget, poolSize: articles.length },
    'daily: indices hors limites — erreur algorithmique',
  );
  return reply.code(503).send({
    success: false,
    error: {
      code: 'DAILY_UNAVAILABLE',
      message: 'Erreur interne lors du calcul du défi quotidien',
    },
  });
}

// Retry : même paire cible à chaque tentative (déterminisme)
for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  const [start, target] = await Promise.all([
    fetchArticleSummary(titleStart, lang),
    fetchArticleSummary(titleTarget, lang),
  ]);

  if (start !== null && target !== null) {
    return reply.code(200).send({ date, start, target });
  }

  request.log.warn(
    { attempt, lang, date, reason: 'échec Wikipedia' },
    'daily: tentative de fetching échouée',
  );
}
```

**Après :**
```typescript
// Boucle de retry : tentative 0 = indices déterministes (cohérence inter-joueurs)
// Tentatives 1+ = indices aléatoires (paires différentes si la paire principale échoue)
for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
  const [idxStart, idxTarget] =
    attempt === 0
      ? computeDailyIndices(hash, articles.length)
      : pickTwoDistinctIndices(articles.length);

  const titleStart = articles[idxStart];
  const titleTarget = articles[idxTarget];

  // noUncheckedIndexedAccess : vérification explicite après sélection
  if (titleStart === undefined || titleTarget === undefined) {
    request.log.warn(
      { attempt, lang, date, idxStart, idxTarget, poolSize: articles.length },
      'daily: indices hors limites — tentative ignorée',
    );
    continue;
  }

  // Les deux appels Wikipedia sont lancés en parallèle (p95 < 2s)
  const [start, target] = await Promise.all([
    fetchArticleSummary(titleStart, lang),
    fetchArticleSummary(titleTarget, lang),
  ]);

  if (start !== null && target !== null) {
    return reply.code(200).send({ date, start, target });
  }

  request.log.warn(
    {
      attempt,
      lang,
      date,
      reason: start === null ? 'start invalide ou ébauche' : 'target invalide ou ébauche',
      titleStart,
      titleTarget,
    },
    'daily: tentative de fetching échouée',
  );
}
```

**Note sur le code d'erreur 503 final :** Remplacer `DAILY_UNAVAILABLE` par
`DAILY_POOL_EXHAUSTED` pour distinguer ce cas de l'ancienne erreur algorithmique. Le
message reste similaire.

**Résultat net :**
- Tentative 0 : paire déterministe (`computeDailyIndices`) — même paire pour tous les joueurs
- Tentatives 1–4 : paires aléatoires (`pickTwoDistinctIndices`) — contournement si la paire
  principale a des articles trop courts ce jour-là
- Le défi reste cohérent entre joueurs (tentative 0 identique), mais le fallback est robuste

## Points de vigilance

1. **`noUncheckedIndexedAccess`** : les accès `articles[idxStart]` et `articles[idxTarget]`
   retournent `string | undefined` — le guard est obligatoire à l'intérieur de la boucle
   (déplacé depuis avant la boucle).

2. **Sémantique de l'attempt 0** : la paire déterministe est tentée EN PREMIER. Si elle
   réussit (cas nominal), le comportement est identique à l'existant. Les paires aléatoires
   ne sont utilisées qu'en fallback.

3. **Pas de seed fixe pour les tentatives aléatoires** : `pickTwoDistinctIndices` utilise
   `Math.random()` — deux joueurs en mode fallback peuvent obtenir des paires différentes.
   C'est acceptable : l'important est que la paire nominale (tentative 0) soit identique.

4. **`MAX_ATTEMPTS` reste à 5** — inchangé.

5. **Logging** : le message de warn doit indiquer `attempt` (0-based) pour faciliter le
   débogage en production. Les warn de tentatives échouées restent au niveau `warn`,
   l'échec final passe à `error`.

## Tests à écrire

### Fichier : `apps/backend/src/__tests__/game.route.test.ts`

Cas de test à ajouter (tests alongside Supertest — schéma existant du fichier) :

```
describe('GET /api/game/daily — fallback retry avec paires différentes')
```

**Cas 1 — Tentative 0 réussit**
- `fetchArticleSummary` retourne des articles valides au premier appel
- Réponse attendue : 200, `start` et `target` non null
- Vérifier que `fetchArticleSummary` n'est appelé que 2 fois (une paire)

**Cas 2 — Tentative 0 échoue, tentative 1 réussit**
- `fetchArticleSummary` retourne `null` pour la paire déterministe, valide pour la suivante
- Réponse attendue : 200
- Vérifier que `fetchArticleSummary` est appelé 4 fois au total (2 paires)

**Cas 3 — Toutes les tentatives échouent**
- `fetchArticleSummary` retourne toujours `null` (mock)
- Réponse attendue : 503 avec `code: 'DAILY_POOL_EXHAUSTED'`

**Cas 4 — Chemin DB prioritaire (non régressé)**
- La table `daily_challenges` contient une ligne valide pour aujourd'hui + lang
- Réponse attendue : 200, données servies depuis la DB
- Vérifier que `fetchArticleSummary` n'est PAS appelé

## Critères de validation

- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur
- [ ] Tests unitaires présents pour les 4 cas listés ci-dessus
- [ ] Tentative 0 utilise `computeDailyIndices` (indices déterministes)
- [ ] Tentatives 1+ utilisent `pickTwoDistinctIndices` (indices aléatoires)
- [ ] Guard `titleStart === undefined || titleTarget === undefined` à l'intérieur de la boucle
- [ ] Code d'erreur 503 final : `DAILY_POOL_EXHAUSTED`
- [ ] Chemin DB (`daily_challenges`) inchangé — aucune régression
- [ ] Logging `request.log.warn({ attempt, lang })` sur chaque tentative échouée
