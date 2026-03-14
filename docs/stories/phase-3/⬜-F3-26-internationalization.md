---
id: F3-26
title: Internationalisation des interfaces
phase: 3-Features
priority: Should
agents: [Tech Lead, Frontend Dev, Backend Dev]
status: pending
created: 2026-03-14
completed:
depends_on: []
---

# F3-26 — Internationalisation des interfaces

## User Story
En tant que joueur dont la langue maternelle n'est pas le français, je veux naviguer dans une interface traduite dans ma langue, afin de profiter pleinement du jeu sans barrière linguistique.

## Critères d'acceptance
<!-- À compléter après l'atelier de cadrage avec le PO — langues cibles, périmètre de traduction et stratégie technique non encore définis -->
- [ ] L'atelier de cadrage PO a été réalisé et ses conclusions sont documentées dans cette story (langues cibles, périmètre, priorisation)
- [ ] Le Tech Lead a produit un ADR définissant la stratégie d'internationalisation (bibliothèque i18n, structure des fichiers de traduction, gestion des pluriels)
- [ ] Toutes les chaînes de l'interface sont externalisées dans des fichiers de traduction (aucun texte en dur dans les composants)
- [ ] La langue de l'application suit la langue système de l'appareil avec fallback sur le français
- [ ] Les langues cibles définies lors de l'atelier sont toutes traduites et intégrées
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur

## Notes de réalisation
Bloqué par atelier de cadrage PO à planifier. Langues cibles et périmètre de traduction non encore définis.
Les critères d'acceptance détaillés seront affinés après l'atelier.

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending
