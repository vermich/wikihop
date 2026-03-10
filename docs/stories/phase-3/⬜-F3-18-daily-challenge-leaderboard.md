---
id: F3-18
title: "Tableau des scores du défi quotidien — classement multijoueur"
phase: 3
priority: Should
agents: [Backend Dev, Frontend Dev, UX/UI, Tech Lead]
status: pending
created: 2026-03-10
completed: ~
depends_on: [F3-01, F3-17]
---

# F3-18 — Tableau des scores du défi quotidien — classement multijoueur

## Contexte

Le défi quotidien est la même paire pour tous les joueurs. On veut permettre aux joueurs de se comparer via un classement global arcade : saisie d'un pseudo sur l'écran de victoire, scores persistés en base, classement consultable.

L'historique personnel (F3-02) reste inchangé.

## Objectif

- Après avoir réussi le défi du jour, le joueur saisit un pseudo (style arcade)
- Son score (temps + nombre de sauts) est envoyé au backend et stocké en base
- Un écran "Classement" affiche le top des scores du défi du jour, triables par temps ou par sauts

## Critères d'acceptance

### Saisie du pseudo (VictoryScreen)
- [ ] Après victoire sur le défi du jour, un champ de saisie pseudo apparaît sur VictoryScreen
- [ ] Le pseudo est limité à 12 caractères (style arcade)
- [ ] Le dernier pseudo saisi est mémorisé en AsyncStorage (`@wikihop/leaderboard_pseudo`) et pré-rempli
- [ ] Un bouton "Soumettre mon score" envoie le pseudo + score au backend
- [ ] La soumission est optionnelle — un bouton "Passer" permet d'ignorer
- [ ] Si le backend est indisponible, un message d'erreur s'affiche (pas de blocage)

### API backend
- [ ] `POST /api/leaderboard/daily` — enregistre un score : `{ date, pseudo, jumps, timeSeconds, lang }`
- [ ] `GET /api/leaderboard/daily?date=YYYY-MM-DD&lang=fr&sort=time|jumps` — retourne le top 20
- [ ] La date est validée côté backend (refus des soumissions pour une date autre qu'aujourd'hui UTC)
- [ ] Le pseudo est sanitisé (trim, max 12 chars, caractères autorisés : lettres, chiffres, `_`, `-`)
- [ ] Stockage PostgreSQL dans une table `daily_scores` (voir Notes techniques)

### Écran Classement
- [ ] Accessible depuis HomeScreen (bouton secondaire sous le bouton "Défi du jour")
- [ ] Affiche le top 20 du défi du jour en cours
- [ ] Deux onglets ou boutons de tri : "Par temps" et "Par sauts"
- [ ] Chaque ligne : rang, pseudo, temps formaté (MM:SS), nombre de sauts, langue
- [ ] Message "Aucun score pour aujourd'hui" si le classement est vide
- [ ] Indicateur de chargement pendant la requête
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur

## Notes techniques

### Table PostgreSQL `daily_scores`
```sql
CREATE TABLE daily_scores (
  id          SERIAL PRIMARY KEY,
  date        DATE NOT NULL,
  pseudo      VARCHAR(12) NOT NULL,
  jumps       INTEGER NOT NULL,
  time_seconds INTEGER NOT NULL,
  lang        VARCHAR(2) NOT NULL DEFAULT 'fr',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_daily_scores_date_lang ON daily_scores (date, lang);
```

### Sécurité
- Pas d'authentification — n'importe qui peut soumettre un score
- Rate limiting à définir par le Tech Lead (ex. 5 soumissions par IP par jour)
- Pas de validation côté client du temps (le backend fait confiance au mobile pour cette v1)

### Hors scope (v1)
- Vérification de la légitimité du score (anti-triche)
- Historique multi-jours du classement
- Scores de l'utilisateur mis en évidence dans le classement
