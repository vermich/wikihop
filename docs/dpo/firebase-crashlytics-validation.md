# Avis RGPD — Migration crash reporting Sentry → Firebase Crashlytics

**Statut global : CONFORME SOUS RESERVE — Scénario C recommandé, Scénario B acceptable sous conditions**
**Date : 1er avril 2026**
**DPO : Maïté**
**Référence ADR : ADR-011**

---

## Contexte

Cet avis fait suite à la validation P-14 (22 mars 2026) qui avait retenu Sentry avec la contrainte explicite de **stockage EU des données de crash**. Le Client souhaite désormais migrer vers Firebase Crashlytics dans le cadre d'une consolidation de l'infrastructure sur Google Workspace (ADR-011).

La migration soulève une question RGPD centrale : Firebase Crashlytics stocke les données aux États-Unis par défaut, ce qui constitue un transfert hors UE au sens du Chapitre V du RGPD.

---

## Analyse préliminaire : qualification des données de crash WikiHop

Avant d'analyser les scénarios, il faut trancher la question de fond : les données de crash WikiHop sont-elles des données personnelles ?

**Données transmises par le SDK crash reporting :**

| Donnée | Qualification RGPD | Analyse |
|--------|-------------------|---------|
| Version de l'app | Non personnelle | Information sur le logiciel, pas sur l'individu |
| OS + version OS | Seule : non personnelle. Combinée : potentiellement | Voir note fingerprinting ci-dessous |
| Stack trace JavaScript | Non personnelle pour WikiHop v. anonyme | Traces ne contenant que du code applicatif, aucune saisie utilisateur, aucun compte |
| Type de crash / message d'erreur | Non personnelle pour WikiHop v. anonyme | Même analyse que la stack trace |
| Timestamp | Non personnelle seule | Horodatage sans lien à un individu identifiable |
| Identifiant d'installation Firebase | **Personnelle — point critique** | Voir analyse spécifique ci-dessous |

### Point critique : l'identifiant d'installation Firebase (FID)

Firebase Crashlytics génère par défaut un **Firebase Installation ID (FID)**, identifiant pseudonyme persistant par appareil et par application. Ce FID est envoyé avec chaque rapport de crash.

