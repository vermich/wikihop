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

/** Constante runtime des langues supportées — F3-26 */
export const SUPPORTED_LANGUAGES = ['fr', 'en', 'es', 'de', 'pt', 'it', 'nl', 'pl'] as const;

/** Langues supportées par WikiHop (ISO 639-1) — F3-26 */
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

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

/** Niveau de difficulté d'une partie (F3-05) */
export type GameDifficulty = 'normal' | 'hard';

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
  /** Indique si la partie est un défi quotidien (F3-01). Absent si partie normale. */
  isDailyChallenge?: boolean;
  /** Date du défi YYYY-MM-DD (présente si isDailyChallenge === true, F3-01). */
  dailyChallengeDate?: string;
  /** Difficulté de la partie (F3-05). Absent = 'normal' pour rétrocompatibilité. */
  difficulty?: GameDifficulty;
  /**
   * Indique si la session fait partie d'une session multijoueur hot-seat (F3-30).
   * Absent = false pour les sessions solo.
   * Les sessions multijoueur ne sont PAS enregistrées dans l'historique solo.
   */
  isMultiplayer?: boolean;
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
  /** Indique si la partie était un défi quotidien (F3-01). Absent si partie normale. */
  isDailyChallenge?: boolean;
  /** Date du défi YYYY-MM-DD (F3-01). */
  dailyChallengeDate?: string;
  /** Difficulté de la partie (F3-05). Absent = 'normal' pour rétrocompatibilité. */
  difficulty?: GameDifficulty;
  /**
   * Chemin complet parcouru (F3-24).
   * Optionnel — absent pour les parties enregistrées avant F3-24 (rétrocompatibilité).
   */
  path?: Article[];
}

// ─────────────────────────────────────────────
// Historique des parties multijoueur
// ─────────────────────────────────────────────

/**
 * Résultat d'un joueur pour une manche donnée — F3-31.
 * Migré depuis multiplayer.store.ts pour éviter une dépendance
 * packages/shared → apps/mobile. Le store ré-exporte ce type depuis shared.
 *
 * Story : F3-31
 */
export interface MultiplayerRoundResult {
  jumps: number | null;
  durationMs: number | null;
  won: boolean;
}

/**
 * Enregistrement d'une session multijoueur terminée.
 * Stocké dans AsyncStorage — les dates sont en string ISO 8601
 * (pas Date) pour éviter toute désérialisation.
 *
 * Story : F3-31
 */
export interface MultiplayerGameRecord {
  /** Identifiant unique de la session (UUID v4) */
  id: string;
  /** Date de début de session — ISO 8601 string */
  date: string;
  /** Noms des joueurs dans l'ordre de leur index */
  playerNames: string[];
  /** Nombre total de manches jouées */
  roundCount: number;
  /**
   * Historique des résultats par manche.
   * roundHistory[roundIndex][playerIndex] = résultat du joueur.
   * Contient TOUTES les manches, y compris la dernière.
   */
  roundHistory: MultiplayerRoundResult[][];
  /**
   * Nom du gagnant global (calculé à partir de rankPlayersGlobal).
   * null si égalité parfaite (wins/jumps/durée identiques pour plusieurs joueurs).
   */
  winner: string | null;
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
