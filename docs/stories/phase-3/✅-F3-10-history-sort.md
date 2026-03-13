---
id: F3-10
title: Tri multi-critères dans l'historique des parties
phase: 3-Features
priority: Should
agents: [Frontend Dev, UX/UI]
status: done
created: 2026-03-01
completed: 2026-03-13
---

# F3-10 — Tri multi-critères dans l'historique des parties

## User Story
En tant que joueur, je veux trier mon historique de parties selon différents critères, afin de retrouver facilement mes meilleures performances ou mes parties les plus récentes.

## Critères d'acceptance
- [x] Un sélecteur (Picker dropdown ou segmented control) permet de choisir le critère de tri dans l'écran historique
- [x] Les critères de tri disponibles sont : Date (plus récent), Date (plus ancien), Durée (plus courte), Durée (plus longue), Nombre de clics (moins), Nombre de clics (plus)
- [x] Le tri est appliqué immédiatement à l'affichage sans rechargement de la liste
- [x] Le critère de tri sélectionné est mémorisé (AsyncStorage) et restauré à la prochaine ouverture de l'historique
- [x] Par défaut, l'historique est trié par Date (plus récent en premier)
- [x] Le sélecteur de tri affiche clairement le critère actuellement actif

## Notes de réalisation
Cette story complète F3-02 (Historique des parties) en ajoutant la dimension tri. Elle doit être développée après F3-02.

## Validation QA — Halim
Validé le 2026-03-13 par Halim.
- SortBar avec 6 chips confirmée dans HistoryScreen.tsx
- Critère actif mis en évidence via styles sortChipActive + sortChipTextActive (fond bleu #2563EB, texte blanc bold)
- Tri via useMemo([records, criterion]) — application immédiate confirmée
- Persistance AsyncStorage clé @wikihop/history_sort_criterion dans useHistorySort.ts
- DEFAULT_SORT_CRITERION = 'date_desc' confirmé dans history-sort.utils.ts
- sortRecords fonction pure : 20 tests TDD passants
- isSortCriterion guard présent et utilisé dans le hook
- Tests TDD commitées avant implémentation : commit fde011f (tests) antérieur à commit 2672148 (implémentation)
- 86 tests ciblés passants / 483 tests suite complète passants — 0 régression
- tsc sans erreur / lint 0 erreur (16 warnings pré-existants non liés à cette story)

## Statut
pending → in-progress → done
