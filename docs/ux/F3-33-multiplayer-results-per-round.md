# Spécifications visuelles — F3-33 — Multijoueur : résultats par manche + médaille partagée

**Auteur :** Benjamin — UX/UI Designer
**Date :** 2026-03-15
**Story liée :** F3-33
**Dépend de :** F3-12 (MultiplayerResultScreen existant), F3-32 (signature `restartSession`), specs Maxime `docs/specs/F3-34-F3-32-F3-33-vague-E.md`
**Écrans concernés :** MultiplayerResultScreen (modification)

---

## Contexte de la modification

`MultiplayerResultScreen` affichait jusqu'ici uniquement le classement final (1 manche). F3-33 ajoute :

1. Une section "PAR MANCHE" conditionnelle (affichée uniquement si `roundHistory.length > 1`)
2. Le support de la médaille d'or partagée entre plusieurs joueurs ex-aequo (rang 1/1/3)

Le layout général de l'écran change avec l'ajout de la section PAR MANCHE entre le bloc paire jouée et le classement final.

---

## Composant : MancheSummaryRow

### Objectif

Résumer en une ligne les résultats de tous les joueurs pour une manche donnée.

### Layout (ASCII)

```
┌──────────────────────────────────────────────────────────────┐  minH:44pt
│                                                              │  paddingH:16 paddingV:8
│  Manche 1    [Alice ✓ 3]  [Bob ✗]  [Charlie ✓ 5]           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Zoom sur la structure interne :**

```
┌──────────────────────────────────────────────────────────────┐
│  ┌─────────┐  ┌───────────────────────────────────────────┐  │
│  │Manche 1 │  │  [Alice ✓ 3]  [Bob ✗]  [Charlie ✓ 5]     │  │
│  │ 13px    │  │  flexWrap: wrap   gap: 6   flex: 1        │  │
│  │ #64748B │  │                                           │  │
│  │ minW:72 │  └───────────────────────────────────────────┘  │
│  └─────────┘                                                  │
│  flexDirection: row   alignItems: center   paddingH:16        │
└──────────────────────────────────────────────────────────────┘
```

**Chip joueur — victoire :**

```
┌──────────────────────┐  borderRadius:4
│  Alice ✓ 3 sauts     │  fond #DCFCE7 — paddingH:8 paddingV:3
└──────────────────────┘  texte 12px Bold #16A34A
```

**Chip joueur — abandon :**

```
┌─────────┐  borderRadius:4
│  Bob ✗  │  fond #F1F5F9 — paddingH:8 paddingV:3
└─────────┘  texte 12px #64748B
```

**Chip joueur — victoire avec pluriel :**

```
"Alice ✓ 1 saut"   (singulier si jumps === 1)
"Bob ✓ 3 sauts"    (pluriel si jumps > 1 ou === 0)
```

**Cas 6 joueurs (wrap) :**

```
┌──────────────────────────────────────────────────────────────┐
│  Manche 2    [Alice ✓ 3]  [Bob ✗]  [Charlie ✓ 5]            │
│              [Diana ✓ 2]  [Emma ✗]  [Frank ✓ 7]             │
└──────────────────────────────────────────────────────────────┘
  Les chips passent à la ligne via flexWrap:'wrap'
  Le label "Manche 2" reste aligné flex-start (alignSelf:'flex-start')
  pour ne pas s'étirer sur plusieurs lignes
```

### Composants de MancheSummaryRow

- **LabelManche** — `Text` Regular 13px `#64748B`. Contenu "Manche [N]" (pas en majuscules ici — différent des labels de section). `minWidth: 72pt`. `alignSelf: 'flex-start'`. `marginTop: 2pt` pour aligner optiquement avec la première ligne de chips.

- **ZoneChips** — `View`. `flexDirection: 'row'`, `flexWrap: 'wrap'`, `gap: 6pt`, `flex: 1`.

- **ChipVictoire** — `View`. Fond `#DCFCE7`, `borderRadius: 4pt`, `paddingHorizontal: 8pt`, `paddingVertical: 3pt`. Contenu : `Text` Bold 12px `#16A34A`. Format : "[Nom] ✓ [N] saut(s)". `numberOfLines={1}` sur le Text — troncature par ellipsis si le nom est très long.

- **ChipAbandon** — `View`. Fond `#F1F5F9`, `borderRadius: 4pt`, `paddingHorizontal: 8pt`, `paddingVertical: 3pt`. Contenu : `Text` Regular 12px `#64748B`. Format : "[Nom] ✗". `numberOfLines={1}`.

