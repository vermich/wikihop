---
id: F3-24
title: Parcours complet dans GameDetailScreen
phase: 3-Features
priority: Could
agents: [Tech Lead, Frontend Dev]
status: pending
created: 2026-03-14
completed:
depends_on: [F3-11]
---

# F3-24 — Parcours complet dans GameDetailScreen

## User Story
En tant que joueur, je veux voir la liste ordonnée des articles que j'ai visités dans le détail d'une partie, afin de me souvenir précisément de mon parcours et de l'analyser.

## Critères d'acceptance
- [ ] GameDetailScreen affiche la liste ordonnée des articles visités pendant la partie (article de départ → article final), sans afficher "Détail du parcours non disponible"
- [ ] Le Tech Lead a documenté la décision d'architecture concernant le stockage de `path: Article[]` dans `GameRecord` (réévaluation de l'impact AsyncStorage par rapport à la décision initiale de F3-02)
- [ ] `buildGameRecord` est modifié pour inclure le tableau `path` lors de la création d'un enregistrement
- [ ] Les anciennes parties en AsyncStorage (sans champ `path`) s'affichent sans erreur — gestion du champ optionnel ou valeur par défaut
- [ ] La liste des articles est scrollable si elle dépasse la hauteur visible de l'écran
- [ ] Chaque article de la liste affiche au minimum son titre
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending
