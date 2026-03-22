# Politique de confidentialité — WikiHop

**Dernière mise à jour : 22 mars 2026**

---

## 1. Responsable de traitement

L'application WikiHop est éditée par **WikiHop App**, éditeur indépendant.

Contact : privacy@wikihop.app

---

## 2. Ce que nous ne collectons pas

WikiHop est conçue pour respecter votre vie privée au maximum. Dans sa version actuelle :

- Aucun nom, prénom ou adresse e-mail n'est collecté
- Aucun identifiant publicitaire ou identifiant de compte
- Aucun cookie de traçage ou pixel de suivi
- Aucun outil d'analytics ou de mesure d'audience
- Aucune donnée de localisation
- Aucune adresse IP transmise à des services tiers

---

## 3. Données stockées localement sur votre appareil

WikiHop stocke les informations suivantes **uniquement sur votre appareil**, dans le stockage local de l'application (AsyncStorage) :

| Donnée | Finalité | Durée |
|--------|----------|-------|
| Langue choisie | Afficher l'interface dans votre langue | Jusqu'à désinstallation ou remise à zéro |
| Statistiques de jeu anonymes | Afficher vos scores et progression | Jusqu'à désinstallation ou remise à zéro |
| Historique des parties | Permettre la consultation de vos parties passées | Jusqu'à désinstallation ou remise à zéro |

Ces données **ne quittent jamais votre appareil**. Elles ne sont ni transmises à WikiHop ni à aucun tiers. Elles sont supprimées automatiquement lorsque vous désinstallez l'application.

---

## 4. Appels à l'API Wikipedia (Wikimedia)

WikiHop affiche des articles issus de Wikipédia en interrogeant l'API publique de la Wikimedia Foundation.

Chaque appel à cette API transite par votre connexion internet et inclut votre adresse IP, comme c'est le cas pour toute navigation web ordinaire. WikiHop n'a pas accès à ces logs et ne les contrôle pas : ils sont traités par la Wikimedia Foundation selon sa propre politique de confidentialité, disponible à l'adresse :

https://foundation.wikimedia.org/wiki/Policy:Privacy_policy

WikiHop ne collecte ni ne stocke aucune information relative à ces appels.

---

## 5. Détection automatique des crashs (Sentry)

WikiHop utilise le service **Sentry** pour détecter et analyser les crashs de l'application, afin de corriger les bugs et améliorer la stabilité.

En cas de plantage de l'application, les informations suivantes sont automatiquement transmises à Sentry :

| Donnée | Finalité |
|--------|----------|
| Version de l'application | Identifier la version concernée par le bug |
| Système d'exploitation et version (iOS / Android) | Reproduire le contexte technique |
| Stack trace JavaScript (trace d'erreur) | Localiser et corriger le bug dans le code |
| Type de crash et message d'erreur | Classifier et prioriser les corrections |
| Horodatage | Corréler les crashs dans le temps |

**Ce qui n'est PAS transmis à Sentry :**
- Aucune adresse IP
- Aucun identifiant de compte (WikiHop n'en crée pas)
- Aucune donnée de navigation (URLs consultées)
- Aucune donnée saisie par l'utilisateur

Ces données sont stockées sur des **serveurs Sentry situés dans l'Union européenne** pendant une durée maximale de **90 jours**, puis supprimées automatiquement.

**Base légale :** intérêt légitime (article 6.1.f RGPD) — la correction de bugs est nécessaire au bon fonctionnement du service.

Sentry (Functional Software Inc.) agit en qualité de sous-traitant au sens du RGPD. Un contrat de traitement des données (DPA) est en vigueur. Pour plus d'informations : [https://sentry.io/privacy/](https://sentry.io/privacy/)

---

## 6. Pas de cookies, pas de bannière

WikiHop n'utilise aucun cookie, ni côté application ni côté serveur. Aucun consentement aux cookies n'est requis.

---

## 7. Infrastructure backend

WikiHop dispose d'un serveur backend hébergé dans l'Union européenne, utilisé pour fournir les listes d'articles de jeu. Ce serveur conserve des **logs techniques d'accès** (adresses IP des requêtes entrantes) pendant une durée maximale de 30 jours, à des fins de sécurité et de maintenance. Ces logs sont pseudonymisés (le dernier octet de chaque adresse IP est tronqué).

Ces logs ne sont pas utilisés pour identifier des utilisateurs individuels et ne sont pas partagés avec des tiers.

---

## 8. Vos droits (RGPD)

Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez de droits sur vos données personnelles : droit d'accès, de rectification, d'effacement, de portabilité et d'opposition.

Dans le cas de WikiHop, ces droits s'appliquent dans un cadre très limité :

- **Données locales (statistiques, langue, historique)** : ces données sont exclusivement sur votre appareil. Vous pouvez les supprimer à tout moment en désinstallant l'application ou via les paramètres de votre téléphone (effacement des données de l'app).
- **Logs serveur** : pseudonymisés et purgés automatiquement sous 30 jours. Il n'est pas possible d'y rattacher votre identité.
- **Rapports de crash (Sentry)** : les données transmises à Sentry ne permettent pas de vous identifier. Elles sont supprimées automatiquement après 90 jours. Pour exercer vos droits, contactez-nous à l'adresse ci-dessous et nous relayerons votre demande à Sentry si nécessaire.

Pour toute demande ou question relative à vos données, vous pouvez nous contacter à :

**privacy@wikihop.app**

---

## 9. Sécurité

WikiHop prend les mesures techniques appropriées pour protéger les données traitées : chiffrement des échanges (HTTPS), pseudonymisation des logs serveur, purge automatique, désactivation de la collecte d'IP côté Sentry.

---

## 10. Modifications de cette politique

En cas de modification de cette politique de confidentialité, la nouvelle version sera publiée avec une date de mise à jour actualisée. Les changements significatifs seront signalés dans les notes de mise à jour de l'application.

---

## 11. Contact

Pour toute question relative à cette politique ou à vos données :

**privacy@wikihop.app**

---

*Document produit par le DPO WikiHop — Maïté*
*Dernière mise à jour : 22 mars 2026*
