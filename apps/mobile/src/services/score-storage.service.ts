/**
 * ScoreStorage — Service de persistance de l'historique des parties (F3-02)
 *
 * Clé AsyncStorage : @wikihop/game_history
 * Capacité maximale : 50 entrées (les plus récentes en premier)
 *
 * Contrat :
 *   - save()         : insère en tête, tronque à 50 entrées
 *   - getAll()       : retourne toutes les entrées ou [] en cas d'erreur
 *   - deleteRecord() : supprime une entrée par id, no-op si absent
 *   - deleteAll()    : vide l'historique
 *
 * Éco-conception :
 *   - Les erreurs AsyncStorage sont loguées (console.error) et ne
 *     remontent JAMAIS vers l'appelant. L'historique est best-effort.
 *   - Pas de polling — les données ne sont lues qu'à la demande
 *     explicite du hook useGameHistory (useFocusEffect + montage).
 *
 * Conventions :
 *   - Exports nommés uniquement (pas de default export)
 *   - Zéro any — JSON.parse typé explicitement
 *   - noUncheckedIndexedAccess satisfait
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GameRecord } from '@wikihop/shared';

/** Clé AsyncStorage dédiée à l'historique (distincte de @wikihop/game_session) */
const HISTORY_KEY = '@wikihop/game_history';

/** Nombre maximum d'entrées conservées (les plus récentes en tête) */
const MAX_ENTRIES = 50;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers internes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lit et désérialise l'historique depuis AsyncStorage.
 * Retourne un tableau vide en cas d'absence ou d'erreur de parsing.
 * Cette fonction interne peut lever — les fonctions publiques catchent.
 */
async function readAll(): Promise<GameRecord[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  if (raw === null) {
    return [];
  }

  // JSON.parse typé explicitement (jamais de any)
  const parsed = JSON.parse(raw) as unknown;

  // Guard : vérifier que le résultat est bien un tableau
  if (!Array.isArray(parsed)) {
    console.error('[ScoreStorage] Données corrompues — format inattendu, réinitialisation.');
    return [];
  }

  return parsed as GameRecord[];
}

// ─────────────────────────────────────────────────────────────────────────────
// API publique
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sauvegarde une partie terminée dans l'historique.
 *
 * - Insère en tête de liste (la plus récente en premier)
 * - Tronque à MAX_ENTRIES (50) après insertion
 * - Les erreurs AsyncStorage sont loguées et ne bloquent pas l'appelant
 *
 * @param record - GameRecord à sauvegarder
 */
export async function save(record: GameRecord): Promise<void> {
  try {
    const existing = await readAll();
    const updated = [record, ...existing].slice(0, MAX_ENTRIES);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (e: unknown) {
    console.error('[ScoreStorage] Erreur lors de la sauvegarde :', e);
  }
}

/**
 * Retourne toutes les parties enregistrées, de la plus récente à la plus ancienne.
 * Retourne un tableau vide si aucune entrée ou en cas d'erreur de lecture.
 */
export async function getAll(): Promise<ReadonlyArray<GameRecord>> {
  try {
    return await readAll();
  } catch (e: unknown) {
    console.error('[ScoreStorage] Erreur lors de la lecture :', e);
    return [];
  }
}

/**
 * Supprime une entrée de l'historique par son identifiant.
 * No-op silencieux si l'identifiant n'existe pas.
 *
 * @param id - UUID de la partie à supprimer
 */
export async function deleteRecord(id: string): Promise<void> {
  try {
    const existing = await readAll();
    const filtered = existing.filter((record) => record.id !== id);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
  } catch (e: unknown) {
    console.error('[ScoreStorage] Erreur lors de la suppression :', e);
  }
}

/**
 * Efface l'intégralité de l'historique.
 */
export async function deleteAll(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch (e: unknown) {
    console.error('[ScoreStorage] Erreur lors de la suppression totale :', e);
  }
}
