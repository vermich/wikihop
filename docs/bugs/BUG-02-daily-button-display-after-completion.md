# BUG-02 — Affichage incorrect du bouton défi après complétion

**Statut :** Confirmé (1 reproduction)
**Priorité :** High — bloquant UX
**Composant suspecté :** HomeScreen — bouton "Défi du jour" (F3-16)

---

## Occurrences

### Occurrence 1 — 2026-03-10

**Contexte :**
- Après avoir réalisé le défi du jour avec succès
- Retour sur HomeScreen depuis VictoryScreen

**Symptômes observés :**
- Le bouton "Défi du jour" n'affiche plus le style complété (brun #92400E + ✓)
- À la place : encadré gris avec libellé en blanc, sans bouton visible

**Hypothèse principale :**
Problème de timing entre `useDailyCompletionStatus` (qui lit AsyncStorage via `useFocusEffect`) et `useDailyChallenge` (état du chargement). Si `dailyChallengeState.status` repasse temporairement en `'loading'` au refocus, `isDailyButtonCompleted` vaut `false` et le style `dailyButtonDisabled` (gris) est appliqué avec le mauvais style de texte.

**Relation avec F3-17 :**
Ce bug sera probablement partiellement résolu par F3-17 (bouton désactivé après complétion). À confirmer après implémentation de F3-17.

---

## À investiguer

- Vérifier si `useDailyChallenge` se re-déclenche au `useFocusEffect` (refetch inutile)
- Vérifier l'ordre d'exécution des deux hooks au retour de VictoryScreen
- Vérifier le style de texte appliqué dans le bloc loading quand `isDailyCompleted === true`
