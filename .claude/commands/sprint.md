# Commande /sprint

**Usage** : `/sprint [description de la fonctionnalité ou du sprint]`

**Exemple** : `/sprint navigation entre articles Wikipedia`

---

## Comportement

Quand l'utilisateur tape `/sprint [description]`, l'orchestrateur exécute les étapes suivantes :

### 1. Analyse du backlog existant

Lire `docs/backlog.md` (index) et les fichiers dans `docs/stories/` pour :
- Identifier les stories existantes liées à la description fournie
- Repérer les stories avec statut `pending` qui correspondent à la demande
- Lister les dépendances entre stories (ex : une story de fondation doit être `done` avant de démarrer une feature)

### 2. Invocation du PM (Gauderic)

Si des stories manquent ou doivent être créées pour la fonctionnalité demandée, invoquer l'agent PM (`.claude/agents/pm.md`) avec la mission :
- Rédiger les user stories manquantes au format standard
- Créer les fichiers `docs/stories/[ID]-[slug].md` avec statut `pending`
- Mettre à jour `docs/backlog.md` avec les nouvelles entrées

### 3. Résumé du sprint

Afficher un tableau récapitulatif :

```
## Sprint — [Description]

### Stories incluses

| ID | Titre | Priorité | Agents | Statut |
|----|-------|----------|--------|--------|
| [M-04](docs/stories/M-04-article-navigation.md) | Navigation entre articles | Must | Frontend Dev | ⬜ pending |
| ... | ... | ... | ... | ... |

### Agents impliqués
- Frontend Dev : M-04, M-05
- Backend Dev : M-02, M-08
- QA : M-09

### Ordre de travail recommandé
1. [M-02] Génération d'une paire aléatoire (Backend Dev) — prérequis pour M-01
2. [M-08] Service Wikipedia API (Frontend Dev + Backend Dev) — prérequis pour M-03
3. [M-03] Affichage d'un article (Frontend Dev + Backend Dev) — prérequis pour M-04
4. [M-04] Navigation entre articles (Frontend Dev)
5. [M-05] Compteur et timer (Frontend Dev)
6. [M-09] Tests unitaires (QA + devs)
```

### 4. Proposition de démarrage

L'orchestrateur propose :
- La première story à attribuer (selon l'ordre de travail)
- L'agent à invoquer en premier
- Si des prérequis bloquants sont identifiés, en informer l'utilisateur avant de démarrer

---

## Règles

- Ne jamais créer de doublons : vérifier l'existence de chaque story avant de la créer
- Les IDs suivent la convention existante : `F-XX` (fondations), `M-XX` (MVP), `F3-XX` (features), `P-XX` (production)
- Les nouveaux IDs sont incrémentaux par rapport au dernier ID existant dans la phase
- Toujours créer les stories dans `docs/stories/` ET mettre à jour l'index `docs/backlog.md`
- Le PM peut créer plusieurs stories en une seule invocation si la fonctionnalité est transversale
- Les stories créées ont toujours le statut `pending`

---

## Exemple complet

**Commande** : `/sprint défi quotidien`

**Résultat attendu** :

L'orchestrateur détecte que `F3-01` (Défi quotidien) existe déjà avec statut `pending`.
Il identifie les dépendances : F3-01 nécessite M-02 et M-01 complétés.
Il affiche le résumé du sprint avec l'ordre recommandé et propose de démarrer par les prérequis manquants.
