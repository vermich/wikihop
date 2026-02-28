---
id: M-08
title: Service Wikipedia API (client mobile)
phase: 2-MVP
priority: Must
agents: [Frontend Dev, Backend Dev]
status: pending
created: 2026-02-28
completed:
---

# M-08 — Service Wikipedia API (client mobile)

## User Story
En tant que développeur, je veux un service centralisé pour appeler l'API Wikipedia, afin de gérer les erreurs, le cache et les timeouts de manière cohérente.

## Critères d'acceptance
- [ ] Service `WikipediaService` dans `apps/mobile/src/services/`
- [ ] Méthodes : `getArticleSummary(title)`, `getArticleContent(title)`, `extractInternalLinks(html)`
- [ ] Timeout configuré (ex : 10 secondes) avec message d'erreur explicite
- [ ] Cache en mémoire des articles déjà chargés pendant la session (évite les appels redondants)
- [ ] Les appels respectent le `User-Agent` recommandé par Wikimedia (`WikiHop/1.0`)
- [ ] Les erreurs 404 (article non trouvé) sont distinguées des erreurs réseau

## Notes de réalisation
<!-- Rempli par l'agent lors de l'implémentation -->

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
