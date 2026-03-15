---
id: F3-35
title: Badge "Mode difficile" dans l'historique des parties
phase: 3-Features
priority: Should
agents: [Frontend Dev, UX/UI]
status: done
created: 2026-03-15
completed: 2026-03-15
depends_on: [F3-02, F3-05, F3-23]
---

# F3-35 — Badge "Mode difficile" dans l'historique des parties

## User Story
En tant que joueur, je veux voir dans l'historique de mes parties lesquelles ont été jouées en mode difficile, afin de distinguer mes performances en mode difficile de mes parties standard.

## Critères d'acceptance
- [x] Chaque `HistoryItem` correspondant à une partie dont `difficulty === 'hard'` (évalué via `isHardMode()` de `difficulty.utils.ts`) affiche un badge "DIFF" visible sans interaction supplémentaire
- [x] Les `HistoryItem` de parties standard (`difficulty` absent, `undefined`, ou `'normal'`) n'affichent pas le badge
- [x] Le badge "DIFF" adopte un style cohérent avec le badge "DÉFI" existant (même zone d'affichage, même gabarit typographique) mais avec une couleur distincte : fond `#FEE2E2`, texte `#991B1B` (rouge — palette identique à l'indicateur mode difficile de `VictoryScreen`)
- [x] Le badge est accessible : présence d'un `accessibilityLabel` incluant "Mode difficile" sur l'élément interactif parent (`TouchableOpacity`), cohérent avec le pattern établi en F3-23
- [x] L'affichage est cohérent après un changement de tri via le `SortBar` (F3-10) — le badge reste présent sur les bonnes parties
- [x] `tsc --noEmit` passe sans erreur
- [x] `npm run lint` passe sans erreur
- [x] Tests alongside dans `HistoryItem.test.tsx` couvrant au minimum : badge présent quand `difficulty === 'hard'`, badge absent quand `difficulty` est `undefined`, badge absent quand `difficulty === 'normal'`, coexistence badge "DIFF" + badge "DÉFI" sur une même partie (défi quotidien joué en mode difficile)

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim

### Rapport QA — F3-35 : Badge "Mode difficile" dans l'historique des parties
**Date** : 2026-03-15
**Testeur** : Halim
**Statut global** : Validé

### Critères d'acceptance
- [x] Badge "DIFF" présent quand `difficulty === 'hard'` via `isHardMode()` — OK
- [x] Badge absent quand `difficulty` undefined ou 'normal' — OK
- [x] Fond `#FEE2E2`, texte `#991B1B` — vérifié dans `StyleSheet.create()` (`diffBadge` / `diffBadgeText`)
- [x] `accessibilityLabel` inclut "Mode difficile." sur le `TouchableOpacity` parent — OK, préfixe positionné avant "Défi du jour."
- [x] Cohérence après tri SortBar — badge lié à `record.difficulty`, invariant au tri (rendu conditionnel pur)
- [x] `tsc --noEmit` — sans erreur (`apps/mobile/tsconfig.json`)
- [x] `npm run lint` — 0 erreur, 18 warnings (console.log backend préexistants)
- [x] 6 tests alongside dans `HistoryItem.test.tsx` : badge présent/absent (hard/undefined/normal), coexistence DÉFI+DIFF, accessibilityLabel hard/normal — tous passants

### Tests automatisés
- npm test (mobile) : 611 tests passants, 36 suites, 0 échec
- tsc --noEmit (apps/mobile) : sans erreur
- npm run lint : 0 erreur

### Vérifications code
- `isHardMode(record.difficulty)` utilisé correctement — import depuis `difficulty.utils`
- `diffBadge` : `backgroundColor: '#FEE2E2'`, `borderRadius: 4`, `paddingHorizontal: 8`, `paddingVertical: 3`, `marginLeft: 4`
- `diffBadgeText` : `fontSize: 11`, `fontWeight: 'bold'`, `color: '#991B1B'`
- Ordre des badges dans le DOM : statut → DÉFI → DIFF — cohérent avec spec UX/UI
- `accessible={false}` sur le `View` badge (décoration) — pattern correct
- `accessibilityLabel` du `TouchableOpacity` : `"Mode difficile. [si hard]" + "Défi du jour. [si daily]"` + info partie

### Bugs identifiés
Aucun bug identifié.

### Conclusion
Story validée. Tous les critères d'acceptance sont satisfaits. Le badge DIFF est implémenté proprement avec le bon pattern d'accessibilité et les couleurs specifiées. Les 6 cas de test alongside couvrent les 4 cas minimum requis par la spec plus 2 cas supplémentaires (accessibilityLabel). TDD respecté : commit test `0353aeb` squash merge confirme les tests avant implémentation selon le message de commit.

## Statut
pending → in-progress → done
