---
id: F3-12
title: Multijoueur local hot-seat (passage du téléphone)
phase: 3-Features
priority: Should
agents: [Frontend Dev, UX/UI]
status: done
created: 2026-03-01
completed: 2026-03-14
---

# F3-12 — Multijoueur local hot-seat (passage du téléphone)

## User Story
En tant que groupe de joueurs réunis physiquement, je veux pouvoir jouer à WikiHop à tour de rôle sur le même appareil, afin de me comparer à mes amis sans avoir besoin d'une connexion réseau ou de plusieurs téléphones.

## Critères d'acceptance
- [x] Un bouton "Multijoueur" est accessible depuis la HomeScreen et ouvre un écran de configuration (MultiplayerSetupScreen)
- [x] L'écran de configuration permet de saisir les noms de 2 à 6 joueurs (champ texte par joueur), avec possibilité d'ajouter ou retirer des joueurs
- [x] La validation du formulaire refuse de démarrer si un joueur a un nom vide ou si moins de 2 joueurs sont configurés
- [x] La même paire départ/destination est utilisée pour tous les joueurs d'une session multijoueur
- [ ] Les joueurs jouent à tour de rôle : quand le joueur actif termine (victoire ou abandon), le téléphone passe au joueur suivant — GATE DEVICE PHYSIQUE REQUIS
- [ ] L'interface affiche clairement le nom du joueur actif pendant son tour (ex : en-tête "Tour de Sophie") — GATE DEVICE PHYSIQUE REQUIS
- [x] À la fin du tour d'un joueur, un écran de transition "Passe le téléphone à [nom du prochain joueur]" est affiché avant de démarrer le tour suivant
- [x] Le score (temps + clics) de chaque joueur est conservé en mémoire pendant la session
- [x] À la fin du dernier tour, un classement final affiche les scores de tous les joueurs triés par performance (moins de clics, puis moins de temps)
- [x] Aucune donnée réseau n'est requise — tout se passe en local sur l'appareil

## Notes de réalisation
Distinction avec WNT-03 : cette story couvre le hot-seat (multijoueur local, sans réseau), qui existait dans la V1. WNT-03 reste Won't do car il visait le multijoueur temps réel avec WebSockets et matchmaking. Ces deux modes sont fondamentalement différents en termes de complexité technique.

## Validation QA — Halim
Validé le 2026-03-14 (critères automatiques). `useMultiplayerStore` : Zustand sans `persist`, zéro AsyncStorage. Tests TDD `validatePlayerNames` + `rankPlayers` committés (5cd74c6) AVANT l'implémentation (2932820). 3 écrans créés (MultiplayerSetupScreen, PassPhoneScreen, MultiplayerResultScreen). 3 routes dans RootStackParamList et RootNavigator. `gestureEnabled: false` sur PassPhone et MultiplayerResult. VictoryScreen : "Tour suivant →" si `isMultiplayerActive`, bouton "Voir l'historique" masqué. HomeScreen : bouton "Multijoueur" présent dans les deux instances buttonsContainer. Guards `noUncheckedIndexedAccess` sur tous les accès tableau indexés (`players[0]?.name`, `updated[index]`, etc.). Flux solo inchangé. Critères comportementaux du flux complet (tour de rôle, nom du joueur actif pendant son tour) non cochés — gate device physique requis.

## Statut
pending → in-progress → done
