# Spécifications visuelles — F3-44 — Bouton "Historique des parties" sur HomeScreen

**Auteur :** Benjamin (UX/UI)
**Date :** 2026-03-20
**Story :** docs/stories/phase-3/F3-44-history-link-to-button-home.md

---

## Écran : HomeScreen — Zone boutons secondaires

### Objectif
Le joueur accède à l'historique de ses parties via un bouton visuellement distinct des liens texte secondaires, signalant une navigation principale plutôt qu'un lien accessoire.

### Contexte de la modification

**Avant F3-44 :** "Historique des parties" était un `secondaryTextButton` — texte centré 16px `#64748B`, hauteur 44pt, même style que "Soutenir Wikipedia" et "À propos". Action tertiaire visuellement indifférenciée.

**Après F3-44 :** Le bouton "Historique des parties" adopte le style **outline secondaire** (même style que le bouton Multijoueur existant), le distinguant clairement des liens texte purs. Les 3 liens texte secondaires ("Soutenir Wikipedia", "Recharger les articles", "À propos") deviennent une ligne de 3 boutons compacts (F3-45 — spécifié séparément).

---

### Hiérarchie visuelle de la zone boutons — après F3-44 + F3-45

```
┌─────────────────────────────────────────────────────┐
│  [Jouer]           (bleu plein, 52pt)               │
│                                                     │
│  [Défi du jour]    (ambre, 52pt)                    │
│                                                     │
│  [Multijoueur]     (outline bleu, 52pt)             │
│                                                     │
│  [Historique des parties]  (outline bleu, 52pt)     │  ← F3-44
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  [♥ Soutenir] [↺ Recharger] [? À propos]           │  ← F3-45
└─────────────────────────────────────────────────────┘
```

---

### Composants

- **HistoryButton** — `TouchableOpacity` style outline bleu :
  - Hauteur : `52pt`
  - `borderWidth: 1`, `borderColor: '#2563EB'`
  - `backgroundColor: '#FFFFFF'`
  - `borderRadius: 12`
  - `alignItems: 'center'`, `justifyContent: 'center'`
  - `marginTop: 12` (même espacement que `multiplayerButton`)
  - Texte : `fontSize: 16`, `fontWeight: 'bold'`, `color: '#2563EB'`
  - `accessibilityRole="button"`
  - `accessibilityLabel` : chaîne i18n `home.history_button_a11y`

- **État pressé :** `activeOpacity: 0.8` (standard) + fond `#EFF6FF` — cohérent avec le pattern outline pressé établi dans le design system.

- **Suppression :** Le `secondaryTextButton` avec label `home.history_link` est supprimé. Son séparateur (`secondaryLinksSeparator`) se décale pour séparer les 3 boutons compacts de F3-45 (voir F3-45).

---

### Layout (ASCII) — Zone boutons complète après F3-44

```
┌─────────────────────────────────────────────────────┐  [SCROLL]
│  paddingHorizontal: 16                              │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  Jouer une partie             (52pt bleu)   │   │
│  └─────────────────────────────────────────────┘   │
│                          marginTop: 12              │
│  ┌─────────────────────────────────────────────┐   │
│  │  Défi du jour                 (52pt ambre)  │   │
│  └─────────────────────────────────────────────┘   │
│                          marginTop: 12              │
│  ┌─────────────────────────────────────────────┐   │
│  │  Multijoueur           (52pt outline bleu)  │   │
│  └─────────────────────────────────────────────┘   │
│                          marginTop: 12              │
│  ┌─────────────────────────────────────────────┐   │
│  │  Historique des parties (52pt outline bleu) │   │  ← F3-44
│  └─────────────────────────────────────────────┘   │
│                          marginTop: 16              │
│  ─────────────────── séparateur #E2E8F0 ─────────  │
│                          marginBottom: 0            │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐     │
│  │  ♥ Wiki  │  │  ↺ Recharger │  │  ? Infos │     │  ← F3-45
│  └──────────┘  └──────────────┘  └──────────┘     │
│                          paddingBottom: 24          │
└─────────────────────────────────────────────────────┘
```

---

### États

- **Default :** Bouton outline bleu `#2563EB` sur fond blanc, texte Bold 16px `#2563EB`.
- **Loading (état skeleton):** Présent dans le `renderContent()` loading — le bouton Historique doit être présent et actif même pendant le chargement des articles (il ne dépend pas de la paire chargée). Conserver `disabled={false}` dans les deux branches `loading` et `success` de `renderContent()`.
- **Error :** L'état error de HomeScreen affiche uniquement le message d'erreur + Réessayer. Le bouton Historique n'est pas affiché dans l'état error (comportement inchangé — error n'est pas dans le `buttonsContainer`).
- **Empty :** Non applicable.
- **Pressé :** `activeOpacity: 0.8`, fond `#EFF6FF`.

---

### Accessibilité

- [ ] `accessibilityLabel` : `"Voir l'historique des parties"` — chaîne i18n `home.history_button_a11y` (à distinguer de l'ancienne `home.history_a11y` si elle était "Accéder à l'historique" — vérifier et unifier)
- [ ] `accessibilityRole="button"` — ce n'est plus un lien, c'est une navigation intra-app : `button` est correct
- [ ] Contraste texte `#2563EB` sur `#FFFFFF` : 4.6:1 — conforme WCAG AA
- [ ] Zone tactile 52×(largeur pleine) — dépasse largement 44pt
- [ ] Pas d'`accessibilityState` disabled (bouton toujours actif)
- [ ] Ordre de lecture VoiceOver : après Multijoueur, avant la zone séparateur + boutons compacts F3-45 — cohérent avec l'ordre JSX

---

### Notes pour Laurent

1. **Style réutilisé :** Le style `multiplayerButton` existant est identique à ce que doit être `historyButton`. Créer un style dédié `historyButton` avec les mêmes valeurs (ne pas réutiliser `multiplayerButton` par référence — styles séparés pour maintenabilité). Valeurs : `height: 52, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#2563EB', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 12`.

2. **Style texte réutilisé :** Le style `multiplayerButtonText` est identique. Créer `historyButtonText` : `fontSize: 16, fontWeight: 'bold', color: '#2563EB'`.

3. **Présence dans les deux branches renderContent :** Le bouton doit être présent dans la branche `loading` et la branche `success` de `renderContent()`. Dans la branche `loading`, ne pas le désactiver — l'accès à l'historique ne dépend pas du chargement des articles.

4. **Suppression :** Supprimer le `TouchableOpacity` avec style `secondaryTextButton` qui pointait vers `History`. Supprimer la traduction `home.history_link` si elle n'est plus utilisée ailleurs (vérifier d'abord avec grep).

5. **Clé de traduction :** Ajouter `home.history_button_a11y` dans tous les fichiers de locale (`fr`, `en`, `es`, `de`, `pt`, `it`, `nl`, `pl`). Libellé bouton visible : utiliser la clé existante ou en créer une. Suggestion : réutiliser `home.history_link` pour le texte visible (même libellé "Historique des parties") et créer `home.history_button_a11y` uniquement pour le label accessibilité.
