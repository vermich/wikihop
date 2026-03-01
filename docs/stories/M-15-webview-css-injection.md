---
id: M-15
title: WebView Wikipedia avec injection CSS mobile
phase: 2-MVP
priority: Must
agents: [Frontend Dev]
status: pending
created: 2026-03-01
completed:
---

# M-15 — WebView Wikipedia avec injection CSS mobile

## User Story
En tant que joueur, je veux lire les articles Wikipedia dans une WebView épurée sans le header et footer Wikipedia, afin de me concentrer sur la navigation sans distraction.

## Critères d'acceptance
- [ ] Les articles Wikipedia sont affichés dans une WebView React Native (`react-native-webview`)
- [ ] Un script CSS est injecté au chargement pour masquer le header (`#mw-head`), le footer (`#mw-footer`), la barre latérale (`#mw-panel`) et les bannières de notification Wikipedia
- [ ] Le CSS injecté masque également les éléments de navigation Wikipedia non pertinents pour le jeu (menus, onglets Lecture/Modifier/Historique)
- [ ] Les liens internes Wikipedia (balises `<a>` vers `/wiki/...`) sont interceptables sans déclencher une navigation hors-WebView
- [ ] Les liens externes (hors domaine `wikipedia.org`) sont bloqués et ne provoquent pas de sortie de l'application
- [ ] Le CSS est appliqué avant le rendu visible (pas de flash du layout original)
- [ ] Le scroll fonctionne correctement sur iOS et Android
- [ ] L'injection CSS est encapsulée dans un composant réutilisable `WikipediaWebView`

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
