# Avis RGPD — P-14 — Crash reporting mobile (Sentry)

**Statut : CONFORME SOUS RESERVE**
**Date : 22 mars 2026**
**DPO : Maïté**

---

## Contexte

L'équipe intègre `@sentry/react-native` pour le crash reporting de l'application WikiHop (version anonyme MVP, sans compte utilisateur). Le Tech Lead a fourni la configuration prévue pour analyse.

---

## Analyse point par point

### Point 1 — Données collectées : version app, OS, stack trace, timestamp

**Verdict : VALIDE**

Ces données sont techniquement nécessaires au diagnostic et à la correction de bugs. Analyse par donnée :

| Donnée | Qualifiable comme "donnée personnelle" ? | Commentaire |
|--------|------------------------------------------|-------------|
| Version de l'app | Non | Information technique sur le logiciel |
| OS + version OS | Seule, non — combinée avec d'autres, potentiellement | Voir note ci-dessous |
| Stack trace JS | Non, pour WikiHop version anonyme | Pas de saisie utilisateur, pas de compte — les traces ne contiennent que du code applicatif |
| Type de crash / message d'erreur | Non, pour WikiHop version anonyme | Idem — à surveiller si la logique de jeu intègre un jour des données saisies |
| Timestamp | Non | Horodatage technique sans lien à un individu identifiable |

**Note sur le fingerprinting :** La combinaison OS + version OS + version app + timestamp peut théoriquement contribuer à un fingerprint d'appareil. Cependant, en l'absence d'IP (couverte par `sendDefaultPii: false`) et en l'absence de tout identifiant utilisateur, le risque de ré-identification est considéré comme négligeable et disproportionné à évaluer au regard de la finalité (correction de bugs). La base légale d'intérêt légitime est justifiée.

**Base légale retenue : intérêt légitime (article 6.1.f RGPD)**

Justification : la correction de bugs est une finalité légitime, proportionnée, et l'utilisateur d'une application a une attente raisonnable que les crashs soient reportés pour améliorer le service. Le test de mise en balance (intérêt de WikiHop vs impact sur les droits des utilisateurs) est favorable : les données sont minimales, non identifiantes, non partagées commercialement.

**Pas de consentement requis** pour ce traitement dans cette configuration. La bannière de consentement reste non obligatoire.

---

### Point 2 — `sendDefaultPii: false` + hook `beforeSend` : garantie d'absence de données personnelles

**Verdict : VALIDE SOUS RESERVE — une correction de code demandée**

**`sendDefaultPii: false`** est le paramètre correct et indispensable. Il désactive la collecte automatique par Sentry de :
- L'adresse IP
- L'e-mail utilisateur (non applicable ici, mais bonne pratique)
- Le nom d'utilisateur (non applicable ici)
- Les cookies (non applicable ici)

Ce paramètre seul est une protection de premier niveau solide.

**Le hook `beforeSend`** avec filtrage de `event.user`, `event.request.cookies`, `event.request.headers` est une défense en profondeur bienvenue. C'est la bonne approche.

**Réserve — correction demandée à Laurent (Frontend Dev) :**

Le hook `beforeSend` doit également supprimer `event.request.url` s'il peut contenir des paramètres utilisateur. Dans WikiHop version anonyme, l'URL des articles Wikipedia chargés dans la WebView pourrait potentiellement être capturée. Spécification précise :

```typescript
beforeSend(event) {
  // Supprimer toutes les données utilisateur et réseau potentiellement identifiantes
  delete event.user;
  if (event.request) {
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.url;   // <-- ajouter cette ligne
    delete event.request.query_string;  // <-- ajouter cette ligne
  }
  return event;
}
```

Cette correction est **requise avant merge**. Elle reste mineure et ne remet pas en cause le verdict global.

---

### Point 3 — Choix du datacenter EU

**Verdict : VALIDE — fortement recommandé et à documenter**

Le choix du datacenter européen est la bonne décision RGPD. Avec un datacenter US :
- Sentry Inc. est une entreprise américaine soumise au Cloud Act
- Un transfert hors UE nécessiterait des garanties appropriées (clauses contractuelles types, Data Privacy Framework)
- Le risque d'accès gouvernemental américain, même théorique, doit être écarté pour un service grand public

Avec le datacenter EU (sentry.io region EU, stockage sur des serveurs en Union européenne) :
- Pas de transfert hors UE pour les données de crash
- Le DPF (Data Privacy Framework) reste pertinent car Sentry Inc. traite les données même si stockées en EU (contrat de sous-traitance) — mais le risque est considérablement réduit
- Sentry fournit un DPA (Data Processing Agreement) standard — il doit être accepté

**Action requise pour Maxime (Tech Lead) ou Julien :** Confirmer que le DSN Sentry configuré correspond bien à l'organisation EU (sentry.io avec région EU sélectionnée dans les paramètres du projet, ou utilisation de `ingest.sentry.io/eu`). Documenter le choix dans le registre des traitements.

---

### Point 4 — Durée de rétention 90 jours

**Verdict : VALIDE AVEC COMMENTAIRE**

