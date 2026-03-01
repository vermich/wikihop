---
id: F3-11
title: Vue détail d'une partie — parcours, suppression et rejouer
phase: 3-Features
priority: Should
agents: [Frontend Dev, UX/UI]
status: pending
created: 2026-03-01
completed:
---

# F3-11 — Vue détail d'une partie — parcours, suppression et rejouer

## User Story
En tant que joueur, je veux consulter le détail complet d'une partie passée et pouvoir la rejouer ou la supprimer, afin de revisiter mes trajets intéressants et gérer mon historique.

## Critères d'acceptance
- [ ] Un appui sur une entrée de l'historique ouvre un écran DetailScreen dédié
- [ ] L'écran affiche : date et heure de la partie, durée totale, nombre de clics, article de départ, article destination, statut (Victoire / Abandonné)
- [ ] Le parcours complet (liste ordonnée des articles visités) est affiché, chaque article étant cliquable et ouvre la page Wikipedia correspondante dans une WebView externe (WebviewScreen)
- [ ] Un bouton "Rejouer cette partie" recharge la même paire départ/destination et démarre une nouvelle session (avec timer et compteur remis à zéro)
- [ ] Un bouton "Supprimer" supprime définitivement cette entrée de l'historique local après confirmation ("Supprimer cette partie ? Cette action est irréversible.")
- [ ] Après suppression, l'écran retourne automatiquement à l'historique et l'entrée n'apparaît plus dans la liste
- [ ] Un bouton "Retour" ramène à l'écran d'historique sans modification

## Notes de réalisation
Cette story dépend de F3-02 (Historique des parties). Le service ScoreStorage doit exposer une méthode `deleteScore(id)`. Le WebviewScreen générique (fonctionnalité V1) sert à l'affichage des pages du parcours.

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
