/**
 * share.utils.ts — WikiHop Mobile — F3-03
 *
 * Fonctions pures pour la construction du message de partage.
 *
 * Références :
 *   Story : docs/stories/phase-3/F3-03-share-result.md
 *   Spec  : Maxime (Tech Lead) — 2026-03-08
 *
 * Conventions :
 *   - Exports nommés uniquement
 *   - Fonctions pures, zéro effet de bord
 *   - Zéro any, TypeScript strict
 */

// ─────────────────────────────────────────────────────────────────────────────
// Helpers internes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formate un nombre de secondes en chaîne lisible.
 * Exemples : 45 → "45 s" | 125 → "2 m 05 s"
 *
 * Logique identique à formatElapsed dans VictoryScreen —
 * dupliquée ici pour éviter un import depuis un composant screen dans un utilitaire.
 */
function formatElapsedSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0
    ? `${String(m)} m ${String(s).padStart(2, '0')} s`
    : `${String(s)} s`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports publics
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Construit le message texte à partager depuis les stats de victoire.
 * Fonction pure — pas d'effets de bord.
 *
 * Format :
 *   WikiHop — J'ai relié "[startTitle]" à "[targetTitle]"
 *   en [jumps] saut[s] et [formatElapsed(elapsedSeconds)] !
 *
 *   Sauras-tu faire mieux ?
 *
 * Règle de pluriel : "saut" si jumps <= 1, "sauts" si jumps > 1.
 *
 * @param startTitle      - Titre de l'article de départ
 * @param targetTitle     - Titre de l'article destination
 * @param jumps           - Nombre de sauts effectués
 * @param elapsedSeconds  - Durée de la partie en secondes
 */
export function buildShareMessage(
  startTitle: string,
  targetTitle: string,
  jumps: number,
  elapsedSeconds: number,
): string {
  const jumpWord = jumps <= 1 ? 'saut' : 'sauts';
  const elapsed = formatElapsedSeconds(elapsedSeconds);

  return [
    `WikiHop — J'ai relié "${startTitle}" à "${targetTitle}"`,
    `en ${String(jumps)} ${jumpWord} et ${elapsed} !`,
    '',
    'Sauras-tu faire mieux ?',
  ].join('\n');
}
