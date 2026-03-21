# ADR-009 : Défi du jour basé sur l'actualité Wikipedia — pré-calcul J-1 avec table PostgreSQL

## Statut
Accepté

## Contexte

La route `GET /api/game/daily` retourne actuellement une paire d'articles déterministe calculée à la requête via hash(date+lang) + pool `popular-pages`. Ce mécanisme garantit l'idempotence mais produit une paire identique chaque jour pour une même langue — sans ancrage dans l'actualité.

La story F3-51 demande que le défi du jour soit basé sur des articles liés à l'actualité Wikipedia (`feed/featured/{date}` de l'API Wikimedia). Ce feed retourne notamment des articles en rapport avec l'actualité du jour.

Deux contraintes structurantes :
1. **L'idempotence doit être maintenue** : tous les utilisateurs d'une même langue voient la même paire le même jour.
2. **La robustesse doit être préservée** : si le feed Wikimedia est indisponible ou ne retourne pas assez d'articles valides, la route ne doit pas échouer.

Un calcul à la requête (comme l'actuel) est incompatible avec l'actualité car :
- L'API `feed/featured` retourne les articles "en vedette" pour une date donnée, non déterministes entre requêtes (les sections peuvent changer au fil de la journée)
- Le calcul à chaque requête multiplierait les appels Wikimedia sans cache

La solution naturelle est de pré-calculer la paire une fois par jour, de la stocker en base, et de la servir depuis la base à chaque requête.

## Décision

Le défi du jour est pré-calculé chaque soir pour J+1, persisté en PostgreSQL, et servi depuis la base de données à chaque requête. Le fallback hash+pageviews existant est conservé si aucun enregistrement n'existe pour la date et la langue demandées.

**Structure de la table** :
```sql
CREATE TABLE daily_challenges (
  date        DATE         NOT NULL,
  lang        VARCHAR(2)   NOT NULL,
  start_article JSONB      NOT NULL,
  target_article JSONB     NOT NULL,
  source      VARCHAR(20)  NOT NULL DEFAULT 'news',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (date, lang)
);
```

Les colonnes `start_article` et `target_article` stockent un objet JSON correspondant à `ArticleSummaryResponse` (id, title, url, language, extract, thumbnailUrl optionnel).

**Source des articles** : section `news` (et `onthisday` en fallback) du feed Wikimedia `https://en.wikipedia.org/api/rest_v1/feed/featured/{YYYY}/{MM}/{DD}`. Note : le feed n'est pleinement supporté que pour `en` — pour les autres langues, le feed retourne moins d'articles voire rien. La spec de F3-51 impose : langues prioritaires `fr`, `en`, `de`, `es` — les autres (`nl`, `pl`, `pt`, `it`) utilisent le fallback hash si le pool est insuffisant.

**Pré-calcul** : route admin `POST /api/admin/daily-challenges/precompute` déclenchable manuellement ou via cron externe (pas de cron intégré dans Fastify — délégué à l'infrastructure). La route calcule J+1 pour toutes les langues supportées.

**Lecture** : `GET /api/game/daily?lang={lang}` lit d'abord depuis `daily_challenges` pour la date du jour. Si aucune ligne → fallback vers le comportement existant (hash + pageviews).

## Conséquences positives

- Le défi est ancré dans l'actualité Wikipedia pour les langues supportées par le feed
- L'idempotence est garantie par la clé primaire `(date, lang)` en base
- Les appels Wikimedia sont regroupés (un seul calcul par langue par jour) au lieu d'être dilués sur chaque requête utilisateur
- Le fallback existant est préservé — aucune régression pour les langues ou les cas d'échec
- La route admin permet de déclencher le calcul manuellement en cas de cron raté

## Conséquences négatives

- Nouvelle dépendance à PostgreSQL pour la route `GET /api/game/daily` (auparavant stateless)
- Si le cron ne s'exécute pas et que le fallback ne produit pas de paire (cas exceptionnel), le défi du jour peut être non basé sur l'actualité
- Le feed `feed/featured` n'est disponible que pour un nombre limité de langues — les 4 langues prioritaires seulement bénéficient de la feature complète
- Complexité opérationnelle accrue : un cron externe ou un appel manuel est nécessaire chaque soir

## Alternatives considérées

- **Cache Redis avec TTL journalier** : évite PostgreSQL mais ajoute une dépendance Redis non présente dans la stack actuelle — écarté (ADR-002 : stack minimaliste)
- **Calcul à la requête avec cache Fastify** : un cache en mémoire avec TTL journalier serait perdu au redémarrage du serveur — écarté (pas de persistance)
- **Cron intégré dans Fastify** (`node-cron`)  : ajoute une dépendance et couple le calcul au cycle de vie du processus — écarté (délégation à l'infrastructure plus robuste)