- **SeparateurManche** — `View` `height: 1`, `backgroundColor: '#E2E8F0'`, `marginHorizontal: 0` (pleine largeur de la zone de contenu). Rendu entre chaque `MancheSummaryRow` par un `ItemSeparatorComponent` ou manuellement.

### Accessibilité de MancheSummaryRow

- [ ] `accessibilityLabel` sur le conteneur de la ligne : `"Manche [N] : [résumé textuel]"`. Exemple : `"Manche 1 : Alice victoire en 3 sauts, Bob abandonné, Charlie victoire en 5 sauts."` Le conteneur a `accessible={true}` — les enfants (LabelManche, ZoneChips, chips individuels) ont `accessible={false}`.
- [ ] Construction du résumé textuel dans le composant : parcourir `results` et construire la phrase avec gestion du singulier/pluriel.
- [ ] Contraste ChipVictoire `#16A34A` sur `#DCFCE7` : 3.1:1 — acceptable (Bold 12px, seuil 3:1 pour texte large Bold)
- [ ] Contraste ChipAbandon `#64748B` sur `#F1F5F9` : 4.6:1 — conforme
- [ ] Contraste LabelManche `#64748B` sur `#FFFFFF` : 4.6:1 — conforme
- [ ] Information de statut (victoire/abandon) transmise par icône (✓/✗) ET couleur — conforme

---

## Écran : MultiplayerResultScreen (mise à jour F3-33)

### Objectif

Afficher le classement final de la session multijoueur, avec détail optionnel par manche et support des ex-aequo au rang 1.

### Layout global mis à jour (ASCII) — session multi-manches

```
┌─────────────────────────────────────┐  [FIXED - SafeAreaView top]
│         Résultats                   │  Header 64pt — fond #FFFFFF
│                                     │  Pas de bouton retour (inchangé F3-12)
├─────────────────────────────────────┤  Bordure #E2E8F0 1pt
│                                     │  [SCROLL - ScrollView]
│  Paire jouée :                      │  Caption 13px #64748B — paddingTop:16
│  [Départ]  →  [Destination]         │  Regular 14px #1E293B — paddingH:16
│                                     │  (inchangé F3-12)
│  ─────────────────────────────     │  Séparateur #E2E8F0 1pt — marginH:16
│                                     │
│  PAR MANCHE                         │  Section conditionnelle
│                                     │  (visible si roundHistory.length > 1)
│  Manche 1  [Alice ✓3] [Bob ✗]      │  MancheSummaryRow — paddingH:16
│  ─────────────────────────────     │  Séparateur interne 1pt
│  Manche 2  [Alice ✗] [Bob ✓4]      │  MancheSummaryRow
│  ─────────────────────────────     │
│  Manche 3  [Alice ✓2] [Bob ✗]      │  MancheSummaryRow
│                                     │
│  ─────────────────────────────     │  Séparateur #E2E8F0 1pt — marginH:16
│                                     │  (après PAR MANCHE, avant CLASSEMENT FINAL)
│  CLASSEMENT FINAL                   │  Label section — Caption Bold 13px #64748B
│                                     │  uppercase letterSpacing:0.8 paddingH:16
│  ┌─────────────────────────────┐   │  PlayerResultRow rang 1
│  │ 🥇  Alice                   │   │  Fond #F0FDF4 + bandeau gauche vert 3pt
│  │     [VICTOIRE] 5 sauts· 3:01│   │  (inchangé F3-12 pour joueur unique rang 1)
│  └─────────────────────────────┘   │
│  ──────────────────────────────    │
│  ┌─────────────────────────────┐   │  PlayerResultRow rang 3 (pas rang 2)
│  │  3.  Bob                    │   │  Car 2 joueurs ex-aequo rang 1
│  │     [ABANDONNÉ] —           │   │
│  └─────────────────────────────┘   │
│                                     │
│  [padding bottom 24pt]              │
└─────────────────────────────────────┘  [FIXED - Zone boutons]
│                                     │  Bordure top #E2E8F0 1pt
│  ┌──────────────┐ ┌──────────────┐  │  paddingH:16 paddingV:12
│  │  Nouvelle    │ │   Rejouer    │  │  Nouvelle partie : h:52 fond #2563EB
│  │  partie      │ │              │  │  Rejouer : h:52 outline #2563EB
│  └──────────────┘ └──────────────┘  │  (boutons ajoutés par F3-29 / F3-12)
└─────────────────────────────────────┘  SafeAreaView bottom
```

