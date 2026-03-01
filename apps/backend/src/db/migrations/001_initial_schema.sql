-- Migration 001 : Schéma initial WikiHop
-- Créé le 2026-03-01
-- Auteur : Backend Dev — Julien
--
-- Ce fichier est exécuté automatiquement par PostgreSQL lors de la
-- première initialisation du volume Docker (via docker-entrypoint-initdb.d/).
-- Pour les migrations incrémentales : npm run db:migrate (depuis apps/backend/)
--
-- Réversibilité : voir section DROP en bas de fichier (commentée).

-- ─────────────────────────────────────────────
-- Table principale : sessions de jeu
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS game_sessions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Article de départ (colonnes décomposées pour requêtes simples)
  start_article_id     TEXT        NOT NULL,
  start_article_title  TEXT        NOT NULL,
  start_article_url    TEXT        NOT NULL,

  -- Article cible
  target_article_id    TEXT        NOT NULL,
  target_article_title TEXT        NOT NULL,
  target_article_url   TEXT        NOT NULL,

  -- Langue du jeu (ISO 639-1 : 'fr', 'en', ...)
  language             TEXT        NOT NULL DEFAULT 'fr',

  -- Chemin de navigation en JSONB (Article[])
  -- ADR-002 : JSONB évite une table de jointure en Phase 1.
  -- Si performances critiques en Phase 4 : créer une table game_session_articles.
  path                 JSONB       NOT NULL DEFAULT '[]'::jsonb,

  -- Nombre de sauts (= longueur du path - 1)
  jumps                INTEGER     NOT NULL DEFAULT 0,

  -- Statut avec contrainte CHECK pour cohérence des données
  status               TEXT        NOT NULL DEFAULT 'in_progress'
                       CHECK (status IN ('in_progress', 'won', 'abandoned')),

  -- Horodatages
  started_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at         TIMESTAMPTZ          -- NULL si en cours
);

-- ─────────────────────────────────────────────
-- Index
-- ─────────────────────────────────────────────

-- Index sur le statut pour les requêtes filtrées (ex: sessions actives)
CREATE INDEX IF NOT EXISTS idx_game_sessions_status
  ON game_sessions(status);

-- Index sur started_at DESC pour les classements et statistiques
CREATE INDEX IF NOT EXISTS idx_game_sessions_started_at
  ON game_sessions(started_at DESC);

-- ─────────────────────────────────────────────
-- Rollback (à exécuter manuellement si nécessaire)
-- ─────────────────────────────────────────────
-- DROP INDEX IF EXISTS idx_game_sessions_started_at;
-- DROP INDEX IF EXISTS idx_game_sessions_status;
-- DROP TABLE IF EXISTS game_sessions;
