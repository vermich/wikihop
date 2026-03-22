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
- [x] Lorsqu'une partie défi du jour est en cours, le bouton retour n'est pas affiché dans le header de navigation (ni sur iOS ni sur Android)
- [x] L'absence du bouton retour s'applique uniquement au contexte du défi du jour — les parties solo classiques conservent leur comportement de navigation habituel
- [x] Sur Android, le bouton hardware retour est également désactivé ou déclenche une confirmation explicite (alerte "Êtes-vous sûr de vouloir quitter le défi ?") plutôt qu'une sortie silencieuse
- [x] Si une alerte de confirmation est implémentée sur Android, elle affiche deux options : "Continuer le défi" et "Quitter" — la sortie n'est effective qu'après confirmation explicite "Quitter"
- [x] Aucune régression sur F3-01 (défi quotidien), F3-17 (une seule tentative), F3-22, F3-27, F3-34 (fixes retour arrière)
- [x] `tsc --noEmit` passe sans erreur
- [x] `npm run lint` passe sans erreur

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

Toute modification touchant la navigation dans ArticleScreen doit respecter la règle obligatoire des specs navigation (diagramme d'état des stacks, comportement explicite pour chaque affordance de retour, section "Interactions connues").

## Validation QA — Halim

**Date :** 2026-03-22
**Statut :** PARTIAL — 7/7 critères validés (fix double-alerte appliqué PR #58). Gate device physique non validé — en attente confirmation Client.

### Critères vérifiés

- **Bouton retour masqué en mode défi :** condition `stackSize > 1 && !isDailyChallenge` dans le JSX. Quand `isDailyChallenge === true`, le bouton retour est remplacé par un placeholder même si `stackSize > 1`. Test Cas 2 confirme. Conforme.
- **Solo conserve le comportement habituel :** condition symétrique — `isDailyChallenge === false` laisse le comportement existant inchangé. Tests Cas 1 et Cas 3 confirment. Conforme.
- **BackHandler Android — confirmation explicite :** `isDailyChallenge` dans le handler BackHandler appelle `handleDailyQuit()` qui déclenche une Alert. Pas de sortie silencieuse. Test Cas 4 confirme. Conforme.
- **Options de l'alerte — CORRIGÉ (PR #58) :** Bug P-17-01 corrigé — `handleDailyQuit` inline désormais `abandonSession() + navigate('Home')` directement sans appeler `handleAbandon()`. Une seule alerte. Test Cas 6 vérifie que `alertSpy` est appelé exactement 1 fois. 34/34 tests passants après fix. Conforme.
- **Aucune régression :** 698 tests mobiles passants (44 suites). tsc sans erreur. Conforme.
- **tsc --noEmit :** 0 erreur. Conforme.
- **lint :** 0 erreur (warnings console.log pré-existants, non bloquants). Conforme.

### Tests automatisés
- `npx jest __tests__/ArticleScreen.test.tsx` : 34/34 tests passants dont 6 cas P-17 (Cas 6 ajouté par fix P-17-01)
- `npx tsc --noEmit` : 0 erreur
- `npx eslint src/ --ext .ts,.tsx` : 0 erreur (warnings pré-existants)
- Suite complète mobile : 698/698 tests passants

### Gate device physique — BLOQUANT
P-17 touche la navigation et le store de jeu (`isDailyChallenge`). Ce critère ne peut pas être coché par QA seul — il requiert une validation Client sur device physique (iOS + Android). Story maintenue en `in-progress` jusqu'à confirmation Client.

## Statut
in-progress
