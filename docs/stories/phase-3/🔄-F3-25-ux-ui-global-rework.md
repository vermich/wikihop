---
id: F3-25
title: Refonte UX/UI globale (vague dédiée)
phase: 3-Features
priority: Should
agents: [UX/UI, Frontend Dev]
status: in-progress
created: 2026-03-14
completed:
depends_on: [F3-08, F3-10]
---

# F3-25 — Refonte UX/UI globale (vague dédiée)

## User Story
En tant que joueur, je veux une interface cohérente, intuitive et sans friction à travers tous les écrans, afin de me concentrer sur le jeu sans être gêné par des incohérences visuelles ou des éléments mal placés.

## Critères d'acceptance
- [ ] "Historique" est renommé "Historique des parties" dans tous les écrans et libellés de navigation
- [ ] Le toggle mode difficile est positionné à gauche du titre "WikiHop" sur HomeScreen, conformément aux specs UX/UI
- [ ] VictoryScreen : le bouton de l'article cible est visible sans scroll — aucun défilement n'est nécessaire pour y accéder depuis la position initiale
- [ ] VictoryScreen : le lien vers l'historique est supprimé de cet écran
- [ ] VictoryScreen : le partage est intégré autrement que par le lien précédent (selon specs UX/UI)
- [ ] Filtres tri historique : chaque critère de tri dispose d'un seul bouton avec 3 états (clic 1 → ascendant, clic 2 → descendant, clic 3 → neutre/désactivé)
- [ ] Le logo d'accès aux statistiques est remplacé par un élément graphique compréhensible (l'icône ⊞ actuelle est abandonnée) — selon specs UX/UI
- [ ] Le bouton "À propos" est positionné au-dessus de la ligne de flottaison sur l'écran qui le contient
- [ ] Aucune régression fonctionnelle sur les features existantes (navigation, jeu, historique, stats)
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress
