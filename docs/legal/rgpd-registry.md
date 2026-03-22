# Registre des activités de traitement — WikiHop

*Document interne — Article 30 du Règlement (UE) 2016/679 (RGPD)*

**Responsable de traitement :** WikiHop App
**Contact DPO :** privacy@wikihop.app
**Dernière mise à jour :** 22 mars 2026

---

## 1. Identification du responsable de traitement

| Champ | Valeur |
|-------|--------|
| Dénomination | WikiHop App |
| Nature juridique | Éditeur indépendant (application non commerciale) |
| Contact DPO | privacy@wikihop.app |

---

## 2. Tableau des traitements

### Traitement 1 — Fourniture du service de jeu (données locales)

| Champ | Détail |
|-------|--------|
| Finalité | Permettre à l'utilisateur de jouer, conserver ses statistiques et son historique de parties |
| Base légale | Intérêt légitime (article 6.1.f RGPD) — nécessaire au fonctionnement du service |
| Catégories de personnes | Utilisateurs de l'application (anonymes, aucune identité connue) |
| Catégories de données | Langue choisie, scores de jeu, historique de parties — toutes anonymes |
| Localisation | Appareil de l'utilisateur uniquement (AsyncStorage) |
| Destinataires | Aucun — données jamais transmises à un tiers |
| Transfert hors UE | Aucun |
| Durée de conservation | Jusqu'à désinstallation de l'application ou effacement manuel |
| Mesures de sécurité | Isolation dans le stockage local de l'app ; suppression automatique à la désinstallation |

---

### Traitement 2 — Logs techniques du serveur backend

| Champ | Détail |
|-------|--------|
| Finalité | Sécurité, détection d'abus, maintenance du service |
| Base légale | Intérêt légitime (article 6.1.f RGPD) — sécurité informatique |
| Catégories de personnes | Utilisateurs de l'application (non identifiés) |
| Catégories de données | Adresse IP pseudonymisée (dernier octet tronqué), horodatage, endpoint appelé |
| Localisation | Serveur backend (Union européenne) |
| Destinataires | Aucun — usage interne uniquement |
| Transfert hors UE | Aucun |
| Durée de conservation | 30 jours maximum, puis purge automatique |
| Mesures de sécurité | Pseudonymisation de l'IP, accès restreint au serveur, HTTPS obligatoire, purge cron automatisée |

---

### Traitement 3 — Appels à l'API Wikipedia (Wikimedia Foundation)

| Champ | Détail |
|-------|--------|
| Finalité | Affichage des articles Wikipedia dans l'application |
| Base légale | Non applicable — WikiHop n'est pas responsable de traitement pour ces données |
| Catégories de personnes | Utilisateurs (leur adresse IP transite vers Wikipedia) |
| Catégories de données | Adresse IP (transmise automatiquement lors de tout appel HTTP — hors contrôle WikiHop) |
| Localisation | Serveurs Wikimedia Foundation (hors périmètre WikiHop) |
| Destinataires | Wikimedia Foundation |
| Transfert hors UE | Possible (serveurs Wikimedia aux USA) — régi par la politique de confidentialité Wikimedia |
| Durée de conservation | Hors périmètre WikiHop — voir https://foundation.wikimedia.org/wiki/Policy:Privacy_policy |
| Mesures de sécurité | HTTPS obligatoire pour tous les appels API |

> **Note DPO :** WikiHop ne peut pas contrôler les logs générés côté Wikimedia. L'utilisateur est informé de ce transfert dans la politique de confidentialité publique. WikiHop ne transmet aucune donnée supplémentaire à Wikipedia (pas d'identifiant utilisateur, pas de tracking).

---

### Traitement 4 — Crash reporting mobile (Sentry)

| Champ | Détail |
|-------|--------|
| Finalité | Détection et diagnostic des crashs de l'application mobile pour correction de bugs |
| Base légale | Intérêt légitime (article 6.1.f RGPD) |
| Catégories de personnes | Utilisateurs de l'application (anonymes, aucune identité connue) |
| Catégories de données | Version de l'app, OS + version OS, stack trace JavaScript, type de crash, timestamp |
| Localisation | Sentry — datacenter Union européenne |
| Destinataires | Sentry / Functional Software Inc. (sous-traitant, DPA en vigueur) |
| Transfert hors UE | Potentiel accès par Sentry Inc. (USA) — couvert par DPA Sentry + Data Privacy Framework |
| Durée de conservation | 90 jours (plan gratuit Sentry), puis suppression automatique |
| Mesures de sécurité | `sendDefaultPii: false` (IP non collectée), hook `beforeSend` filtrant user/cookies/headers/url/query_string, datacenter EU, HTTPS, `enabled: false` hors production |

