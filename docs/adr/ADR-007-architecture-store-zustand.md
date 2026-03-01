# ADR-007 : Architecture du store Zustand — Phase 2

## Statut
Accepté

## Contexte
La Phase 2 introduit la logique de jeu complète (GameSession), la sélection de langue, et un cache de pages populaires côté mobile. Le store Zustand (retenu en ADR-002) doit être structuré pour :
- Gérer l'état en mémoire pendant une session active
- Se coordonner avec la persistance AsyncStorage (retenue en ADR-005) sans dupliquer la logique
- Supporter la future story F3-02 (historique des parties Phase 3) sans refactoring majeur

Il faut décider du découpage en slices, de la frontière mémoire/persistance, des règles de verrouillage de langue, et de la stratégie d'invalidation du cache `popularPages`.

## Décision

### Trois slices Zustand distinctes

Le store est organisé en trois slices combinées dans un store unique via le pattern de composition Zustand (fonctions retournant des sous-états et des actions) :

#### Slice `gameSession`

```typescript
interface GameSessionSlice {
  // État
  currentSession: GameSession | null;
  // Actions
  startSession: (startArticle: Article, targetArticle: Article) => void;
  addArticleToPath: (article: Article) => void;
  completeSession: () => void;
  abandonSession: () => void;
  clearSession: () => void;
}
```

- `startSession` crée une nouvelle `GameSession` avec `status: 'in_progress'`, `jumps: 0`, `startedAt: new Date().toISOString()`, et persiste immédiatement via AsyncStorage (`@wikihop/game_session`)
- `addArticleToPath` ajoute l'article au tableau `path`, incrémente `jumps`, et persiste
- `completeSession` passe `status` à `'won'`, renseigne `completedAt`, et persiste
- `abandonSession` passe `status` à `'abandoned'` et persiste — ce JSON doit rester lisible par F3-02 sans transformation
- `clearSession` met `currentSession` à `null` et supprime la clé AsyncStorage

#### Slice `language`

```typescript
interface LanguageSlice {
  // État
  language: Language; // 'fr' | 'en'
  isLanguageLocked: boolean;
  // Actions
  setLanguage: (lang: Language) => void;
}
```

- `language` est initialisée à `'fr'` par défaut si aucune valeur n'est persistée
- `setLanguage` est **bloquée si `isLanguageLocked === true`** — la langue ne peut pas changer pendant une partie en cours (voir règle ci-dessous)
- `isLanguageLocked` est dérivée de l'état `gameSession.currentSession?.status === 'in_progress'` — elle n'est **pas** un champ indépendant dans le store mais un sélecteur calculé. Sa valeur est `true` uniquement quand `currentSession` existe et est `in_progress`.
- Persistance : `setLanguage` écrit dans AsyncStorage (`@wikihop/language`) uniquement si le changement est autorisé

#### Slice `popularPages`

```typescript
interface PopularPagesSlice {
  // État
  popularPages: Article[];
  popularPagesFetchedAt: string | null; // ISO 8601
  popularPagesLanguage: Language | null; // langue lors du dernier fetch
  // Actions
  setPopularPages: (pages: Article[], language: Language) => void;
  invalidatePopularPages: () => void;
}
```

- `setPopularPages` stocke les articles, l'heure du fetch (`new Date().toISOString()`), la langue du fetch, et persiste via AsyncStorage (`@wikihop/popular_pages`)
- `invalidatePopularPages` vide le cache en mémoire et supprime la clé AsyncStorage — appelé automatiquement si la langue change (voir règle d'invalidation)
- La date de dernier fetch (`popularPagesFetchedAt`) est exposée dans le store pour que le HomeScreen puisse afficher "Mis à jour il y a X heures"

### Règle : verrouillage de la langue pendant une partie

La langue est verrouillée (`isLanguageLocked = true`) dès qu'une `GameSession` avec `status: 'in_progress'` existe dans le store. `setLanguage` ne fait rien si ce verrou est actif (pas d'erreur levée, simplement ignoré). Ce comportement est documenté dans les specs Frontend (Laurent) pour que l'UI reflète l'état désactivé du sélecteur de langue.

Justification : changer de langue en cours de partie implique de changer l'article cible et le contenu des articles en chemin — expérience incohérente et techniquement complexe. La simplicité prime.