**Note sur les boutons en bas :** La zone boutons reflète l'état actuel du code (`newGameButton` bleu plein à gauche, `replayButton` outline à droite). Ces boutons existent depuis F3-12/F3-29 et ne changent pas avec F3-33.

### Layout — session 1 manche (section PAR MANCHE absente)

```
┌─────────────────────────────────────┐
│         Résultats                   │  Header 64pt
├─────────────────────────────────────┤
│                                     │  [SCROLL]
│  Paire jouée :                      │
│  [Départ]  →  [Destination]         │
│                                     │
│  ─────────────────────────────     │  Séparateur
│                                     │
│  CLASSEMENT FINAL                   │  Label section — nouveau avec F3-33
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🥇  Sophie                  │   │
│  │     [VICTOIRE] 3 sauts· 1:23│   │
│  └─────────────────────────────┘   │
│  ──────────────────────────────    │
│  ┌─────────────────────────────┐   │
│  │ 🥈  Thomas                  │   │
│  │     [ABANDONNÉ] —           │   │
│  └─────────────────────────────┘   │
│  ...                                │
│                                     │
└─────────────────────────────────────┘
```

**Différence visible F3-12 → F3-33 en session 1 manche :** le label "CLASSEMENT FINAL" apparaît (il était absent dans F3-12). C'est la seule modification visible pour une session 1 manche.

### Médaille d'or partagée — spécification visuelle

**Règle d'affichage du rang :**

```
Rang calculé par rankPlayersGlobalWithRank() :
  • Deux joueurs ex-aequo rang 1 → les deux ont entry.rank === 1
  • Le joueur suivant a entry.rank === 3 (pas 2)
  • Jamais de rang 2 si deux joueurs partagent le rang 1
```

**Rendu des PlayerResultRow en cas de médaille partagée :**

```
┌──────────────────────────────────────────────────────────────┐
│  🥇  Alice          Bold 17px #1E293B                        │
│      [VICTOIRE]  5 sauts · 3:01   Caption 13px #64748B       │
└──────────────────────────────────────────────────────────────┘
  Fond #F0FDF4 + bandeau gauche #16A34A 3pt
  (entry.rank === 1 && entry.wins > 0)

┌──────────────────────────────────────────────────────────────┐
│  🥇  Charlie        Bold 17px #1E293B                        │
│      [VICTOIRE]  5 sauts · 3:01   Caption 13px #64748B       │
└──────────────────────────────────────────────────────────────┘
  Fond #F0FDF4 + bandeau gauche #16A34A 3pt
  (même rang 1, même mise en valeur visuelle)

┌──────────────────────────────────────────────────────────────┐
│   3.  Bob           Bold 17px #1E293B                        │
│      [ABANDONNÉ] —   Caption 13px #64748B                    │
└──────────────────────────────────────────────────────────────┘
  Fond #FFFFFF (pas de mise en valeur)
  "3." affiché car rank === 3 (pas "2.")
```

**Règle du fond vert pâle et bandeau gauche :** `entry.rank === 1 && entry.wins > 0`. Les deux joueurs ex-aequo rang 1 avec victoire affichent tous deux le fond `#F0FDF4` et le bandeau gauche vert `#16A34A` 3pt. Cette règle est inchangée de F3-12 — elle s'applique maintenant à plusieurs joueurs si plusieurs ont `rank === 1`.

**Affichage du rang dans ZoneRang :**

```
entry.rank === 1 → 🥇
entry.rank === 2 → 🥈
entry.rank === 3 → 🥉
entry.rank >= 4  → Text Bold 17px #94A3B8 "[rank]."
```

En cas d'ex-aequo 1/1/3 : deux 🥇, puis "3." (pas de 🥈, pas de "2."). En cas d'ex-aequo 2/2/4 : 🥇 pour le rang 1, deux 🥈, puis "4.".

**Cas particulier — ex-aequo rang 3 :**

```
🥇  Alice
🥈  Bob
🥉  Charlie  ← entry.rank === 3
🥉  Diana    ← entry.rank === 3 (ex-aequo)
 5. Emma     ← entry.rank === 5 (pas "4.")
```

Deux joueurs peuvent partager 🥉 pour la même raison que deux joueurs partagent 🥇.

### Composants (delta F3-12 → F3-33)

Les composants du header, BlocPaireJouee, ZoneBoutons, SeparateurRow et BoutonRetourAccueil sont identiques à F3-12.