> **Note DPO :** Le traitement est conditionné au choix du datacenter EU lors de la configuration du DSN Sentry. Le Tech Lead doit confirmer cette configuration avant mise en production. Le DPA Sentry doit être accepté via le compte Sentry de l'organisation. Voir validation complète dans `docs/dpo/P-14-sentry-validation.md`.

---

## 3. Analyse de risque — Appels API Wikipedia et logs IP

**Question :** Les appels à l'API Wikipedia génèrent-ils des logs d'adresse IP ?

**Réponse documentée :** Oui. Comme tout appel HTTP, les requêtes adressées à l'API Wikimedia (api.wikimedia.org, fr.wikipedia.org/w/api.php, etc.) transmettent l'adresse IP de l'appareil appelant. La Wikimedia Foundation conserve ces logs selon sa propre politique de confidentialité.

**Évaluation du risque pour WikiHop :**

- WikiHop n'est pas responsable de ce traitement : il relève entièrement de Wikimedia
- WikiHop ne reçoit aucun log en retour, ne stocke pas ces adresses IP
- Le risque résiduel est limité : équivalent à toute consultation de Wikipédia depuis un navigateur
- L'utilisateur est informé de cette réalité technique dans la politique de confidentialité

**Mesures prises :**
- Information claire dans la politique de confidentialité (section 4)
- Aucune donnée personnelle supplémentaire transmise à Wikimedia (pas d'identifiant, pas de fingerprint)

---

## 4. Procédure de réponse aux demandes d'exercice de droits

**Droits applicables :** accès, rectification, effacement, portabilité, opposition (RGPD articles 15 à 21)

### Canal de contact

Toute demande doit être adressée à : **privacy@wikihop.app**

### Procédure

1. **Réception** de la demande par e-mail
2. **Accusé de réception** sous 72 heures ouvrées
3. **Analyse** : identifier si des données personnelles identifiantes existent pour le demandeur
4. **Réponse sous 1 mois** (délai RGPD) :
   - Dans la quasi-totalité des cas, la réponse sera : *"WikiHop ne collecte et ne conserve aucune donnée personnelle permettant de vous identifier. Les seules données stockées le sont localement sur votre appareil et sont sous votre contrôle direct."*
   - Pour les logs serveur : les IP étant pseudonymisées, il est techniquement impossible de retrouver les logs associés à un utilisateur précis sans information complémentaire
5. **Suppression des données locales** : l'utilisateur peut lui-même effacer ses données en désinstallant l'app ou via Paramètres > Applications > WikiHop > Effacer les données

---

## 5. Conclusion DPO — Bannière cookie requise ?

**Question :** L'application WikiHop doit-elle afficher une bannière de consentement aux cookies ?

**Réponse : NON.**

Justification :
- WikiHop n'utilise aucun cookie, ni dans l'application ni côté serveur
- Aucun SDK publicitaire, aucun tracker analytics, aucun pixel de suivi
- Les données locales (AsyncStorage) sont strictement nécessaires au fonctionnement du service et ne constituent pas des cookies au sens de la directive ePrivacy
- Aucun consentement préalable n'est requis pour le traitement basé sur l'intérêt légitime (logs pseudonymisés de sécurité)

L'application est conforme sans bannière de consentement dans sa version actuelle. Cette conclusion devra être **révisée si** :
- Des comptes utilisateurs sont introduits
- Un outil d'analytics est intégré (Firebase, Mixpanel, etc.)
- Un SDK publicitaire est ajouté

**Note de mise à jour (22 mars 2026) :** L'intégration de Sentry (crash reporting, story P-14) a été analysée et validée sans obligation de consentement. La base légale d'intérêt légitime est suffisante car : (1) les données sont minimales et non identifiantes, (2) l'IP est désactivée, (3) l'utilisateur est informé dans la politique de confidentialité. La bannière de consentement reste non requise après cette intégration.

---

*Document produit par le DPO WikiHop — Maïté*
*Article 30 RGPD — Usage interne*
*Dernière mise à jour : 22 mars 2026*
