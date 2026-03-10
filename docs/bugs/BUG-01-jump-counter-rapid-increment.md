# BUG-01 — Compteur de sauts s'incrémente rapidement sans navigation

**Statut :** En attente de reproduction
**Priorité :** À confirmer
**Composant suspecté :** WebView / compteur de sauts (GameScreen)

---

## Occurrences

### Occurrence 1 — 2026-03-10

**Contexte :**
- Langue : FR
- Mode : Difficile
- Type de partie : Nouvelle partie (pas une reprise)
- Moment : Au milieu du parcours

**Symptômes observés :**
1. Au changement de page, le compteur de sauts a commencé à s'incrémenter rapidement tout seul
2. Le titre affiché changeait entre la page précédente et la page actuelle
3. Au clic suivant sur un lien, le comportement anormal s'est arrêté
4. Une fois arrivé sur la page cible, la victoire ne s'est pas déclenchée

**Fréquence :** Arrivé une seule fois, ne s'est pas reproduit lors de la session suivante.

---

## Hypothèses en attente de confirmation

- Double-attachement du listener `onNavigationStateChange` sur la WebView (les articles peu populaires du mode difficile peuvent avoir une structure HTML différente)
- Événements de navigation multiples émis pour un seul changement de page

---

## À faire avant investigation

- Attendre au moins 2 reproductions supplémentaires avec contexte
- Noter si ça se reproduit en mode normal ou uniquement en mode difficile
- Noter si ça se reproduit sur un article spécifique (titre de l'article en cours)
