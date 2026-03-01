/**
 * @wikihop/shared — Types TypeScript partagés
 *
 * Ces types constituent le contrat entre le mobile et le backend.
 * Toute modification ici doit être coordonnée avec Tech Lead (Maxime).
 *
 * ADR-002 : Types partagés dans packages/shared, pas de logique métier.
 */

// ─────────────────────────────────────────────
// Primitives
// ─────────────────────────────────────────────

/** Langues supportées par WikiHop (ISO 639-1) */
export type Language = 'fr' | 'en';

// ─────────────────────────────────────────────
// Entités Wikipedia
// ─────────────────────────────────────────────

/**
 * Représente un article Wikipedia.
 * `id` correspond au `pageid` retourné par l'API REST Wikipedia.
 */
export interface Article {
  /** Identifiant unique Wikipedia (pageid) */
  id: string;
  /** Titre de l'article tel qu'affiché sur Wikipedia */
  title: string;
  /** URL complète de l'article */
  url: string;
  /** Langue de l'article (ex: 'fr', 'en') */
  language: Language;
}

// ─────────────────────────────────────────────
// Session de jeu
// ─────────────────────────────────────────────

/** États possibles d'une session de jeu */
export type GameStatus = 'in_progress' | 'won' | 'abandoned';

/**
 * Représente une session de jeu complète.
 *
 * Une session est créée au démarrage d'une partie et mise à jour
 * à chaque saut (ajout dans `path`) ou changement de statut.
 *
 * Règle métier : `jumps === path.length - 1` (premier article = départ, pas compté)
 */
export interface GameSession {
  /** Identifiant unique de la session (UUID v4) */
  id: string;
  /** Article de départ (imposé par le système) */
  startArticle: Article;
  /** Article cible à atteindre */
  targetArticle: Article;
  /** Liste ordonnée des articles visités, startArticle inclus en position 0 */
  path: Article[];
  /** Nombre de sauts effectués (= path.length - 1) */
  jumps: number;
  /** Timestamp ISO 8601 de début de partie */
  startedAt: Date;
  /** Timestamp ISO 8601 de fin de partie (undefined si en cours) */
  completedAt?: Date;
  /** Statut courant de la session */
  status: GameStatus;
}

// ─────────────────────────────────────────────
// Défi quotidien
// ─────────────────────────────────────────────

/**
 * Paire d'articles constituant le défi du jour.
 * Identique pour tous les joueurs à une date donnée.
 * Utilisé par Phase 3 (F3-01).
 */
export interface DailyChallenge {
  /** Date du défi (format YYYY-MM-DD) */
  date: string;
  /** Article de départ du défi */
  startArticle: Article;
  /** Article cible du défi */
  targetArticle: Article;
  /** Langue du défi */
  language: Language;
}

// ─────────────────────────────────────────────
// API — Contrats de réponse partagés
// ─────────────────────────────────────────────

/**
 * Enveloppe standard pour les réponses API réussies.
 * Le backend retourne toujours cette structure.
 */
export interface ApiResponse<T> {
  success: true;
  data: T;
}

/**
 * Enveloppe standard pour les erreurs API.
 */
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

/** Union discriminée pour typer les réponses API */
export type ApiResult<T> = ApiResponse<T> | ApiError;

// ─────────────────────────────────────────────
// Guards de type utilitaires
// ─────────────────────────────────────────────

/** Type guard : vérifie si une réponse API est un succès */
export function isApiResponse<T>(result: ApiResult<T>): result is ApiResponse<T> {
  return result.success === true;
}

/** Type guard : vérifie si une réponse API est une erreur */
export function isApiError<T>(result: ApiResult<T>): result is ApiError {
  return result.success === false;
}
