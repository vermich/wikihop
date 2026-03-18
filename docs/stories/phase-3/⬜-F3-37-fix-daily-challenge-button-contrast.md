---
id: F3-37
title: Fix — Contraste bouton défi du jour (texte blanc sur fond gris, locale FR)
phase: 3-Features
priority: Must
agents: [Frontend Dev]
status: pending
created: 2026-03-18
completed:
---

# F3-37 — Fix — Contraste bouton défi du jour (texte blanc sur fond gris, locale FR)

## User Story
En tant que joueur utilisant l'application en français, je veux que le bouton du défi du jour soit lisible, afin de pouvoir l'identifier clairement sans effort visuel.

## Critères d'acceptance
- [ ] En locale FR, le texte du bouton défi du jour est lisible — le ratio de contraste texte/fond est conforme WCAG 2.1 AA (minimum 4.5:1 pour un texte normal)
- [ ] En locale EN, le comportement et le rendu du bouton restent identiques à l'état actuel (aucune régression)
- [ ] Le fix est vérifié dans les deux thèmes si l'app supporte un mode sombre, sinon en mode clair uniquement
- [ ] `tsc --noEmit` passe sans erreur après le fix
- [ ] `npm run lint` passe sans erreur après le fix

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

Symptôme observé : texte blanc sur fond gris sur le bouton défi du jour uniquement en FR. Probable cause : une traduction FR plus longue force un recalcul de style ou un état de complétion renvoie une couleur de fond grise au lieu d'une couleur foncée.

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending
