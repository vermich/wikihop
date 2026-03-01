# ADR-005 : Persistance locale mobile — AsyncStorage vs MMKV

## Statut
Accepté

## Contexte
La Phase 2 de WikiHop introduit des données qui doivent survivre aux redémarrages de l'application côté mobile :
- La `GameSession` en cours (`status: 'in_progress'` ou `'abandoned'`) pour permettre la reprise ou la lecture ultérieure par l'historique (story F3-02)
- Le cache des pages populaires (`popular-pages`) retourné par le backend, avec un TTL de 24 heures pour éviter des appels réseau inutiles sur le HomeScreen
- La préférence de langue de l'utilisateur (`'fr'` ou `'en'`)

Il faut choisir un mécanisme de persistance clé-valeur compatible avec Expo SDK 54 (managed workflow), pérenne jusqu'en Phase 3, et simple à intégrer avec Zustand.

Les deux candidats principaux sont :
- **`@react-native-async-storage/async-storage`** — librairie officielle communauté React Native, incluse dans la stack ADR-002
- **`react-native-mmkv`** — wrapper Expo Module autour de MMKV (memory-mapped key-value store), synchrone, très performant

## Décision
**AsyncStorage est retenu** comme mécanisme de persistance locale pour la Phase 2.

### Données persistées et format des clés

| Clé | Type de valeur | TTL | Description |
|-----|----------------|-----|-------------|
| `@wikihop/game_session` | `GameSession \| null` (JSON) | Aucun | Session en cours ou dernière session abandonnée |
| `@wikihop/popular_pages` | `{ data: Article[], fetchedAt: string }` (JSON ISO 8601) | 24 h | Cache du endpoint `/popular-pages`, invalidé si `fetchedAt + 24h < now` |
| `@wikihop/language` | `'fr' \| 'en'` (JSON) | Aucun | Préférence de langue persistée |

Convention des clés : préfixe `@wikihop/` suivi d'un identifiant en `snake_case`.

### Stratégie TTL pour `popular_pages`
Le champ `fetchedAt` est une chaîne ISO 8601. À chaque lecture, le store vérifie `Date.now() - new Date(fetchedAt).getTime() > 86_400_000`. Si le cache est périmé, une requête réseau est déclenchée et `fetchedAt` est mis à jour.

### Format de sérialisation des sessions pour F3-02
Le JSON stocké sous `@wikihop/game_session` suit exactement l'interface `GameSession` de `packages/shared`. Les sessions `abandoned` y sont lisibles directement par la story F3-02 (historique Phase 3) sans transformation. Aucun champ propriétaire ne doit être ajouté à ce niveau de persistance.

### Intégration avec Zustand
La persistance n'utilise **pas** le middleware `zustand/middleware/persist` de manière automatique. Les lectures/écritures AsyncStorage sont déclenchées explicitement depuis les actions du store (`setGameSession`, `setLanguage`, `setPopularPages`) pour conserver un contrôle total sur la sérialisation, le TTL et la gestion des erreurs. AsyncStorage étant asynchrone, une action `hydrate()` est appelée au démarrage de l'application (dans `App.tsx` ou le root navigator) pour réhydrater le store Zustand.

## Conséquences positives
- Aucune dépendance native supplémentaire — `@react-native-async-storage/async-storage` est déjà dans la stack ADR-002 et compatible Expo SDK 54 managed workflow sans ejection
- API simple et documentée, familière à l'ensemble de l'équipe React Native
- Totalement asynchrone : aucun risque de blocage du thread JS principal
- Le format JSON des sessions est portable et directement consommable par F3-02 sans couche de transformation

## Conséquences négatives
- Performance : AsyncStorage est asynchrone et plus lent que MMKV pour des lectures synchrones fréquentes — acceptable pour WikiHop où la lecture de persistance se fait une seule fois au démarrage (hydratation)
- Pas d'encryption au repos : les données de session sont stockées en clair sur l'appareil. Acceptable en Phase 2 car aucune donnée sensible n'est persistée (pas d'identifiant utilisateur, pas de token)
- La réhydratation asynchrone au démarrage introduit un état transitoire "non hydraté" que les composants doivent gérer (ex. : spinner ou skeleton sur HomeScreen pendant la hydration)

## Alternatives considérées
- **`react-native-mmkv`** — performances synchrones nettement supérieures (lecture en ~1ms vs ~5ms AsyncStorage), mais nécessite `expo-modules-core` et une build native custom (incompatible avec Expo Go). L'intégration en managed workflow requiert un Config Plugin et une Expo prebuild. La performance synchrone n'apporte pas de bénéfice mesurable pour WikiHop où la persistance est lue une seule fois au boot. À reconsidérer si des lectures de persistance fréquentes sont introduites en Phase 4.
- **`expo-secure-store`** — conçu pour les secrets (tokens, credentials), limité à 2 Ko par valeur et synchrone uniquement sur iOS. Inadapté pour stocker des objets `GameSession` qui peuvent dépasser 2 Ko en Phase 3 avec un historique de chemin long.
- **`zustand/middleware/persist` avec AsyncStorage adapter** — possible, mais opaque sur la sérialisation partielle et le TTL. Écarté au profit d'une persistance explicite pour garder le contrôle total sur la logique de cache `popular_pages`.
- **SQLite (`expo-sqlite`)** — surpuissant pour un stockage clé-valeur avec 3 clés. Justifié uniquement si des requêtes relationnelles sur l'historique local sont nécessaires (à reconsidérer en Phase 3 pour F3-02 si le volume d'historique devient significatif).
