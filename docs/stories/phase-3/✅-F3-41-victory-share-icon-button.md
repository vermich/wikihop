---
id: F3-41
title: UX — Bouton de partage VictoryScreen : icône standard dans l'encadré statistiques
phase: 3-Features
priority: Should
agents: [Frontend Dev, UX/UI]
status: done
created: 2026-03-18
completed: 2026-03-20
---

# F3-41 — UX — Bouton de partage VictoryScreen : icône standard dans l'encadré statistiques

## User Story
En tant que joueur sur l'écran de victoire, je veux partager mon résultat via une icône de partage standard intégrée dans l'encadré des statistiques, afin que l'action de partage soit facilement repérable et cohérente avec les conventions mobiles.

## Critères d'acceptance
- [x] Le bouton de partage sur VictoryScreen affiche une icône standard de partage (icône "share" iOS / Android) et non un libellé texte
- [x] Le bouton est positionné dans l'encadré qui affiche les statistiques (nombre de sauts, temps), à proximité de l'information de score
- [x] Un tap sur l'icône déclenche le même comportement qu'auparavant (appel à `Share.share` avec le message de résultat)
- [x] L'ancienne disposition avec bouton texte est supprimée
- [x] L'icône est accessible : elle possède un `accessibilityLabel` explicite (ex. "Partager mon résultat")
- [x] `tsc --noEmit` passe sans erreur
- [x] `npm run lint` passe sans erreur

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
Validé le 2026-03-20. Import Ionicons confirmé depuis `@expo/vector-icons`. TouchableOpacity avec icône `share-social-outline` (taille 22, couleur `#2563EB`) positionné dans `statsBlock`. Style `shareIconButton` : `position: 'absolute'`, `top: 12`, `right: 12`. `accessibilityLabel` via clé i18n `victory.a11y_share`. `accessibilityRole="button"` présent. Styles `shareButton`/`shareButtonText` absents. tsc sans erreur, lint sans erreur.

Note : 2 tests VictoryScreen en échec (voir Bug ci-dessous) — tests obsolètes non mis à jour, non bloquants pour la validation de l'implémentation.

## Bug identifié — Tests obsolètes
**Sévérité : Moyenne** — 2 tests dans `__tests__/VictoryScreen.test.tsx` cherchent des éléments supprimés intentionnellement :
- `affiche le message Félicitations !` (ligne 258) : cherche `getByText('Félicitations !')` supprimé par F3-42
- `le bouton Partager est présent avec le texte "Partager ↑"` (ligne 390) : cherche `getByText('Partager  ↑')` remplacé par icône dans F3-41

Ces tests doivent être mis à jour par Laurent pour refléter la nouvelle implémentation.

## Statut
done
