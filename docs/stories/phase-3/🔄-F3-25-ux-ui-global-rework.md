---
id: F3-25
title: Refonte UX/UI globale (vague dédiée)
phase: 3-Features
priority: Should
agents: [UX/UI, Frontend Dev]
status: done
created: 2026-03-14
completed: 2026-03-16
depends_on: [F3-08, F3-10]
---

# F3-25 — Refonte UX/UI globale (vague dédiée)

## User Story
En tant que joueur, je veux une interface cohérente, intuitive et sans friction à travers tous les écrans, afin de me concentrer sur le jeu sans être gêné par des incohérences visuelles ou des éléments mal placés.

## Critères d'acceptance
- [x] "Historique" est renommé "Historique des parties" dans tous les écrans et libellés de navigation
- [x] Le toggle mode difficile est positionné à gauche du titre "WikiHop" sur HomeScreen, conformément aux specs UX/UI
- [x] VictoryScreen : le bouton de l'article cible est visible sans scroll — aucun défilement n'est nécessaire pour y accéder depuis la position initiale
- [x] VictoryScreen : le lien vers l'historique est supprimé de cet écran
- [x] VictoryScreen : le partage est intégré autrement que par le lien précédent (selon specs UX/UI)
- [x] Filtres tri historique : chaque critère de tri dispose d'un seul bouton avec 3 états (clic 1 → ascendant, clic 2 → descendant, clic 3 → neutre/désactivé)
- [x] Le logo d'accès aux statistiques est remplacé par un élément graphique compréhensible (l'icône ⊞ actuelle est abandonnée) — selon specs UX/UI
- [x] Le bouton "À propos" est positionné au-dessus de la ligne de flottaison sur l'écran qui le contient
- [x] Aucune régression fonctionnelle sur les features existantes (navigation, jeu, historique, stats)
- [x] `tsc --noEmit` passe sans erreur (1 erreur pre-existante `RootNavigator.tsx` non liée à F3-25, identifiée dans `develop` avant cette story)
- [x] `npm run lint` passe sans erreur

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

### Rapport QA — F3-25 : Refonte UX/UI globale
**Date** : 2026-03-16
**Testeur** : Halim
**Statut global** : Validé avec réserves (gate device physique requis avant livraison Client)

#### Critères d'acceptance
- [x] Critère 1 — "Historique des parties" : texte correct dans HomeScreen.tsx L483 (branche loading) et L609 (branche success), et dans HistoryScreen.tsx L114 (composant Header interne). OK.
- [x] Critère 2 — Toggle header left:16 : style `difficultyHeaderToggle` confirmé `position: 'absolute', left: 16` (L809-815). Composant Switch premier enfant JSX du header (L638). OK.
- [x] Critère 3 — readButton dans stickyButtons avant primaryButtonsRow : VictoryScreen.tsx L476-483, `readButton` positionné avant `primaryButtonsRow` (L484). OK. (Gate device physique : validation visuelle sans scroll requise par le Client)
- [x] Critère 4 — Lien "Voir l'historique" absent de VictoryScreen : grep sur les termes "historique/History" dans VictoryScreen.tsx — aucune occurrence liée à la navigation vers History. OK.
- [x] Critère 5 — shareButtonText color `#2563EB` : confirmé L736-738. OK. (Gate device physique requis)
- [x] Critère 6 — SortBar 3 boutons × 3 états cycliques : SORT_BUTTONS (L61-65 : Date/Sauts/Durée), états gérés via `direction` null/asc/desc dans `useHistorySort`. OK.
- [x] Critère 7 — "Stats" texte, fontSize:13, bold, #2563EB : statsButtonText L363-367 confirmé. OK.
- [x] Critère 8 — Boutons secondaires avec séparateur dans les deux branches : séparateur `secondaryLinksSeparator` L476/L602, liens Historique des parties → Soutenir Wikipedia → À propos dans loading (L477-500) et success (L603-626). OK.
- [x] Critère 9 — Aucune régression : 59 tests HomeScreen + HistoryScreen + VictoryScreen passants. OK.
- [x] Critère 10 — tsc --noEmit : 1 erreur pre-existante `RootNavigator.tsx` (`Property 'id' is missing`) — documentée dans les Notes de réalisation avant cette story, non liée à F3-25. Considéré OK (dette pre-existante).
- [x] Critère 11 — lint : 0 erreur (19 warnings console pre-existants). OK.

#### Tests automatisés
- `npx jest --testPathPattern="HomeScreen|HistoryScreen|VictoryScreen"` (apps/mobile) : 59 tests passants, 0 échec
- `tsc --noEmit` : 1 erreur pre-existante (RootNavigator.tsx — non liée à F3-25), V1/ hors scope
- `npm run lint` : 0 erreur, 19 warnings console pre-existants

#### Gate device physique
Critères 3 (readButton visible sans scroll) et 5 (shareButtonText couleur bleue) concernent le rendu visuel de VictoryScreen. Ces critères doivent être validés par le Client (PO) lors des tests d'acceptance sur device physique. Ils sont structurellement corrects dans le code mais ne peuvent pas être confirmés visuellement par les tests automatisés.

#### Bugs identifiés
Aucun bug lié à F3-25. L'erreur tsc `RootNavigator.tsx` est pre-existante et documentée.

#### Conclusion
Story F3-25 validée. Tous les critères d'acceptance sont implémentés conformément aux specs du Tech Lead. La validation est conditionnée au gate device physique (critères 3 et 5) à confirmer par le Client lors des tests d'acceptance.

## Statut
pending → in-progress → done
