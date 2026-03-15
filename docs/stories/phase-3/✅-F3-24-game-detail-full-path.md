---
id: F3-24
title: Parcours complet dans GameDetailScreen
phase: 3-Features
priority: Could
agents: [Tech Lead, Frontend Dev]
status: done
created: 2026-03-14
completed: 2026-03-15
depends_on: [F3-11]
---

# F3-24 — Parcours complet dans GameDetailScreen

## User Story
En tant que joueur, je veux voir la liste ordonnée des articles que j'ai visités dans le détail d'une partie, afin de me souvenir précisément de mon parcours et de l'analyser.

## Critères d'acceptance
- [x] GameDetailScreen affiche la liste ordonnée des articles visités pendant la partie (article de départ → article final), sans afficher "Détail du parcours non disponible"
- [x] Le Tech Lead a documenté la décision d'architecture concernant le stockage de `path: Article[]` dans `GameRecord` (réévaluation de l'impact AsyncStorage par rapport à la décision initiale de F3-02)
- [x] `buildGameRecord` est modifié pour inclure le tableau `path` lors de la création d'un enregistrement
- [x] Les anciennes parties en AsyncStorage (sans champ `path`) s'affichent sans erreur — gestion du champ optionnel ou valeur par défaut
- [x] La liste des articles est scrollable si elle dépasse la hauteur visible de l'écran
- [x] Chaque article de la liste affiche au minimum son titre
- [x] `tsc --noEmit` passe sans erreur
- [x] `npm run lint` passe sans erreur

## Notes de réalisation

### Décision architecture — stockage de `path` dans GameRecord

**Contexte.** La décision initiale de F3-02 avait exclu `path` de `GameRecord` pour limiter la taille AsyncStorage. F3-24 réévalue ce choix.

**Analyse de taille.**
Un `Article` contient 4 champs : `id` (string, ~5 chars), `title` (string, ~15–30 chars), `url` (string, ~60 chars), `language` (2 chars). Taille JSON estimée : ~120–140 bytes par article.

Pour un parcours de 5 à 10 articles : 600 à 1 400 bytes. Pour 50 parties (limite MAX_ENTRIES), cela représente 30 à 70 KB de données supplémentaires dans AsyncStorage — volume parfaitement acceptable (AsyncStorage supporte plusieurs MB par clé).

**Décision : stockage inline dans GameRecord.**
Le champ est ajouté en `path?: Article[]` (optionnel, rétrocompatibilité obligatoire). Les enregistrements existants sans `path` ne crashent pas — l'écran affiche un message de fallback.

**Aucun ADR distinct requis** — cette décision est une révision de périmètre d'un champ de stockage, pas un choix technologique structurant. La décision est documentée ici.

---

### 1. Modification `packages/shared/src/types/index.ts`

Ajouter `path?: Article[]` à l'interface `GameRecord`, après le champ `status` :

```typescript
/** Chemin complet parcouru (optionnel — absent pour les parties enregistrées avant F3-24) */
path?: Article[];
```

Mettre à jour le commentaire JSDoc de l'interface pour retirer la mention "ne contient pas le chemin complet" qui deviendra obsolète.

---

### 2. Modification `apps/mobile/src/utils/history.utils.ts` — `buildGameRecord`

Ajouter `path` au retour de `buildGameRecord`. Pattern spread conditionnel identique aux autres champs optionnels déjà présents (respect de `exactOptionalPropertyTypes`) :

```typescript
...(session.path.length > 0 ? { path: session.path } : {}),
```

`session.path` est toujours un tableau (non undefined dans `GameSession`), mais on l'inclut uniquement si non vide — cas défensif. Placer cette ligne après les champs existants, dans le bloc de champs optionnels en fin de return.

Mettre à jour le JSDoc de la fonction pour mentionner que `path` est inclus depuis F3-24.

---

### 3. Modification `apps/mobile/src/services/score-storage.service.ts`

