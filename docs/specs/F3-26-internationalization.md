# Specs techniques — F3-26 : Internationalisation des interfaces

**Story :** `docs/stories/phase-3/🔄-F3-26-internationalization.md`
**ADR de référence :** `docs/adr/ADR-008-i18n-strategy.md`
**Destinataires :** Laurent (Frontend Dev), Julien (Backend Dev)

---

## 1. Contexte

WikiHop cible 8 langues : français (fr, défaut), anglais (en), espagnol (es), allemand (de), portugais (pt), italien (it), néerlandais (nl), polonais (pl).

Deux périmètres sont concernés :
- **Laurent** : setup i18next dans `apps/mobile`, externalisation de toutes les chaînes UI, extension du sélecteur de langue, synchronisation i18next ↔ store.
- **Julien** : zéro modification de logique backend, uniquement extension du type `Language` dans `packages/shared` et mise à jour de la validation dans `language.store.ts`.

---

## 2. Périmètre

### In scope
- Ajout des packages `i18next` et `react-i18next` dans `apps/mobile`
- Création du fichier `apps/mobile/src/i18n/i18n.ts` (configuration)
- Création de 8 fichiers de locale : `apps/mobile/src/i18n/locales/{fr,en,es,de,pt,it,nl,pl}.json`
- Externalisation de toutes les chaînes en dur dans les composants et écrans listés ci-dessous
- Extension du type `Language` dans `packages/shared/src/types/index.ts`
- Mise à jour de `language.store.ts` : validation des 8 langues dans `hydrateLanguage()` et appel à `i18next.changeLanguage()` dans `setLanguage()`
- Mise à jour du sélecteur de langue dans `HomeScreen.tsx` (déléguer la forme UX à Benjamin avant implémentation)
- Constante `SUPPORTED_LANGUAGES` exportée depuis `packages/shared` pour validation centralisée

### Hors scope
- Traduction des contenus Wikipedia (les articles sont dans la langue source)
- Pluralisation complexe dans le backend
- Extraction automatique des clés (CLI i18next-extract)
- Chargement dynamique des traductions (CDN, lazy-loading)
- Backend : les messages d'erreur API ne sont pas traduits en Phase 3

---

## 3. Dépendances à installer

### Dans `apps/mobile/package.json`

```bash
npm install i18next react-i18next
```

Versions cibles (compatibles Expo SDK 52 / React 18) :
- `i18next` : `^24.x`
- `react-i18next` : `^15.x`

**Pas** de `i18next-react-native-language-detector` — la langue est gérée par le store Zustand, pas par la détection automatique du système. La synchronisation est manuelle et explicite.

---

## 4. Architecture des fichiers i18n

```
apps/mobile/src/i18n/
├── i18n.ts
└── locales/
    ├── fr.json   ← source de vérité
    ├── en.json
    ├── es.json
    ├── de.json
    ├── pt.json
    ├── it.json
    ├── nl.json
    └── pl.json
```

### 4.1 Configuration `i18n.ts`

```typescript
// apps/mobile/src/i18n/i18n.ts

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import nl from './locales/nl.json';
import pl from './locales/pl.json';
import pt from './locales/pt.json';

export const SUPPORTED_LANGUAGES = ['fr', 'en', 'es', 'de', 'pt', 'it', 'nl', 'pl'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

void i18next.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
    es: { translation: es },
    de: { translation: de },
    pt: { translation: pt },
    it: { translation: it },
    nl: { translation: nl },
    pl: { translation: pl },
  },
  lng: 'fr',           // langue initiale — écrasée par hydrateLanguage()
  fallbackLng: 'fr',
  interpolation: {
    escapeValue: false,  // React gère le XSS
  },
});

export { i18next };
```

`i18n.ts` est importé une seule fois dans `App.tsx`, en tête de fichier, avant tout import de composant. L'initialisation est synchrone — les ressources sont embarquées.

### 4.2 Point d'entrée dans `App.tsx`

```typescript
// apps/mobile/App.tsx
import './src/i18n/i18n'; // doit être le premier import applicatif

// ... reste des imports
```

