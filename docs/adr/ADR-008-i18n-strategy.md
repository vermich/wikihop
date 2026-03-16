# ADR-008 : Stratégie d'internationalisation (i18n) — 8 langues cibles

## Statut
Accepté

## Contexte

WikiHop cible une audience internationale. La Phase 3 (F3-26) requiert la traduction de l'interface mobile en 8 langues : français (fr), anglais (en), espagnol (es), allemand (de), portugais (pt), italien (it), néerlandais (nl), polonais (pl). Le français est la langue par défaut et le fallback.

Deux problèmes distincts sont à résoudre :

1. **Traduction des chaînes UI** : tous les textes en dur dans les composants React Native doivent être externalisés dans des fichiers de traduction et remplacés par des appels à une fonction `t('clé')`.
2. **Extension de la langue Wikipedia** : le type `Language` dans `packages/shared` est actuellement `'fr' | 'en'`. Il doit être étendu aux 8 langues cibles pour que l'API Wikipedia retourne des articles dans la bonne langue (ex : `es.wikipedia.org`, `de.wikipedia.org`).

Le store `language.store.ts` gère déjà la sélection et la persistance de langue via AsyncStorage (`@wikihop/language`). La logique de verrouillage et d'invalidation du cache popularPages est documentée dans ADR-007. Cette infrastructure est conservée et étendue — elle n'est pas refaite.

## Décision

### 1. Bibliothèque retenue : `i18next` + `react-i18next`

`i18next` avec le binding `react-i18next` est retenu comme couche de traduction.

Configuration minimale :
- Initialisation synchrone via `i18next.init()` au démarrage, avant le premier rendu React
- Ressources embarquées directement dans le bundle (pas de chargement réseau des traductions)
- Pas de plugin de détection automatique de langue du système intégré à i18next — la langue est lue depuis le store Zustand (`language.store.ts`), qui est lui-même réhydraté depuis AsyncStorage au démarrage. La synchronisation i18next ↔ store est assurée manuellement via `i18next.changeLanguage(lang)` dans `setLanguage()`.

### 2. Structure des fichiers de traduction

```
apps/mobile/src/i18n/
├── i18n.ts                  ← configuration i18next + initialisation
└── locales/
    ├── fr.json              ← français (source de vérité)
    ├── en.json
    ├── es.json
    ├── de.json
    ├── pt.json
    ├── it.json
    ├── nl.json
    └── pl.json
```

`fr.json` est le fichier de référence. Toute nouvelle clé est d'abord ajoutée en français, puis propagée dans les autres locales. Les locales manquantes retombent sur le français (fallback i18next).

### 3. Convention de nommage des clés

Les clés suivent la convention `[écran].[élément]` en snake_case. Le namespace est unique (`translation`, valeur par défaut i18next — pas de namespace multiple en Phase 3).

Exemples :
```
home.play_button
home.daily_challenge_button
home.daily_challenge_completed
home.new_articles_button
home.history_link
home.support_wikipedia_link
home.about_link
home.multiplayer_button
home.error_load_title
home.error_load_subtitle
home.retry_button
home.resuming_session_title
home.resuming_session_message
home.resuming_session_resume
home.resuming_session_new_game
home.card_label_start
home.card_label_target
victory.header_title
victory.congrats_text
victory.stat_jump_singular
victory.stat_jump_plural
victory.stat_duration_label
victory.path_section_title
victory.read_button
victory.new_game_button
victory.replay_button
victory.next_turn_button
victory.share_button
victory.badge_daily_challenge
victory.badge_hard_mode
```

Les clés de pluriel suivent la convention i18next : `key_one`, `key_other` (format ICU simplifié, voir section gestion des pluriels).

### 4. Gestion des pluriels

i18next supporte les règles de pluriel par locale via le plugin `i18next-plural-rules` (intégré nativement depuis i18next v21). Le format de clé retenu est le suffixe `_one` / `_other` pour les langues à deux formes, et `_one` / `_few` / `_other` pour le polonais (3 formes plurielles).

Exemple dans `fr.json` :
```json
{
  "victory": {
    "stat_jump_one": "saut",
    "stat_jump_other": "sauts"
  }
}
```

Usage dans le composant :
```typescript
t('victory.stat_jump', { count: stats.jumps })
```

### 5. Extension du type `Language`

