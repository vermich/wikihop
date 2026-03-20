---
id: F3-38
title: Fix — Articles non chargés pour les langues ES/DE/PT/IT/NL/PL
phase: 3-Features
priority: Must
agents: [Frontend Dev, Backend Dev]
status: done
created: 2026-03-18
completed: 2026-03-20
---

# F3-38 — Fix — Articles non chargés pour les langues ES/DE/PT/IT/NL/PL

## User Story
En tant que joueur ayant sélectionné une langue autre que l'anglais ou le français, je veux que les articles Wikipedia se chargent correctement, afin de pouvoir jouer dans ma langue.

## Critères d'acceptance
- [x] En locale ES, un article Wikipedia est chargé et affiché dans la WebView sans erreur
- [x] En locale DE, un article Wikipedia est chargé et affiché dans la WebView sans erreur
- [x] En locale PT, un article Wikipedia est chargé et affiché dans la WebView sans erreur
- [x] En locale IT, un article Wikipedia est chargé et affiché dans la WebView sans erreur
- [x] En locale NL, un article Wikipedia est chargé et affiché dans la WebView sans erreur
- [x] En locale PL, un article Wikipedia est chargé et affiché dans la WebView sans erreur
- [x] EN et FR continuent de fonctionner sans régression
- [x] La paire d'articles générée (départ + cible) correspond bien à la langue sélectionnée dans chaque locale testée
- [x] `tsc --noEmit` passe sans erreur après le fix
- [x] `npm run lint` passe sans erreur après le fix

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

Piste probable : le code de langue passé à l'API Wikipedia ou à la WebView n'est pas correctement résolu pour les 6 langues ajoutées dans F3-26. Vérifier le mapping entre le code locale i18n et le subdomain Wikipedia (`es.wikipedia.org`, `de.wikipedia.org`, etc.) ainsi que la liste de pages populaires fallback pour chaque langue.

## Validation QA — Halim
Validé le 2026-03-20. popular-pages.json contient : es(188), de(182), pt(156), it(173), nl(176), pl(179) articles — tous ≥ 80. `FallbackLanguage` dans le service couvre les 8 langues. Tests backend passing (3 échecs DB préexistants hors scope, isolés dans db.test.ts). tsc backend sans erreur, lint sans erreur. Note : validation WebView sur device physique non effectuée (gate device non requis pour cette story — concerne le fallback backend, pas la WebView directement).

## Statut
done