### 4.3 Hook dans les composants

```typescript
import { useTranslation } from 'react-i18next';

function HomeScreen(): React.JSX.Element {
  const { t } = useTranslation();
  // ...
  <Text>{t('home.play_button')}</Text>
}
```

---

## 5. Extension du type `Language` (Julien — packages/shared)

### 5.1 Modification dans `packages/shared/src/types/index.ts`

```typescript
// Avant
export type Language = 'fr' | 'en';

// Après
export type Language = 'fr' | 'en' | 'es' | 'de' | 'pt' | 'it' | 'nl' | 'pl';
```

C'est le seul changement requis côté `packages/shared`. Le backend (`apps/backend`) utilise déjà `Language` pour construire les URLs Wikipedia (`{lang}.wikipedia.org`) — l'extension est immédiatement fonctionnelle sans modification de logique.

### 5.2 Mise à jour de `language.store.ts` (Laurent)

La fonction `hydrateLanguage()` contient actuellement une validation stricte `parsed === 'fr' || parsed === 'en'`. Cette validation doit être mise à jour pour accepter les 8 langues. La constante `SUPPORTED_LANGUAGES` exportée depuis `i18n.ts` est utilisée pour éviter la duplication :

```typescript
import { SUPPORTED_LANGUAGES } from '../i18n/i18n';

// Dans hydrateLanguage()
if (SUPPORTED_LANGUAGES.includes(parsed as Language)) {
  set({ language: parsed as Language });
}
```

**Point de vigilance :** `SUPPORTED_LANGUAGES.includes()` avec `noUncheckedIndexedAccess` et `exactOptionalPropertyTypes` — le cast `parsed as Language` est acceptable ici car il est précédé du guard `includes`. Commenter la raison du cast.

### 5.3 Synchronisation i18next dans `setLanguage()` (Laurent)

```typescript
import i18next from 'i18next';

setLanguage: async (lang: Language): Promise<void> => {
  // ... logique existante (verrou, persistance, invalidation cache)

  // Synchronisation i18next APRÈS la mise à jour du store et AsyncStorage
  void i18next.changeLanguage(lang);
},
```

L'appel est `void` — `changeLanguage` retourne une Promise mais le store n'a pas à l'attendre : le composant re-render via `react-i18next` dès que i18next émet l'événement `languageChanged`.

---

## 6. Convention de nommage des clés i18n

Les clés suivent le format `[écran].[élément]` en snake_case. Un seul namespace (`translation`, défaut i18next).

### Règles
- Les clés sont en **anglais** (langue de codage), les valeurs sont dans la locale du fichier
- Pas d'abréviation dans les clés (`play_button` pas `play_btn`)
- Les clés de pluriel utilisent le suffixe i18next : `_one` / `_other` (deux formes), `_one` / `_few` / `_other` (polonais, 3 formes)
- Les interpolations utilisent `{{variable}}` (syntaxe i18next)

---

## 7. Inventaire des chaînes par écran

Pour chaque écran, la liste des clés à créer. Les valeurs françaises de référence sont indiquées entre guillemets.

### 7.1 HomeScreen (`home.*`)

