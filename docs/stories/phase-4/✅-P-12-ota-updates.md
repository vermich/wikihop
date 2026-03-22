---
id: P-12
title: Stratégie de mise à jour OTA (Over The Air)
phase: 4-Production
priority: Should
agents: [Tech Lead, Frontend Dev]
status: done
created: 2026-02-28
completed: 2026-03-22
---

# P-12 — Stratégie de mise à jour OTA (Over The Air)

## User Story
En tant qu'éditeur, je veux pouvoir déployer des corrections mineures sans passer par la validation des stores, afin de réagir rapidement aux bugs en production.

## Critères d'acceptance
- [x] Expo Updates configuré en mode `manual` ou `on-launch`
- [x] La politique de mise à jour OTA est documentée (quels types de changements sont éligibles)
- [x] Les mises à jour critiques (correctifs de sécurité) peuvent être forcées
- [x] La compatibilité OTA avec la version du runtime Expo est vérifiée à chaque release
- [x] Les mises à jour OTA ne contournent pas les politiques Apple (pas de changement de fonctionnalité majeur sans review)

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim

**Date :** 2026-03-22
**Statut :** PARTIAL — tous les critères code/doc sont validés. Activation du projet EAS (`[PROJECT_ID]` placeholder) et test réel OTA non vérifiables en local.

### Critères vérifiés

- **Mode `on-launch` :** `app.json` : `"checkAutomatically": "ON_LOAD"`. Mode on-launch conforme (la spec accepte `manual` ou `on-launch`). Conforme.
- **Politique documentée :** `docs/ops/ota-policy.md` présent — liste exhaustive des types éligibles (corrections JS/TS, style, i18n, logique métier) et non éligibles (modules natifs, SDK, permissions, app.json). Conforme.
- **Mises à jour critiques forcées :** hook `useCriticalUpdateCheck` dans `apps/mobile/src/hooks/useCriticalUpdateCheck.ts` — détecte le préfixe `[CRITICAL]` dans le message du manifest et appelle `reloadAsync()` immédiatement. Appelé depuis `App.tsx` au démarrage. No-op en simulateur (`isEmbeddedLaunch`). Conforme.
- **Compatibilité runtime vérifiée :** `runtimeVersion.policy: "appVersion"` dans `app.json` — lie chaque OTA à une version native exacte. La politique est documentée dans `docs/ops/ota-policy.md` (section "Versionning"). Le workflow de release (`release.yml`) reconstruit l'app native à chaque tag, garantissant la cohérence runtime/OTA. Conforme.
- **Politique Apple :** section "Politique Apple" dans `docs/ops/ota-policy.md` — citant l'Article 3.3.2 des App Store Guidelines et un tableau d'exemples. Conforme.

### Note
`app.json` contient `"url": "https://u.expo.dev/[PROJECT_ID]"` — placeholder non remplacé. Cela n'affecte pas les critères d'acceptance (configuration ops), mais devra être renseigné avant la mise en production.

## Statut
pending → in-progress → done