- **LabelSectionPARMANCHE** — `Text` Caption Bold 13px `#64748B` uppercase, `letterSpacing: 0.8`. Contenu "PAR MANCHE". `paddingHorizontal: 16pt`. `marginTop: 16pt`, `marginBottom: 0`. Rendu conditionnel : `roundHistory.length > 1`.

- **MancheSummaryRow** (×N) — composant décrit ci-dessus. Rendu dans le ScrollView pour chaque manche de `roundHistory`. `paddingHorizontal: 16pt`, `paddingVertical: 8pt`. Séparateur horizontal entre chaque manche (1pt `#E2E8F0`, pleine largeur).

- **SeparateurApresParManche** — séparateur `#E2E8F0` 1pt avec `marginHorizontal: 16pt`, `marginVertical: 8pt`. Rendu uniquement si la section PAR MANCHE est visible (`roundHistory.length > 1`).

- **LabelSectionCLASSEMENTFINAL** — `Text` Caption Bold 13px `#64748B` uppercase, `letterSpacing: 0.8`. Contenu "CLASSEMENT FINAL". `paddingHorizontal: 16pt`. `marginTop: 16pt`, `marginBottom: 8pt`. Nouveau avec F3-33 — absent de F3-12.

- **PlayerResultRow** — modifié pour lire `entry.rank` au lieu de `index + 1`. Médaille et fond vert pâle basés sur `entry.rank`. AccessibilityLabel mis à jour pour tenir compte des rangs partagés (voir ci-dessous). Reste des specs visuelles identiques à F3-12.

### États de l'écran

- **Session 1 manche (default) :** Section PAR MANCHE absente. Label "CLASSEMENT FINAL" visible. Classement identique à F3-12 visuellement sauf pour l'ajout du label. Médaille d'or partagée si ex-aequo.

- **Session multi-manches :** Section PAR MANCHE visible entre le bloc paire et le classement final. N lignes MancheSummaryRow.

- **Ex-aequo rang 1 :** Deux (ou plus) PlayerResultRow avec 🥇 et fond `#F0FDF4` + bandeau gauche vert. Le joueur suivant affiche son rang réel (3, 4...).

- **Tous abandonnés :** Section PAR MANCHE affiche les chips d'abandon pour chaque manche. Classement final sans fond vert (pas de victoire). Inchangé de F3-12 pour ce cas.

- **Loading :** Sans objet — données en mémoire locale. Inchangé de F3-12.

- **Error :** Sans objet. Inchangé de F3-12.

### Accessibilité

- [ ] `accessibilityRole="header"` sur le titre "Résultats" — inchangé de F3-12
- [ ] `accessibilityLabel` sur le conteneur section "PAR MANCHE" : `"Section par manche"` — `accessibilityRole="header"` (niveau de section)
- [ ] `accessibilityLabel` sur chaque MancheSummaryRow : format complet `"Manche [N] : [joueur1] victoire en [K] saut(s), [joueur2] abandonné..."` — les enfants sont `accessible={false}`
- [ ] `accessibilityLabel` sur le conteneur section "CLASSEMENT FINAL" : `"Classement final"` — `accessibilityRole="header"`
- [ ] `accessibilityLabel` sur PlayerResultRow mis à jour pour les rangs partagés :
  - Rang 1 partagé : `"Première place, ex-aequo : Alice — Victoire en 5 sauts et 3 minutes 1 seconde"`
  - Rang 1 partagé (second joueur) : `"Première place, ex-aequo : Charlie — Victoire en 5 sauts et 3 minutes 1 seconde"`
  - Rang 3 après ex-aequo : `"Troisième place : Bob — Partie abandonnée"`
  - Rang non-podium : `"[rang]e place : [Nom] — [statut]"` (ex: "5e place : Emma — Partie abandonnée")
- [ ] L'ajout de "ex-aequo" dans l'accessibilityLabel des rangs partagés est obligatoire — le screen reader ne peut pas déduire le partage depuis la liste seule
- [ ] `accessibilityLabel` sur section "PAR MANCHE" si `roundHistory.length <= 1` : section absente du DOM d'accessibilité (conditionnelle)
- [ ] Contraste label "PAR MANCHE" `#64748B` sur `#FFFFFF` : 4.6:1 — conforme
- [ ] Contraste label "CLASSEMENT FINAL" `#64748B` sur `#FFFFFF` : 4.6:1 — conforme
- [ ] Contraste ChipVictoire dans MancheSummaryRow `#16A34A` sur `#DCFCE7` : 3.1:1 — acceptable Bold 12px
- [ ] Contraste ChipAbandon `#64748B` sur `#F1F5F9` : 4.6:1 — conforme
- [ ] Contraste nom joueur `#1E293B` sur `#F0FDF4` (row rang 1) : 15.4:1 — conforme
- [ ] Aucune information transmise par la couleur seule : rang textuel dans accessibilityLabel, statut textuel dans les chips
- [ ] Ordre de lecture VoiceOver : Header → BlocPaireJouee → [Section PAR MANCHE si visible → MancheSummaryRows] → Section CLASSEMENT FINAL → PlayerResultRows → ZoneBoutons
- [ ] Animations : aucune animation automatique — inchangé de F3-12