| Clé | Valeur fr de référence |
|-----|----------------------|
| `home.card_label_start` | `"DÉPART"` |
| `home.card_label_target` | `"DESTINATION"` |
| `home.play_button` | `"Jouer"` |
| `home.daily_challenge_button` | `"Défi du jour"` |
| `home.daily_challenge_completed` | `"Défi du jour complété"` |
| `home.new_articles_button` | `"Nouveaux articles"` |
| `home.multiplayer_button` | `"Multijoueur"` |
| `home.history_link` | `"Historique des parties"` |
| `home.support_wikipedia_link` | `"Soutenir Wikipedia"` |
| `home.about_link` | `"À propos"` |
| `home.error_load_title` | `"Impossible de charger les articles."` |
| `home.error_load_subtitle` | `"Vérifiez votre connexion internet."` |
| `home.retry_button` | `"Réessayer"` |
| `home.session_resume_title` | `"Partie en cours"` |
| `home.session_resume_message` | `"Tu as une partie en cours vers \"{{target}}\". Veux-tu la reprendre ?"` |
| `home.session_resume_action` | `"Reprendre"` |
| `home.session_new_game_action` | `"Nouvelle partie"` |
| `home.difficulty_toggle_on_a11y` | `"Mode difficile activé — désactiver"` |
| `home.difficulty_toggle_off_a11y` | `"Mode difficile désactivé — activer"` |
| `home.daily_badge_new` | `"NEW"` |
| `home.daily_button_loading_a11y` | `"Défi du jour — chargement en cours"` |
| `home.daily_button_completed_a11y` | `"Défi du jour déjà complété aujourd'hui"` |
| `home.daily_button_new_a11y` | `"Nouveau défi du jour disponible — jouer le défi quotidien"` |
| `home.daily_button_default_a11y` | `"Jouer le défi du jour"` |
| `home.accessibility_loaded` | `"Articles chargés. Départ : {{start}}. Destination : {{target}}."` |
| `home.accessibility_error` | `"Erreur de chargement. {{message}}."` |
| `home.accessibility_start_prefix` | `"Article de départ"` |
| `home.accessibility_target_prefix` | `"Article destination"` |
| `home.multiplayer_a11y` | `"Multijoueur — jouer à plusieurs sur cet appareil"` |
| `home.refresh_a11y` | `"Tirer de nouveaux articles"` |
| `home.history_a11y` | `"Voir mon historique de parties"` |
| `home.donation_a11y` | `"Soutenir Wikipedia — faire un don à Wikimedia"` |
| `home.about_a11y` | `"À propos de WikiHop"` |
| `home.daily_error_title` | `"Indisponible"` |
| `home.daily_error_message` | `"Le défi du jour est momentanément indisponible."` |
| `home.error_start_title` | `"Erreur"` |
| `home.error_start_message` | `"Impossible de démarrer la partie. Réessayez."` |

**Note sur le sélecteur de langue :** les labels du sélecteur (FR, EN, ES…) sont des codes ISO — ils ne sont pas traduits. Les accessibilityLabel sont traduits. Attendre la spec UX/Benjamin avant d'implémenter le nouveau sélecteur.

### 7.2 VictoryScreen (`victory.*`)

| Clé | Valeur fr de référence |
|-----|----------------------|
| `victory.header_title` | `"Victoire !"` |
| `victory.congrats_text` | `"Félicitations !"` |
| `victory.stat_jump_one` | `"saut"` |
| `victory.stat_jump_other` | `"sauts"` |
| `victory.stat_duration_label` | `"durée"` |
| `victory.path_section_title` | `"CHEMIN PARCOURU"` |
| `victory.read_button` | `"Lire \"{{title}}\""` |
| `victory.new_game_button` | `"Nouvelle partie"` |
| `victory.replay_button` | `"Rejouer"` |
| `victory.next_turn_button` | `"Tour suivant →"` |
| `victory.share_button` | `"Partager  ↑"` |
| `victory.badge_daily_challenge` | `"Défi du jour — {{date}}"` |
| `victory.badge_hard_mode` | `"Mode difficile"` |
| `victory.path_item_destination_a11y` | `"{{number}}. {{title}}, article de destination. Voir sur Wikipedia"` |
| `victory.path_item_a11y` | `"{{number}}. {{title}}. Voir sur Wikipedia"` |
| `victory.a11y_stats` | `"Victoire ! {{jumps}} saut{{plural}} en {{duration}}. De {{start}} à {{target}}."` |
| `victory.a11y_next_turn` | `"Tour du joueur suivant"` |
| `victory.a11y_new_game` | `"Démarrer une nouvelle partie"` |
| `victory.a11y_replay` | `"Rejouer avec les mêmes articles"` |
| `victory.a11y_share` | `"Partager mon résultat"` |
| `victory.a11y_read` | `"Lire l'article {{title}}"` |
| `victory.a11y_daily_badge` | `"Partie jouée dans le cadre du défi du jour du {{date}}"` |
| `victory.a11y_hard_badge` | `"Partie jouée en mode difficile"` |
| `victory.a11y_stats_block` | `"{{jumps}} saut{{plural}} effectué{{plural}} en {{duration}}. De {{start}} vers {{target}}."` |

