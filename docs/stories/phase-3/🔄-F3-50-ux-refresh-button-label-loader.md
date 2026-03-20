---
id: F3-50
title: UX — Renommer "Changer articles" + loader dynamique sur le bouton Recharger
phase: 3-Features
priority: Should
agents: [Frontend Dev]
status: in-progress
created: 2026-03-21
completed:
---

# F3-50 — UX — Renommer "Changer articles" + loader dynamique sur le bouton Recharger

## User Story
En tant que joueur sur l'écran d'accueil, je veux que le bouton de rechargement des articles utilise un libellé clair et affiche un indicateur de chargement pendant l'opération, afin de comprendre instantanément ce que fait le bouton et d'avoir un retour visuel pendant l'attente.

## Critères d'acceptance
- [ ] Le libellé du bouton Recharger est "Changer articles" dans toutes les 8 locales supportées (FR, EN, ES, DE, PT, IT, NL, PL) — les clés i18n correspondantes sont mises à jour dans tous les fichiers de traduction
- [ ] L'icône de chargement statique présente sur le bouton est retirée de l'état au repos (état normal, aucun chargement en cours)
- [ ] Pendant le chargement des articles, le libellé "Changer articles" est remplacé par un indicateur de chargement (spinner ou ActivityIndicator) — le libellé texte n'est pas affiché simultanément
- [ ] Une fois le chargement terminé (succès ou erreur), le libellé "Changer articles" est réaffiché normalement — l'indicateur de chargement disparaît
- [ ] Le bouton est désactivé (non tappable) pendant le chargement pour éviter les doubles déclenchements
- [ ] Le comportement existant de rechargement des paires d'articles est inchangé (F3-45)
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

Modifications attendues :
1. Renommer la clé i18n "Nouveaux articles" en "Changer articles" dans les 8 fichiers de locale (FR, EN, ES, DE, PT, IT, NL, PL)
2. Retirer l'icône de chargement statique du rendu au repos du bouton
3. Conditionner le contenu du bouton sur l'état de chargement : si `isLoading` → ActivityIndicator, sinon → libellé texte

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress
