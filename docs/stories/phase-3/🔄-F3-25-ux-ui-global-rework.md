---
id: F3-25
title: Refonte UX/UI globale (vague dédiée)
phase: 3-Features
priority: Should
agents: [UX/UI, Frontend Dev]
status: in-progress
created: 2026-03-14
completed:
depends_on: [F3-08, F3-10]
---

# F3-25 — Refonte UX/UI globale (vague dédiée)

## User Story
En tant que joueur, je veux une interface cohérente, intuitive et sans friction à travers tous les écrans, afin de me concentrer sur le jeu sans être gêné par des incohérences visuelles ou des éléments mal placés.

## Critères d'acceptance
- [ ] "Historique" est renommé "Historique des parties" dans tous les écrans et libellés de navigation
- [ ] Le toggle mode difficile est positionné à gauche du titre "WikiHop" sur HomeScreen, conformément aux specs UX/UI
- [ ] VictoryScreen : le bouton de l'article cible est visible sans scroll — aucun défilement n'est nécessaire pour y accéder depuis la position initiale
- [ ] VictoryScreen : le lien vers l'historique est supprimé de cet écran
- [ ] VictoryScreen : le partage est intégré autrement que par le lien précédent (selon specs UX/UI)
- [ ] Filtres tri historique : chaque critère de tri dispose d'un seul bouton avec 3 états (clic 1 → ascendant, clic 2 → descendant, clic 3 → neutre/désactivé)
- [ ] Le logo d'accès aux statistiques est remplacé par un élément graphique compréhensible (l'icône ⊞ actuelle est abandonnée) — selon specs UX/UI
- [ ] Le bouton "À propos" est positionné au-dessus de la ligne de flottaison sur l'écran qui le contient
- [ ] Aucune régression fonctionnelle sur les features existantes (navigation, jeu, historique, stats)
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur

## Notes de réalisation

Audit complet des 8 critères réalisé le 2026-03-16. Tous les critères étaient déjà implémentés dans `develop` au moment de la prise en charge, répartis dans plusieurs PR précédentes :

- **Critère 1** — "Historique des parties" : texte correct dans `HomeScreen.tsx` (branches loading + success) et dans `HistoryScreen.tsx` (header `Header` interne).
- **Critère 2** — Toggle mode difficile dans le header : `Switch` positionné dans `difficultyHeaderToggle` (`position: 'absolute', left: 16`), premier enfant du header JSX, accessibilityLabel dynamique, `accessibilityState={{ checked }}`. Supprimé du corps ScrollView.
- **Critère 3** — Bouton "Lire [titre]" dans la zone sticky : `readButton` présent avant `primaryButtonsRow` dans `stickyButtons`, hauteur 48, bordure `#2563EB`, `marginBottom: 12`.
- **Critère 4** — Lien "Voir l'historique" : absent de `VictoryScreen.tsx` — supprimé, aucun style mort résiduel.
- **Critère 5** — Partager en couleur primaire : `shareButtonText.color = '#2563EB'` (promu depuis `#64748B`).
- **Critère 6** — SortBar 3 états : implémenté dans `HistoryScreen.tsx` via `useHistorySort` + `SORT_BUTTONS`. Déjà fait.
- **Critère 7** — "Stats" remplace "⊞" : `statsButtonText` affiche `{'Stats'}`, `fontSize: 13`, `fontWeight: 'bold'`, `color: '#2563EB'`, zone tactile `minWidth: 44, height: 44, paddingHorizontal: 8`.
- **Critère 8** — "À propos" au-dessus de la ligne de flottaison : ordre des boutons secondaires correct (Historique des parties → Soutenir Wikipedia → À propos), séparateur `secondaryLinksSeparator` présent dans les deux branches (loading + success).

**lint** : 0 erreur (19 warnings console pre-existants).
**tsc** : l'erreur `Property 'id' is missing` sur `Stack.Navigator` est une erreur pre-existante dans `develop` (non liée à F3-25).

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress
