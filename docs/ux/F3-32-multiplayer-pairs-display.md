# Spécifications visuelles — F3-32 — Multijoueur : paires par manche

**Auteur :** Benjamin — UX/UI Designer
**Date :** 2026-03-15
**Story liée :** F3-32
**Dépend de :** F3-12 (MultiplayerSetupScreen existant), specs Maxime `docs/specs/F3-34-F3-32-F3-33-vague-E.md`
**Écrans concernés :** MultiplayerSetupScreen (modification), MultiplayerRoundTransitionScreen (modification mineure)

---

## Contexte de la modification

`MultiplayerSetupScreen` affichait jusqu'ici un unique bloc paire d'articles passif (fond `#F8FAFC`, labels "De :" / "Vers :"), chargé via `useRandomPair`. F3-32 remplace ce bloc par N blocs `PairSlot` indépendants — un par manche configurée — chacun avec son propre état de chargement et son bouton de renouvellement.

Le layout général de `MultiplayerSetupScreen` change d'ordre :
- **Avant (F3-12) :** JOUEURS → paire unique → bouton Commencer
- **Après (F3-32) :** JOUEURS → MANCHES (stepper) → PAIRES (N slots) → bouton Commencer

---

## Composant : PairSlot

### Objectif

Afficher la paire d'articles d'une manche donnée, avec renouvellement manuel individuel.

### Layout (ASCII) — état success

```
┌──────────────────────────────────────┐  marginHorizontal:16 marginBottom:8
│  MANCHE 1                            │  Caption Bold 13px #64748B uppercase
│                                      │  letterSpacing:0.8 marginBottom:6
│  ┌────────────────────────────────┐  │  Bloc fond #F8FAFC
│  │  De :   Impressionnisme        │  │  borderRadius:8 padding:12
│  │  Vers :  Musée du Louvre       │  │
│  │                                │  │
│  │  ┌──────────────────────────┐  │  │  Bouton Renouveler
│  │  │  ⟳  Renouveler          │  │  │  h:36pt — outline #2563EB
│  │  └──────────────────────────┘  │  │  marginTop:10
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

### Layout (ASCII) — état loading

```
┌──────────────────────────────────────┐  marginHorizontal:16 marginBottom:8
│  MANCHE 1                            │  Caption Bold 13px #64748B uppercase
│                                      │
│  ┌────────────────────────────────┐  │  Bloc fond #F8FAFC
│  │  ████████████████████          │  │  Skeleton ligne 1
│  │  h:14, w:70%, #E2E8F0          │  │  borderRadius:4 marginBottom:8
│  │  ████████████████              │  │  Skeleton ligne 2
│  │  h:14, w:55%, #E2E8F0          │  │  borderRadius:4
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
  (Bouton Renouveler absent en loading)
```

### Layout (ASCII) — état error

```
┌──────────────────────────────────────┐  marginHorizontal:16 marginBottom:8
│  MANCHE 1                            │  Caption Bold 13px #64748B uppercase
│                                      │
│  ┌────────────────────────────────┐  │  Bloc fond #F8FAFC
│  │  Impossible de charger         │  │  Regular 14px #E11D48
│  │  la paire. Vérifiez votre      │  │
│  │  connexion.                    │  │
│  │                                │  │
│  │  ┌──────────────────────────┐  │  │  Bouton Réessayer
│  │  │      Réessayer           │  │  │  h:36pt — outline #2563EB
│  │  └──────────────────────────┘  │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

### Composants du PairSlot

- **LabelManche** — `Text` Caption Bold 13px `#64748B`. Contenu "MANCHE [N]" en majuscules. `letterSpacing: 0.8`. `marginBottom: 6pt`. `marginHorizontal: 0` (il est déjà dans le conteneur avec `marginHorizontal: 16`).

- **ContainerBloc** — `View`. Fond `#F8FAFC`, `borderRadius: 8pt`, `padding: 12pt`. Contient le contenu selon l'état.

- **SkeletonLigne** (loading) — `View`. `height: 14pt`, `backgroundColor: '#E2E8F0'`, `borderRadius: 4pt`. Deux lignes : première à 70% de largeur, seconde à 55%. `marginBottom: 8pt` entre les deux. `accessibilityElementsHidden={true}`.

