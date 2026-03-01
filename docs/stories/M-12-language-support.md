---
id: M-12
title: Support de la langue (français par défaut, configurable)
phase: 2-MVP
priority: Should
agents: [Frontend Dev, Backend Dev]
status: in-progress
created: 2026-02-28
completed:
---

# M-12 — Support de la langue (français par défaut, configurable)

## User Story
En tant que joueur, je veux jouer en français par défaut, afin d'avoir une expérience dans ma langue.

## Critères d'acceptance
- [ ] La langue Wikipedia par défaut est `fr`
- [ ] Le code est conçu pour supporter d'autres langues (`en`, `es`, etc.) sans refactoring majeur
- [ ] La langue est stockée dans le store Zustand et persistée
- [ ] L'URL Wikipedia s'adapte à la langue sélectionnée (`fr.wikipedia.org`, `en.wikipedia.org`, etc.)
- [ ] Note : l'interface de l'app elle-même n'est pas traduite en phase 2 (français uniquement)

## Notes de réalisation

### Spécifications techniques — Laurent (Frontend Dev) et Julien (Backend Dev)

Story de référence : `docs/stories/M-12-language-support.md`
ADR de référence : ADR-005 (AsyncStorage), ADR-007 (architecture Zustand)

---

## Partie Frontend — Laurent

#### Périmètre

**Dans le scope M-12 :**
- Slice Zustand `language` dans un fichier dédié
- Persistance AsyncStorage de la langue sélectionnée
- Verrouillage de langue pendant une session `in_progress`
- Invalidation du cache `popularPages` lors d'un changement de langue
- Tests unitaires du store

**Hors scope M-12 :**
- Sélecteur de langue dans l'UI (composant) — couvert par une story séparée
- Traduction de l'interface de l'app (hors scope Phase 2, confirmé dans les critères d'acceptance)
- Slice `popularPages` — si elle n'est pas encore implémentée, l'appel à `invalidatePopularPages()` est un no-op commenté (voir section 3)

---

#### 1. Fichier — `apps/mobile/src/store/language.store.ts` (nouveau fichier)

Ce fichier est un store Zustand indépendant du store `game.store.ts`. Les deux stores coexistent — `language.store.ts` lit le store de jeu pour calculer le sélecteur `isLanguageLocked`.

Structure du fichier :

```
apps/mobile/src/store/language.store.ts
```

---

#### 2. Interface du slice

Conformément à ADR-007 :

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Language } from '@wikihop/shared';
import { create } from 'zustand';

import { useGameStore } from './game.store';

/** Clé AsyncStorage de la préférence de langue (ADR-005) */
const LANGUAGE_STORAGE_KEY = '@wikihop/language';

interface LanguageSlice {
  // ── État ──────────────────────────────────────────────────────────────
  /** Langue active. Défaut : 'fr'. */
  language: Language;
  /**
   * Vaut true une fois que hydrateLanguage() a terminé.
   * Permet aux composants d'attendre la lecture AsyncStorage avant d'afficher
   * le sélecteur de langue.
   */
  isLanguageHydrated: boolean;

  // ── Actions ───────────────────────────────────────────────────────────
  /**
   * Change la langue active.
   * Bloquée si isLanguageLocked === true (session in_progress).
   * Invalide le cache popularPages si la langue change effectivement.
   * Persiste dans AsyncStorage si le changement est autorisé.
   */
  setLanguage: (lang: Language) => Promise<void>;