Aucune modification de la logique de sérialisation/désérialisation requise. `JSON.parse` reconstruit `path` automatiquement comme `Article[]` puisque le type est JSON-safe (pas de `Date`, pas d'instance). La lecture dans `readAll()` est correcte telle quelle.

Aucune migration de données à prévoir : les enregistrements sans `path` resteront valides car le champ est `?` optionnel dans le type.

---

### 4. Modification `apps/mobile/src/screens/GameDetailScreen.tsx`

**Section "CHEMIN PARCOURU"** — remplacer le rendu statique actuel :

```tsx
{/* Section chemin parcouru */}
<View style={styles.sectionChemin}>
  <Text style={styles.sectionCheminTitle}>{'CHEMIN PARCOURU'}</Text>
  <Text style={styles.sectionCheminMessage}>
    {'Détail du parcours non disponible'}
  </Text>
</View>
```

Par un rendu conditionnel :

- Si `record.path` est défini et non vide : afficher la liste ordonnée
- Sinon : afficher le message `'Détail du parcours non disponible'` (inchangé)

**Rendu de la liste.** Chaque article est affiché avec un index ordinal et son titre. Le conteneur `sectionChemin` est déjà dans un `ScrollView`, donc la scrollabilité est couverte sans `FlatList` supplémentaire. Utiliser un `.map()` avec `key={item.id}`.

Structure attendue pour chaque item :
```tsx
<View key={article.id} style={styles.pathItem}>
  <Text style={styles.pathIndex}>{`${String(index + 1)}.`}</Text>
  <Text style={styles.pathTitle}>{article.title}</Text>
</View>
```

Le premier article (index 0) est l'article de départ, le dernier est la destination.

**Styles à ajouter** dans `StyleSheet.create()` :
- `pathItem` : `flexDirection: 'row'`, `alignItems: 'flex-start'`, `marginBottom: 8`
- `pathIndex` : `fontSize: 14`, `color: '#64748B'`, `width: 24`, `marginTop: 1`
- `pathTitle` : `fontSize: 15`, `color: '#1E293B'`, `flex: 1`

---

### 5. TDD — fonctions pures et hooks

**Aucune nouvelle fonction pure isolée** n'est introduite par cette story.

La modification de `buildGameRecord` est un ajout de champ dans une fonction pure existante. Le fichier de tests `apps/mobile/src/__tests__/history.utils.test.ts` doit être mis à jour pour couvrir le nouveau comportement :

**Cas de test à ajouter dans `history.utils.test.ts` :**

- `buildGameRecord` avec `session.path` non vide → `record.path` défini et égal à `session.path`
- `buildGameRecord` avec `session.path` vide (`[]`) → `record.path` absent (ou tableau vide selon l'implémentation)
- Invariant : les champs existants (`startArticle`, `targetArticle`, `jumps`, etc.) sont inchangés quand `path` est présent

Ces tests doivent être committés **avant** l'implémentation (TDD strict — `buildGameRecord` est une fonction pure).

---

### 6. Tests alongside — GameDetailScreen

Tests à écrire en même temps que la modification de l'écran (si le projet dispose de tests de composant) :

- Rendu avec `record.path` défini → les titres des articles apparaissent dans le DOM de test
- Rendu avec `record.path` absent → le message `'Détail du parcours non disponible'` est affiché
- Rendu avec `record.path = []` → le message fallback est affiché

---

### 7. Critères de qualité

- `tsc --noEmit` sans erreur après modification de `GameRecord` dans shared (impact transverse sur tous les consommateurs du type)
- `npm run lint` sans erreur
- Le rendu conditionnel ne produit pas de `undefined` rendu comme texte (guard `Array.isArray(record.path) && record.path.length > 0`)
- Zéro `any` non justifié

---

### 8. Points de vigilance

**Rétrocompatibilité.** Les GameRecord existants en AsyncStorage n'ont pas de champ `path`. Lors de la désérialisation par `JSON.parse`, `path` sera `undefined`. Le guard dans l'écran (`record.path` présent et non vide) couvre ce cas. Ne pas utiliser `record.path!`.

**`noUncheckedIndexedAccess`.** Si un accès indexé sur `record.path` est nécessaire (ex: premier ou dernier élément), toujours vérifier l'existence avant usage. Le `.map()` est préférable aux accès directs par index.

**Gate device physique.** F3-24 ne modifie pas le flux Home→Game→Victory ni la WebView. Le gate device physique du CLAUDE.md ne s'applique pas à cette story. Un test simulateur est suffisant.

**Impact TypeScript sur les consommateurs.** L'ajout de `path?: Article[]` à `GameRecord` est non-breaking (champ optionnel). Vérifier que `tsc --noEmit` passe dans les trois workspaces (shared, mobile, backend) avant de soumettre la PR.

## Validation QA — Halim

### Rapport QA — F3-24 : Parcours complet dans GameDetailScreen
**Date** : 2026-03-15
**Testeur** : Halim
**Statut global** : Validé

### Critères d'acceptance
- [x] `GameRecord.path?: Article[]` présent dans `packages/shared/src/types/index.ts` — OK, champ optionnel avec JSDoc F3-24
- [x] Décision architecture documentée dans la story (Notes de réalisation) — OK
- [x] `buildGameRecord` inclut `path` via spread conditionnel `session.path.length > 0` — vérifié dans `history.utils.ts`
- [x] Anciennes parties sans `path` (undefined) : guard `Array.isArray(record.path) && record.path.length > 0` → fallback "Détail du parcours non disponible" — OK
- [x] Liste scrollable : `sectionChemin` dans un `ScrollView` existant — scrollabilité couverte sans FlatList supplémentaire
- [x] Chaque article affiche son titre via `article.title` dans `pathTitle` style — OK
- [x] `tsc --noEmit` (apps/mobile) : sans erreur
- [x] `npm run lint` : 0 erreur

### Tests automatisés
- npm test (mobile) : 611 tests passants, 36 suites, 0 échec
- tsc --noEmit (apps/mobile) : sans erreur
- npm run lint : 0 erreur

### Tests TDD vérifiés
- Commit `4ec94d9` (tests TDD F3-24 `buildGameRecord` avec `path`) précède le commit `f37c664` (implémentation) — TDD strict respecté
- 3 cas TDD dans `history.utils.test.ts` : path non vide → record.path défini, path vide → record.path absent/vide, champs existants inchangés
- Tests alongside `GameDetailScreen.test.tsx` : rendu avec `record.path` défini, absent, vide — 3 cas couverts

### Vérifications code
- `GameRecord.path?: Article[]` dans `packages/shared/src/types/index.ts` (ligne 139) — champ optionnel correct
- Commentaire JSDoc `types/index.ts` mis à jour : mention F3-24 présente
- Rendu conditionnel : `Array.isArray(record.path) && record.path.length > 0` — guard double correct (noUncheckedIndexedAccess)
- `.map()` avec `key={article.id}` — pas d'accès par index direct
- Styles `pathItem`, `pathIndex`, `pathTitle` conformes aux specs Tech Lead
- `exactOptionalPropertyTypes` : spread conditionnel `session.path.length > 0 ? { path: session.path } : {}` — pattern correct

### Gate device physique
Non requis pour F3-24 — ne touche pas la WebView, le store de jeu ou le flux Home-Game-Victory (confirmé dans la spec Tech Lead).

### Bugs identifiés
Aucun bug identifié.

### Conclusion
Story validée. `path?: Article[]` est ajouté à `GameRecord` de manière rétrocompatible. `buildGameRecord` le propage correctement. `GameDetailScreen` affiche la liste ordonnée ou le fallback selon la présence du champ. TDD strict vérifié par l'ordre des commits. Aucune régression sur les stories existantes.

## Statut
pending → in-progress → done
