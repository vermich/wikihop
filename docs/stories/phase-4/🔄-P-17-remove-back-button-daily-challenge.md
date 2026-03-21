---
id: P-17
title: UX — Supprimer le bouton retour sur l'écran défi du jour
phase: 4-Production
priority: Should
agents: [Frontend Dev]
status: in-progress
created: 2026-03-21
completed:
---

# P-17 — UX — Supprimer le bouton retour sur l'écran défi du jour

## User Story
En tant que joueur ayant démarré le défi du jour, je veux que le bouton retour du header de navigation ne soit pas affiché pendant le défi, afin de ne pas quitter accidentellement le défi en cours et perdre ma tentative.

## Critères d'acceptance
- [ ] Lorsqu'une partie défi du jour est en cours, le bouton retour n'est pas affiché dans le header de navigation (ni sur iOS ni sur Android)
- [ ] L'absence du bouton retour s'applique uniquement au contexte du défi du jour — les parties solo classiques conservent leur comportement de navigation habituel
- [ ] Sur Android, le bouton hardware retour est également désactivé ou déclenche une confirmation explicite (alerte "Êtes-vous sûr de vouloir quitter le défi ?") plutôt qu'une sortie silencieuse
- [ ] Si une alerte de confirmation est implémentée sur Android, elle affiche deux options : "Continuer le défi" et "Quitter" — la sortie n'est effective qu'après confirmation explicite "Quitter"
- [ ] Aucune régression sur F3-01 (défi quotidien), F3-17 (une seule tentative), F3-22, F3-27, F3-34 (fixes retour arrière)
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

Toute modification touchant la navigation dans ArticleScreen doit respecter la règle obligatoire des specs navigation (diagramme d'état des stacks, comportement explicite pour chaque affordance de retour, section "Interactions connues").

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
in-progress