**Note :** `victory.stat_jump` avec `{ count: stats.jumps }` gère automatiquement le singulier/pluriel via i18next.

### 7.3 HistoryScreen (`history.*`)

| Clé | Valeur fr de référence |
|-----|----------------------|
| `history.header_title` | `"Historique"` |
| `history.stats_button_a11y` | `"Voir mes statistiques"` |
| `history.sort_date_label` | `"Date"` |
| `history.sort_jumps_label` | `"Sauts"` |
| `history.sort_duration_label` | `"Durée"` |
| `history.empty_message` | `"Aucune partie jouée"` |
| `history.empty_subtitle` | `"Lancez votre première partie depuis l'accueil."` |
| `history.clear_button` | `"Effacer l'historique"` |
| `history.clear_confirm_title` | `"Effacer l'historique ?"` |
| `history.clear_confirm_message` | `"Cette action est irréversible."` |
| `history.clear_confirm_action` | `"Effacer"` |
| `history.clear_cancel_action` | `"Annuler"` |
| `history.loading_a11y` | `"Chargement de l'historique"` |
| `history.sort_a11y_inactive` | `"Trier par {{criterion}} — tap pour trier du plus ancien au plus récent"` |
| `history.sort_a11y_asc` | `"Trier par {{criterion}} croissant — tap pour trier du plus récent au plus ancien"` |
| `history.sort_a11y_desc` | `"Trier par {{criterion}} décroissant — tap pour désactiver le tri"` |

**Note :** `SORT_BUTTONS` dans `HistoryScreen.tsx` contient des labels en dur (`'Date'`, `'Sauts'`, `'Durée'`). Ces labels doivent être remplacés par des clés i18n. La constante `SORT_BUTTONS` devient dynamique ou est reconstruite dans le composant via `t()`.

### 7.4 GameDetailScreen (`game_detail.*`)

| Clé | Valeur fr de référence |
|-----|----------------------|
| `game_detail.header_title` | `"Détail de la partie"` |
| `game_detail.back_button_a11y` | `"Retour à l'historique"` |
| `game_detail.stat_jumps_label` | `"Sauts"` |
| `game_detail.stat_duration_label` | `"Durée"` |
| `game_detail.path_section_title` | `"CHEMIN PARCOURU"` |
| `game_detail.badge_daily` | `"Défi du jour — {{date}}"` |
| `game_detail.badge_hard` | `"Mode difficile"` |
| `game_detail.badge_won` | `"Partie gagnée"` |
| `game_detail.badge_abandoned` | `"Partie abandonnée"` |

### 7.5 StatsScreen (`stats.*`)

| Clé | Valeur fr de référence |
|-----|----------------------|
| `stats.header_title` | `"Statistiques"` |
| `stats.back_button_a11y` | `"Retour à l'historique"` |
| `stats.total_games_label` | `"Parties jouées"` |
| `stats.won_games_label` | `"Parties gagnées"` |
| `stats.win_rate_label` | `"Taux de victoire"` |
| `stats.best_jumps_label` | `"Meilleur score (sauts)"` |
| `stats.avg_jumps_label` | `"Sauts en moyenne"` |
| `stats.best_time_label` | `"Meilleur temps"` |
| `stats.avg_time_label` | `"Temps moyen"` |
| `stats.chart_title` | `"Évolution du nombre de sauts"` |
| `stats.empty_message` | `"Aucune statistique disponible"` |
| `stats.empty_subtitle` | `"Jouez des parties pour voir vos stats ici."` |

### 7.6 AboutScreen (`about.*`)