90 jours est acceptable pour du crash reporting. La CNIL n'impose pas de durée maximale spécifique pour ce type de donnée ; la proportionnalité s'apprécie au regard de la finalité.

**Justification de la proportionnalité :**
- Les crashs doivent être corrélés avec les versions de l'app, qui sortent à intervalles irréguliers
- Un délai de 90 jours laisse le temps de diagnostiquer des bugs apparus progressivement
- 90 jours est cohérent avec les pratiques de l'industrie pour le crash reporting

**Commentaire :** Si WikiHop passe sur un plan Sentry payant avec durées configurables, préférer 30 à 60 jours pour respecter le principe de minimisation. 90 jours est la limite haute acceptable — pas au-delà.

---

## Mention rédigée pour la politique de confidentialité

Voir section dédiée ci-dessous — cette mention remplace la liste "ce que nous ne collectons pas" pour la rendre exacte, et ajoute une nouvelle section dans la politique.

---

## Instructions pour Laurent (Frontend Dev)

**Mise à jour du hook `beforeSend` requise (correction bloquante) :**

Dans la configuration Sentry (probablement `apps/mobile/src/lib/sentry.ts` ou équivalent), ajouter la suppression de `event.request.url` et `event.request.query_string` dans le hook `beforeSend`. Voir le snippet au Point 2 ci-dessus.

**Mise à jour de l'écran "À propos" (AboutScreen) : OUI, requise**

L'utilisateur doit pouvoir trouver l'information sur le crash reporting sans lire la politique de confidentialité complète. La mention dans l'écran "À propos" doit inclure :

> "WikiHop utilise Sentry pour la détection automatique de crashs. En cas de plantage, des informations techniques anonymes (version de l'app, type d'erreur) sont envoyées à nos serveurs européens pour nous aider à corriger le problème. Aucune donnée personnelle n'est transmise."

Cette phrase s'ajoute à la section existante sur la confidentialité dans l'écran "À propos", au même niveau que les informations sur les logs serveur. C'est une information, pas un consentement — pas de case à cocher, pas de bouton accept/refuse.

---

## Récapitulatif des actions requises

| Qui | Action | Bloquant ? |
|-----|--------|-----------|
| Laurent (Frontend Dev) | Ajouter `delete event.request.url` et `delete event.request.query_string` dans `beforeSend` | Oui — avant merge |
| Laurent (Frontend Dev) | Ajouter mention Sentry dans `AboutScreen.tsx` | Oui — avant merge |
| Maxime (Tech Lead) | Confirmer que le DSN correspond au datacenter EU de Sentry | Oui — avant merge |
| Registre des traitements | Ajouter Traitement 4 — Crash reporting Sentry | Fait dans ce document (voir ci-dessous) |

---

## Fiche sous-traitant Sentry (pour le registre)

| Champ | Valeur |
|-------|--------|
| Nom | Functional Software Inc. (Sentry) |
| Nature | Sous-traitant (au sens RGPD art. 28) |
| Finalité | Collecte et analyse des rapports de crash de l'application mobile |
| Données transmises | Version app, OS + version OS, stack trace JS, type de crash, timestamp |
| Données NON transmises | IP (désactivée), données utilisateur (filtrées), URLs de requête (filtrées) |
| Localisation des données | Datacenter EU (obligatoire — à confirmer sur le DSN) |
| DPA | Disponible sur https://sentry.io/legal/dpa/ — à accepter |
| Durée de rétention | 90 jours (plan gratuit) |
| Transfert hors UE | Potentiel accès par Sentry Inc. (USA) couvert par le DPA et le DPF — risque résiduel faible |

---

## Nouveau traitement pour le registre des traitements

**Traitement 4 — Crash reporting mobile (Sentry)**

| Champ | Détail |
|-------|--------|
| Finalité | Détection et diagnostic des crashs de l'application mobile pour correction de bugs |
| Base légale | Intérêt légitime (article 6.1.f RGPD) |
| Catégories de personnes | Utilisateurs de l'application (anonymes) |
| Catégories de données | Version de l'app, OS + version OS, stack trace JavaScript, type de crash, timestamp |
| Localisation | Sentry — datacenter EU |
| Destinataires | Sentry (sous-traitant, DPA signé) — aucun autre tiers |
| Transfert hors UE | Potentiel (Sentry Inc., USA) — couvert par DPA + DPF |
| Durée de conservation | 90 jours (plan gratuit Sentry) |
| Mesures de sécurité | `sendDefaultPii: false`, hook `beforeSend` filtrant user/cookies/headers/url, datacenter EU, HTTPS |

---

## Conclusion

La configuration Sentry proposée par Maxime est solide et témoigne d'une bonne prise en compte des enjeux RGPD dès la conception. Les deux ajouts au `beforeSend` et la mention dans l'AboutScreen sont des corrections mineures mais requises avant merge. Sous réserve de ces corrections, la story P-14 peut passer en `done` côté DPO.

---

*Validation produite par Maïté, DPO WikiHop*
*22 mars 2026*