- **LigneDe** (success) — `Text` Regular 14px. Label "De : " en `#64748B`, titre en Bold 14px `#1E293B` sur la même ligne. `numberOfLines={2}` pour les titres longs. `marginBottom: 4pt`.

- **LigneVers** (success) — identique à LigneDe. "Vers : " label + titre destination. `marginBottom: 0`.

- **BoutonRenouveler** (success uniquement) — `TouchableOpacity`. Hauteur 36pt, fond `#FFFFFF`, `borderWidth: 1pt`, `borderColor: '#2563EB'`, `borderRadius: 6pt`, `marginTop: 10pt`. Texte "⟳ Renouveler" Regular 14px `#2563EB`. Centré. `disabled` quand le slot repasse en `loading` après tap (évite les doubles taps). `accessibilityState={{ disabled: true }}` pendant le rechargement.

  **Note sur la taille du bouton :** 36pt de hauteur est en dessous du minimum de 44pt. Compensé par un `hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}` pour atteindre la zone tactile de 44pt sans impacter le layout visuel.

- **TexteErreur** (error) — `Text` Regular 14px `#E11D48`. `marginBottom: 8pt`. Message fixe : "Impossible de charger la paire. Vérifiez votre connexion."

- **BoutonRéessayer** (error) — même géométrie que BoutonRenouveler (h:36pt, outline `#2563EB`, `hitSlop` identique). Texte "Réessayer" Regular 14px `#2563EB`. Appelle `refresh()` du hook interne.

### États du PairSlot

- **Loading :** Deux lignes skeleton (70% + 55%), pas de bouton Renouveler. `ContainerBloc` fond `#F8FAFC`. Skeleton `accessibilityElementsHidden={true}`.