| Clé | Valeur fr de référence |
|-----|----------------------|
| `about.header_title` | `"À propos"` |
| `about.back_button_a11y` | `"Retour à l'accueil"` |
| `about.app_version` | `"Version {{version}}"` |
| `about.section_sources` | `"Sources"` |
| `about.section_legal` | `"Légal"` |
| `about.section_code` | `"Code source"` |
| `about.sources_text` | `"WikiHop utilise l'API MediaWiki de la Wikimedia Foundation."` |
| `about.legal_privacy_label` | `"Politique de confidentialité"` |
| `about.code_github_label` | `"Voir le code sur GitHub"` |

**Note importante :** les textes de l'écran About sont validés par la DPO (Maïté). Toute modification du contenu des traductions pour cet écran nécessite une revalidation DPO. Ne modifier que la structure (externalisation), pas le fond des textes.

### 7.7 MultiplayerSetupScreen (`multiplayer_setup.*`)

| Clé | Valeur fr de référence |
|-----|----------------------|
| `multiplayer_setup.header_title` | `"Multijoueur"` |
| `multiplayer_setup.back_button_a11y` | `"Retour à l'accueil"` |
| `multiplayer_setup.section_players` | `"JOUEURS"` |
| `multiplayer_setup.section_rounds` | `"MANCHES"` |
| `multiplayer_setup.section_pairs` | `"PAIRES"` |
| `multiplayer_setup.add_player_button` | `"+ Ajouter un joueur"` |
| `multiplayer_setup.player_placeholder` | `"Joueur {{number}}"` |
| `multiplayer_setup.start_button` | `"Commencer"` |
| `multiplayer_setup.loading_pairs` | `"Chargement des paires..."` |
| `multiplayer_setup.pair_refresh_a11y` | `"Changer la paire de la manche {{round}}"` |

### 7.8 PassPhoneScreen (`pass_phone.*`)

| Clé | Valeur fr de référence |
|-----|----------------------|
| `pass_phone.title` | `"Passe le téléphone"` |
| `pass_phone.instruction` | `"C'est au tour de {{playerName}} !"` |
| `pass_phone.ready_button` | `"Je suis prêt"` |

### 7.9 MultiplayerRoundTransitionScreen (`multiplayer_transition.*`)

| Clé | Valeur fr de référence |
|-----|----------------------|
| `multiplayer_transition.title` | `"Fin de la manche {{round}}"` |
| `multiplayer_transition.next_round_button` | `"Manche {{round}} →"` |

### 7.10 MultiplayerResultScreen (`multiplayer_result.*`)

| Clé | Valeur fr de référence |
|-----|----------------------|
| `multiplayer_result.header_title` | `"Résultats"` |
| `multiplayer_result.winner_label` | `"Vainqueur"` |
| `multiplayer_result.tie_label` | `"Égalité !"` |
| `multiplayer_result.new_game_button` | `"Nouvelle partie"` |
| `multiplayer_result.back_home_button` | `"Retour à l'accueil"` |
| `multiplayer_result.rank_label` | `"{{rank}}."` |
| `multiplayer_result.stat_jumps_one` | `"saut"` |
| `multiplayer_result.stat_jumps_other` | `"sauts"` |

### 7.11 MultiplayerHistoryScreen (`multiplayer_history.*`)

| Clé | Valeur fr de référence |
|-----|----------------------|
| `multiplayer_history.header_title` | `"Historique multijoueur"` |
| `multiplayer_history.empty_message` | `"Aucune partie multijoueur"` |
| `multiplayer_history.players_label` | `"Joueurs"` |
| `multiplayer_history.winner_label` | `"Vainqueur"` |
| `multiplayer_history.rounds_label_one` | `"manche"` |
| `multiplayer_history.rounds_label_other` | `"manches"` |

### 7.12 DonationScreen (`donation.*`)

| Clé | Valeur fr de référence |
|-----|----------------------|
| `donation.header_title` | `"Soutenir Wikipedia"` |
| `donation.back_button_a11y` | `"Retour à l'accueil"` |

### 7.13 ArticleViewerScreen (`article_viewer.*`)

| Clé | Valeur fr de référence |
|-----|----------------------|
| `article_viewer.back_button_a11y` | `"Fermer l'article"` |
| `article_viewer.loading_a11y` | `"Chargement de l'article"` |

