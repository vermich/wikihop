---
id: F3-01
title: Défi quotidien (même paire pour tous les joueurs)
phase: 3-Features
priority: Must
agents: [Backend Dev, Frontend Dev, UX/UI]
status: pending
created: 2026-02-28
completed:
---

# F3-01 — Défi quotidien (même paire pour tous les joueurs)

## User Story
En tant que joueur régulier, je veux un défi quotidien avec la même paire d'articles pour tous, afin de pouvoir comparer mes résultats avec d'autres joueurs.

## Critères d'acceptance
- [ ] Endpoint `GET /api/game/daily` retourne la paire du jour (identique pour tous les appels de la journée)
- [ ] La paire quotidienne change automatiquement à minuit UTC
- [ ] Les paires sont générées à l'avance et stockées en base de données
- [ ] Un joueur ne peut jouer le défi quotidien qu'une seule fois par jour (contrôle local)
- [ ] L'écran d'accueil affiche clairement le défi du jour avec une indication visuelle distincte
- [ ] Si le joueur a déjà joué le défi du jour, son résultat est affiché à la place du bouton "Jouer"

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