### Règle : invalidation du cache `popularPages` lors d'un changement de langue

Quand `setLanguage` est appelé avec succès (partie non en cours), si `popularPagesLanguage !== nouvelle langue`, `invalidatePopularPages()` est appelé immédiatement. Le HomeScreen déclenchera un nouveau fetch au prochain montage.

```
setLanguage('en')
  → if currentSession?.status !== 'in_progress'
    → persiste 'en' dans AsyncStorage
    → if popularPagesLanguage !== 'en'
      → invalidatePopularPages()
```

### Frontière mémoire / persistance

| Données | Localisation | Persistance AsyncStorage |
|---------|-------------|--------------------------|
| `currentSession` | Store Zustand (mémoire) | Oui — écrite à chaque mutation |
| `language` | Store Zustand (mémoire) | Oui — écrite à chaque `setLanguage` autorisé |
| `popularPages` + `fetchedAt` + `fetchedLanguage` | Store Zustand (mémoire) | Oui — écrite à chaque `setPopularPages` |
| `isLanguageLocked` | Sélecteur calculé (pas dans AsyncStorage) | Non |

La réhydratation est effectuée **une seule fois** au démarrage de l'application via une action `hydrate()` qui lit les trois clés AsyncStorage et initialise le store. Cette action est appelée dans le root component avant le rendu des écrans.

### Non-utilisation du middleware `zustand/middleware/persist`

Le middleware `persist` est écarté (conformément à ADR-005) car :
1. Il ne supporte pas nativement la logique de TTL sur `popularPages`
2. Il persiste l'intégralité du slice par défaut, ce qui inclurait `isLanguageLocked` (champ calculé à ne pas persister)
3. La gestion fine des erreurs AsyncStorage (try/catch par action) est plus explicite et plus testable

### Compatibilité Phase 3 (F3-02 — historique)

Le format JSON de `GameSession` stocké dans AsyncStorage (`@wikihop/game_session`) suit exactement l'interface `packages/shared` sans champ supplémentaire. F3-02 pourra lire ces sessions directement. Si un stockage d'un historique de plusieurs sessions est nécessaire (Phase 3), il sera géré par une quatrième clé AsyncStorage (`@wikihop/game_history`) sans modifier la structure de `@wikihop/game_session`. Aucun changement de store ne sera requis — uniquement l'ajout d'une slice `history` optionnelle.

## Conséquences positives
- Séparation claire des responsabilités : trois slices indépendantes et testables unitairement
- La règle de verrouillage de langue est encodée dans le store — l'UI n'a pas à la gérer elle-même
- L'invalidation du cache `popularPages` est atomique avec le changement de langue — pas de risque d'incohérence entre la langue affichée et le contenu du cache
- Format de session compatible Phase 3 sans dette technique

## Conséquences négatives
- La réhydratation asynchrone au démarrage crée un état transitoire : les composants doivent gérer un store partiellement initialisé (ex. : `popularPages` vide le temps de la lecture AsyncStorage). Mitigation : un booléen `isHydrated` dans le store pour conditionner l'affichage des écrans
- Les mutations AsyncStorage sont synchronisées manuellement dans chaque action — risque d'oubli lors de l'ajout de nouvelles actions. Mitigation : pattern de convention documenté dans les specs Frontend
- `isLanguageLocked` est un sélecteur calculé, non un champ du store — les développeurs doivent utiliser `useGameSessionStore(state => state.currentSession?.status === 'in_progress')` et non rechercher un champ `isLanguageLocked` inexistant

## Alternatives considérées
- **Un store unique monolithique** — simplifie la création mais rend les tests difficiles (impossible de mocker une slice sans l'autre) et les sélecteurs ambigus. Écarté.
- **`zustand/middleware/persist` automatique** — voir ADR-005 pour la justification complète de l'écart. Le TTL et la sérialisation partielle nécessitent une gestion manuelle.
- **`isLanguageLocked` comme champ indépendant** — introduit une duplication d'état (deux sources de vérité : `currentSession.status` et `isLanguageLocked`). Risque de désynchronisation. Écarté au profit du sélecteur calculé.
- **Redux Toolkit** — écarté en ADR-002. Rappel : boilerplate disproportionné pour un état de jeu simple.
