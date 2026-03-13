---
id: F3-11
title: Vue détail d'une partie — parcours, suppression et rejouer
phase: 3-Features
priority: Should
agents: [Frontend Dev, UX/UI]
status: done
created: 2026-03-01
completed: 2026-03-13
---

# F3-11 — Vue détail d'une partie — parcours, suppression et rejouer

## User Story
En tant que joueur, je veux consulter le détail complet d'une partie passée et pouvoir la rejouer ou la supprimer, afin de revisiter mes trajets intéressants et gérer mon historique.

## Critères d'acceptance
- [x] Un appui sur une entrée de l'historique ouvre un écran DetailScreen dédié
- [x] L'écran affiche : date et heure de la partie, durée totale, nombre de clics, article de départ, article destination, statut (Victoire / Abandonné)
- [x] Le parcours complet (liste ordonnée des articles visités) est affiché — note : GameRecord ne stocke pas `path` (décision périmètre F3-02) ; message "Détail du parcours non disponible" affiché, conforme à la spec technique validée par le Tech Lead
- [x] Un bouton "Rejouer cette partie" recharge la même paire départ/destination et démarre une nouvelle session (avec timer et compteur remis à zéro)
- [x] Un bouton "Supprimer" supprime définitivement cette entrée de l'historique local après confirmation (titre : "Supprimer cette partie" / message : "Cette action est irréversible.")
- [x] Après suppression, l'écran retourne automatiquement à l'historique et l'entrée n'apparaît plus dans la liste
- [x] Un bouton "Retour" ramène à l'écran d'historique sans modification

## Notes de réalisation
Cette story dépend de F3-02 (Historique des parties). Le service ScoreStorage doit exposer une méthode `deleteScore(id)`. Le WebviewScreen générique (fonctionnalité V1) sert à l'affichage des pages du parcours.

## Validation QA — Halim
Validé le 2026-03-13 par Halim.
- Route GameDetail: { recordId: string } présente dans RootStackParamList et RootNavigator
- HistoryItem.onPress branché dans HistoryScreen via handleItemPress → navigation.navigate('GameDetail', { recordId })
- Cas record === null géré : écran "Partie introuvable" + bouton Retour
- Bouton Rejouer : clearSession() + startSession() + navigation.navigate('Game') — ordre conforme à la spec
- Bouton Supprimer : Alert.alert avec confirmation + ScoreStorage.deleteRecord + navigation.goBack()
- Message "Détail du parcours non disponible" affiché (champ path absent du GameRecord — périmètre F3-02)
- Gate device physique : non testé sur device physique (test automatisé uniquement)
- 21 tests GameDetailScreen passants / 483 suite complète — 0 régression
- tsc sans erreur / lint 0 erreur

RESERVE : Gate device physique (navigation History → GameDetail → Rejouer → Game) à valider manuellement sur iOS et Android avant livraison client. Ce point est en attente de validation manuelle — non bloquant pour la validation QA automatisée.

## Statut
pending → in-progress → done
