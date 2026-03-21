-- Migration 002 : Table daily_challenges (F3-51)
-- Paires pré-calculées pour le défi du jour basé sur l'actualité Wikipedia.
--
-- PRIMARY KEY (date, lang) garantit l'idempotence : un seul enregistrement
-- par langue par jour. INSERT ON CONFLICT DO UPDATE est safe pour le rejeu.
--
-- start_article et target_article sont stockés en JSONB (structure ArticleSummaryResponse)
-- pour éviter une table de jointure supplémentaire (ADR-002 : stack minimaliste).
--
-- Index :
-- - daily_challenges_date_idx : requêtes de lecture par date (GET /api/game/daily)

CREATE TABLE IF NOT EXISTS daily_challenges (
  date           DATE         NOT NULL,
  lang           VARCHAR(2)   NOT NULL,
  start_article  JSONB        NOT NULL,
  target_article JSONB        NOT NULL,
  source         VARCHAR(20)  NOT NULL DEFAULT 'news',
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (date, lang)
);

CREATE INDEX IF NOT EXISTS daily_challenges_date_idx ON daily_challenges (date);
