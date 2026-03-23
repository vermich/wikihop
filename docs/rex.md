# REX — Retour d'Expérience WikiHop

> Document vivant. Mis à jour à chaque rétrospective d'équipe.
> Objectif : capitaliser sur les apprentissages pour améliorer les pratiques d'équipe — WikiHop et au-delà.

**Projet** : WikiHop — application mobile Wikirace (React Native + Fastify)
**Équipe** : Orchestrateur + 8 agents IA spécialisés (PM, Tech Lead, UX/UI, Frontend Dev, Backend Dev, QA, Security, DPO)
**Modèle de travail** : Workflow séquentiel par waves, stories dans `docs/stories/`, backlog dans `docs/backlog.md`

---

## Table des matières

1. [Rétrospective Phase 1 — Fondations](#rétro-1--phase-1--fondations)
2. [Rétrospective Phase 2 — MVP (itération 1)](#rétro-2--phase-2--mvp-itération-1)
3. [Historique des changements process](#historique-des-changements-process)
4. [Patterns récurrents à surveiller](#patterns-récurrents-à-surveiller)
5. [Ce qui fonctionne bien](#ce-qui-fonctionne-bien)

---

## Rétro 1 — Phase 1 — Fondations

**Date** : 2026-02-28
**Stories validées** : F-01 à F-12 (12 stories, fondations techniques)
**Contexte** : Première itération complète avec le workflow agents. Configuration du monorepo, CI/CD, Docker, TypeScript strict.

### Observations

#### Problème : FST_ERR_INVALID_SCHEMA (Fastify v5 + Zod)

**Symptôme** : Les routes Fastify retournaient une erreur `FST_ERR_INVALID_SCHEMA` au démarrage, bloquant le backend.

**Cause** : Fastify v5 avec `fastify-type-provider-zod` v6 requiert deux changements non documentés ensemble :
1. Les imports Zod doivent venir de `'zod/v4'` et non `'zod'`
2. Chaque plugin/route doit appeler `.withTypeProvider<ZodTypeProvider>()` explicitement — ce n'est pas hérité automatiquement

**Résolution** : Correction dans tous les fichiers de routes + documentation dans `docs/versions.md`.

**Leçon** : Lors d'une mise à jour majeure de framework (Fastify v4 → v5), vérifier systématiquement les changelogs des plugins dépendants, pas seulement le framework lui-même.

---

#### Problème : Réorganisation des stories après coup

**Symptôme** : Les stories Phase 1 étaient dans `docs/stories/` à la racine. Après la Phase 1, il a fallu les déplacer dans un sous-dossier `docs/stories/phase-1/` et mettre à jour tous les liens du backlog.

**Cause** : La convention de répertoires n'a pas été anticipée avant la création des premières stories.

**Résolution** : Migration manuelle + mise à jour des liens dans `docs/backlog.md`.

**Leçon** : Définir la convention de répertoires des stories dès le démarrage (par phase, par domaine, etc.). Un refactoring de structure de fichiers docs coûte du temps et des risques de liens cassés.

**Action prise** : Structure `docs/stories/phase-1/`, `docs/stories/` (Phase 2+) définie explicitement dans la convention.

---

#### Observation : Commandes `ls` demandant des validations répétées

**Symptôme** : Les agents sous-traitants utilisaient `Bash(ls ...)` pour explorer les répertoires, déclenchant des demandes de validation à chaque fois.

**Cause** : `ls` n'était pas dans la liste des outils auto-approuvés dans `~/.claude/settings.json`. Les agents auraient dû utiliser l'outil dédié `Glob` à la place.

**Résolution** : Différée à la Rétro 2 (voir ci-dessous).

---

## Rétro 2 — Phase 2 — MVP (itération 1)

**Date** : 2026-03-02
**Stories validées** : M-01 à M-17 (11 Must + stories in-progress)
**Waves réalisées** : 4 waves de développement (M-07+M-16 / M-02+M-08+M-12 / M-15+M-03+M-04+M-05 / M-01+M-06)
**Tests** : 205 tests au total, 0 régression

### Observations

---

#### Problème 1 : Commandes `ls` déclenchant des validations utilisateur

**Symptôme** : À chaque wave, certains agents utilisaient `Bash(ls ...)` pour explorer les répertoires au lieu de l'outil `Glob`, générant des demandes de validation répétées et interrompant le flux de travail.

**Cause** : `ls` n'était pas dans `~/.claude/settings.json` dans la liste `allowedTools`. L'instruction "préférer Glob à ls" était dans le system prompt de l'orchestrateur mais pas dans les prompts des agents spécialisés.

**Impact** : Friction utilisateur à chaque wave. Interruptions fréquentes pour valider des actions inoffensives.

**Résolution appliquée** :
- `Bash(ls *)` et `Bash(ls)` ajoutés à `~/.claude/settings.json`
- Note ajoutée dans `MEMORY.md` de l'orchestrateur

**Leçon générale** : Lors de la configuration initiale d'un projet multi-agents, passer en revue les commandes shell courantes (ls, cat, find, pwd…) et les pré-approuver si elles sont inoffensives. Le coût de la sur-validation est plus élevé que le risque de ces commandes.

---

#### Problème 2 : Absence de TDD — tests écrits après le code

**Symptôme** : Les agents écrivaient les tests en même temps (ou juste après) le code d'implémentation. Un `expect(...)` sans matcher dans `isPlayableArticle.test.ts` a été détecté en code review Tech Lead — le test passait toujours, ne validant rien.

**Cause** : Le workflow demandait "écrire des tests" sans préciser d'ordre ni de stratégie. Les agents interprétaient cela comme "tests alongside" sur tous les types de code.

**Impact** : Tests qui ne testent rien (faux positifs), détectés tardivement en code review plutôt qu'immédiatement.

**Résolution appliquée** :
- Règle TDD ciblée ajoutée dans `CLAUDE.md`
- Workflow d'implémentation mis à jour dans `frontend-dev.md` et `backend-dev.md`
- Le Tech Lead doit maintenant lister explicitement les fonctions pures à TDDer dans ses specs
- Distinction claire : **TDD strict** pour fonctions pures/hooks/services, **alongside** pour composants UI

**Leçon générale** : Le TDD "pur" sur tous les types de code est difficile avec des agents IA (feedback loop non-interactif). Une approche hybride ciblée est plus réaliste : TDD là où c'est facile et utile (fonctions pures, logique métier isolée), alongside là où c'est complexe (composants UI avec rendu).

---

#### Problème 3 : Code mort (ref `fetchCount`) non détecté avant merge

**Symptôme** : Dans `useRandomPair.ts`, un `useRef(fetchCount)` était incrémenté dans `refresh()` mais jamais lu. Le `trigger` state gérait déjà le re-fetch. La ref était du code mort.

**Cause** : Le critère "pas de code mort" existait dans la checklist Tech Lead ("Pas de code mort ou de `console.log` laissés") mais n'était pas marqué **bloquant** — le Tech Lead l'avait noté en "non-bloquant" et avait approuvé la PR quand même.

**Impact** : Code mort mergé, nettoyage a posteriori nécessaire, précédent négatif pour les futures PRs.

**Résolution appliquée** :
- "Code mort = **BLOQUANT**" ajouté explicitement dans la checklist de code review Tech Lead (`tech-lead-maxime.md`)
- Règle encodée dans `CLAUDE.md`
- Fix immédiat : `fetchCount` et `useRef` supprimés, committé sur `develop`

**Leçon générale** : Les critères de qualité "non-bloquants" finissent toujours par être ignorés sous la pression. Si quelque chose est mauvais, le rendre bloquant. Si ce n'est vraiment pas bloquant, ne pas le mettre dans la checklist — ça dilue l'attention.

---

#### Problème 4 : Specs commitées après le code dans certaines waves

**Symptôme** : Dans les waves 1 et 2, les specs Tech Lead et maquettes UX/UI étaient commitées sur `develop` **après** que le code des agents dev était déjà pushé. Pendant une fenêtre temporelle, le code existait sans la documentation qui l'expliquait.

**Cause** : L'orchestrateur commitait PM + Tech Lead + UX/UI après avoir reçu les résultats des agents, parfois après que les PRs dev avaient déjà été créées.

**Impact** : Risque de désynchronisation docs/code. Traceability réduite.

**Résolution appliquée** :
- Règle d'ordre strict ajoutée dans `CLAUDE.md` : PM commit → Tech Lead commit → UX/UI commit → **puis seulement** lancement agents dev

**Leçon générale** : Les specs sont du code. Elles méritent d'être dans le dépôt **avant** l'implémentation, pas après. C'est une exigence de traçabilité, pas juste une préférence.

---

#### Observation positive : Le cycle wave (PM+TL en parallèle → UX/UI → Dev → Review → QA) est efficace

**Observation** : Le séquençage en waves (grouper les stories interdépendantes) avec parallélisation PM+Tech Lead au kickoff a permis une cadence soutenue sans blocages inter-agents.

**Chiffres** : 11 stories Must livrées et validées QA en une session, avec 205 tests et 0 régression.

**À conserver** : Ce pattern de wave est reproduire dans les prochaines phases.

---

## Rétro 3 — Phase 3 — Features

**Date** : 2026-03-16
**Stories validées** : F3-01 à F3-36 (31 actives + 5 won't)
**Tests** : 678 tests, 0 régression
**Waves** : A à I

### Observations

---

#### Problème 1 : Bug retour arrière — 3 occurrences (F3-22, F3-27, F3-34)

**Symptôme** : Le retour arrière dans ArticleScreen a nécessité 3 stories correctifs successifs. Chaque correctif résolvait un symptôme mais pas la cause racine.

**Cause** : Deux sources de vérité pour l'état de navigation — le stack React Navigation d'un côté, l'historique interne de la WebView de l'autre. Les specs F3-22 et F3-27 ne modélisaient pas explicitement la coexistence de ces deux stacks. Les specs ne précisaient pas non plus le comportement attendu pour les 3 affordances de retour (geste iOS / bouton header / hardware Android). La solution correcte (stack applicatif explicite) n'est arrivée qu'en F3-34.

**Résolution appliquée** :
- Règle "Specs navigation — diagramme d'état obligatoire" ajoutée dans `CLAUDE.md`
- Règle "ADR obligatoire si bug navigation revient une 2e fois" ajoutée dans `CLAUDE.md`

**Leçon générale** : Deux sources de vérité pour le même état = bug garanti. Quand une zone de code génère deux bugs consécutifs, c'est le signal d'un problème architectural, pas d'implémentation. Il faut s'arrêter et modéliser avant de corriger.

---

#### Problème 2 : Gate device physique — dérive

**Symptôme** : Sur les waves D et E, Laurent n'avait pas accès au device physique. Les stories ont quand même été validées "avec réserves" par QA et passées en `done`.

**Cause** : Le gate était décrit comme un critère de PR (Tech Lead + QA), mais personne n'était désigné comme décisionnaire final. Le Client n'était pas impliqué.

**Résolution appliquée** :
- La validation device physique est désormais explicitement de la responsabilité du **Client**
- Une story sans validation Client reste en `in-progress` — aucune exception, aucun "validé avec réserves"
- `CLAUDE.md` mis à jour

**Leçon générale** : Les tests d'acceptance utilisateur ne peuvent pas être délégués à l'équipe technique. Le Client est le seul décisionnaire sur "est-ce que ça marche sur mon appareil".

---

#### Problème 3 : Specs imprécises — ambiguïtés non remontées avant le dev

**Symptôme** : Des comportements de navigation n'étaient pas spécifiés (affordances de retour, cas limites iOS vs Android). Laurent a dû interpréter ou découvrir en implémentant.

**Cause** : Le PM ne sollicitait pas le Client pour clarifier les cas ambigus avant de lancer le Tech Lead. Les lacunes restaient dans les specs et n'étaient découvertes qu'en implémentation.

**Résolution appliquée** :
- Règle ajoutée dans `CLAUDE.md` : si les critères d'acceptance sont ambigus, le PM demande au Client **avant** de lancer le Tech Lead

**Leçon générale** : Le coût de poser une question au Client avant de commencer est infiniment plus faible que celui de corriger après livraison.

---

#### Problème 4 : Périmètre Phase 3 trop large

**Symptôme** : 36 stories actives en Phase 3, dont 5 correctifs Must non anticipés. Code reviews sous pression sur les zones sensibles (WebView, navigation).

**Cause** : Pas de plafond défini. Les features et correctifs se sont accumulés sans régulation du scope.

**Résolution appliquée** :
- Règle "8-10 stories par lot, 15 max par phase" ajoutée dans `CLAUDE.md`
- Toute régression = story Must créée immédiatement (pas en correctif post-livraison)

---

#### Observation positive : Optimisation tokens (injection contenu dans prompts agents)

**Pratique** : Pré-lire les fichiers avec Read/Grep et injecter le contenu directement dans les prompts agents, au lieu de leur demander de lire eux-mêmes.

**Impact** : Réduction significative du nombre de tool calls par agent. Appréciée par toute l'équipe.

**À conserver** : Systématiser pour PM, Tech Lead, QA. Laisser les agents dev lire eux-mêmes (ils ont besoin de vérifier leur output).

---

## Historique des changements process

| Date | Changement | Fichier(s) modifié(s) | Déclencheur |
|------|-----------|-----------------------|-------------|
| 2026-02-28 | Convention répertoires stories par phase | `docs/backlog.md`, `docs/stories/phase-1/` | Rétro Phase 1 |
| 2026-02-28 | Documentation FST_ERR_INVALID_SCHEMA + Zod/v4 | `docs/versions.md` | Bug bloquant Phase 1 |
| 2026-03-02 | `Bash(ls *)` ajouté aux outils auto-approuvés | `~/.claude/settings.json` | Rétro Phase 2 |
| 2026-03-02 | Règle TDD ciblé (fonctions pures + hooks = TDD strict) | `CLAUDE.md`, `frontend-dev.md`, `backend-dev.md`, `tech-lead-maxime.md` | Rétro Phase 2 |
| 2026-03-02 | Code mort = critère bloquant en code review | `CLAUDE.md`, `tech-lead-maxime.md`, `frontend-dev.md`, `backend-dev.md` | Rétro Phase 2 |
| 2026-03-02 | Commits specs avant lancement agents dev | `CLAUDE.md` | Rétro Phase 2 |
| 2026-03-02 | Fix `fetchCount` ref morte dans `useRandomPair.ts` | `apps/mobile/src/hooks/useRandomPair.ts` | Rétro Phase 2 |
| 2026-03-16 | Gate device physique = validation Client obligatoire (plus seulement Laurent+QA) | `CLAUDE.md` | Rétro Phase 3 |
| 2026-03-16 | PM doit clarifier specs auprès du Client avant lancement Tech Lead | `CLAUDE.md` | Rétro Phase 3 |
| 2026-03-16 | Specs navigation : diagramme d'état + affordances + interactions obligatoires | `CLAUDE.md` | Rétro Phase 3 |
| 2026-03-16 | ADR obligatoire si bug navigation revient une 2e fois | `CLAUDE.md` | Rétro Phase 3 |
| 2026-03-16 | Plafond 8-10 stories/lot, 15/phase | `CLAUDE.md` | Rétro Phase 3 |
| 2026-03-16 | Backlog mis à jour au handoff (pas en fin de vague) | `CLAUDE.md` | Rétro Phase 3 |
| 2026-03-16 | Commandes mv/rm/sed/find/etc. ajoutées aux outils auto-approuvés | `~/.claude/settings.json` | Rétro Phase 3 |

---

## Patterns récurrents à surveiller

Ces patterns ont émergé au moins une fois — à surveiller activement dans les prochaines itérations.

### Pattern 1 : Code mort via `useRef` inutilisé

**Contexte** : React Native / Zustand. Des refs sont parfois créées "au cas où" pendant l'implémentation (compteurs, flags) puis le besoin disparaît mais la ref reste.

**Détection** : ESLint `no-unused-vars` ne couvre pas les `.current` des refs — c'est un angle mort du linting.

**Mitigation** : La code review Tech Lead vérifie manuellement les `useRef` — vérifier que `.current` est bien **lu** quelque part, pas seulement assigné.

---

### Pattern 2 : `expect(value)` sans matcher dans Jest

**Contexte** : Tests Jest. `expect(myFunction())` sans `.toBe()`, `.toEqual()`, `.toThrow()`, etc. passe toujours — ne teste rien.

**Détection** : Difficile automatiquement. ESLint plugin `jest/valid-expect` peut le détecter.

**Mitigation** : À ajouter en Phase 3 — `eslint-plugin-jest` avec la règle `jest/valid-expect: error`.

**Statut** : Ticket à créer → story de qualité à planifier.

---

### Pattern 3 : Mock Jest consommé une seule fois avec double assertion

**Contexte** : `mockResolvedValueOnce` ou `mockRejectedValueOnce` sont consommés au premier appel. Si le premier test utilise `await expect(...).rejects.toThrow()` ET que la valeur devrait être en cache au second appel, le mock est déjà consommé.

**Symptôme** : Le second appel résout depuis le cache (comportement attendu) mais si on attendait une erreur sur les deux, le second test passe pour la mauvaise raison.

**Mitigation** : Utiliser `try/catch` + assertions directes sur l'objet erreur pour les tests d'erreur qui impliquent du caching. Utiliser des titres uniques par test pour isoler les caches.

---

### Pattern 4 : Permissions macOS lors de `find` à large scope

**Contexte** : Une commande `find /Users/[user]` déclenche des demandes de permission macOS pour accéder au Bureau, à la Musique, à Google Drive, etc.

**Mitigation** : Ne jamais lancer `find` sur un répertoire utilisateur large. Utiliser `Glob` ou `find` ciblé sur un sous-répertoire précis (ex: `find /Users/[user]/Projets`).

---

## Ce qui fonctionne bien

Ces pratiques ont prouvé leur valeur et doivent être maintenues.

### Workflow wave séquentiel avec parallélisation PM+Tech Lead

Le démarrage de chaque wave avec PM et Tech Lead en parallèle (PM → statuts in-progress, Tech Lead → specs) permet de ne jamais bloquer les agents dev en attente de décisions. La parallélisation n'introduit pas de conflits car leurs livrables sont distincts (docs vs backlog).

### Critères d'acceptance cochés dans les fichiers story

Coche directement dans `docs/stories/[ID].md` par QA. Chaque critère est un checkbox Markdown — l'état des tests est visible dans le fichier même, pas dans un système externe.

### Rapports QA structurés avec tableau de bord

Le format de rapport QA (critères cochés / tests automatisés / cas limites / bugs) produit une traçabilité claire par story. Le bilan wave en tableau synthétique permet une revue rapide de l'avancement.

### Séparation fonctions pures testables vs composants UI

Le fait d'extraire `formatSeconds`, `computeElapsedSeconds`, `isPlayableArticle` en fonctions pures exportées (au lieu de les laisser inline dans les composants) rend les tests exhaustifs simples à écrire. Ce pattern doit être systématisé.

### `packages/shared` comme contrat d'API entre mobile et backend

Le type `ArticleSummary` défini une seule fois dans `packages/shared/src/types/index.ts` et consommé par les deux apps a évité la désynchronisation de type lors de la Wave 2. Ce contrat partagé est à étendre à tous les nouveaux types partagés.

---

## Rétro 4 — Phase 4 — Production

**Date** : 2026-03-23
**Stories validées** : P-01 à P-17 (15 actives + 5 déplacées Phase 5 + 2 bugs correctifs)
**Tests** : 699 tests, 0 régression
**Stories Phase 5** : P-07/P-08/P-09/P-11/M-11 (nécessitent déploiement backend ou comptes store)

### Observations

---

#### Problème 1 : QA lisant du code pré-merge

**Symptôme** : Halim a rejeté M-13 avec 7 bugs. Vérification manuelle a révélé que toutes les corrections étaient présentes dans `develop` — Halim avait lu les fichiers sur la branche avant merge (ou dans un état de travail intermédiaire).

**Cause** : L'agent QA n'avait pas de garantie sur le checkout de la branche correcte avant de lire les fichiers. Quand plusieurs agents travaillent en parallèle sur des branches différentes, l'état du working directory peut être indéterminé.

**Résolution appliquée** :
- Re-run QA avec instruction explicite "lire sur `develop` post-merge" — validé au second passage
- Ajout dans les prompts QA : toujours préciser la branche/commit de référence

**Leçon générale** : Les agents QA doivent être instruits de manière explicite sur le commit ou la branche à lire. "Lire le fichier actuel" est ambigu dans un contexte de worktrees ou de branches multiples actives.

---

#### Problème 2 : Schéma SQL incorrect dans les scripts de test

**Symptôme** : Les scripts k6 P-05 contenaient un `INSERT INTO daily_challenges` avec des colonnes inexistantes (`challenge_date`, `start_title TEXT`, `target_title TEXT`) au lieu du vrai schéma (`date`, `start_article JSONB`, `target_article JSONB`). Tech Lead l'a détecté en code review.

**Cause** : L'agent Backend Dev avait écrit les scripts k6 de mémoire sans vérifier la migration SQL de référence (`apps/backend/src/db/migrations/002_daily_challenges.sql`). Le schéma JSONB est moins intuitif que des colonnes TEXT — tendance naturelle à simplifier.

**Résolution appliquée** :
- Correction dans le même workflow (fix committé sur la même branche avant merge)
- Leçon intégrée : pour tout script de test ou fixture impliquant du SQL, lire la migration de référence avant d'écrire

**Leçon générale** : Les scripts de test qui contiennent du SQL manuel sont des pièges silencieux. Un `INSERT` incorrect ne plante pas à l'écriture — il plante à l'exécution sur la vraie base, souvent bien plus tard. La code review doit systématiquement croiser les colonnes avec les migrations.

---

#### Problème 3 : Correction DPO non intégrée dans l'implémentation initiale (P-14)

**Symptôme** : Le rapport DPO listait deux corrections bloquantes avant merge : `delete event.request.url` et mention Sentry dans `AboutScreen`. L'implémentation initiale a inclus le premier point mais pas la mention dans AboutScreen, forçant une PR de correction supplémentaire (#62).

**Cause** : Le prompt agent Frontend Dev injectait les specs Tech Lead (qui ne mentionnaient pas AboutScreen explicitement) mais pas le rapport DPO complet. La correction DPO était dans `docs/dpo/P-14-sentry-validation.md` — fichier non lu par l'agent.

**Résolution appliquée** :
- Correction en PR de fix (#62) — 1 session supplémentaire
- Pour les futures stories avec DPO : injecter le contenu du rapport DPO dans le prompt Frontend Dev, pas seulement les specs Tech Lead

**Leçon générale** : Quand plusieurs agents produisent des livrables qui doivent tous être intégrés (Tech Lead specs + DPO rapport), s'assurer que l'agent implémenteur reçoit **tous** les livrables dans son prompt, pas seulement le livrable principal.

---

#### Problème 4 : Worktrees git orphelins entre sessions

**Symptôme** : Au début de cette session, un worktree `.claude/worktrees/agent-aeeab83e` était orphelin (PR déjà mergée). Git refusait les opérations sur la branche.

**Cause** : Les worktrees créés par `isolation: worktree` dans les agents ne sont pas automatiquement nettoyés si la session parent se termine anormalement.

**Résolution appliquée** :
- `git worktree remove --force` pour nettoyer manuellement
- Vérification systématique de `git worktree list` en début de session après une interruption

**Leçon générale** : `git worktree list` en début de session est une bonne hygiène, surtout après une interruption. Un worktree orphelin n'est pas dangereux mais peut bloquer des opérations git.

---

#### Problème 5 : Branches distantes non nettoyées entre phases

**Symptôme** : En fin de Phase 4, 41 branches locales mergées et 44+ branches remote orphelines subsistaient.

**Cause** : Aucun nettoyage de branches entre les phases. Accumulation naturelle sur 4 phases.

**Résolution appliquée** :
- Nettoyage manuel en rétro finale : `git branch --merged develop | xargs git branch -d` + `git push origin --delete`
- À planifier en fin de chaque phase (pas seulement en fin de projet)

**Leçon générale** : Le nettoyage des branches doit être une tâche de fin de phase, pas de fin de projet. 40+ branches créent du bruit dans `git log --all` et ralentissent les opérations remote.

---

#### Observation positive 1 : Protocole de débogage — fiche hypothèse

Le protocole de débogage (`docs/debug-protocol.md`) avec fiche hypothèse obligatoire avant chaque tentative a évité les corrections "à l'aveugle". Sur le bug P-17-01 (double alert), le diagnostic structuré a permis d'identifier la cause racine (appel `handleAbandon` qui déclenchait une seconde `Alert`) en une seule tentative.

**À conserver** : Systématiser dans tout projet impliquant des bugs de comportement React Native / état async.

---

#### Observation positive 2 : Déplacement stratégique des stories en Phase 5

Déplacer P-07/P-08/P-09/P-11/M-11 en Phase 5 plutôt que de les bloquer a permis de livrer Phase 4 proprement sans dépendances externes non résolues. Le critère "cette story nécessite un service en RUN" est un bon signe de déplacement en phase suivante.

**À conserver** : En début de phase, classifier les stories selon leurs dépendances externes (déploiement, comptes tiers, API keys). Celles avec dépendances non confirmées → phase suivante.

---

#### Observation positive 3 : DPO intégrée dans le workflow standard

Pour les stories impliquant des données (crash reporting, analytics, comptes utilisateurs), l'intégration DPO en amont (avant l'implémentation) a produit des specs de filtrage précises (`filterSentryEvent`) qui ont guidé le TDD. Sans validation DPO préalable, le risque était de découvrir les contraintes RGPD en post-implémentation.

**À conserver** : Sur tout nouveau projet collectant des données (même anonymes), faire valider par le DPO la liste des données collectées **avant** d'écrire la première ligne de code.

---

### Chiffres de fin de Phase 4

| Métrique | Valeur |
|----------|--------|
| Stories livrées (P-01→P-17 actives) | 15 done + 2 en Phase 5 |
| Stories déplacées Phase 5 | 5 (P-07/P-08/P-09/P-11/M-11) |
| PRs mergées sur develop | 62 PRs (F-01 à P-17) |
| Tests automatisés | 699 (mobile) + tests backend |
| Couverture branches (mobile) | 69% (seuil ajusté) |
| Branches nettoyées en rétro | 41 locales + 44 remote |
| ADRs documentés | 10 |
| Phases complètes | 4 (Fondations → MVP → Features → Production) |

---

## Historique des changements process

| Date | Changement | Fichier(s) modifié(s) | Déclencheur |
|------|-----------|-----------------------|-------------|
| 2026-02-28 | Convention répertoires stories par phase | `docs/backlog.md`, `docs/stories/phase-1/` | Rétro Phase 1 |
| 2026-02-28 | Documentation FST_ERR_INVALID_SCHEMA + Zod/v4 | `docs/versions.md` | Bug bloquant Phase 1 |
| 2026-03-02 | `Bash(ls *)` ajouté aux outils auto-approuvés | `~/.claude/settings.json` | Rétro Phase 2 |
| 2026-03-02 | Règle TDD ciblé (fonctions pures + hooks = TDD strict) | `CLAUDE.md`, `frontend-dev.md`, `backend-dev.md`, `tech-lead-maxime.md` | Rétro Phase 2 |
| 2026-03-02 | Code mort = critère bloquant en code review | `CLAUDE.md`, `tech-lead-maxime.md`, `frontend-dev.md`, `backend-dev.md` | Rétro Phase 2 |
| 2026-03-02 | Commits specs avant lancement agents dev | `CLAUDE.md` | Rétro Phase 2 |
| 2026-03-02 | Fix `fetchCount` ref morte dans `useRandomPair.ts` | `apps/mobile/src/hooks/useRandomPair.ts` | Rétro Phase 2 |
| 2026-03-16 | Gate device physique = validation Client obligatoire (plus seulement Laurent+QA) | `CLAUDE.md` | Rétro Phase 3 |
| 2026-03-16 | PM doit clarifier specs auprès du Client avant lancement Tech Lead | `CLAUDE.md` | Rétro Phase 3 |
| 2026-03-16 | Specs navigation : diagramme d'état + affordances + interactions obligatoires | `CLAUDE.md` | Rétro Phase 3 |
| 2026-03-16 | ADR obligatoire si bug navigation revient une 2e fois | `CLAUDE.md` | Rétro Phase 3 |
| 2026-03-16 | Plafond 8-10 stories/lot, 15/phase | `CLAUDE.md` | Rétro Phase 3 |
| 2026-03-16 | Backlog mis à jour au handoff (pas en fin de vague) | `CLAUDE.md` | Rétro Phase 3 |
| 2026-03-16 | Commandes mv/rm/sed/find/etc. ajoutées aux outils auto-approuvés | `~/.claude/settings.json` | Rétro Phase 3 |
| 2026-03-23 | Injecter le rapport DPO dans les prompts agents dev (stories avec données) | Process orchestrateur | Rétro Phase 4 |
| 2026-03-23 | Instruction branche/commit explicite dans les prompts QA | Process orchestrateur | Rétro Phase 4 |
| 2026-03-23 | Nettoyage branches en fin de phase (pas seulement fin de projet) | Process orchestrateur | Rétro Phase 4 |
| 2026-03-23 | Classifier stories par dépendances externes en début de phase | Process orchestrateur | Rétro Phase 4 |

---

## Patterns récurrents à surveiller

Ces patterns ont émergé au moins une fois — à surveiller activement dans les prochaines itérations.

### Pattern 1 : Code mort via `useRef` inutilisé

**Contexte** : React Native / Zustand. Des refs sont parfois créées "au cas où" pendant l'implémentation (compteurs, flags) puis le besoin disparaît mais la ref reste.

**Détection** : ESLint `no-unused-vars` ne couvre pas les `.current` des refs — c'est un angle mort du linting.

**Mitigation** : La code review Tech Lead vérifie manuellement les `useRef` — vérifier que `.current` est bien **lu** quelque part, pas seulement assigné.

---

### Pattern 2 : `expect(value)` sans matcher dans Jest

**Contexte** : Tests Jest. `expect(myFunction())` sans `.toBe()`, `.toEqual()`, `.toThrow()`, etc. passe toujours — ne teste rien.

**Détection** : Difficile automatiquement. ESLint plugin `jest/valid-expect` peut le détecter.

**Mitigation** : À ajouter en Phase 5 — `eslint-plugin-jest` avec la règle `jest/valid-expect: error`.

---

### Pattern 3 : Mock Jest consommé une seule fois avec double assertion

**Contexte** : `mockResolvedValueOnce` ou `mockRejectedValueOnce` sont consommés au premier appel. Si le premier test utilise `await expect(...).rejects.toThrow()` ET que la valeur devrait être en cache au second appel, le mock est déjà consommé.

**Mitigation** : Utiliser `try/catch` + assertions directes sur l'objet erreur pour les tests d'erreur qui impliquant du caching.

---

### Pattern 4 : Permissions macOS lors de `find` à large scope

**Contexte** : Une commande `find /Users/[user]` déclenche des demandes de permission macOS.

**Mitigation** : Ne jamais lancer `find` sur un répertoire utilisateur large. Utiliser `Glob` ou `find` ciblé.

---

### Pattern 5 : SQL manuel dans les scripts de test — colonnes mémorisées au lieu de vérifiées

**Contexte** : Scripts k6, fixtures, seeds. L'agent écrit du SQL de mémoire au lieu de lire la migration de référence.

**Détection** : Code review Tech Lead — croiser les colonnes SQL avec `db/migrations/`.

**Mitigation** : Dans tout prompt agent impliquant du SQL manuel, injecter le contenu de la migration correspondante.

---

### Pattern 6 : Livrables multi-agents non tous injectés dans le prompt implémenteur

**Contexte** : Stories avec DPO + Tech Lead. L'agent dev reçoit les specs Tech Lead mais pas le rapport DPO.

**Détection** : QA bloque sur un critère DPO absent de l'implémentation.

**Mitigation** : Pour les stories avec DPO, injecter systématiquement le rapport DPO dans le prompt Frontend Dev / Backend Dev.

---

## Ce qui fonctionne bien

Ces pratiques ont prouvé leur valeur et doivent être maintenues.

### Workflow wave séquentiel avec parallélisation PM+Tech Lead

Le démarrage de chaque wave avec PM et Tech Lead en parallèle (PM → statuts in-progress, Tech Lead → specs) permet de ne jamais bloquer les agents dev en attente de décisions.

### Critères d'acceptance cochés dans les fichiers story

Coche directement dans `docs/stories/[ID].md` par QA. Chaque critère est un checkbox Markdown — l'état des tests est visible dans le fichier même.

### Rapports QA structurés

Le format de rapport QA (critères cochés / tests automatisés / cas limites / bugs) produit une traçabilité claire par story.

### Séparation fonctions pures testables vs composants UI

Extraire `formatSeconds`, `computeElapsedSeconds`, `isPlayableArticle` en fonctions pures exportées rend les tests exhaustifs simples à écrire. À systématiser.

### `packages/shared` comme contrat d'API

Le type partagé évite la désynchronisation entre mobile et backend. À étendre à tous les nouveaux types partagés.

### Protocole de débogage — fiche hypothèse

La fiche `DIAGNOSTIC — [ID] — Tentative N` évite les corrections à l'aveugle. Après 2 tentatives sans succès, checkpoint obligatoire avant de continuer.

### Déplacement stratégique des stories avec dépendances externes

Les stories nécessitant un service en RUN (déploiement, comptes store) sont déplacées en phase suivante dès qu'elles sont identifiées — permet de clore la phase proprement.

### DPO intégrée en amont

Valider avec le DPO la liste des données collectées avant d'écrire la première ligne de code évite des corrections post-implémentation coûteuses.

---

## À améliorer — items ouverts

| # | Observation | Piste d'action | Priorité |
|---|-------------|----------------|----------|
| 1 | `eslint-plugin-jest` absent — `expect()` sans matcher non détecté | Ajouter `jest/valid-expect: error` dans `.eslintrc.js` | Should |
| 2 | Auto-approbation GitHub impossible — PR review `--approve` échoue | Accepter la limitation, process documenté | Won't fix |
| 3 | `no-console` warnings dans les stores (5 occurrences) | Remplacer par un logger mobile (ou supprimer) | Could |
| 4 | Branches non nettoyées entre phases | Ajouter nettoyage branches en fin de chaque phase | Should |

---

*REX créé le 2026-03-02 — mis à jour à chaque rétrospective d'équipe.*
*Format : observations datées → résolution → leçon généralisable*
