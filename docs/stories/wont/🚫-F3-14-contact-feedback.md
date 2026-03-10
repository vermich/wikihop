---
id: F3-14
title: Formulaire de feedback in-app (ContactScreen)
phase: 3-Features
priority: Could
agents: [Frontend Dev, UX/UI, DPO, Backend Dev]
status: pending
created: 2026-03-01
completed:
---

# F3-14 — Formulaire de feedback in-app (ContactScreen)

## User Story
En tant que joueur, je veux pouvoir envoyer un message à l'équipe WikiHop directement depuis l'application, afin de signaler un bug, suggérer une amélioration ou poser une question sans quitter l'app.

## Critères d'acceptance
- [ ] Un écran ContactScreen est accessible depuis la HomeScreen ou le menu principal
- [ ] Le formulaire propose une sélection de catégorie obligatoire parmi : "Bug", "Suggestion de fonctionnalité", "Autre"
- [ ] Un champ texte libre (multiline, 10 à 1000 caractères) permet de saisir le message
- [ ] La soumission est refusée si la catégorie n'est pas sélectionnée ou si le message est vide ou inférieur à 10 caractères, avec un message d'erreur explicite sur le champ concerné
- [ ] Lors de la soumission, un indicateur de chargement est affiché et le bouton est désactivé pour éviter les doubles envois
- [ ] En cas de succès, un message de confirmation s'affiche ("Merci pour votre retour !") et le formulaire est réinitialisé
- [ ] En cas d'erreur réseau ou serveur, un message d'erreur est affiché avec un bouton "Réessayer"
- [ ] Les données soumises sont envoyées à Firebase Firestore (collection `feedbacks`) avec : `category`, `message`, `timestamp`, `appVersion`, `platform` (iOS/Android) — aucune donnée identifiante (pas d'email, pas d'IP)
- [ ] Le DPO a validé la liste exacte des champs collectés et leur conformité RGPD avant déploiement
- [ ] Un lien vers la politique de confidentialité est visible sur l'écran Contact

## Notes de réalisation
Firebase Firestore est utilisé comme dans la V1. La configuration Firebase (google-services.json / GoogleService-Info.plist) doit être gérée via les secrets d'environnement (voir P-04). Aucune donnée identifiante ne doit être collectée — le DPO doit valider les champs avant déploiement.

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