  /**
   * Réhydrate la langue depuis AsyncStorage au démarrage.
   * Appelée depuis App.tsx en même temps que hydrate() du game store.
   * Toujours termine par set({ isLanguageHydrated: true }), même en cas d'erreur.
   */
  hydrateLanguage: () => Promise<void>;
}
```

---

#### 3. Implémentation de `setLanguage`

Le sélecteur `isLanguageLocked` est calculé depuis le store de jeu — il n'est **pas** un champ de `LanguageSlice` (ADR-007 : sélecteur calculé, non persisté).

Pattern d'implémentation :

```typescript
setLanguage: async (lang: Language): Promise<void> => {
  // Calcul du verrou depuis le store de jeu (sélecteur calculé, ADR-007)
  const isLanguageLocked =
    useGameStore.getState().currentSession?.status === 'in_progress';

  if (isLanguageLocked) {
    // Silencieux : pas d'erreur levée, simplement ignoré (ADR-007)
    return;
  }

  const previousLang = get().language;
  set({ language: lang });

  // Persistance AsyncStorage
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, JSON.stringify(lang));
  } catch (e: unknown) {
    console.error('[language.store] Erreur AsyncStorage.setItem :', e);
  }

  // Invalidation du cache popularPages si la langue a changé (ADR-007)
  if (previousLang !== lang) {
    // TODO M-16 frontend : remplacer par usePopularPagesStore.getState().invalidatePopularPages()
    // une fois le store popularPages implémenté. Pour l'instant : no-op commenté.
  }
},
```

Note sur l'accès inter-store : utiliser `useGameStore.getState()` (accès Zustand hors composant React) — jamais de hook `useGameStore()` dans un store.

---

#### 4. Implémentation de `hydrateLanguage`

```typescript
hydrateLanguage: async (): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw) as unknown;
      // Validation stricte : uniquement 'fr' ou 'en' acceptés
      if (parsed === 'fr' || parsed === 'en') {
        set({ language: parsed });
      }
      // Valeur invalide en AsyncStorage : on garde le défaut 'fr', pas d'erreur levée
    }
  } catch (e: unknown) {
    console.error('[language.store] Erreur lors de la réhydratation :', e);
    // Erreur JSON ou lecture : on garde le défaut 'fr'
  } finally {
    set({ isLanguageHydrated: true });
  }
},
```

**Valeur invalide** : si `AsyncStorage` contient une valeur corrompue ou une ancienne langue (`'es'`, `'de'`), on ignore silencieusement et on conserve `'fr'` par défaut. Pas de `clearItem` dans ce cas — la valeur sera écrasée au prochain `setLanguage`.

---

#### 5. Appel de `hydrateLanguage` au démarrage

Dans `App.tsx` (ou le root component), appeler `hydrateLanguage()` en parallèle avec `hydrate()` du game store :

```typescript
useEffect(() => {
  void Promise.all([
    useGameStore.getState().hydrate(),
    useLanguageStore.getState().hydrateLanguage(),
  ]);
}, []);
```

Les deux hydratations sont indépendantes et peuvent s'exécuter en parallèle.

---

#### 6. Export du store

```typescript
export const useLanguageStore = create<LanguageSlice>()((set, get) => ({
  language: 'fr',
  isLanguageHydrated: false,
  setLanguage: /* ... */,
  hydrateLanguage: /* ... */,
}));
```

Export nommé : `useLanguageStore`. Pas de `export default`.

---

#### 7. Tests — `apps/mobile/__tests__/store/languageStore.test.ts`

Mocker `@react-native-async-storage/async-storage` avec `jest.mock` (le mock jest est déjà configuré dans le projet via `__mocks__`).
Mocker `../game.store` pour contrôler `isLanguageLocked` sans dépendre du store de jeu réel.

**Cas à couvrir :**

| Cas | Comportement attendu |
|-----|---------------------|
| `setLanguage('en')` sans session active | Langue changée en `'en'`, AsyncStorage écrit |
| `setLanguage('en')` avec session `in_progress` | Langue inchangée, AsyncStorage non écrit |
| `setLanguage('fr')` alors que déjà `'fr'` | Aucun changement, pas d'écriture AsyncStorage |
| `setLanguage('en')` depuis `'fr'` | `invalidatePopularPages` appelé (ou no-op si slice absente) |
| `hydrateLanguage()` avec `'en'` en AsyncStorage | Langue initialisée à `'en'` |
| `hydrateLanguage()` avec valeur corrompue | Langue reste `'fr'`, `isLanguageHydrated: true` |
| `hydrateLanguage()` sans clé AsyncStorage | Langue reste `'fr'`, `isLanguageHydrated: true` |
| `hydrateLanguage()` avec erreur AsyncStorage | Langue reste `'fr'`, `isLanguageHydrated: true` |

**Seuil de coverage :** ≥ 70 % sur `language.store.ts`.

---

#### 8. Points de vigilance Frontend

1. **`isLanguageLocked` est un sélecteur calculé, pas un champ** — ne pas ajouter de champ `isLanguageLocked` dans l'interface du store. Les composants calculent : `useGameStore(s => s.currentSession?.status === 'in_progress')`.
2. **Accès inter-store** : `useGameStore.getState()` (pas de hook) — valide en dehors du cycle de rendu React.
3. **`exactOptionalPropertyTypes`** : lors de la validation de la langue hydratée, ne pas caster `parsed as Language` directement — vérifier explicitement avec `=== 'fr' || === 'en'`.
4. **`finally` obligatoire** dans `hydrateLanguage` pour garantir que `isLanguageHydrated` passe à `true` même en cas d'erreur.
5. **Pas de `console.log`** — uniquement `console.error` pour les erreurs AsyncStorage.

---

## Partie Backend — Julien

#### Périmètre M-12 côté backend

M-12 n'introduit **aucun nouveau code backend**. Les deux points à vérifier sont :

1. **L'endpoint `GET /api/game/random-pair?lang=fr|en`** (implémenté dans M-02) accepte déjà le paramètre `lang` avec validation Zod (`z.enum(['fr', 'en']).default('fr')`). Aucune modification supplémentaire.

2. **`getPopularPages(language: 'fr' | 'en')`** dans `apps/backend/src/services/popular-pages.service.ts` accepte déjà les deux langues. La lecture du code confirme que le paramètre `language` est typé `'fr' | 'en'` et propagé correctement jusqu'aux URLs Wikimedia et au fallback JSON. Aucune modification requise.

**Action Julien pour M-12 :** vérifier lors de la PR M-02 que les deux points ci-dessus sont couverts par des tests existants. Si les tests de `game.route.test.ts` incluent déjà un cas `?lang=en`, M-12 est considérée couverte côté backend.

---

#### URL Wikipedia dynamique par langue

La construction d'URL Wikipedia suivant la langue est déjà implémentée dans `popular-pages.service.ts` via `buildWikimediaUrl(lang)`. Le même pattern doit être utilisé dans `game.route.ts` pour la validation des articles :

```
https://{lang}.wikipedia.org/api/rest_v1/page/summary/{title}
```

Le critère d'acceptance "l'URL Wikipedia s'adapte à la langue sélectionnée" est satisfait dès lors que M-02 utilise `lang` comme paramètre dynamique dans la construction de l'URL.

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
