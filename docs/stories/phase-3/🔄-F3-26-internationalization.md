---
id: F3-26
title: Internationalisation des interfaces
phase: 3-Features
priority: Should
agents: [Tech Lead, Frontend Dev, Backend Dev]
status: in-progress
created: 2026-03-14
completed:
depends_on: []
---

# F3-26 — Internationalisation des interfaces

## User Story
En tant que joueur dont la langue maternelle n'est pas le français, je veux naviguer dans une interface traduite dans ma langue, afin de profiter pleinement du jeu sans barrière linguistique.

## Critères d'acceptance
- [ ] 8 langues implémentées : fr, en, es, de, pt, it, nl, pl
- [ ] La langue de l'app suit la langue système de l'appareil avec fallback sur le français
- [ ] Toutes les chaînes de l'interface sont externalisées dans des fichiers de traduction (aucun texte en dur dans les composants)
- [ ] Le Tech Lead a produit un ADR définissant la stratégie i18n (bibliothèque, structure fichiers, gestion pluriels)
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur

## Notes de réalisation
**Décision PO — 2026-03-16**
Langues cibles validées par le PO :
- Français (fr) — langue par défaut et fallback
- Anglais (en)
- Espagnol (es)
- Allemand (de)
- Portugais (pt)
- Italien (it)
- Néerlandais (nl)
- Polonais (pl)

Atelier de cadrage réalisé. Les critères d'acceptance sont désormais complets et la story peut entrer en développement.

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress
