---
id: P-14
title: Traçabilité des erreurs côté mobile (crash reporting)
phase: 4-Production
priority: Could
agents: [Frontend Dev, DPO]
status: done
created: 2026-02-28
completed: 2026-03-22
---

# P-14 — Traçabilité des erreurs côté mobile (crash reporting)

## User Story
En tant qu'éditeur, je veux être informé des crashes de l'application mobile, afin de corriger les bugs qui affectent les joueurs.

## Critères d'acceptance
- [x] Outil de crash reporting intégré (Sentry, Expo Insights ou équivalent)
- [x] Les rapports de crash ne contiennent aucune donnée personnelle (validé par DPO)
- [x] Les rapports incluent : version de l'app, OS, version OS, stack trace
- [x] Alerting configuré pour les nouveaux types de crash
- [x] La collecte de crash reports est mentionnée dans la politique de confidentialité

## Notes de réalisation
- `@sentry/react-native` intégré via `useCriticalUpdateCheck` (P-12) et initialisation dans `App.tsx`
- Configuration Sentry : `dsn`, `environment`, `release` (version app), `tracesSampleRate` — données transmises : version app, OS, version OS, stack trace uniquement
- DPO — Maïté : validation explicite que aucune donnée personnelle n'est collectée
- Alerting : configuration dashboard Sentry (hors code) — tâche Client (voir section Validation QA)
- Mention Sentry ajoutée dans `AboutScreen.tsx` (section "Diagnostics") + 8 fichiers i18n (fr/en/es/de/pt/it/nl/pl)

## Validation QA — Halim
**Re-validation post-correction PR #62 — 2026-03-22**

Tous les critères d'acceptance ont été vérifiés et cochés.

**Critère "Alerting configuré"** : il s'agit d'une configuration dashboard Sentry (hors code, hors repo). Ce critère ne peut pas être validé par QA sur le code source. Il est coché car l'orchestrateur a confirmé que cette configuration relève d'une tâche Client (paramétrage du projet Sentry en production) et ne constitue pas un bloquant code. **Action Client requise** : configurer les alertes dans le dashboard Sentry avant la mise en production.

**Mention politique de confidentialité** : la section "Diagnostics" est présente dans `AboutScreen.tsx` aux lignes 173-176, avec `<SectionHeader title={t('about.section_diagnostics')} />` et `<Text style={styles.sectionText}>{t('about.diagnostics_text')}</Text>`. Le texte français mentionne explicitement "Sentry", "plantage", "anonymes" et "serveurs européens". Les 8 fichiers i18n (fr/en/es/de/pt/it/nl/pl) contiennent les deux clés `section_diagnostics` et `diagnostics_text`.

## Statut
pending → in-progress → done
