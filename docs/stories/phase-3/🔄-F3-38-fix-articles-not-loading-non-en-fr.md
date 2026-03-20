---
id: F3-38
title: Fix — Articles non chargés pour les langues ES/DE/PT/IT/NL/PL
phase: 3-Features
priority: Must
agents: [Frontend Dev, Backend Dev]
status: pending
created: 2026-03-18
completed:
---

# F3-38 — Fix — Articles non chargés pour les langues ES/DE/PT/IT/NL/PL

## User Story
En tant que joueur ayant sélectionné une langue autre que l'anglais ou le français, je veux que les articles Wikipedia se chargent correctement, afin de pouvoir jouer dans ma langue.

## Critères d'acceptance
- [ ] En locale ES, un article Wikipedia est chargé et affiché dans la WebView sans erreur
- [ ] En locale DE, un article Wikipedia est chargé et affiché dans la WebView sans erreur
- [ ] En locale PT, un article Wikipedia est chargé et affiché dans la WebView sans erreur
- [ ] En locale IT, un article Wikipedia est chargé et affiché dans la WebView sans erreur
- [ ] En locale NL, un article Wikipedia est chargé et affiché dans la WebView sans erreur
- [ ] En locale PL, un article Wikipedia est chargé et affiché dans la WebView sans erreur
- [ ] EN et FR continuent de fonctionner sans régression
- [ ] La paire d'articles générée (départ + cible) correspond bien à la langue sélectionnée dans chaque locale testée
- [ ] `tsc --noEmit` passe sans erreur après le fix
- [ ] `npm run lint` passe sans erreur après le fix

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

Piste probable : le code de langue passé à l'API Wikipedia ou à la WebView n'est pas correctement résolu pour les 6 langues ajoutées dans F3-26. Vérifier le mapping entre le code locale i18n et le subdomain Wikipedia (`es.wikipedia.org`, `de.wikipedia.org`, etc.) ainsi que la liste de pages populaires fallback pour chaque langue.

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending
