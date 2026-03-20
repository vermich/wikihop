---
id: F3-46
title: Fix — Affichage bouton défi du jour (FR/IT incorrect, délai autres langues)
phase: 3-Features
priority: Must
agents: [Frontend Dev]
status: in-progress
created: 2026-03-21
completed:
---

# F3-46 — Fix — Affichage bouton défi du jour (FR/IT incorrect, délai autres langues)

## User Story
En tant que joueur utilisant l'application en français ou en italien, je veux que le bouton défi du jour s'affiche correctement dès l'ouverture de l'écran, afin de ne pas être confus par un état visuel erroné ou un flash de design incorrect.

## Critères d'acceptance
- [ ] En locale FR, le bouton défi du jour s'affiche avec le design correct dès le premier rendu — aucun état visuel incorrect visible
- [ ] En locale IT, le bouton défi du jour s'affiche avec le design correct dès le premier rendu — aucun état visuel incorrect visible
- [ ] Pour toutes les autres langues supportées (EN, ES, DE, PT, NL, PL), le bouton défi du jour s'affiche avec le design correct dès le premier rendu — aucun délai ni flash de style intermédiaire
- [ ] Le comportement du bouton (tap, navigation vers le défi quotidien) est inchangé dans toutes les locales
- [ ] Aucune régression sur les stories F3-01, F3-16, F3-17, F3-21, F3-37 (défi quotidien, indicateur complétion, tentative unique, état visuel complété, contraste FR)
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

Symptôme observé : en FR et IT, le bouton défi du jour présente un problème d'affichage visuel. Sur les autres langues, un délai est perceptible avant que le design correct s'affiche (flash de style). Probable cause : la logique de rendu conditionnel du bouton dépend d'un état asynchrone (chargement du défi, vérification de complétion du jour) qui n'est pas encore résolu au premier rendu — entraînant un état intermédiaire visible. Les locales FR et IT peuvent avoir un comportement spécifique lié à la longueur de leurs traductions ou à un chemin de code différent.

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress
