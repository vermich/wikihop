---
id: F3-03
title: Partage du résultat
phase: 3-Features
priority: Must
agents: [Frontend Dev]
status: in-progress
created: 2026-02-28
completed:
---

# F3-03 — Partage du résultat

## User Story
En tant que joueur fier de mon score, je veux partager mon résultat avec mes amis, afin de les inviter à essayer de faire mieux.

## Critères d'acceptance
- [x] Un bouton "Partager" est disponible sur l'écran de résultat
- [x] Le partage utilise l'API native de partage du système (Share API de React Native)
- [x] Le texte partagé contient : articles de départ et destination, nombre de sauts, temps, et un lien vers l'app
- [x] Le format est lisible et engageant sans être encombrant
- [x] Aucune donnée personnelle n'est incluse dans le message partagé
- [x] Le partage fonctionne sur iOS et Android

## Notes de réalisation

### Spécifications techniques — Maxime (Tech Lead) — 2026-03-08

**Story concernée :** F3-03 — Partage du résultat
**Fichier cible :** `apps/mobile/src/screens/VictoryScreen.tsx`
**Fichier de tests :** `apps/mobile/src/__tests__/VictoryScreen.test.ts` (ou fichier dédié `share.utils.test.ts`)

---

#### 1. Périmètre

**Dans scope :**
- Ajout d'un bouton "Partager" dans la zone sticky de `VictoryScreen`
- Fonction pure `buildShareMessage` (dans `VictoryScreen.tsx`, exportée)
- Gestion d'erreur de `Share.share()`

**Hors scope :**
- Deep link vers l'app (pas d'URL trackée en Phase 3)
- Partage d'image ou de capture d'écran
- Analytics de partage

---

#### 2. Import exact

```typescript
import { Share } from 'react-native';
```

`Share` est une API React Native core — pas de package tiers à installer. L'import doit être ajouté dans le bloc d'imports existant de `VictoryScreen.tsx`.

---

#### 3. Fonction pure à implémenter — TDD strict obligatoire

```typescript
/**
 * Construit le message texte à partager depuis les stats de victoire.
 * Fonction pure — pas d'effets de bord.
 *
 * @param startTitle   - Titre de l'article de départ
 * @param targetTitle  - Titre de l'article destination
 * @param jumps        - Nombre de sauts effectués
 * @param elapsedSeconds - Durée de la partie en secondes
 */
export function buildShareMessage(
  startTitle: string,
  targetTitle: string,
  jumps: number,
  elapsedSeconds: number,
): string
```

**Format exact du message (à respecter à la virgule près pour les tests) :**

```
WikiHop — J'ai relié "[startTitle]" à "[targetTitle]"
en [jumps] saut[s] et [formatElapsed(elapsedSeconds)] !

Sauras-tu faire mieux ?
```

Règle de pluriel : `saut` si `jumps === 1`, `sauts` si `jumps > 1`.

**Note importante :** `buildShareMessage` peut et doit réutiliser `formatElapsed` (déjà exportée depuis `VictoryScreen.tsx`). Les deux fonctions sont dans le même fichier.

---

#### 4. Cas de test TDD obligatoires — écrire les tests AVANT l'implémentation

Les tests doivent être écrits et committés avant le code de `buildShareMessage`.

| Cas | `jumps` | `elapsedSeconds` | Chaîne attendue (extrait) |
|-----|---------|-----------------|--------------------------|
| Singulier (1 saut) | 1 | 45 | `"en 1 saut et 45 s !"` |
| Pluriel | 3 | 125 | `"en 3 sauts et 2 m 05 s !"` |
| Zéro saut | 0 | 10 | `"en 0 saut et 10 s !"` — 0 est singulier |
| Titres avec guillemets | 2 | 60 | Vérifier que les titres sont bien entre `"..."` |
| Durée longue | 5 | 3661 | `"en 5 sauts et 61 m 01 s !"` |

Test supplémentaire (snapshot ou vérification complète sur un cas représentatif) : vérifier que le message commence bien par `"WikiHop — "` et se termine bien par `"Sauras-tu faire mieux ?"`.

---

#### 5. Intégration dans VictoryScreen — position et style du bouton

Le bouton "Partager" s'insère dans la **zone sticky** (`stickyButtons`) de `VictoryScreen`, **entre** la ligne de boutons primaires (`primaryButtonsRow`) et le bouton "Voir l'historique".

Layout cible de la zone sticky après modification :
```
[Nouvelle partie]  [Rejouer]
[Partager]
[Voir l'historique]
```

Le bouton "Partager" est un bouton secondaire de style outline, cohérent avec le bouton "Rejouer" existant :
- `height: 48`
- `borderWidth: 1`, `borderColor: '#2563EB'`, `borderRadius: 12`
- `backgroundColor: '#FFFFFF'`
- `marginBottom: 8`
- Texte : `fontSize: 16`, `fontWeight: 'bold'`, `color: '#2563EB'`

**Accessibilité :**
```typescript
accessibilityLabel="Partager mon résultat"
accessibilityRole="button"
```

---

#### 6. Handler handleShare — gestion d'erreur

```typescript
const handleShare = useCallback(async (): Promise<void> => {
  if (stats === null) return;

  const message = buildShareMessage(
    stats.startTitle,
    stats.targetTitle,
    stats.jumps,
    stats.elapsedSeconds,
  );

  try {
    await Share.share({ message });
  } catch (e: unknown) {
    // L'utilisateur a fermé la feuille de partage ou une erreur OS est survenue.
    // Comportement attendu : silencieux — pas d'Alert, pas de log console.
    // void e : absorption intentionnelle — l'annulation n'est pas une erreur utilisateur.
    void e;
  }
}, [stats]);
```

**Point de vigilance :** `Share.share()` lève une exception si l'utilisateur annule sur certaines versions Android. Il ne faut pas afficher d'erreur dans ce cas. Le `try/catch` absorbe silencieusement.

**Pattern `void e`** : accepté et documenté (point de vigilance récurrent #13 de l'équipe) — l'absorption est intentionnelle et commentée.

Le handler est appelé depuis le JSX avec : `onPress={() => { void handleShare(); }}`

---

#### 7. Critères de qualité (code review)

- [ ] `buildShareMessage` est exportée et testée avant implémentation (TDD)
- [ ] Tous les cas de test du tableau ci-dessus passent
- [ ] Le catch absorbe silencieusement avec `void e` commenté
- [ ] `handleShare` est dans `useCallback` avec `[stats]` en deps
- [ ] Le bouton "Partager" respecte le style outline décrit
- [ ] `tsc --noEmit` passe sans erreur
- [ ] Aucun `any` non justifié

---

#### 8. Points de vigilance

- **Pluriel de "saut"** : `jumps === 1` → `"saut"`, sinon `"sauts"`. Le cas `jumps === 0` donne `"saut"` (singulier).
- **`Share.share` ne retourne pas `dismissed`** de façon fiable sur tous les appareils — ne pas brancher de logique sur le résultat de la promesse.
- **Stats nulles** : le guard `if (stats === null) return` est indispensable car `VictoryScreen` peut rendre avec `stats === null` pendant le guard de navigation (useEffect redirect). Le bouton ne doit pas crasher dans ce cas.

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
