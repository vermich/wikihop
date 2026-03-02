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

## À améliorer — items ouverts

| # | Observation | Piste d'action | Priorité |
|---|-------------|----------------|----------|
| 1 | `eslint-plugin-jest` absent — `expect()` sans matcher non détecté | Ajouter `jest/valid-expect: error` dans `.eslintrc.js` | Should |
| 2 | URL backend `http://localhost:3000` hardcodée dans `useRandomPair.ts` | Variables d'environnement Expo (`EXPO_PUBLIC_API_URL`) | Should (Phase 3) |
| 3 | Auto-approbation GitHub impossible — PR review `--approve` échoue | Accepter la limitation, process documenté | Won't fix |
| 4 | `no-console` warnings dans les stores (5 occurrences) | Remplacer par un logger mobile (ou supprimer) | Could |

---

*REX créé le 2026-03-02 — à enrichir après chaque rétrospective d'équipe.*
*Format : observations datées → résolution → leçon généralisable*
