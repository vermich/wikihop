---
id: P-10
title: Conformité RGPD complète — Registre de traitement
phase: 4-Production
priority: Should
agents: [DPO]
status: done
created: 2026-02-28
completed: 2026-03-21
---

# P-10 — Conformité RGPD complète — Registre de traitement

## User Story
En tant qu'éditeur, je veux documenter les traitements de données effectués par WikiHop, afin d'être en conformité avec le RGPD en cas de contrôle CNIL.

## Critères d'acceptance
- [x] Registre de traitement documenté : finalité, base légale, données traitées, durée de conservation
- [x] Analyse de risque réalisée (les appels Wikipedia API génèrent-ils des logs IP ?)
- [x] Contact DPO / responsable de traitement identifié et documenté
- [x] Procédure de réponse aux demandes d'exercice de droits (effacement, accès) documentée
- [x] Le DPO valide que l'app peut fonctionner sans bannière cookie (aucun tracker, aucune PII)

## Notes de réalisation

**DPO — Maïté (21 mars 2026)**

Document produit : `docs/legal/rgpd-registry.md`

Le registre documente 3 traitements :
1. **Données locales** (langue, scores, historique) — intérêt légitime, appareil uniquement, suppression à désinstallation
2. **Logs serveur backend** — intérêt légitime (sécurité), IP pseudonymisée, 30 jours max, purge cron
3. **Appels API Wikimedia** — hors périmètre direct WikiHop, Wikimedia Foundation responsable de traitement

**Analyse de risque Wikipedia :** Oui, les appels HTTP transmettent l'IP à Wikimedia. Risque résiduel limité (équivalent à une navigation web ordinaire), hors contrôle WikiHop, utilisateur informé dans la politique de confidentialité.

**Conclusion bannière cookie : NON requise.** Aucun cookie, aucun tracker, aucun analytics. Les données locales AsyncStorage ne constituent pas des cookies au sens de la directive ePrivacy. Cette conclusion est valable pour la version MVP anonyme uniquement — à réviser si comptes utilisateurs, analytics ou crash reporter tiers sont ajoutés.

**Procédure droits RGPD** : documentée — canal privacy@wikihop.app, réponse sous 1 mois. Dans les faits, aucune donnée identifiante conservée côté serveur (IP pseudonymisée non rattachable à un individu).

## Validation QA — Halim

Validée le 2026-03-21. Tous les critères cochés. Registre conforme art. 30 RGPD — 3 traitements documentés. Analyse de risque Wikipedia réalisée. Conclusion bannière cookie motivée et documentée.

## Statut
pending → in-progress → done
