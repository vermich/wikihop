---
id: P-01
title: Politique de confidentialité (RGPD)
phase: 4-Production
priority: Must
agents: [DPO, Frontend Dev]
status: in-progress
created: 2026-02-28
completed:
---

# P-01 — Politique de confidentialité (RGPD)

## User Story
En tant que joueur, je veux lire la politique de confidentialité de l'application, afin de comprendre quelles données sont collectées et comment elles sont utilisées.

## Critères d'acceptance
- [x] La politique de confidentialité est rédigée par le DPO
- [x] Elle couvre : données collectées (aucune en version anonyme), stockage local, API Wikipedia, analytics (aucun)
- [ ] Elle est accessible depuis l'app (page "À propos") et depuis une URL publique (ex: wikihop.app/privacy) — *à implémenter par Frontend Dev*
- [x] Elle est disponible en français
- [x] Elle est mise à jour avant la soumission sur les stores
- [x] Elle respecte les exigences RGPD (CNIL) et les exigences Apple/Google

## Notes de réalisation

**DPO — Maïté (21 mars 2026)**

Document produit : `docs/legal/privacy-policy.md`

La politique de confidentialité couvre :
- Absence totale de collecte de données personnelles identifiantes
- Données locales anonymes (AsyncStorage) : langue, scores, historique — stockage appareil uniquement, suppression à la désinstallation
- Appels API Wikipedia : transmission de l'IP à Wikimedia (hors contrôle WikiHop), utilisateur informé avec lien vers la politique Wikimedia
- Logs serveur backend : IP pseudonymisée (dernier octet tronqué), conservation 30 jours max, purge automatique
- Absence de cookies, de trackers, d'analytics — aucune bannière de consentement requise
- Droits RGPD : procédure de contact via privacy@wikihop.app ; dans les faits, aucune donnée identifiante côté serveur

**Critère restant :** intégration dans l'app (écran "À propos" + lien URL publique) — délégué au Frontend Dev.

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
