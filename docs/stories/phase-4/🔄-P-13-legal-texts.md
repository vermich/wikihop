---
id: P-13
title: Textes légaux in-app (CGU simplifiées)
phase: 4-Production
priority: Should
agents: [DPO, Frontend Dev]
status: in-progress
created: 2026-02-28
completed:
---

# P-13 — Textes légaux in-app (CGU simplifiées)

## User Story
En tant que joueur, je veux accéder aux conditions générales et mentions légales depuis l'application, afin de connaître mes droits.

## Critères d'acceptance
- [ ] Mentions légales accessibles depuis l'écran "À propos" : éditeur, hébergeur — *à implémenter par Frontend Dev*
- [ ] Lien vers la politique de confidentialité complète (URL externe) — *à implémenter par Frontend Dev*
- [x] Lien vers les conditions d'utilisation de l'API Wikipedia (Wikimedia Terms of Use) — documenté dans `docs/legal/legal-mentions.md`
- [x] Le texte est rédigé en français simple, sans jargon juridique excessif
- [x] Validé par le DPO

## Notes de réalisation

**DPO — Maïté (21 mars 2026)**

Document produit : `docs/legal/legal-mentions.md`

Les mentions légales couvrent :
- Éditeur : WikiHop App (indépendant, non commercial, gratuit)
- Distribution : Apple App Store et Google Play Store (avec coordonnées des plateformes)
- Hébergement backend : infrastructure cloud UE (placeholder à préciser au moment du déploiement)
- Contenu Wikipedia : licence CC BY-SA 4.0, lien vers les CGU Wikimedia Foundation (https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use), absence d'affiliation avec Wikimedia
- Propriété intellectuelle : distinction contenu Wikipedia (CC BY-SA 4.0) vs éléments propres à WikiHop
- Contact : contact@wikihop.app

**Critères restants :** intégration dans l'écran "À propos" de l'app — délégué au Frontend Dev. L'URL de la politique de confidentialité publique devra être renseignée au moment de la publication.

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
