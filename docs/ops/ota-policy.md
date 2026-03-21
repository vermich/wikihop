# Politique OTA (Over The Air) — WikiHop

Les mises à jour OTA permettent de déployer des corrections JS/TS sans passer par une review App Store / Play Store. Ce document définit ce qui est éligible, les procédures de déploiement, et les contraintes légales Apple.

---

## Principe de fonctionnement

WikiHop utilise `expo-updates` avec `checkAutomatically: ON_LOAD`. Au lancement de l'app :
1. L'app vérifie si une mise à jour est disponible sur le channel `production`
2. Si oui, elle télécharge le bundle JS en arrière-plan
3. Le nouveau bundle est appliqué **au prochain lancement** (pas immédiatement)
4. Exception : les patches marqués `[CRITICAL]` forcent un rechargement immédiat

Le `runtimeVersion` est basé sur `appVersion`. Une OTA n'est compatible qu'avec la version native exacte — elle ne sera pas distribuée à d'autres versions.

---

## Types de changements éligibles OTA

Ces changements peuvent être déployés par OTA sans passer par une review store :

- Corrections de bugs dans la logique JS/TS
- Ajustements de style et de layout (couleurs, marges, typographie)
- Corrections de textes, labels, messages d'erreur
- Mise à jour des traductions i18n (fichiers `locales/*.json`)
- Correctifs de logique métier (calcul de score, tri, formatage)
- Corrections dans les services (Wikipedia service, popular-pages service)
- Mise à jour des URLs d'API ou constantes de configuration (hors `app.json`)

---

## Types de changements NON éligibles OTA

Ces changements nécessitent un build EAS et une review store :

- Ajout ou mise à jour d'un module natif (`expo install nouveau-module`)
- Changements dans la structure de navigation (ajout de stack, modification des types de routes)
- Mise à jour du SDK Expo (ex: 52 → 54)
- Modification des permissions Android/iOS (`app.json` → `android.permissions`, `ios.infoPlist`)
- Changements dans `app.json` (icône, splash screen, config EAS)
- Ajout de nouvelles dépendances avec code natif
- Modifications dans `metro.config.js`

---

## Politique Apple — règle impérative

> **Article 3.3.2 des App Store Guidelines :** Les mises à jour OTA ne peuvent pas modifier les fonctionnalités principales de l'app ni introduire de nouvelles fonctionnalités majeures.

**Interprétation pour WikiHop :**

| Action OTA | Éligible Apple ? |
|------------|-----------------|
| Corriger un bug de calcul de score | Oui |
| Corriger l'affichage d'un bouton | Oui |
| Mettre à jour une traduction | Oui |
| Ajouter un nouveau mode de jeu | **Non** — nécessite review store |
| Ajouter un écran de paramètres | **Non** — fonctionnalité nouvelle |
| Modifier les règles de navigation existantes | Risqué — préférer review store |

En cas de doute, soumettre une review store. Le risque d'une OTA non conforme est le retrait de l'app.

---

## Procédure de déploiement OTA standard

```bash
# Depuis apps/mobile/
eas update --channel production --message "fix: correction bug [description]"
```

Les utilisateurs reçoivent la mise à jour au prochain lancement de l'app.

**Convention de message :**
- Standard : suivre Conventional Commits (`fix:`, `chore:`, etc.)
- Patch critique : préfixer par `[CRITICAL]` → `[CRITICAL] fix: correction faille XSS`

---

## Procédure de déploiement OTA critique (patch immédiat)

Pour les corrections urgentes (failles de sécurité, bugs bloquants) :

```bash
eas update --channel production --message "[CRITICAL] fix: description du patch"
```

Le hook `useCriticalUpdateCheck` détecte le préfixe `[CRITICAL]` et force le rechargement immédiat de l'app à son prochain lancement (pas au prochain lancement suivant).

**Critères justifiant un patch `[CRITICAL]` :**
- Faille de sécurité exposant des données utilisateur
- Bug bloquant empêchant tout démarrage de partie
- Crash au lancement affectant > 5% des sessions
- Donnée corrompue dans AsyncStorage affectant la progression des utilisateurs

---

## Canaux EAS

| Channel | Usage | Audience |
|---------|-------|----------|
| `production` | Updates production — utilisateurs finaux | Tous les utilisateurs |
| `preview` | Tests internes avant production | Équipe interne (builds preview) |

---

## Rollback OTA

Voir `docs/ops/rollback-procedure.md` → section "Rollback mobile — OTA".

---

## Versionning

Avec `runtimeVersion.policy: "appVersion"` :
- Chaque build EAS production incrémente `version` dans `app.json`
- Une OTA est liée à une `version` exacte
- Les utilisateurs sur une ancienne version native ne reçoivent pas les OTA des versions supérieures

**Implication :** si une correction OTA est nécessaire pour plusieurs versions natives en simultané, déployer une OTA par version (via `eas update --runtime-version X.Y.Z`).