**Contrairement à Sentry avec `sendDefaultPii: false`**, Firebase Crashlytics n'a pas d'équivalent direct qui désactive l'identifiant d'installation. Le FID est transmis nativement et constitue une **donnée pseudonyme liée à un appareil** — donc une donnée personnelle au sens du RGPD (considérant 26 : une donnée qui permet d'isoler un individu dans un ensemble est personnelle, même sans nom ni email).

**Conséquence directe :** contrairement à Sentry correctement configuré, Firebase Crashlytics en configuration par défaut traite des données personnelles (le FID), ce qui :
1. Renforce la nécessité d'une base légale solide (intérêt légitime reste applicable, mais doit être réévalué)
2. Rend le transfert hors UE encore plus structurant qu'avec Sentry

### Note sur le fingerprinting (reprise de P-14)

La combinaison OS + version OS + version app + timestamp + FID constitue un profil d'appareil nettement plus identifiant qu'avec Sentry (où le FID était absent). Le risque de ré-identification est accru. Ce point pèse dans l'analyse des scénarios.

---

## Analyse des trois scénarios

---

### Scénario A — Firebase Crashlytics plan Spark (gratuit, stockage US)

**Verdict : NON CONFORME**

#### Pourquoi le DPF EU-USA ne suffit pas ici

Le Data Privacy Framework (DPF), en vigueur depuis juillet 2023, permet des transferts de données personnelles vers des entreprises américaines certifiées sans mécanisme supplémentaire. Google LLC est certifiée DPF.

Cependant, le DPF ne règle pas tout :

1. **Le DPF est attaquable.** Il s'agit du troisième accord EU-USA successif après Safe Harbor (invalidé 2015) et Privacy Shield (invalidé 2020). Max Schrems a déjà déposé un recours devant la CJUE. La probabilité d'une invalidation future est non nulle. Se reposer exclusivement sur le DPF pour un transfert structurel crée un risque de non-conformité rétroactive.

2. **Le Cloud Act américain n'est pas neutralisé par le DPF.** Google LLC reste soumise aux injonctions du gouvernement américain de communiquer des données hébergées aux USA, y compris sur des ressortissants européens. Le DPF ne crée pas d'exception au Cloud Act — il améliore les recours des personnes concernées, mais pas l'accès du gouvernement américain aux données.

3. **Le FID est une donnée personnelle** (voir analyse préliminaire). Pour une donnée strictement non personnelle et réellement anonyme, un transfert hors UE ne serait pas soumis au RGPD. Mais le FID Firebase rend cette échappatoire inapplicable.

4. **La contrainte EU était explicite dans P-14.** Mon avis du 22 mars 2026 a posé la résidence EU comme condition non négociable, et cette contrainte était motivée par le risque Cloud Act + la souveraineté des données. Le passage à un plan Spark sans résidence EU constitue un recul de conformité documenté.

**Conclusion Scénario A :** Ce scénario expose WikiHop à un risque RGPD structurel sur les transferts hors UE. Il n'est pas conforme au standard de conformité établi dans P-14 et ne peut pas être autorisé.

---

### Scénario B — Firebase Crashlytics plan Blaze (payant, EU data residency)

**Verdict : CONFORME SOUS RESERVE**

#### Ce que la résidence EU Firebase change

Avec le plan Blaze et la configuration EU data residency (région `europe-west1` ou `europe-west3`) :

- Les données de crash sont stockées dans des datacenters Google en Union européenne
- Le risque Cloud Act sur les données au repos est considérablement réduit (même analyse que Sentry EU dans P-14)
- Google fournit un DPA (Data Processing Agreement) complet pour Firebase — compatible avec les exigences de l'article 28 RGPD

#### Divergences avec Sentry — ce qui change

Ce scénario **ne remplace pas Sentry à iso-conformité** sur un point : la présence du Firebase Installation ID (FID). Avec Sentry + `sendDefaultPii: false`, aucun identifiant persistant n'était transmis. Firebase Crashlytics transmet le FID par défaut.

**Correction technique requise si Scénario B retenu :**

Le Backend Dev ou le Frontend Dev doit vérifier s'il est possible de désactiver ou anonymiser le FID dans `@react-native-firebase/crashlytics`. Si cette désactivation n'est pas techniquement possible, la base légale reste l'intérêt légitime, mais la politique de confidentialité et le registre doivent être mis à jour pour refléter ce traitement.

#### Conditions requises pour la conformité (Scénario B)

1. Plan Firebase Blaze activé avec EU data residency configurée (région EU dans les paramètres Firebase)
2. DPA Google Firebase accepté (disponible via Google Cloud DPA — lier au compte Google Workspace du Client)
3. Vérification et documentation du comportement du FID (désactivable ou non)
4. Mise à jour du registre des traitements (Traitement 4 — voir section dédiée)
5. Mise à jour de l'AboutScreen et des 8 fichiers i18n (voir section dédiée)
6. Mise à jour de la politique de confidentialité (référence à Firebase/Google au lieu de Sentry)

---

### Scénario C — Maintien de Sentry (status quo)

**Verdict : CONFORME**

#### Analyse

Le scénario C ne soulève aucun problème RGPD nouveau. Les conditions validées dans P-14 restent applicables :

- Datacenter EU (à confirmer sur le DSN — action Tech Lead, non encore documentée comme réalisée)
- `sendDefaultPii: false` + hook `beforeSend` complet
- Aucun identifiant persistant transmis
- DPA Sentry à accepter (action non encore documentée comme réalisée)
- Base légale intérêt légitime valide

**Point d'attention :** La P-14 documentait deux actions comme "requises avant merge" (correction `beforeSend` + confirmation datacenter EU + DPA Sentry). Le statut de ces actions doit être vérifié avant de considérer que le Scénario C est pleinement conforme en production.

**Avantage du Scénario C :** Pas de FID, pas de nouvelle donnée personnelle, pas de nouveau sous-traitant à documenter, conformité déjà validée dans ce bureau.

---

## Recommandation finale

**Je recommande le Scénario C — maintien de Sentry.**

Motivation :

1. **La contrainte EU était la condition sine qua non de P-14.** La migrer vers Firebase Spark (Scénario A) constituerait une régression de conformité documentée. Je ne peux pas l'autoriser.

2. **Le Scénario B est conforme mais introduit une complexité nouvelle** (FID, plan payant, configuration EU data residency à vérifier) pour un bénéfice limité côté conformité — on passe d'un sous-traitant validé (Sentry EU) à un sous-traitant différent avec une nouvelle donnée personnelle (FID) à gérer. Ce n'est pas une progression de conformité, c'est un déplacement du risque.

3. **L'argument de centralisation Google Workspace est légitime côté technique** mais il n'a pas de valeur RGPD. La loi ne connaît pas la "cohérence d'infrastructure" comme base légale.

4. **Le projet Sentry n'a pas encore été configuré côté Client** (prérequis P-18). Cette absence de configuration ne constitue pas un argument pour migrer — elle signifie que la conformité Sentry n'est pas encore complète, pas que Sentry doit être abandonné.

**Si le Client tient à Firebase Crashlytics**, le Scénario B est la seule voie conforme. Dans ce cas, les conditions de la section Scénario B doivent toutes être réalisées avant lancement de la migration.

---

## Actions requises selon le scénario retenu

### Si Scénario C (recommandé)

| Qui | Action | Bloquant ? |
|-----|--------|-----------|
| Client (P-18) | Créer le projet Sentry avec DSN EU, configurer alerting | Oui — pour mise en production |
| Tech Lead | Confirmer que le DSN configuré correspond au datacenter EU | Oui — avant production |
| Client | Accepter le DPA Sentry (https://sentry.io/legal/dpa/) via le compte Sentry | Oui — avant production |
| Laurent | Vérifier que les corrections `beforeSend` de P-14 sont bien en place (url + query_string) | Oui — à vérifier dans la PR |

Aucune modification des textes légaux ni du registre n'est requise pour le Scénario C.

### Si Scénario B (conditionnel)

| Qui | Action | Bloquant ? |
|-----|--------|-----------|
| Client | Activer plan Firebase Blaze avec EU data residency (europe-west1 ou europe-west3) | Oui — avant code |
| Client | Accepter le DPA Google Firebase (via Google Cloud Console) | Oui — avant production |
| Laurent | Vérifier le comportement du FID dans `@react-native-firebase/crashlytics` — désactivable ? | Oui — specs à fournir à Maïté |
| Laurent | Mettre à jour `AboutScreen.tsx` — section Diagnostics | Oui |
| Laurent | Mettre à jour les 8 fichiers i18n (fr, en, es, de, pt, it, nl, pl) | Oui |
| Maïté | Mettre à jour registre des traitements (Traitement 4) | Oui |
| Maïté | Mettre à jour politique de confidentialité (section Sentry → Firebase) | Oui |

---

## Mise à jour du registre des traitements

### Traitement 4 — version actuelle (Sentry — Scénario C)

Aucune modification. Le registre du 22 mars 2026 reste applicable.

**Rappel des actions bloquantes non encore documentées comme réalisées :**
- DPA Sentry à accepter (action Client / P-18)
- Confirmation DSN EU (action Tech Lead)
- Corrections `beforeSend` (action Laurent — vérifier en PR)

### Traitement 4 — version alternative si Scénario B retenu

Si Firebase Crashlytics plan Blaze EU est retenu, le Traitement 4 du registre doit être remplacé par :

| Champ | Détail |
|-------|--------|
| Finalité | Détection et diagnostic des crashs de l'application mobile pour correction de bugs |
| Base légale | Intérêt légitime (article 6.1.f RGPD) |
| Catégories de personnes | Utilisateurs de l'application (anonymes, aucune identité nominative connue) |
| Catégories de données | Version de l'app, OS + version OS, stack trace JavaScript, type de crash, timestamp, Firebase Installation ID (pseudonyme d'appareil) |
| Localisation | Firebase / Google LLC — datacenter Union européenne (EU data residency, plan Blaze) |
| Destinataires | Google LLC / Firebase (sous-traitant, DPA Google Cloud accepté) |
| Transfert hors UE | Résidence EU activée — accès potentiel par Google LLC (USA) couvert par DPA Google + DPF |
| Durée de conservation | 90 jours (durée par défaut Firebase Crashlytics — à confirmer et documenter) |
| Mesures de sécurité | EU data residency activée, DPA Google Cloud accepté, HTTPS, désactivation du crash reporting hors production (à implémenter), examen du FID |

**Note obligatoire à ajouter si FID non désactivable :**
> Le Firebase Installation ID (FID) est un identifiant pseudonyme généré par Firebase par appareil et par application. Il constitue une donnée personnelle au sens du RGPD. Il n'est lié à aucune identité et n'est pas partagé entre applications. Les utilisateurs peuvent réinitialiser leur FID en désinstallant et réinstallant l'application.

---

## Mise à jour des textes in-app — si Scénario B retenu

### Texte actuel (fr.json — diagnostics_text)

> "WikiHop utilise Sentry pour la détection automatique de crashs. En cas de plantage, des informations techniques anonymes (version de l'app, type d'erreur) sont envoyées à nos serveurs européens pour nous aider à corriger le problème. Aucune donnée personnelle n'est transmise."

### Texte à substituer si Scénario B retenu

**Note :** La phrase "Aucune donnée personnelle n'est transmise" doit être retirée si le FID est non désactivable, car il constitue une donnée personnelle.

**Version si FID désactivable :**
> "WikiHop utilise Firebase Crashlytics (Google) pour la détection automatique de crashs. En cas de plantage, des informations techniques anonymes (version de l'app, type d'erreur) sont envoyées à des serveurs européens pour nous aider à corriger le problème. Aucune donnée personnelle identifiante n'est transmise."

**Version si FID non désactivable :**
> "WikiHop utilise Firebase Crashlytics (Google) pour la détection automatique de crashs. En cas de plantage, des informations techniques (version de l'app, type d'erreur, identifiant anonyme d'installation) sont envoyées à des serveurs européens. Aucune identité personnelle n'est collectée. Données hébergées dans l'Union européenne."

Ces textes sont à propager dans les 8 fichiers i18n. Les traductions dans les langues autres que le français sont à la charge de Laurent, en conservant le même niveau d'information.

---

## Conclusion

La migration vers Firebase Crashlytics plan Spark (Scénario A) est **refusée** — transfert hors UE non conforme au standard établi dans P-14.

La migration vers Firebase Crashlytics plan Blaze EU (Scénario B) est **conditionnellement autorisée** — sous réserve des six conditions listées ci-dessus, dont la vérification du FID que je dois valider avant lancement.

Le maintien de Sentry (Scénario C) est **recommandé et conforme** — sous réserve des actions P-18 (configuration DSN EU, DPA Sentry) qui restent à réaliser.

**Mon avis écrit pour le fichier story :** Le Client doit trancher entre Scénario B et Scénario C. Si le choix est le Scénario B, me contacter avant que Laurent commence le code pour valider le comportement du FID. Si le choix est le Scénario C, aucune action DPO supplémentaire n'est requise à ce stade — les actions restantes sont techniques (P-18).

---

*Validation produite par Maïté, DPO WikiHop*
*1er avril 2026*
