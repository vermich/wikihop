/**
 * Utilitaires de langue — WikiHop Mobile — F3-26
 *
 * Fonctions pures pour la validation des langues supportées.
 * Utilise SUPPORTED_LANGUAGES depuis @wikihop/shared comme source de vérité unique.
 */

import { SUPPORTED_LANGUAGES } from '@wikihop/shared';
import type { Language } from '@wikihop/shared';

/**
 * Type guard : vérifie si une valeur inconnue est une Language supportée.
 *
 * Utilise SUPPORTED_LANGUAGES depuis @wikihop/shared — source de vérité unique.
 * Le cast `as ReadonlyArray<unknown>` est nécessaire car `includes` sur un tuple
 * `readonly ['fr', 'en', ...]` attend un paramètre du type du tuple, pas `unknown`.
 * Ce cast est sûr ici car il est précédé d'un guard d'inclusion.
 */
export function isSupportedLanguage(value: unknown): value is Language {
  return (SUPPORTED_LANGUAGES as ReadonlyArray<unknown>).includes(value);
}
