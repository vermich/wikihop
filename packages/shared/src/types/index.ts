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

/**
 * Résumé d'un article Wikipedia retourné par l'API REST (/page/summary/{title}).
 * Utilisé par M-02 (backend) et M-08 (mobile) comme type de contrat commun.
 *
 * Étend `Article` avec les champs supplémentaires de l'API Wikimedia REST.
 */
export interface ArticleSummary extends Article {
  /** Extrait texte brut (premier paragraphe, > 200 chars si article non-ébauche) */
  extract: string;
  /** URL de l'image de couverture (thumbnail), absente si article sans image */
  thumbnailUrl?: string;
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
// Historique des parties
// ─────────────────────────────────────────────

/**
 * Enregistrement d'une partie terminée dans l'historique local.
 * Sous-ensemble de GameSession — ne contient pas le chemin complet
 * pour limiter la taille de stockage AsyncStorage.
 *
 * Les dates sont stockées en string ISO 8601 (pas Date) car AsyncStorage
 * sérialise en JSON — pas de désérialisation nécessaire à la lecture.
 *
 * Story : F3-02
 */
export interface GameRecord {
  /** Identifiant unique de la partie (UUID v4, issu de GameSession.id) */
  id: string;
  /** Article de départ */
  startArticle: Article;
  /** Article destination */
  targetArticle: Article;
  /** Nombre de sauts effectués */
  jumps: number;
  /** Durée de la partie en millisecondes (calculée : completedAt - startedAt) */
  durationMs: number;
  /** Date de début ISO 8601 (string) */
  startedAt: string;
  /** Date de fin ISO 8601 (toujours présente car la partie est terminée) */
  completedAt: string;
  /** Statut final : 'won' ou 'abandoned' */
  status: 'won' | 'abandoned';
}

// ─────────────────────────────────────────────
// Défi quotidien
// ─────────────────────────────────────────────

/**
 * Paire d'articles constituant le défi du jour.
 * Identique pour tous les joueurs à une date donnée.
 * Utilisé par Phase 3 (F3-01).
 */
export interface GameRecord {
  /** Identifiant unique de la partie (UUID v4, issu de GameSession.id) */
  id: string;
  /** Article de départ */
  startArticle: Article;
  /** Article destination */
  targetArticle: Article;
  /** Nombre de sauts effectués */
  jumps: number;
  /** Durée de la partie en millisecondes (calculée : completedAt - startedAt) */
  durationMs: number;
  /** Date de début ISO 8601 (string) */
  startedAt: string;
  /** Date de fin ISO 8601 (toujours présente car la partie est terminée) */
  completedAt: string;
  /** Statut final : 'won' ou 'abandoned' */
  status: 'won' | 'abandoned';
}

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
