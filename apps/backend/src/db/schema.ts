/**
 * db/schema.ts — Définitions TypeScript des tables PostgreSQL
 *
 * Ces types reflètent exactement le schéma SQL de migrations/001_initial_schema.sql.
 * Toute modification du schéma SQL doit être répercutée ici (et vice-versa).
 *
 * Convention de nommage :
 * - Types TypeScript : PascalCase, suffixe Row (ex: GameSessionRow)
 * - Colonnes SQL : snake_case
 * - Mapping snake_case → camelCase dans les services (pas dans les queries)
 */

import type { GameStatus } from '@wikihop/shared';

/**
 * Représente une ligne de la table `game_sessions` telle que retournée par PostgreSQL.
 *
 * Les colonnes JSONB (path) sont typées comme `unknown` à ce niveau —
 * la désérialisation et la validation se font dans les services (Zod).
 */
export interface GameSessionRow {
  /** UUID généré par gen_random_uuid() */
  id: string;
  /** ID Wikipedia de l'article de départ */
  start_article_id: string;
  /** Titre de l'article de départ */
  start_article_title: string;
  /** URL complète de l'article de départ */
  start_article_url: string;
  /** ID Wikipedia de l'article cible */
  target_article_id: string;
  /** Titre de l'article cible */
  target_article_title: string;
  /** URL complète de l'article cible */
  target_article_url: string;
  /** Langue du jeu (ISO 639-1) */
  language: string;
  /**
   * Chemin de navigation stocké en JSONB.
   * Structure : Article[] (voir @wikihop/shared)
   * ADR-002 : JSONB pour éviter une table de jointure en Phase 1.
   */
  path: unknown;
  /** Nombre de sauts effectués */
  jumps: number;
  /** Statut de la session */
  status: GameStatus;
  /** Timestamp de début */
  started_at: Date;
  /** Timestamp de fin (null si en cours) */
  completed_at: Date | null;
}
