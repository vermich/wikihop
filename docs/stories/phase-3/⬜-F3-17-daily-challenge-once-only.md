---
id: F3-17
title: "Défi quotidien — une seule tentative par jour"
phase: 3
priority: Should
agents: [Frontend Dev, UX/UI]
status: pending
created: 2026-03-10
completed: ~
depends_on: [F3-16]
---

# F3-17 — Défi quotidien — une seule tentative par jour

## Contexte

F3-16 a introduit un indicateur visuel de complétion du défi quotidien, mais le bouton restait cliquable (rejouer autorisé). Le PO souhaite désormais bloquer la tentative après la première réussite jusqu'au renouvellement du défi.

## Objectif

- Le bouton "Défi du jour" devient inactif (`disabled={true}`) après la première réussite
- Le bouton "Rejouer" est masqué sur VictoryScreen quand la session est un défi quotidien complété
- Le blocage se lève automatiquement au renouvellement du défi (minuit UTC)

## Critères d'acceptance

- [ ] Le bouton "Défi du jour" passe en `disabled={true}` après complétion (au lieu de `disabled={false}` actuel en F3-16)
- [ ] Sur VictoryScreen, si la session est un défi quotidien, le bouton "Rejouer" est masqué
- [ ] Le blocage se lève automatiquement le lendemain (comparaison date UTC — logique existante de F3-16)
- [ ] L'accessibilityLabel indique l'état bloqué : "Défi du jour déjà complété aujourd'hui"
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur

## Notes techniques

- Modifier `disabled` dans HomeScreen : `disabled={isDailyCompleted || dailyChallengeState.status !== 'success'}`
- VictoryScreen : conditionner l'affichage du bouton "Rejouer" sur `!currentSession?.isDailyChallenge`
- La logique de détection `isDailyCompleted` est déjà en place (F3-16 — `useDailyCompletionStatus`)
