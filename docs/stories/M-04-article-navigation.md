---
id: M-04
title: Navigation entre articles (tap sur un lien)
phase: 2-MVP
priority: Must
agents: [Frontend Dev]
status: pending
created: 2026-02-28
completed:
---

# M-04 — Navigation entre articles (tap sur un lien)

## User Story
En tant que joueur, je veux naviguer vers un autre article en tapant sur un lien interne, afin d'avancer vers la destination.

## Critères d'acceptance
- [ ] Taper sur un lien interne charge et affiche le nouvel article
- [ ] Chaque navigation incrémente le compteur de sauts de 1
- [ ] L'article visité est ajouté au chemin de la session (`path[]`)
- [ ] Un bouton "Retour" permet de revenir à l'article précédent dans le chemin (sans décrémenter les sauts)
- [ ] La navigation en arrière ne recharge pas l'article depuis l'API (utilisation du cache)
- [ ] L'état de scroll de l'article précédent n'est pas conservé (l'article s'affiche depuis le début)

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
