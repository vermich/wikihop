---
id: F3-41
title: UX — Bouton de partage VictoryScreen : icône standard dans l'encadré statistiques
phase: 3-Features
priority: Should
agents: [Frontend Dev, UX/UI]
status: pending
created: 2026-03-18
completed:
---

# F3-41 — UX — Bouton de partage VictoryScreen : icône standard dans l'encadré statistiques

## User Story
En tant que joueur sur l'écran de victoire, je veux partager mon résultat via une icône de partage standard intégrée dans l'encadré des statistiques, afin que l'action de partage soit facilement repérable et cohérente avec les conventions mobiles.

## Critères d'acceptance
- [ ] Le bouton de partage sur VictoryScreen affiche une icône standard de partage (icône "share" iOS / Android) et non un libellé texte
- [ ] Le bouton est positionné dans l'encadré qui affiche les statistiques (nombre de sauts, temps), à proximité de l'information de score
- [ ] Un tap sur l'icône déclenche le même comportement qu'auparavant (appel à `Share.share` avec le message de résultat)
- [ ] L'ancienne disposition avec bouton texte est supprimée
- [ ] L'icône est accessible : elle possède un `accessibilityLabel` explicite (ex. "Partager mon résultat")
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending
