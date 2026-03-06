# Protocole de débogage — WikiHop

Version : 1.0 — issu de la rétro Phase 2 (2026-03-06)
Auteur : Tech Lead (Maxime)

---

## Contexte

Ce protocole a été formalisé après un bug WebView Android (Phase 2) où quatre hypothèses
ont été testées en série sans visibilité externe. Le diff V1/V2 — qui était la clé —
a été consulté en dernier au lieu d'être la première action.

---

## Règle 1 — Fiche d'hypothèse avant tout commit de debug

Avant tout changement de code lié à un bug, le développeur rédige une fiche dans
le commentaire de la PR ou de l'issue Git.

Format :

```
Hypothèse : [description en une phrase]
Signal observé qui la supporte : [log, comportement, diff de code]
Changement minimal pour valider : [ce qu'on va modifier, sans refactor annexe]
Résultat attendu si confirmée : [comportement observable mesurable]
Résultat attendu si invalidée : [comportement observable mesurable]
```

Règles :
- La fiche est écrite AVANT le commit, pas après
- Si l'hypothèse est invalidée, elle est marquée `[INVALIDÉE — raison]` et conservée
- La fiche suivante est rédigée avant d'ouvrir l'éditeur

---

## Règle 2 — La V1 est consultée en premier sur toute régression

Quand un bug apparaît sur une fonctionnalité qui fonctionnait dans une version précédente :

1. Identifier le fichier ou commit de référence fonctionnel (ex: `V1/` dans le repo)
2. Produire le diff V1 → V2 AVANT de formuler la première hypothèse
3. Annoter chaque delta : "ce changement est-il suspect pour ce bug ?"

Si on ne peut pas expliquer pourquoi chaque delta est sûr, c'est un candidat à investiguer.

La V1 est la ground truth. Ne pas l'utiliser en dernier recours.

---

## Règle 3 — Mise à jour PR après chaque hypothèse

Le développeur poste une mise à jour dans la PR après chaque hypothèse testée,
y compris pour les invalidations.

Format court :

```
Hypothèse N [STATUT] : description — résultat observé.
Hypothèse N+1 [EN COURS] : description.
```

Objectif : le Tech Lead peut suivre l'état de la recherche sans attendre un compte-rendu final.

---

## Règle 4 — Checkpoint Tech Lead après 2 hypothèses invalidées

Déclencheur : 2 hypothèses consécutives invalidées sans résolution.

Action : le développeur alerte le Tech Lead explicitement ("2 hypothèses invalidées,
je bloque"). Le Tech Lead lit le diff V1 lui-même et propose la piste suivante.

On ne continue pas en série au-delà de 2 invalidations sans ce checkpoint.
Le Tech Lead intervient AVANT la troisième tentative.

---

## Checklist de débogage — à cocher avant tout commit de fix

- [ ] Fiche d'hypothèse rédigée (Règle 1)
- [ ] Diff V1 consulté si régression (Règle 2)
- [ ] Changement minimal (pas de refactor annexe pendant le debug)
- [ ] Résultat observable défini avant de coder
- [ ] Mise à jour PR postée après test (Règle 3)
- [ ] Si 2e invalidation : checkpoint Tech Lead demandé (Règle 4)

---

## Fichiers de référence associés

- `docs/webview-lessons.md` — leçons spécifiques WebView Android
- `V1/` — snapshot de la version fonctionnelle de référence (WebView)
