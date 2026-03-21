---
id: P-13
title: Textes légaux in-app (CGU simplifiées)
phase: 4-Production
priority: Should
agents: [DPO, Frontend Dev]
status: done
created: 2026-02-28
completed: 2026-03-21
---

# P-13 — Textes légaux in-app (CGU simplifiées)

## User Story
En tant que joueur, je veux accéder aux conditions générales et mentions légales depuis l'application, afin de connaître mes droits.

## Critères d'acceptance
- [x] Mentions légales accessibles depuis l'écran "À propos" : éditeur, hébergeur — LinkRow `url="https://wikihop.app/mentions-legales"` présent dans AboutScreen, clé i18n `legal_mentions_label` dans les 8 fichiers de locale
- [x] Lien vers la politique de confidentialité complète (URL externe) — LinkRow `url="https://wikihop.app/privacy"` présent dans AboutScreen (non régressé)
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

Validée le 2026-03-21. Tous les critères couverts. 2 nouvelles clés i18n (`legal_mentions_label`, `legal_mentions_a11y`) présentes dans les 8 fichiers de locale. tsc sans erreur. Lint sans erreur (warnings no-console non bloquants). Tests mobiles : 184 passants, 0 échec (3 échecs db.test.ts backend hors périmètre).

## Statut
pending → in-progress → done