### 7.14 GameHUD (`game_hud.*`)

| Clé | Valeur fr de référence |
|-----|----------------------|
| `game_hud.jumps_label` | `"sauts"` |
| `game_hud.target_label` | `"Cible"` |
| `game_hud.abandon_button_a11y` | `"Abandonner la partie"` |
| `game_hud.timer_a11y` | `"Temps écoulé : {{time}}"` |

### 7.15 HistoryItem (composant partagé — `history_item.*`)

| Clé | Valeur fr de référence |
|-----|----------------------|
| `history_item.badge_daily` | `"Défi du jour"` |
| `history_item.badge_hard` | `"Difficile"` |
| `history_item.badge_won` | `"Gagné"` |
| `history_item.badge_abandoned` | `"Abandonné"` |
| `history_item.jumps_one` | `"saut"` |
| `history_item.jumps_other` | `"sauts"` |

---

## 8. Structure du fichier `fr.json` (source de vérité)

Le fichier `fr.json` est organisé par namespace d'écran. Les autres locales (`en.json`, etc.) ont exactement la même structure — seules les valeurs changent.

```json
{
  "home": {
    "play_button": "Jouer",
    "daily_challenge_button": "Défi du jour",
    "..."
  },
  "victory": {
    "header_title": "Victoire !",
    "stat_jump_one": "saut",
    "stat_jump_other": "sauts",
    "..."
  },
  "history": {
    "..."
  }
}
```

**Pluriel polonais** — `pl.json` uniquement, exemple pour `victory.stat_jump` :
```json
{
  "victory": {
    "stat_jump_one": "skok",
    "stat_jump_few": "skoki",
    "stat_jump_other": "skoków"
  }
}
```

---

## 9. Synchronisation langue app ↔ Wikipedia API

La langue Wikipedia est pilotée par `useLanguageStore().language`. Quand l'utilisateur change la langue via le sélecteur, `setLanguage(lang)` :
1. Met à jour le store Zustand
2. Persiste dans AsyncStorage (`@wikihop/language`)
3. Invalide le cache `popularPages` si la langue change (logique existante ADR-007)
4. Appelle `i18next.changeLanguage(lang)` pour synchroniser l'UI

Le backend utilise le paramètre `language` dans ses routes pour construire l'URL `{lang}.wikipedia.org`. Aucune modification de logique backend n'est requise — l'extension du type `Language` suffit.

---

## 10. Sélecteur de langue — dépendance UX/UI

Le sélecteur actuel dans `HomeScreen.tsx` est un toggle FR/EN en haut à droite (deux `TouchableOpacity`). Il doit être étendu à 8 options.

**Règle : ne pas implémenter avant la spec Benjamin.**

Laurent attend la spec UX/UI de Benjamin pour la forme du nouveau sélecteur (menu déroulant `Picker`, liste scrollable horizontale, modal). L'interface fonctionnelle est figée :
- Lecture : `const language = useLanguageStore(s => s.language)`
- Écriture : `void setLanguage(lang)` où `lang: Language`
- Désactivation si `isLanguageLocked` (session `in_progress`) — comportement existant conservé

---

## 11. TDD — fonctions à tester en premier

