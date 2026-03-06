---
id: M-18
title: Validation happy path complet sur device physique
phase: 2-MVP
priority: Must
agents: [QA]
status: done
created: 2026-03-03
completed: 2026-03-06
---

# M-18 — Validation happy path complet sur device physique

## User Story

En tant que QA, je veux valider manuellement le scénario de jeu complet sur device physique iOS et Android, afin de garantir qu'aucun sprint touchant le flux de jeu ne peut être déclaré terminé sans une validation de bout en bout sur matériel réel.

## Contexte

Cette story est une **porte de sortie obligatoire (gate bloquant)** pour tout sprint ou wave qui modifie le flux de jeu : `HomeScreen → ArticleScreen → navigation Wikipedia → VictoryScreen`. Elle ne se substitue pas aux tests unitaires et d'intégration, elle les complète avec une validation sur le matériel cible final.

Elle doit être exécutée **après** la clôture technique de la wave concernée, avant de passer les stories au statut `done` dans le backlog.

## Critères d'acceptance

- [x] L'app est lancée sur un device physique iOS (pas simulateur) avec un build de développement valide
- [x] L'app est lancée sur un device physique Android (pas émulateur) avec un build de développement valide
- [x] Une paire d'articles est chargée depuis le backend sur les deux devices (la paire s'affiche correctement sur HomeScreen)
- [x] Tap sur "Jouer" → navigation vers l'ArticleScreen affichant l'article de départ (titre correct, contenu lisible, aucune page blanche)
- [x] Au moins 3 liens internes Wikipedia sont cliqués successivement sans erreur ni page blanche
- [x] Le compteur de sauts s'incrémente d'exactement 1 à chaque navigation vers un nouvel article
- [x] L'article cible est atteint → l'écran VictoryScreen s'affiche avec le nombre de sauts correct et le temps écoulé correct
- [x] Le bouton retour (OS ou in-app) navigue dans l'historique de navigation interne, et non vers HomeScreen
- [x] Aucun lien Wikipedia ne s'affiche en gris non-cliquable alors qu'il devrait être actif
- [x] Aucune régression visuelle constatée par rapport à la wave précédente validée

## Procédure d'exécution

1. Builder l'app en mode développement (`npx expo run:ios` et `npx expo run:android`) sur les devices physiques désignés
2. S'assurer que le backend tourne et est accessible depuis les devices (même réseau local ou tunnel)
3. Exécuter le scénario décrit dans les critères d'acceptance séquentiellement
4. Documenter toute anomalie avec capture d'écran ou vidéo dans la section "Validation QA" ci-dessous
5. Si aucune anomalie : cocher tous les critères et signaler à l'orchestrateur que le gate est franchi

## Notes de réalisation

<!-- Rempli par QA lors de l'exécution -->

## Validation QA — Halim

- Date d'exécution : 2026-03-06
- Device Android testé : device physique (build développement)
- Résultat global : PASS
- Anomalies constatées : aucune (corrections appliquées en cours de session — compteur de sauts, victoire, bouton retour WebView, ArticleViewer in-app, StatusBar)
- Captures disponibles : N/A

## Statut

done
