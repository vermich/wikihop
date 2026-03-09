/**
 * hard-mode.utils.ts — Fonctions pures pour le mode difficile
 *
 * La stratégie du mode difficile repose sur la position des articles dans le
 * classement des pages les plus vues. Les articles en fin de classement sont
 * moins populaires et donc thématiquement plus éloignés les uns des autres,
 * ce qui augmente la difficulté de navigation.
 *
 * Référence : docs/stories/phase-3/F3-05-hard-mode.md
 */

// ---------------------------------------------------------------------------
// getHardModePool
// ---------------------------------------------------------------------------

/**
 * Extrait le sous-ensemble "difficile" d'un pool d'articles.
 *
 * Le pool difficile correspond au dernier tiers du tableau d'articles.
 * Ces articles sont moins populaires (en fin de classement des pageviews),
 * ce qui maximise la distance sémantique probable entre articles cibles.
 *
 * Si le sous-ensemble résultant contient moins de 2 articles, retourne un
 * tableau vide — l'appelant est responsable de répondre 503.
 *
 * Calcul : taille du tiers = Math.floor(articles.length / 3)
 * Début du sous-ensemble = articles.length - taille du tiers
 *
 * @param articles - Pool complet d'articles (ordonné par popularité décroissante)
 * @returns Sous-ensemble des articles les moins populaires (dernier tiers)
 */
export function getHardModePool(articles: string[]): string[] {
  const thirdSize = Math.floor(articles.length / 3);

  // Garde : si le tiers contient moins de 2 articles → pool insuffisant
  if (thirdSize < 2) {
    return [];
  }

  const startIndex = articles.length - thirdSize;
  return articles.slice(startIndex);
}
