/**
 * daily-challenge.utils.ts — Fonctions pures pour le défi quotidien
 *
 * Ces fonctions sont pures et déterministes — testées via TDD strict.
 * Elles garantissent que tous les joueurs obtiennent la même paire d'articles
 * pour un jour UTC donné, sans persistance en base de données.
 *
 * Référence : docs/stories/phase-3/F3-01-daily-challenge.md
 */

// ---------------------------------------------------------------------------
// djb2Hash — algorithme de hachage djb2
// ---------------------------------------------------------------------------

/**
 * Implémentation de l'algorithme de hachage djb2.
 *
 * L'algorithme est : hash = hash * 33 + charCode
 * équivalent à : hash = ((hash << 5) + hash) + charCode
 *
 * Le masque `>>> 0` convertit en entier 32 bits non signé pour éviter les
 * débordements négatifs en JavaScript (les entiers JS sont 64 bits flottants).
 *
 * @param input - Chaîne à hacher (ex : '2026-03-09')
 * @returns Entier non négatif 32 bits
 */
export function djb2Hash(input: string): number {
  let hash = 5381;

  for (let i = 0; i < input.length; i++) {
    const charCode = input.charCodeAt(i);
    // hash * 33 + charCode via opération bit-à-bit
    hash = ((hash << 5) + hash + charCode) >>> 0;
  }

  return hash >>> 0;
}

// ---------------------------------------------------------------------------
// getTodayUTC — date UTC courante au format YYYY-MM-DD
// ---------------------------------------------------------------------------

/**
 * Retourne la date UTC courante au format ISO YYYY-MM-DD.
 *
 * Utilise `toISOString()` pour garantir l'utilisation de l'heure UTC,
 * indépendamment du fuseau horaire du serveur.
 *
 * @returns Chaîne de date au format 'YYYY-MM-DD'
 */
export function getTodayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// computeDailyIndices — calcul déterministe de deux indices distincts
// ---------------------------------------------------------------------------

/**
 * Calcule deux indices distincts dans un pool d'articles à partir d'un hash.
 *
 * L'algorithme garantit :
 * - Déterminisme : même hash + même poolSize → même paire
 * - Distinctivité : les deux indices sont toujours différents
 * - Bornes : les indices sont dans [0, poolSize - 1]
 *
 * Méthode :
 * - Premier indice : hash modulo poolSize
 * - Deuxième indice : (hash / poolSize) modulo (poolSize - 1), ajusté si égal au premier
 *
 * @param hash     - Hash djb2 d'une date (issu de djb2Hash)
 * @param poolSize - Taille du pool d'articles (doit être >= 2)
 * @returns Tuple [indexStart, indexTarget] avec indexStart !== indexTarget
 */
export function computeDailyIndices(hash: number, poolSize: number): [number, number] {
  const first = hash % poolSize;

  // Utilise la partie haute du hash pour le deuxième indice
  // Division entière pour extraire une valeur indépendante
  const secondRaw = Math.floor(hash / poolSize) % (poolSize - 1);

  // Décale pour éviter la collision avec le premier indice
  const second = secondRaw >= first ? secondRaw + 1 : secondRaw;

  return [first, second];
}