Le type `Language` dans `packages/shared/src/types/index.ts` est étendu :

```typescript
// Avant
export type Language = 'fr' | 'en';

// Après
export type Language = 'fr' | 'en' | 'es' | 'de' | 'pt' | 'it' | 'nl' | 'pl';
```

Cette modification est un **breaking change** pour le `language.store.ts` : la validation dans `hydrateLanguage()` doit être mise à jour pour accepter les 8 valeurs valides. Elle impacte également le backend (`apps/backend`) qui utilise `Language` pour construire les URLs Wikipedia — cette extension est immédiatement compatible, aucune modification de logique backend n'est requise (la langue pilote déjà l'URL `{lang}.wikipedia.org`).

### 6. Synchronisation langue app ↔ i18next

`setLanguage()` dans `language.store.ts` appelle `i18next.changeLanguage(lang)` après avoir mis à jour le store et persisté dans AsyncStorage. L'ordre est : store → AsyncStorage → i18next.

`hydrateLanguage()` appelle `i18next.changeLanguage(lang)` dans son bloc `try`, après avoir résolu la langue persistée.

`i18n.ts` est initialisé avant le rendu de l'application (dans `App.tsx`, avant le `return`), avec la langue par défaut `'fr'`. La réhydratation du store et l'appel à `i18next.changeLanguage` se font immédiatement après — la fenêtre d'affichage en français par défaut est inférieure à un cycle de rendu dans les cas normaux.

### 7. Sélecteur de langue dans le HomeScreen

Le sélecteur de langue actuel (deux boutons FR/EN) est remplacé par un sélecteur à 8 options. La forme exacte du contrôle UI (menu déroulant, liste horizontale scrollable, modal) est une décision UX/UI déléguée à Benjamin — les specs techniques imposent uniquement l'interface fonctionnelle : appel à `setLanguage(lang: Language)` et lecture de `language` depuis `useLanguageStore`.

## Conséquences positives

- Standard de l'industrie React Native : excellente documentation, active community, support natif des règles de pluriel pour toutes les locales cibles
- Zéro overhead réseau : les traductions sont embarquées dans le bundle, pas de fetch au démarrage
- Fallback automatique vers le français si une clé est absente dans une locale — pas de crash, pas de clé affichée brute
- L'extension de `Language` dans `packages/shared` propage automatiquement le typage au backend sans modification de logique
- La synchronisation i18next ↔ Zustand est explicite et auditable (un seul point d'appel par action)

## Conséquences négatives

- Migration nécessaire de tous les textes en dur dans les composants existants — travail mécanique mais extensif (environ 10 écrans + composants partagés)
- L'ajout de `i18next-plural-rules` pour le polonais (3 formes) ajoute une dépendance supplémentaire si le plugin n'est pas inclus par défaut
- Le sélecteur de langue à 8 options dans le HomeScreen requiert une décision UX avant implémentation — dépendance sur Benjamin
- `hydrateLanguage()` doit être mis à jour manuellement pour valider les 8 nouvelles valeurs de `Language` — risque d'oubli si une 9e langue est ajoutée à l'avenir. Mitigation : la validation doit utiliser un tableau `SUPPORTED_LANGUAGES` partagé (exporté depuis `i18n.ts` ou `packages/shared`)

## Alternatives considérées

- **`react-native-localize` seul** — fournit uniquement la détection de la langue système, sans gestion des traductions (clés, fallback, pluriels). Il faut le coupler à une solution de traduction. Complexité équivalente à i18next + binding, mais moins bien intégrée. Écarté.
- **LinguiJS** — solution moderne avec extraction de messages à la compilation. Plus puissante que i18next pour les grands projets, mais la communauté React Native est significativement plus petite. La courbe d'apprentissage (macros Babel) et le setup sont disproportionnés pour 8 locales et un seul namespace. Écarté.
- **Fichiers TypeScript de traduction** (`locales/fr.ts`) — typage fort garanti, pas de `t('clé.inexistante')` possible. Avantage réel, mais incompatible avec les outils de traduction standard (Crowdin, Localazy) si WikiHop devait externaliser la traduction dans le futur. Écarté.
- **Stockage des traductions côté backend** — les chaînes UI sont rarement des données dynamiques. Ajouter une dépendance réseau pour les chaînes statiques est une anti-pattern. Écarté.
