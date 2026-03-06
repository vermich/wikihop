---
id: P-07
title: Soumission App Store (iOS)
phase: 4-Production
priority: Must
agents: [Tech Lead, Frontend Dev, DPO]
status: pending
created: 2026-02-28
completed:
---

# P-07 — Soumission App Store (iOS)

## User Story
En tant qu'éditeur, je veux soumettre WikiHop sur l'App Store Apple, afin que les utilisateurs iOS puissent télécharger le jeu.

## Critères d'acceptance
- [ ] Compte Apple Developer Program actif
- [ ] `app.json` / `app.config.js` Expo configuré : `bundleIdentifier`, version, icône, splash screen
- [ ] Build Expo EAS `production` signé avec les certificats Apple valides
- [ ] Métadonnées App Store complètes : description (fr), captures d'écran (toutes tailles requises), catégorie, âge
- [ ] Politique de confidentialité accessible via URL publique
- [ ] Questionnaire App Privacy d'Apple rempli (pas de collecte de données)
- [ ] Review Guidelines Apple vérifiées (pas de guideline 3.2.2 violation — pas de raison de rejet évident)
- [ ] Soumission initiale en mode "Manuel" (pas de publication automatique)

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
