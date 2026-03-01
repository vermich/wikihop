---
id: F3-10
title: Tri multi-critères dans l'historique des parties
phase: 3-Features
priority: Should
agents: [Frontend Dev, UX/UI]
status: pending
created: 2026-03-01
completed:
---

# F3-10 — Tri multi-critères dans l'historique des parties

## User Story
En tant que joueur, je veux trier mon historique de parties selon différents critères, afin de retrouver facilement mes meilleures performances ou mes parties les plus récentes.

## Critères d'acceptance
- [ ] Un sélecteur (Picker dropdown ou segmented control) permet de choisir le critère de tri dans l'écran historique
- [ ] Les critères de tri disponibles sont : Date (plus récent), Date (plus ancien), Durée (plus courte), Durée (plus longue), Nombre de clics (moins), Nombre de clics (plus)
- [ ] Le tri est appliqué immédiatement à l'affichage sans rechargement de la liste
- [ ] Le critère de tri sélectionné est mémorisé (AsyncStorage) et restauré à la prochaine ouverture de l'historique
- [ ] Par défaut, l'historique est trié par Date (plus récent en premier)
- [ ] Le sélecteur de tri affiche clairement le critère actuellement actif

## Notes de réalisation
Cette story complète F3-02 (Historique des parties) en ajoutant la dimension tri. Elle doit être développée après F3-02.

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
