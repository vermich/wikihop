---
id: M-16
title: Pages populaires — stratégie hybride API + cache + fallback JSON
phase: 2-MVP
priority: Must
agents: [Frontend Dev, Backend Dev]
status: pending
created: 2026-03-01
completed:
---

# M-16 — Pages populaires — stratégie hybride API + cache + fallback JSON

## User Story
En tant que joueur, je veux que la paire d'articles proposée soit issue de pages Wikipedia connues et intéressantes, même sans connexion internet, afin de toujours pouvoir jouer.

## Critères d'acceptance
- [ ] Le service `popular-pages` interroge l'API Wikimedia (`/api/rest_v1/metrics/pageviews/top/...`) pour récupérer les pages les plus consultées du mois en cours
- [ ] Les pages populaires récupérées depuis l'API sont stockées en cache AsyncStorage avec un TTL de 24 heures
- [ ] Si l'API Wikimedia est inaccessible (pas de réseau ou erreur), le service utilise un fichier JSON statique embarqué dans l'app (`assets/popular-pages.json`) comme fallback
- [ ] Le fichier JSON statique contient au minimum 200 articles par langue (FR et EN) pour assurer une bonne variété
- [ ] Un bouton "Recharger" en HomeScreen déclenche un rechargement manuel des pages populaires depuis l'API (avec animation de chargement)
- [ ] La date de dernière mise à jour des pages populaires est affichée dans la HomeScreen (ex : "Mis à jour il y a 2 heures")
- [ ] Les pages dont le titre contient des termes à exclure (pages de désambiguïsation, listes, portails) sont filtrées
- [ ] La langue du service s'adapte à la langue sélectionnée dans l'app (FR ou EN)

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
