/**
 * MultiplayerScoreStorage — Service de persistance de l'historique multijoueur (F3-31)
 *
 * Clé AsyncStorage : @wikihop/multiplayer_history
 * Capacité maximale : 20 entrées (les plus récentes en premier)
 *
 * Contrat :
 *   - save()    : insère en tête, tronque à 20 entrées
 *   - loadAll() : retourne toutes les entrées ou [] en cas d'erreur
 *
 * Éco-conception :
 *   - Les erreurs AsyncStorage sont loguées (console.error) et ne
 *     remontent JAMAIS vers l'appelant. L'historique est best-effort.
 *   - Pas de polling — les données ne sont lues qu'à la demande
 *     explicite (useFocusEffect dans MultiplayerHistoryScreen).
 *
 * Conventions :
 *   - Exports nommés uniquement (pas de default export)
 *   - Zéro any — JSON.parse typé explicitement
 *   - noUncheckedIndexedAccess satisfait
 *
 * Story : F3-31
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MultiplayerGameRecord } from '@wikihop/shared';

/** Clé AsyncStorage dédiée à l'historique multijoueur */
const MULTIPLAYER_HISTORY_KEY = '@wikihop/multiplayer_history';

/** Nombre maximum d'entrées conservées (les plus récentes en tête) */
const MAX_ENTRIES = 20;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers internes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lit et désérialise l'historique depuis AsyncStorage.
 * Retourne un tableau vide en cas d'absence ou de données corrompues.
 * Cette fonction interne peut lever — les fonctions publiques catchent.
 */
async function readAll(): Promise<MultiplayerGameRecord[]> {
  const raw = await AsyncStorage.getItem(MULTIPLAYER_HISTORY_KEY);
  if (raw === null) {
    return [];
  }

  // JSON.parse typé explicitement (jamais de any)
  const parsed = JSON.parse(raw) as unknown;

  // Guard obligatoire : données corrompues → réinitialisation silencieuse
  if (!Array.isArray(parsed)) {
    console.error('[MultiplayerScoreStorage] Données corrompues — format inattendu, réinitialisation.');
    return [];
  }

  return parsed as MultiplayerGameRecord[];
}

// ─────────────────────────────────────────────────────────────────────────────
// API publique
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sauvegarde une session multijoueur terminée dans l'historique.
 *
 * - Insère en tête de liste (la plus récente en premier)
 * - Tronque à MAX_ENTRIES (20) après insertion
 * - Les erreurs AsyncStorage sont loguées et ne bloquent pas l'appelant
 *
 * @param record - MultiplayerGameRecord à sauvegarder
 */
export async function save(record: MultiplayerGameRecord): Promise<void> {
  try {
    const existing = await readAll();
    const updated = [record, ...existing].slice(0, MAX_ENTRIES);
    await AsyncStorage.setItem(MULTIPLAYER_HISTORY_KEY, JSON.stringify(updated));
  } catch (e: unknown) {
    console.error('[MultiplayerScoreStorage] Erreur lors de la sauvegarde :', e);
  }
}

/**
 * Retourne toutes les sessions enregistrées, de la plus récente à la plus ancienne.
 * Retourne un tableau vide si aucune entrée ou en cas d'erreur de lecture.
 */
export async function loadAll(): Promise<ReadonlyArray<MultiplayerGameRecord>> {
  try {
    return await readAll();
  } catch (e: unknown) {
    console.error('[MultiplayerScoreStorage] Erreur lors de la lecture :', e);
    return [];
  }
}
