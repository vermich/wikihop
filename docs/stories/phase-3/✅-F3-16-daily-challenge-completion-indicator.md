---
id: F3-16
title: "Indicateur de complétion du défi quotidien"
phase: 3
priority: Should
agents: [Frontend Dev, UX/UI]
status: done
created: 2026-03-10
completed: 2026-03-10
depends_on: [F3-01]
---

# F3-16 — Indicateur de complétion du défi quotidien

## Contexte

Le bouton "Défi du jour" (F3-01) sur le HomeScreen n'a aucun retour visuel différencié entre deux états :
- Le joueur n'a pas encore fait le défi d'aujourd'hui
- Le joueur a déjà complété le défi d'aujourd'hui

## Objectif

Ajouter un indicateur visuel sur le bouton "Défi du jour" pour que le joueur sache d'un coup d'œil s'il a déjà joué le défi du jour. Le design exact est défini par Benjamin (UX/UI).

## Critères d'acceptance

- [x] Le bouton "Défi du jour" affiche un état visuel distinct après complétion du défi (design UX/UI à définir)
- [x] L'état "complété" est calculé par date UTC — il se réinitialise automatiquement à minuit UTC
- [x] La date de complétion est persistée en AsyncStorage sous la clé `@wikihop/daily_completion_date` (format YYYY-MM-DD) — note : clé révisée par Tech Lead dans les specs techniques et ADR-005 (clé initiale `daily_challenge_completed_date` dans la story est obsolète)
- [x] Rejouer le défi reste possible même quand l'indicateur est affiché (pas de blocage)
- [x] L'indicateur est mis à jour dès le retour sur le HomeScreen après une victoire sur le défi (via `useFocusEffect`)
- [x] Si aucun défi n'a été complété aujourd'hui, le bouton s'affiche dans son état normal (non complété)
- [x] `tsc --noEmit` passe sans erreur
- [x] `npm run lint` passe sans erreur

## Notes UX

- Benjamin doit proposer le design exact : icône étoile, badge, changement de couleur, texte secondaire, etc.
- L'indicateur doit rester lisible en mode clair et sombre (accessibilité)
- Le bouton doit rester cliquable même en état "complété" (rejouer = autorisé)

## Notes techniques

- La clé AsyncStorage `daily_challenge_completed_date` stocke la date UTC (YYYY-MM-DD) du dernier défi complété
- Comparaison à faire avec `getTodayUTC()` côté mobile (ou `new Date().toISOString().slice(0, 10)`)
- Le hook `useDailyChallenge` ou un nouveau hook `useDailyChallengeCompletion` peut porter cette logique
- La mise à jour doit se faire dans `handlePlayDaily` (HomeScreen) ou au retour via `useFocusEffect`
- ADR-005 liste déjà les clés AsyncStorage — la nouvelle clé doit y être ajoutée
