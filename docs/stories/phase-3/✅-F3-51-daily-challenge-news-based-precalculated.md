---
id: F3-51
title: Défi du jour basé sur l'actualité Wikipedia (pré-calculé J-1)
phase: 3-Features
priority: Should
agents: [Backend Dev, Tech Lead]
status: done
created: 2026-03-21
completed: 2026-03-21
---

# F3-51 — Défi du jour basé sur l'actualité Wikipedia (pré-calculé J-1)

## User Story
En tant que joueur, je veux que le défi du jour soit basé sur des articles d'actualité Wikipedia et identique pour tous les utilisateurs, afin de partager une expérience commune ancrée dans l'actualité du moment.

## Critères d'acceptance
- [ ] Un job backend calcule le défi du lendemain chaque soir à partir de l'API Wikimedia `feed/featured/{YYYY}/{MM}/{DD}` (cron ou équivalent)
- [ ] Le défi calculé est persisté en base PostgreSQL avec la date cible (une ligne par langue par date)
- [ ] La route `GET /api/game/daily` sert la paire depuis la base de données pour la date du jour
- [ ] Si aucun défi pré-calculé n'existe pour la date du jour (premier lancement, échec du job), le comportement actuel (hash + pageviews) est utilisé en fallback — sans erreur visible côté client
- [ ] Le défi est identique pour tous les utilisateurs le même jour (pas de randomisation à la requête)
- [ ] Les langues `fr`, `en`, `de`, `es` sont couvertes en priorité — les autres langues (`nl`, `pl`, `pt`, `it`) utilisent le fallback si le pool `news` retourné est insuffisant (< 5 articles valides)
- [ ] Tests d'intégration couvrant la route `GET /api/game/daily` (cas nominal, cas fallback) et le job de pré-calcul (cas succès, cas pool insuffisant, cas échec API Wikimedia)
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

Périmètre backend attendu :
1. Table PostgreSQL `daily_challenges` : colonnes `date` (DATE), `lang` (VARCHAR), `start_article` (VARCHAR), `target_article` (VARCHAR), `created_at` (TIMESTAMP) — clé primaire composite `(date, lang)`
2. Job de pré-calcul : appelable manuellement ET planifié la veille à une heure configurable (variable d'environnement `DAILY_CHALLENGE_CRON_HOUR`, défaut 22h UTC)
3. Logique de sélection depuis `feed/featured` : extraire les articles de type `news` ou `onthisday`, filtrer les articles non jouables (stubs, redirections, pages de désambiguation)
4. Route `GET /api/game/daily?lang={lang}` : interroger `daily_challenges` pour la date du jour et la langue demandée ; si aucun résultat → déléguer au comportement actuel (hash + pageviews)
5. Pas de modification frontend requise pour cette story — le contrat de la route existante est préservé

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