Les éléments suivants sont soumis à TDD strict (tests écrits avant l'implémentation) :

### 11.1 `isSupportedLanguage(value: unknown): value is Language`

Fonction pure à créer dans `apps/mobile/src/i18n/i18n.ts` ou `apps/mobile/src/utils/language.utils.ts`.

**Cas de test attendus :**
- `'fr'` → `true`
- `'en'` → `true`
- `'es'`, `'de'`, `'pt'`, `'it'`, `'nl'`, `'pl'` → `true` (chacun)
- `'zh'` → `false`
- `''` → `false`
- `null` → `false`
- `undefined` → `false`
- `42` → `false`
- `{ lang: 'fr' }` → `false`

### 11.2 `hydrateLanguage()` — mise à jour des tests existants

Si des tests existent pour `hydrateLanguage()`, mettre à jour les cas :
- Valeur persistée `'es'` → hydrate correctement (nouveau cas)
- Valeur persistée `'zh'` → fallback `'fr'` (existant élargi)
- Chacune des 8 langues → hydrate sans fallback

---

## 12. Stratégie de migration par écran

La migration se fait écran par écran. L'ordre recommandé (du plus simple au plus complexe) :

1. **`AboutScreen`** — composant stateless, peu de chaînes, bon point d'entrée
2. **`GameDetailScreen`** — peu de logique UI
3. **`StatsScreen`**
4. **`HistoryScreen`** (attention : `SORT_BUTTONS` doit devenir dynamique)
5. **`VictoryScreen`** (pluriels, interpolations)
6. **`HomeScreen`** (le plus complexe — sélecteur de langue à refaire après spec Benjamin)
7. **Composants partagés** : `GameHUD`, `HistoryItem`
8. **Écrans multijoueur** : `MultiplayerSetupScreen`, `PassPhoneScreen`, `MultiplayerRoundTransitionScreen`, `MultiplayerResultScreen`, `MultiplayerHistoryScreen`
9. **`DonationScreen`**, **`ArticleViewerScreen`**

Pour chaque écran, la PR doit inclure :
- La locale `fr.json` mise à jour (source de vérité)
- Les 7 autres locales mises à jour (ou marquées `TODO` avec la valeur fr en fallback si traduction non disponible)
- Le composant migré (zéro chaîne en dur)
- Les tests mis à jour

---

## 13. Critères de qualité (PR review)

- Zéro chaîne en dur dans les composants et écrans migrés (`tsc --noEmit` ne suffit pas — chercher les `Text` avec du contenu littéral)
- `isSupportedLanguage` testée avec les 9+ cas listés en section 11.1
- `hydrateLanguage` accepte les 8 langues sans fallback
- `i18n.ts` importé en premier dans `App.tsx` avant tout composant
- `i18next.changeLanguage()` appelé dans `setLanguage()` après persistance AsyncStorage
- Pas de `i18next.t()` direct — toujours via `useTranslation()` dans les composants, ou `i18next.t()` uniquement hors du cycle React (si nécessaire dans un service)
- Les fichiers de locale ont exactement la même structure (clés identiques dans toutes les locales)
- `npm run lint` passe sans erreur
- `tsc --noEmit` passe sans erreur

---

## 14. Points de vigilance

### TypeScript strict
- `SUPPORTED_LANGUAGES` est un `readonly` tuple — `includes()` sur ce type requiert un cast explicite `as Language` ou `(SUPPORTED_LANGUAGES as ReadonlyArray<string>).includes(value as string)`. Choisir la forme la plus lisible et la commenter.
- `exactOptionalPropertyTypes` : si `i18next.changeLanguage` retourne `Promise<TFunction>`, ne pas le spreader dans un type `void`.

### Pluriels polonais
- Le polonais a 3 formes plurielles (one/few/other). i18next les supporte nativement depuis v21 via les `Intl.PluralRules` du moteur JavaScript. Vérifier sur un simulateur Android que `Intl.PluralRules` est disponible dans l'environnement Hermes d'Expo SDK 52.

### AboutScreen — textes DPO
- Les valeurs dans `fr.json` pour les clés `about.*` doivent être copiées mot pour mot depuis le code actuel — ces textes ont été validés par Maïté. Ne rien reformuler.

### SORT_BUTTONS dans HistoryScreen
- La constante `SORT_BUTTONS` contient des `label: string` en dur. Elle ne peut pas être `const` au niveau module si les labels viennent de `t()`. Deux approches acceptables : (a) déplacer la construction dans le composant avec `useMemo(() => [...], [t])`, ou (b) stocker uniquement les critères et calculer le label à l'affichage. Préférer (b) pour éviter le re-render inutile.

### `accessibilityLabel` avec interpolation
- Les `accessibilityLabel` qui contiennent des variables (ex : `home.session_resume_message`) doivent utiliser `t('home.session_resume_message', { target: currentSession.targetArticle.title })`. Vérifier que les accolades sont bien `{{target}}` dans le JSON (double accolade, syntaxe i18next).