- **Success :** LigneDe + LigneVers + BoutonRenouveler. Bouton actif sauf pendant un rechargement (tap → disabled=true jusqu'à résolution).

- **Error :** Message d'erreur + BoutonRéessayer. Pas de lignes De/Vers.

### Accessibilité du PairSlot

- [ ] `accessibilityElementsHidden={true}` sur les skeletons en loading
- [ ] `AccessibilityInfo.announceForAccessibility("Manche [N] : paire chargée. De [titre départ], vers [titre destination].")` quand le slot passe de loading à success
- [ ] `AccessibilityInfo.announceForAccessibility("Manche [N] : erreur de chargement.")` quand le slot passe à error
- [ ] `accessibilityLabel="Renouveler la paire de la manche [N]"` sur BoutonRenouveler — pas juste "Renouveler"
- [ ] `accessibilityRole="button"` sur BoutonRenouveler et BoutonRéessayer
- [ ] `accessibilityState={{ disabled: true }}` sur BoutonRenouveler pendant le rechargement
- [ ] `accessibilityLabel="Réessayer de charger la paire de la manche [N]"` sur BoutonRéessayer
- [ ] Contraste message erreur `#E11D48` sur `#F8FAFC` : 4.4:1 — légèrement en dessous de 4.5:1. **Correction : utiliser `#FFFFFF` comme fond du ContainerBloc en état error**, ou déplacer le message hors du ContainerBloc sur fond `#FFFFFF` (contraste `#E11D48`/`#FFFFFF` = 4.6:1). Voir Notes pour Laurent.
- [ ] Contraste labels "De :" / "Vers :" `#64748B` sur `#F8FAFC` : 4.5:1 — conforme limite. Mesure exacte token `#64748B` (#6, #4, #7, #4, #8, #B) / `#F8FAFC` : 4.5:1 — conforme.
- [ ] Contraste titres `#1E293B` sur `#F8FAFC` : 15.5:1 — conforme
- [ ] Contraste texte BoutonRenouveler `#2563EB` sur `#FFFFFF` : 4.9:1 — conforme
- [ ] Zone tactile BoutonRenouveler : 36pt visuel + hitSlop → 44pt effectif — conforme
- [ ] Informations de paire non transmises par la couleur seule — texte "De :" / "Vers :" explicite

---

## Écran : MultiplayerSetupScreen (mise à jour F3-32)

### Objectif

Permettre à un groupe de configurer les joueurs, le nombre de manches, et valider toutes les paires avant de commencer.

### Layout global mis à jour (ASCII)

```
┌─────────────────────────────────────┐  [FIXED - SafeAreaView top]
│  ←   Multijoueur                   │  Header 64pt — fond #FFFFFF
├─────────────────────────────────────┤  Bordure #E2E8F0 1pt
│                                     │  [SCROLL - KeyboardAwareScrollView]
│  JOUEURS                            │  Caption Bold 13px #64748B uppercase
│                                     │  paddingTop:20 paddingH:16
│  ┌─────────────────────────────┐   │  PlayerRow — h:52pt (inchangé F3-12)
│  │  👤  Joueur 1          [✕]  │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │  👤  Joueur 2          [✕]  │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │  Bouton Ajouter un joueur (inchangé)
│  │  +  Ajouter un joueur       │   │  h:44pt, outline dashed #2563EB
│  └─────────────────────────────┘   │
│                                     │
│  ─────────────────────────────     │  Séparateur #E2E8F0 1pt marginV:16
│                                     │
│  MANCHES                            │  Caption Bold 13px #64748B uppercase
│                                     │  paddingH:16 marginBottom:8
│  ┌─────────────────────────────┐   │  Stepper manches (inchangé F3-28)
│  │  −   [  3  ]   +            │   │  h:44pt — valeur Bold 17px #1E293B
│  └─────────────────────────────┘   │
│                                     │
│  ─────────────────────────────     │  Séparateur #E2E8F0 1pt marginV:16
│                                     │
│  PAIRES                             │  Caption Bold 13px #64748B uppercase
│                                     │  paddingH:16 marginBottom:8
│                                     │
│  MANCHE 1                           │  LabelManche — Bold 13px #64748B
│  ┌─────────────────────────────┐   │  ContainerBloc — fond #F8FAFC
│  │  De :   [titre départ]      │   │  borderRadius:8 padding:12
│  │  Vers :  [titre cible]      │   │  marginH:16 marginBottom:8
│  │  ┌──────────────────────┐   │   │
│  │  │  ⟳  Renouveler      │   │   │
│  │  └──────────────────────┘   │   │
│  └─────────────────────────────┘   │
│                                     │
│  MANCHE 2                           │
│  ┌─────────────────────────────┐   │  (même structure PairSlot)
│  │  ████████████████           │   │  Skeleton si en cours de chargement
│  │  ████████████               │   │
│  └─────────────────────────────┘   │
│                                     │
│  MANCHE 3                           │
│  ┌─────────────────────────────┐   │
│  │  De :   [titre départ]      │   │
│  │  Vers :  [titre cible]      │   │
│  │  ┌──────────────────────┐   │   │
│  │  │  ⟳  Renouveler      │   │   │
│  │  └──────────────────────┘   │   │
│  └─────────────────────────────┘   │
│                                     │
│  [padding bottom 24pt]              │
└─────────────────────────────────────┘  [FIXED - Zone bouton]
│                                     │  Bordure top #E2E8F0 1pt
│  ┌─────────────────────────────┐   │  paddingH:16 paddingV:12
│  │         Commencer           │   │  h:52pt — fond #2563EB ou #E2E8F0
│  └─────────────────────────────┘   │  (selon état)
└─────────────────────────────────────┘  SafeAreaView bottom
```

**Cas 5 manches (scroll long) :**

```
┌─────────────────────────────────────┐
│  PAIRES                             │
│                                     │
│  MANCHE 1   [slot chargé]           │
│  MANCHE 2   [slot chargé]           │
│  MANCHE 3   [slot en loading...]    │
│  MANCHE 4   [slot en loading...]    │
│  MANCHE 5   [slot en loading...]    │  ← visible par scroll
│                                     │
│  [padding bottom 24pt]              │
└─────────────────────────────────────┘
```

Les 5 slots sont rendus dans le ScrollView existant — pas de liste virtualisée, pas de hauteur fixe imposée. Le ScrollView absorbe naturellement la hauteur totale. La `KeyboardAwareScrollView` gère le clavier en cas de focus sur un `TextInput` de joueur.

### Comportement du BoutonCommencer selon l'état des paires

```
┌──────────────────────────────────────────────────────────────┐
│  Condition d'activation du BoutonCommencer                   │
│                                                              │
│  Actif (fond #2563EB) UNIQUEMENT si :                        │
│    • Tous les noms de joueurs sont remplis (non vides)        │
│    • Au moins 2 joueurs                                       │
│    • TOUTES les paires sont à l'état success (aucun null)    │
│                                                              │
│  Désactivé (fond #E2E8F0, texte #94A3B8) si :               │
│    • Au moins une paire en loading OU en error               │
│    • OU un nom vide                                          │
│    • OU moins de 2 joueurs                                   │
│                                                              │
│  Message sous le bouton quand des paires chargent encore :  │
│  "Chargement des paires en cours..."                         │
│  Caption 13px #64748B — centré — marginTop:6                │
└──────────────────────────────────────────────────────────────┘
```

Le message "Chargement des paires en cours..." est visible uniquement quand `isStartDisabled === true` ET qu'au moins un slot est en `loading`. Il disparaît dès que toutes les paires sont soit success soit error.

### Composants (delta F3-12 → F3-32)

Les composants de la zone JOUEURS et du header sont identiques à F3-12. Seule la zone paire change.

- **LabelSection "PAIRES"** — même style que les autres labels de section de l'écran ("JOUEURS", "MANCHES") : Caption Bold 13px `#64748B` uppercase, `letterSpacing: 0.8`, `paddingHorizontal: 16pt`, `marginBottom: 8pt`.

- **PairSlot** (×N) — composant décrit ci-dessus. Rendu via `Array.from({ length: roundCount })`. `marginHorizontal: 16pt`, `marginBottom: 8pt` entre chaque slot.

- **MessageChargement** — `Text` Caption 13px `#64748B`, centré, `marginTop: 6pt`. Conditionnel (voir ci-dessus).

- **BoutonCommencer** — condition d'activation étendue : `isStartDisabled = hasEmptyName || players.length < 2 || hasUnreadyPair`. Style inchangé (fond `#2563EB` actif, fond `#E2E8F0` désactivé).

### États de l'écran

- **Default (ouverture) :** Section JOUEURS avec 2 PlayerRows vides, stepper MANCHES à 1, section PAIRES avec 1 PairSlot en loading. BoutonCommencer désactivé + message "Chargement des paires en cours...".

- **En cours de configuration :** L'utilisateur peut modifier les noms pendant que les paires chargent. Le stepper peut être modifié — un nouveau slot apparaît instantanément en loading si le nombre de manches augmente. La réduction du nombre de manches supprime les slots excédentaires (les slots existants < nouveau roundCount conservent leur état).

- **Prêt :** Tous les slots à success, tous les noms remplis, 2 joueurs minimum. BoutonCommencer actif, message disparu.

- **Erreur partielle :** Un ou plusieurs slots en error. BoutonCommencer désactivé. Les slots en error affichent leur bouton Réessayer individuel. Le message "Chargement des paires en cours..." est remplacé par l'absence de message (l'erreur dans le slot est suffisamment explicite).

- **Validation échouée :** Identique à F3-12 — bordure rouge sur les TextInput vides, message en Caption `#E11D48`.

### Accessibilité

- [ ] `accessibilityLabel="Section Paires d'articles"` sur le `View` contenant le label "PAIRES" et les PairSlots — permet à VoiceOver de distinguer les sections
- [ ] Ordre de lecture VoiceOver : Header → JOUEURS (PlayerRows) → BoutonAjouter → MANCHES (stepper) → PAIRES (PairSlots 1..N) → BoutonCommencer
- [ ] Chaque PairSlot annonce son état via `AccessibilityInfo.announceForAccessibility` (voir section Accessibilité du PairSlot ci-dessus)
- [ ] `accessibilityLabel="Commencer la partie"` sur BoutonCommencer — inchangé de F3-12
- [ ] `accessibilityState={{ disabled: true }}` sur BoutonCommencer quand inactif — inchangé
- [ ] MessageChargement : `accessibilityLiveRegion="polite"` pour annoncer quand le texte apparaît ou disparaît — les screen readers n'ont pas besoin d'annonce agressive ici
- [ ] Stepper manches : `accessibilityLabel` mis à jour sur le bouton "−" et "+" avec "Réduire le nombre de manches — [N] actuellement" / "Augmenter le nombre de manches — [N] actuellement"
- [ ] Contraste label "PAIRES" `#64748B` sur `#FFFFFF` : 4.6:1 — conforme
- [ ] Contraste label "MANCHE N" `#64748B` sur `#FFFFFF` : 4.6:1 — conforme
- [ ] Zones tactiles : BoutonRenouveler 36pt visuel + hitSlop → 44pt effectif, BoutonCommencer 52pt — conformes

### Notes pour Laurent

- Le composant `PairSlot` est un composant React interne à `MultiplayerSetupScreen.tsx`. Il n'a pas besoin d'être dans un fichier séparé. Maxime le définit comme `function PairSlot({ roundNumber, roundIndex, onPairReady, onPairNotReady }: PairSlotProps)` — voir les specs techniques pour la signature complète.

- Les labels "MANCHE 1", "MANCHE 2", etc. dans le PairSlot sont des labels de section **en dehors** du `ContainerBloc` fond `#F8FAFC`. Le bloc gris clair ne contient que le contenu de la paire (De/Vers ou skeleton ou erreur) et le bouton Renouveler/Réessayer. Cette séparation visuelle est intentionnelle : le label identifie la manche, le bloc contient la paire.

- Le BoutonRenouveler est visuellement plus petit (h:36pt) que les autres boutons du projet car il est dans un contexte dense (N blocs empilés). Compenser avec `hitSlop`. Ne pas mettre ce bouton à 44pt visuels — cela rendrait les blocs trop hauts sur les écrans à 5 manches.

- L'erreur de contraste signalée pour `#E11D48` sur `#F8FAFC` (4.4:1 vs 4.5:1 requis) doit être résolue par Laurent en remplaçant le fond du ContainerBloc par `#FFFFFF` uniquement en état error. En état loading et success, le fond `#F8FAFC` est conservé.

- Quand `roundCount` diminue via le stepper, les slots supprimés sont ceux de la fin (index >= nouveau roundCount). Les slots restants conservent leur état — pas de rechargement des paires déjà chargées.

- Le message "Chargement des paires en cours..." doit disparaître proprement quand toutes les paires sont résolues (success ou error). Ne pas afficher ce message en état error — le bouton Réessayer dans chaque slot est l'indication suffisante.

- MultiplayerRoundTransitionScreen : la modification est purement logique (lire `allPairs[currentRound]` au lieu d'appeler `useRandomPair`). Aucun changement visuel sur cet écran — il affiche toujours son `ActivityIndicator` pendant la fraction de seconde avant le `useEffect`. Aucune spec visuelle supplémentaire requise pour cette modification.

---

## Tokens confirmés (pas de nouveaux tokens)

Tous les tokens utilisés dans ces specs sont déjà documentés dans le design system :

| Token | Valeur | Usage dans F3-32 |
|-------|--------|-----------------|
| Surface alt | `#F8FAFC` | ContainerBloc fond (loading, success) |
| Surface placeholder | `#F1F5F9` | — (non utilisé directement) |
| Border | `#E2E8F0` | Skeleton background, séparateurs |
| Text Secondary | `#64748B` | Labels "De :", "Vers :", labels section, MessageChargement |
| Text Primary | `#1E293B` | Titres articles dans les paires |
| Primary | `#2563EB` | BoutonRenouveler, BoutonRéessayer, BoutonCommencer actif |
| Error | `#E11D48` | TexteErreur |
| Disabled BG | `#E2E8F0` | BoutonCommencer désactivé |
| Text Disabled | `#94A3B8` | Texte BoutonCommencer désactivé |
| Background | `#FFFFFF` | ContainerBloc fond en état error (correction contraste) |