### Notes pour Laurent

- Le label "CLASSEMENT FINAL" est nouveau dans F3-33. Il n'existait pas dans F3-12. Le rendre visible même pour les sessions 1 manche — il uniformise le pattern visuel et prépare les sessions multi-manches.

- `rankPlayersGlobalWithRank` est la nouvelle fonction à utiliser à la place de `rankPlayersGlobal` (si ce dernier n'est plus utilisé ailleurs dans le fichier, supprimer son import — code mort bloquant en code review selon les règles du projet).

- L'interface locale `GlobalRankEntry` dans `MultiplayerResultScreen` est à supprimer et remplacer par `GlobalRankEntryWithRank` importé depuis `multiplayer.utils`. Voir specs Maxime section F3-33.

- `PlayerResultRow` ne reçoit plus un index mais un `entry` de type `GlobalRankEntryWithRank`. Le rang est lu directement depuis `entry.rank`. La médaille (🥇/🥈/🥉) est calculée depuis `entry.rank` — pas depuis la position dans le tableau trié. C'est crucial pour les ex-aequo.

- La phrase dans l'accessibilityLabel des rangs partagés doit être construite dynamiquement. Logique suggérée : si plusieurs entrées ont le même rang, détecter ce cas et ajouter "ex-aequo" dans le label. Vérifier si `rankedPlayers.filter(p => p.rank === entry.rank).length > 1`.

- Le `rankWord` pour l'accessibilityLabel des rangs au-delà de 3 : `"${String(rank)}e place"` en minuscule (comme dans les specs Maxime). Pour les rangs 1-3, garder "Première place", "Deuxième place", "Troisième place" en toutes lettres.

- MancheSummaryRow est un composant interne à `MultiplayerResultScreen.tsx`. Pas besoin de fichier séparé.

- Gestion du pluriel dans les chips victoire : `jumps === 1 ? "1 saut" : "${jumps} sauts"`. À mutualiser avec la logique existante de VictoryScreen si une fonction utilitaire existe déjà (ex: `formatJumps`).

- Pour le bouton Rejouer dans F3-33 : `restartSession` attend maintenant un tableau de paires (F3-32). Voir specs Maxime section "Adaptation du bouton Rejouer avec F3-32" — la solution de `Array.from({ length: roundCount }, () => sameArticle)` est un compromis documenté et acceptable pour cette story.

---

## Récapitulatif des nouveaux éléments visuels F3-33

| Élément | Nouveau | Modifié | Inchangé |
|---------|---------|---------|----------|
| Section "PAR MANCHE" + MancheSummaryRows | oui | | |
| Label "CLASSEMENT FINAL" | oui | | |
| PlayerResultRow — rang depuis `entry.rank` | | oui | |
| PlayerResultRow — fond `#F0FDF4` multi-joueurs rang 1 | | oui | |
| PlayerResultRow — médaille partagée 🥇/🥇 | | oui | |
| Header, BlocPaireJouee, ZoneBoutons, BoutonRetourAccueil | | | oui |

---

## Tokens confirmés (pas de nouveaux tokens)

| Token | Valeur | Usage dans F3-33 |
|-------|--------|-----------------|
| Surface winner | `#F0FDF4` | Fond PlayerResultRow rang 1 — déjà token F3-12 |
| Success / Victoire | `#16A34A` | Bandeau gauche rang 1, ChipVictoire texte |
| Badge Victoire fond | `#DCFCE7` | ChipVictoire fond dans MancheSummaryRow |
| Badge Abandonné fond | `#F1F5F9` | ChipAbandon fond dans MancheSummaryRow |
| Badge Abandonné texte | `#64748B` | ChipAbandon texte |
| Text Secondary | `#64748B` | LabelManche, labels section, stats texte |
| Text Primary | `#1E293B` | Noms joueurs |
| Border | `#E2E8F0` | SeparateurRow, SeparateurManche |
