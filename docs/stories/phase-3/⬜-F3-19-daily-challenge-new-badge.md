---
id: F3-19
title: "Badge « New » sur le défi quotidien non encore réalisé"
phase: 3
priority: Could
agents: [Frontend Dev, UX/UI]
status: pending
created: 2026-03-10
completed: ~
depends_on: [F3-16, F3-17]
---

# F3-19 — Badge « New » sur le défi quotidien non encore réalisé

## Contexte

Le joueur ne sait pas au premier coup d'œil si un nouveau défi est disponible. Un badge "New" visible sur le bouton "Défi du jour" quand le défi du jour n'a pas encore été réalisé améliore la rétention.

## Objectif

Afficher un sticker/badge "New" sur le bouton "Défi du jour" tant que le joueur n'a pas complété le défi du jour. Le badge disparaît une fois le défi complété.

## Critères d'acceptance

- [ ] Un badge "New" est visible sur le bouton "Défi du jour" quand `isDailyCompleted === false` et `dailyChallengeState.status === 'success'`
- [ ] Le badge disparaît immédiatement au retour sur HomeScreen après complétion du défi
- [ ] Le badge n'apparaît pas si le défi est déjà chargé en erreur ou en loading
- [ ] Design défini par UX/UI (Benjamin)
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur

## Notes UX (à définir par Benjamin)

- Position du badge : coin supérieur droit du bouton, ou inline dans le texte ?
- Style : pastille rouge avec texte "New", étoile, ou autre ?
- Accessibilité : le badge doit être annoncé par le screen reader (`accessibilityLabel`)
