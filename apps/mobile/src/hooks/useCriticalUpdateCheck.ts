/**
 * Hook useCriticalUpdateCheck — WikiHop
 *
 * Vérifie les mises à jour OTA au démarrage et force un rechargement immédiat
 * si l'update est marquée comme critique (préfixe `[CRITICAL]` dans le message).
 *
 * Comportement :
 * - No-op si Updates.isEmbeddedLaunch === true (Expo Go / simulateur)
 * - Appelle checkForUpdateAsync() au montage
 * - Si update disponible → fetchUpdateAsync()
 * - Recharge via reloadAsync() uniquement si message commence par [CRITICAL]
 * - Absorbe toutes les erreurs réseau silencieusement (pas de crash)
 *
 * Voir docs/ops/ota-policy.md pour la politique complète.
 */

import * as Updates from 'expo-updates';
import { useEffect } from 'react';

/** Métadonnées d'une update EAS — sous-type de `object` */
interface UpdateMetadata {
  message?: unknown;
}

/**
 * Extrait le message des métadonnées du manifest.
 * Retourne undefined si le manifest ou les métadonnées sont absents.
 */
function getUpdateMessage(manifest: Updates.Manifest | undefined): string | undefined {
  if (manifest === undefined) return undefined;
  // ExpoUpdatesManifest.metadata est typé `object` — accès via cast explicite
  const meta = (manifest as { metadata?: UpdateMetadata }).metadata;
  if (meta === undefined) return undefined;
  return typeof meta.message === 'string' ? meta.message : undefined;
}

export function useCriticalUpdateCheck(): void {
  useEffect(() => {
    if (Updates.isEmbeddedLaunch) {
      return;
    }

    async function checkForCriticalUpdate(): Promise<void> {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (!update.isAvailable) return;

        const fetchedUpdate = await Updates.fetchUpdateAsync();
        const message = getUpdateMessage(fetchedUpdate.manifest);
        if (typeof message === 'string' && message.startsWith('[CRITICAL]')) {
          await Updates.reloadAsync();
        }
      } catch {
        // Erreur réseau ou SDK — absorber silencieusement, l'app continue
      }
    }

    void checkForCriticalUpdate();
  }, []);
}
