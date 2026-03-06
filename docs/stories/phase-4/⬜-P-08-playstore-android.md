---
id: P-08
title: Soumission Google Play Store (Android)
phase: 4-Production
priority: Must
agents: [Tech Lead, Frontend Dev, DPO]
status: pending
created: 2026-02-28
completed:
---

# P-08 — Soumission Google Play Store (Android)

## User Story
En tant qu'éditeur, je veux soumettre WikiHop sur le Google Play Store, afin que les utilisateurs Android puissent télécharger le jeu.

## Critères d'acceptance
- [ ] Compte Google Play Console actif (frais uniques)
- [ ] `app.json` / `app.config.js` Expo configuré : `package` Android, `versionCode`, icône adaptative, splash screen
- [ ] Build Expo EAS `production` signé avec la keystore Android (stockée en dehors du dépôt)
- [ ] Métadonnées Play Store complètes : description (fr), captures d'écran (téléphone + tablette), catégorie, classification PEGI
- [ ] Politique de confidentialité accessible via URL publique (obligatoire pour toute app)
- [ ] Formulaire "Data Safety" Google Play rempli (aucune donnée collectée)
- [ ] Classification de contenu obtenue (questionnaire IARC)
- [ ] Soumission initiale en mode "Révision interne" (tracks Google Play)

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
