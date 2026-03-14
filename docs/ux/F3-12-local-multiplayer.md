# Spécifications visuelles — F3-12 — Multijoueur local hot-seat

**Auteur :** Benjamin — UX/UI Designer
**Date :** 2026-03-14
**Story liée :** F3-12
**Dépend de :** M-01 (HomeScreen), M-06 (VictoryScreen comme référence de style)
**Écrans concernés :** HomeScreen (bouton Multijoueur), MultiplayerSetupScreen, PassPhoneScreen, MultiplayerResultScreen

---

## Décisions de design préalables

### Validation du bouton Multijoueur dans HomeScreen

**Style proposé par Maxime :**
`height: 52, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#2563EB', borderRadius: 12, alignItems: 'center', justifyContent: 'center'`

**Validation : CONFIRMÉ avec ajustement mineur.**

Ce style correspond au bouton secondaire outline déjà établi dans le design system (fond blanc, bordure `#2563EB`, coins 12pt, hauteur 52pt). C'est la hiérarchie correcte : le bouton "Multijoueur" est une action secondaire, moins prioritaire que "Défi du jour" (amber, primaire plein) et "Jouer" (bleu primaire plein). L'outline blanc signale clairement une option alternative sans concurrencer les CTAs principaux.

**Ajustement :** ajouter le texte en Bold 16px `#2563EB` (cohérence avec les autres boutons outline existants). Maxime ne l'a pas précisé dans le style — c'est une complétion, pas un changement.

**Position dans HomeScreen :** entre le bouton "Défi du jour" (amber) et le bouton "Jouer" (bleu primaire), tel que spécifié par Maxime. Séparé de chaque voisin par un `marginTop: 12pt`.

---

### PassPhoneScreen : fond sombre ou clair ?

Deux options évaluées :
- **Fond blanc `#FFFFFF`** — cohérent avec le reste de l'app
- **Fond sombre `#0F172A`** — marque une rupture forte, "rideau" entre deux joueurs

**Fond sombre `#0F172A` retenu.** Justification : cet écran est un écran de transition physique — le téléphone change de mains. Un fond sombre signale visuellement la "neutralisation" de l'écran (le joueur suivant ne voit pas les résultats du joueur précédent pendant la transition). C'est une convention UX de hot-seat établie dans les jeux sur tablette. Le contraste fort entre PassPhoneScreen et les autres écrans de l'app est intentionnel.

---

### MultiplayerResultScreen : rang avec médailles ou chiffres ?

**Médailles emoji (🥇🥈🥉) pour les rangs 1-2-3, chiffres "4." "5." "6." pour les suivants.** Justification : les médailles sont universellement reconnues pour le podium et ajoutent une dimension émotionnelle positive. Au-delà du podium (rangs 4-6), les chiffres sont plus neutres — la compétition principale se joue sur le podium. Ce pattern est utilisé dans Kahoot, Jackbox, et les classements d'App Store.

---

## Bouton Multijoueur — HomeScreen

### Zoom sur la zone boutons HomeScreen mise à jour

```
┌─────────────────────────────────────┐
│                                     │
│  ┌─────────────────────────────┐   │  Bouton "Défi du jour"
│  │       Défi du jour          │   │  h:52, fond #D97706, texte blanc Bold 16px
│  └─────────────────────────────┘   │  borderRadius:12
│                                     │  marginTop: 16pt (depuis ArticleCard bas)
│  ┌─────────────────────────────┐   │  Bouton "Multijoueur"  ← NOUVEAU
│  │       Multijoueur           │   │  h:52, fond #FFFFFF, bordure #2563EB 1pt
│  └─────────────────────────────┘   │  borderRadius:12, texte #2563EB Bold 16px
│                                     │  marginTop: 12pt
│  ┌─────────────────────────────┐   │  Bouton "Jouer"
│  │           Jouer             │   │  h:52, fond #2563EB, texte blanc Bold 18px
│  └─────────────────────────────┘   │  borderRadius:12
│                                     │
└─────────────────────────────────────┘
```

**Accessibilité bouton Multijoueur :**
- `accessibilityLabel="Multijoueur — jouer à plusieurs sur cet appareil"`
- `accessibilityRole="button"`
- Zone tactile : 52pt de hauteur, pleine largeur moins marges 16pt — conforme

---

## Écran : MultiplayerSetupScreen

### Objectif

Permettre à un groupe de 2 à 6 joueurs de saisir leurs noms et de lancer une session hot-seat sur la même paire d'articles.

### Layout (ASCII)

```
┌─────────────────────────────────────┐  [FIXED - SafeAreaView top]
│  ←   Multijoueur                   │  Header 64pt — fond #FFFFFF
├─────────────────────────────────────┤  Bordure #E2E8F0 1pt
│                                     │  [SCROLL - KeyboardAwareScrollView]
│  Joueurs                            │  Caption Bold 13px #64748B uppercase
│                                     │  paddingTop:20 paddingH:16
│  ┌─────────────────────────────┐   │
│  │  👤  Joueur 1          [✕]  │   │  PlayerRow — h:52pt
│  └─────────────────────────────┘   │  Bordure #E2E8F0 1pt
│  ┌─────────────────────────────┐   │
│  │  👤  Joueur 2          [✕]  │   │  PlayerRow (✕ désactivé si 2 joueurs)
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │  (apparaît si joueur ajouté)
│  │  👤  Joueur 3          [✕]  │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │  Bouton "+ Ajouter un joueur"
│  │  +  Ajouter un joueur       │   │  h:44pt, outline #2563EB, dashed
│  └─────────────────────────────┘   │  (désactivé + opacité 0.4 si 6 joueurs)
│                                     │
│  ─────────────────────────────     │  Séparateur #E2E8F0 1pt — marginTop:16
│                                     │
│  ┌─────────────────────────────┐   │  Info paire d'articles
│  │  De : [Titre départ]        │   │  Regular 14px #64748B
│  │  Vers : [Titre destination] │   │  paddingH:16 paddingV:12
│  └─────────────────────────────┘   │
│                                     │
│  [padding bottom 24pt]              │
└─────────────────────────────────────┘  [FIXED - Zone bouton]
│                                     │  Bordure top #E2E8F0 1pt
│  ┌─────────────────────────────┐   │  paddingH:16 paddingV:12
│  │         Commencer           │   │  h:52pt — fond #2563EB — Bold 16px blanc
│  └─────────────────────────────┘   │  (désactivé si noms vides ou < 2 joueurs)
└─────────────────────────────────────┘  SafeAreaView bottom
```

**Zoom sur une PlayerRow**

```
┌──────────────────────────────────────────────────────┐  h:52pt
│  [👤]  ┌──────────────────────────────┐  [  ✕  ]  │
│  16px  │  Sophie                      │  44×44pt  │
│        └──────────────────────────────┘           │
└──────────────────────────────────────────────────────┘
  paddingH:16   TextInput flex:1   marginLeft:8

[👤] = icône décorative, accessible={false}
TextInput : Regular 16px #1E293B, placeholder "Prénom du joueur" #94A3B8
[✕] = TouchableOpacity 44×44pt, icône ✕ Regular 16px #94A3B8
      désactivé (opacity:0.3) si seulement 2 joueurs dans la liste
```

### Composants

- **Header** — Hauteur 64pt, fond `#FFFFFF`, bordure bas `#E2E8F0` 1pt. Bouton retour "←" à gauche (44×44pt, `accessibilityLabel="Retour à l'accueil"`). Titre "Multijoueur" centré Bold 24px `#1E293B`. Position du bouton retour : `position: 'absolute', left: 16`.

- **PlayerRow** — View `flexDirection: 'row'`, `alignItems: 'center'`, hauteur minimale 52pt, `paddingHorizontal: 16pt`. Fond `#FFFFFF`, bordure bas `#E2E8F0` 1pt. Contient : icône joueur (accessible={false}), `TextInput` flex:1, bouton suppression (✕).

- **TextInput joueur** — `Regular 16px` `#1E293B`. Placeholder "Prénom du joueur" en `#94A3B8`. `returnKeyType="next"` pour chaîner les champs. `maxLength={20}` (noms longs rognent le layout). `autoCapitalize="words"`. `flex: 1`.

- **BoutonSupprimer (✕)** — `TouchableOpacity` 44×44pt. Icône ✕ 16px `#94A3B8`. Désactivé si `players.length <= 2` : opacité 0.3, `disabled={true}`. Jamais masqué — toujours présent visuellement mais inactif sous le seuil minimum.

- **BoutonAjouterJoueur** — `TouchableOpacity` hauteur 44pt, pleine largeur moins marges 16pt, `borderWidth: 1`, `borderStyle: 'dashed'`, `borderColor: '#2563EB'`, `borderRadius: 8pt`. Texte `#2563EB` Regular 16px. Icône "+" en préfixe (Text). Désactivé si `players.length >= 6` : opacité 0.4, `disabled={true}`, `accessibilityState={{ disabled: true }}`.

- **BlocPaire** — View d'information passive. Fond `#F8FAFC`, `borderRadius: 8pt`, `paddingHorizontal: 16pt`, `paddingVertical: 12pt`, `marginHorizontal: 16pt`. Deux lignes : "De : [titre]" et "Vers : [titre]" en Regular 14px `#64748B`. Visible uniquement quand la paire est chargée. Remplacée par un skeleton (rectangle `#F1F5F9` 60pt de hauteur) pendant le chargement.

- **BoutonCommencer** — CTA primaire plein. Hauteur 52pt, fond `#2563EB`, `borderRadius: 12pt`, texte Bold 16px `#FFFFFF`. Désactivé si : paire non chargée OU au moins un nom vide OU moins de 2 joueurs. État désactivé : fond `#E2E8F0`, texte `#94A3B8`. `accessibilityState={{ disabled: true }}` quand inactif.

### États

- **Default :** 2 PlayerRows pré-remplies vides, BoutonAjouterJoueur actif, BoutonCommencer désactivé (noms vides). BlocPaire en chargement (skeleton) si la paire n'est pas encore disponible.

- **Loading (paire en cours de chargement) :** BoutonCommencer désactivé avec message "Chargement de la partie..." sous le bouton en Caption 13px `#64748B`. BlocPaire remplacé par skeleton. Les champs de noms restent interactifs (l'utilisateur peut remplir ses noms pendant que la paire charge).

- **Error (paire indisponible) :** BlocPaire remplacée par un message d'erreur "Impossible de charger une partie. Vérifiez votre connexion." en Regular 14px `#E11D48`. BoutonCommencer reste désactivé. Un bouton "Réessayer" en outline `#2563EB` hauteur 44pt apparaît sous le message.

- **Prêt (tous noms remplis + paire chargée) :** BoutonCommencer actif (fond `#2563EB`). BlocPaire affiche les titres. BoutonAjouterJoueur actif si < 6 joueurs.

- **Validation échouée (tap Commencer avec nom vide) :** La PlayerRow du champ vide affiche une bordure `#E11D48` 1pt sur le TextInput. Un message "Tous les joueurs doivent avoir un prénom" apparaît en Caption 13px `#E11D48` sous le dernier PlayerRow invalide. Aucune navigation ne se produit.

### Accessibilité

- [ ] `accessibilityRole="header"` sur le titre "Multijoueur" dans le header
- [ ] `accessibilityLabel="Retour à l'accueil"` sur le bouton retour
- [ ] `accessibilityRole="button"` sur le bouton retour
- [ ] `accessibilityLabel` sur chaque PlayerRow TextInput : `"Nom du joueur [N]"` (ex: "Nom du joueur 1") — le placeholder seul n'est pas suffisant pour les lecteurs d'écran
- [ ] `accessibilityLabel` sur chaque BoutonSupprimer : `"Supprimer le joueur [N]"` — PAS juste "Supprimer"
- [ ] `accessibilityState={{ disabled: true }}` sur BoutonSupprimer quand `players.length <= 2`
- [ ] `accessibilityLabel="Ajouter un joueur"` sur BoutonAjouterJoueur
- [ ] `accessibilityState={{ disabled: true }}` sur BoutonAjouterJoueur quand 6 joueurs
- [ ] `accessibilityLabel="Commencer la partie"` sur BoutonCommencer
- [ ] `accessibilityState={{ disabled: true }}` sur BoutonCommencer quand inactif
- [ ] `accessibilityLabel` sur BlocPaire : `"Paire d'articles : de [Titre départ] à [Titre destination]"` — le bloc entier est lu en une annonce, ses enfants `accessible={false}`
- [ ] Contraste texte principal `#1E293B` sur `#FFFFFF` : 16.1:1 — conforme
- [ ] Contraste placeholder `#94A3B8` sur `#FFFFFF` : 2.4:1 — hors WCAG mais accepté pour les placeholders (convention iOS/Android, pas de contenu informatif requis dans le placeholder)
- [ ] Contraste bouton Commencer `#FFFFFF` sur `#2563EB` : 4.6:1 — conforme
- [ ] Contraste bouton désactivé `#94A3B8` sur `#E2E8F0` : 2.0:1 — insuffisant WCAG mais acceptable pour état désactivé (convention WCAG 2.1 note 1 : les composants désactivés sont exempts de l'exigence de contraste)
- [ ] Contraste message erreur `#E11D48` sur `#FFFFFF` : 4.6:1 — conforme
- [ ] Zones tactiles : BoutonSupprimer 44×44pt, BoutonAjouterJoueur h:44pt, BoutonCommencer h:52pt — toutes conformes
- [ ] Ordre de lecture VoiceOver : Header (retour → titre) → label section "Joueurs" → PlayerRow 1 (TextInput → BoutonSupprimer) → PlayerRow 2 → ... → BoutonAjouterJoueur → BlocPaire → BoutonCommencer
- [ ] Annonce VoiceOver à l'ajout d'un joueur : `AccessibilityInfo.announceForAccessibility("Joueur [N] ajouté.")` après ajout
- [ ] Annonce VoiceOver à la suppression d'un joueur : `AccessibilityInfo.announceForAccessibility("Joueur [N] supprimé.")` après suppression

### Notes pour Laurent

- Utiliser un `KeyboardAwareScrollView` (ou `KeyboardAvoidingView` + `ScrollView`) pour éviter que le clavier masque les TextInput du bas. Sur iOS, `behavior="padding"` — sur Android, `behavior="height"`.
- L'ordre de tabulation des TextInput doit être séquentiel : utiliser `ref` et `onSubmitEditing` pour passer automatiquement au champ suivant. Sur le dernier TextInput, `returnKeyType="done"` ferme le clavier.
- La paire d'articles utilisée est la même pour tous les joueurs. Elle est chargée via le hook existant `useRandomPair` (ou un appel direct au service). Elle est passée en paramètre lors de la navigation vers `ArticleScreen` pour chaque joueur.
- L'état de la session multijoueur (liste des joueurs, leurs résultats, index du joueur actif) est géré dans un store dédié ou dans le composant MultiplayerSetupScreen via un `useReducer` — décision laissée au Tech Lead.
- Le bouton "✕" de suppression sur les PlayerRows 1 et 2 n'est JAMAIS masqué — il est désactivé (opacité 0.3, `disabled={true}`). Cette cohérence visuelle évite un layout shift quand on passe de 3 à 2 joueurs.
- `maxLength={20}` sur les TextInput : les noms très longs (>20 caractères) poseraient des problèmes dans PassPhoneScreen et MultiplayerResultScreen. Cette contrainte doit être communiquée à l'utilisateur si nécessaire (texte "20 caractères max" en Caption sous les champs, optionnel).

---

## Écran : PassPhoneScreen

### Objectif

Assurer la transition physique du téléphone entre deux joueurs sans révéler les résultats ou la progression du joueur précédent.

### Layout (ASCII)

```
┌─────────────────────────────────────┐  [FIXED - SafeAreaView complet]
│                                     │  Fond #0F172A (sombre)
│                                     │
│                                     │  Espace supérieur flexible (~30% écran)
│                                     │
│             📱                      │  Icône 64px — centré — accessible={false}
│                                     │  marginBottom: 24pt
│        À toi de jouer !             │  Bold 28px #F8FAFC — centré
│                                     │  marginBottom: 16pt
│   Passe le téléphone à              │  Regular 16px #94A3B8 — centré
│                                     │
│          Sophie                     │  Bold 24px #FFFFFF — centré
│                                     │  marginBottom: 48pt
│                                     │
│  ┌─────────────────────────────┐   │  Bouton "Prêt !"
│  │           Prêt !            │   │  h:56pt — fond #2563EB — Bold 18px blanc
│  └─────────────────────────────┘   │  borderRadius:16pt — marginH:32pt
│                                     │
│                                     │  Espace inférieur flexible (~15% écran)
│                                     │
└─────────────────────────────────────┘
```

**Précisions sur la zone centrale :**

La zone centrale (icône + textes + bouton) est positionnée avec `justifyContent: 'center'` dans un `View flex:1`. Elle n'est pas calée en haut ni en bas — elle flotte au centre vertical avec une légère compensation vers le haut (l'icône et les textes prennent plus de place visuellement que le bouton). Utiliser `paddingBottom: 48pt` sur le conteneur central pour compenser optiquement.

```
[Fond #0F172A — plein écran]

             ↕ flex espace haut

         📱                ← 64px, marginBottom: 24
    À toi de jouer !       ← Bold 28px #F8FAFC, marginBottom: 16
  Passe le téléphone à     ← Regular 16px #94A3B8, marginBottom: 4
        Sophie             ← Bold 24px #FFFFFF, marginBottom: 48

  [        Prêt !        ] ← h:56, fond #2563EB, borderRadius:16

             ↕ flex espace bas (< espace haut)
```

### Composants

- **Fond plein** — `backgroundColor: '#0F172A'`, `flex: 1`. Aucun header, aucune barre de navigation. Ce screen doit désactiver le swipe-back natif iOS (`gestureEnabled: false` dans les options de la Stack) pour éviter qu'un joueur précédent accède par glissement à cet écran.

- **Icône 📱** — `Text` 64px, `accessible={false}` (décoratif). `textAlign: 'center'`. Alternative : utiliser un pictogramme de bibliothèque si l'équipe décide de standardiser les icônes. En l'absence de décision, l'emoji convient pour le MVP.

- **TitreAction** — `Text` Bold 28px `#F8FAFC`. "À toi de jouer !" Centré. `textAlign: 'center'`. `marginBottom: 16pt`.

- **LabellPassage** — `Text` Regular 16px `#94A3B8`. "Passe le téléphone à". Centré. `textAlign: 'center'`. `marginBottom: 4pt`.

- **NomJoueur** — `Text` Bold 24px `#FFFFFF`. Nom du joueur suivant, interpolé dynamiquement. Centré. `textAlign: 'center'`. `marginBottom: 48pt`. `numberOfLines={1}` avec `ellipsizeMode="tail"` si le nom dépasse la largeur disponible.

- **BoutonPret** — `TouchableOpacity`. Hauteur 56pt, fond `#2563EB`, `borderRadius: 16pt`, `marginHorizontal: 32pt`. Texte Bold 18px `#FFFFFF` centré. Pleine largeur moins les 32pt de marge de chaque côté.

### États

- **Default :** Fond sombre, icône, textes, bouton visible. Cet écran n'a qu'un seul état — aucun chargement, aucune erreur possible.

- **Loading :** Sans objet — aucune donnée réseau sur cet écran.

- **Error :** Sans objet.

- **Empty :** Sans objet.

### Accessibilité

- [ ] `accessibilityRole="header"` sur TitreAction ("À toi de jouer !") — c'est l'élément le plus important de l'écran
- [ ] `accessibilityLabel` sur le conteneur texte (View regroupant LabellPassage + NomJoueur) : `"Passe le téléphone à [NomJoueur]"` — une seule annonce cohérente. Les Text enfants `accessible={false}`.
- [ ] `accessibilityLabel="Je suis prêt à jouer"` sur BoutonPret — "Prêt !" seul manque de contexte pour les lecteurs d'écran
- [ ] `accessibilityRole="button"` sur BoutonPret
- [ ] Icône 📱 : `accessible={false}` — décorative
- [ ] Contraste TitreAction `#F8FAFC` sur `#0F172A` : 19.7:1 — conforme
- [ ] Contraste LabellPassage `#94A3B8` sur `#0F172A` : 4.7:1 — conforme WCAG AA
- [ ] Contraste NomJoueur `#FFFFFF` sur `#0F172A` : 21:1 — conforme
- [ ] Contraste BoutonPret `#FFFFFF` sur `#2563EB` : 4.6:1 — conforme
- [ ] Zone tactile BoutonPret : 56pt hauteur × pleine largeur moins 32pt marges — conforme (largeur >> 44pt)
- [ ] Ordre de lecture VoiceOver : Icône (skipped) → TitreAction → PassageLabel+Nom (annonce groupée) → BoutonPret
- [ ] `gestureEnabled: false` dans les options de navigation pour cet écran — évite tout accès accidentel par swipe-back au contenu du joueur précédent. À documenter dans les Notes pour Laurent.
- [ ] Aucune animation automatique sur cet écran

### Notes pour Laurent

- `gestureEnabled: false` dans les `screenOptions` de la Stack Navigator pour PassPhoneScreen : `navigation.setOptions({ gestureEnabled: false })` dans un `useEffect` au montage, ou configuré directement dans le Stack via `<Stack.Screen name="PassPhone" options={{ gestureEnabled: false }} />`.
- Le bouton retour natif iOS doit aussi être désactivé pour cet écran — utiliser `headerShown: false` (aucun header natif) ET `gestureEnabled: false`. La navigation depuis ce screen se fait UNIQUEMENT via le BoutonPret.
- Quand BoutonPret est pressé, naviguer vers `ArticleScreen` avec le joueur actif (passer le nom du joueur pour le header "Tour de [NomJoueur]").
- Cet écran est aussi utilisé en fin de tour d'un joueur (passage au joueur suivant). Il ne s'affiche PAS après le dernier joueur — à ce moment, naviguer directement vers MultiplayerResultScreen.
- Le nom du joueur est tronqué à 1 ligne (`numberOfLines={1}`) pour éviter les débordements sur de petits écrans. Avec `maxLength={20}` sur le TextInput de setup, les noms ne devraient pas poser de problème en pratique.

---

## Écran : MultiplayerResultScreen

### Objectif

Afficher le classement final de tous les joueurs d'une session hot-seat, triés par performance.

### Layout (ASCII)

```
┌─────────────────────────────────────┐  [FIXED - SafeAreaView top]
│         Résultats                   │  Header 64pt — fond #FFFFFF
│                                     │  Pas de bouton retour (fin de session)
├─────────────────────────────────────┤  Bordure #E2E8F0 1pt
│                                     │  [SCROLL - ScrollView]
│  Paire jouée :                      │  Caption 13px #64748B — paddingTop:16
│  [Départ]  →  [Destination]         │  Regular 14px #1E293B — paddingH:16
│                                     │
│  ─────────────────────────────     │  Séparateur #E2E8F0 1pt — marginH:16
│                                     │
│  ┌─────────────────────────────┐   │  Classement (liste)
│  │ 🥇  Sophie                  │   │  PlayerResultRow — rang 1
│  │     [VICTOIRE] 3 sauts · 1:23│  │
│  └─────────────────────────────┘   │
│  ──────────────────────────────    │  Séparateur interne 1pt #E2E8F0
│  ┌─────────────────────────────┐   │
│  │ 🥈  Thomas                  │   │  rang 2
│  │     [VICTOIRE] 5 sauts · 2:04│  │
│  └─────────────────────────────┘   │
│  ──────────────────────────────    │
│  ┌─────────────────────────────┐   │
│  │ 🥉  Claire                  │   │  rang 3
│  │     [ABANDONNÉ] —           │   │
│  └─────────────────────────────┘   │
│  ──────────────────────────────    │
│  ┌─────────────────────────────┐   │
│  │  4.  Marc                   │   │  rang 4+ : chiffre
│  │     [ABANDONNÉ] —           │   │
│  └─────────────────────────────┘   │
│                                     │
│  [padding bottom 24pt]              │
└─────────────────────────────────────┘  [FIXED - Zone bouton]
│                                     │  Bordure top #E2E8F0 1pt
│  ┌─────────────────────────────┐   │  paddingH:16 paddingV:12
│  │    Retour à l'accueil       │   │  h:52pt — fond #2563EB — Bold 16px blanc
│  └─────────────────────────────┘   │  borderRadius:12
└─────────────────────────────────────┘  SafeAreaView bottom
```

**Zoom sur une PlayerResultRow**

```
┌──────────────────────────────────────────────────────┐  minH:64pt
│                                                      │
│  [Rang]   Nom du joueur                              │
│   🥇      Sophie                Bold 17px #1E293B    │
│                                                      │
│           [VICTOIRE]  3 sauts · 1:23                 │
│           badge pill  Caption 13px #64748B           │
│                                                      │
└──────────────────────────────────────────────────────┘
  paddingH:16  paddingV:12

Légende :
  [Rang] = emoji médaille (🥇🥈🥉) 24px pour rangs 1-2-3
           ou Text Bold 17px #94A3B8 "4." "5." "6." pour rangs suivants
           minWidth: 36pt — aligné verticalement center
  Nom    = Bold 17px #1E293B
  Badge  = pill identique à HistoryItem (Victoire vert / Abandonné gris)
  Stats  = Caption 13px #64748B — "N sauts · mm:ss" si victoire
                                  "—" si abandonné
```

**Détail du rang 1 (mise en valeur supplémentaire)**

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  🥇  Sophie                   Bold 17px #1E293B      │
│                                                      │
│      [VICTOIRE]   3 sauts · 1:23                     │
│                                                      │
└──────────────────────────────────────────────────────┘
  Fond #F0FDF4 (vert très très pâle) — mise en valeur du premier rang
  borderLeft: 3pt solid #16A34A — indicateur gauche
  Uniquement sur la row du rang 1
```

Le fond `#F0FDF4` et le bandeau gauche vert distinguent le gagnant sans sur-charger. Cette mise en valeur s'applique uniquement si le joueur rang 1 a le statut "Victoire". Si tous les joueurs ont abandonné, aucune mise en valeur de fond (la victoire est sémantique — sans victoire réelle, pas de célébration).

### Composants

- **Header** — Hauteur 64pt, fond `#FFFFFF`, bordure bas `#E2E8F0` 1pt. Titre "Résultats" centré Bold 24px `#1E293B`. **Pas de bouton retour** — la session est terminée, l'unique action disponible est "Retour à l'accueil". Le back swipe est désactivé (`gestureEnabled: false`) pour cet écran.

- **BlocPaireJouee** — View passive, `paddingHorizontal: 16pt`, `paddingTop: 16pt`, `paddingBottom: 12pt`. Label "Paire jouée :" en Caption 13px `#64748B`. Trajet "[Départ] → [Destination]" en Regular 14px `#1E293B`. `numberOfLines={2}` pour les titres longs.

- **PlayerResultRow** — View hauteur minimale 64pt, `paddingHorizontal: 16pt`, `paddingVertical: 12pt`. `flexDirection: 'row'`, `alignItems: 'flex-start'`. Contient : zone rang (minWidth 36pt), zone info (flex:1). Non tactile (pas de navigation depuis ce row). Fond `#F0FDF4` + bandeau gauche vert uniquement sur le rang 1 si victoire.

- **ZoneRang** — View `minWidth: 36pt`, `alignItems: 'center'`. Emoji médaille en Text 24px pour rangs 1-2-3. Texte Bold 17px `#94A3B8` "4.", "5.", "6." pour les rangs suivants. `accessible={false}` — inclus dans l'accessibilityLabel du PlayerResultRow parent.

- **ZoneInfo** — View `flex: 1`, `paddingLeft: 8pt`. Nom du joueur en Bold 17px `#1E293B`. En dessous : `flexDirection: 'row'`, `alignItems: 'center'`, `marginTop: 4pt` : badge statut + stats texte.

- **BadgeStatut** — Identique à HistoryItem. Fond `#DCFCE7`/texte `#16A34A` pour Victoire. Fond `#F1F5F9`/texte `#64748B` pour Abandonné. `accessible={false}` — l'info est dans l'accessibilityLabel du row.

- **StatsTexte** — Caption 13px `#64748B`. "3 sauts · 1:23" si victoire. "—" si abandonné. `marginLeft: 8pt`.

- **SeparateurRow** — View `height: 1`, `backgroundColor: '#E2E8F0'`, pleine largeur. Entre chaque PlayerResultRow.

- **BoutonRetourAccueil** — CTA primaire plein. Hauteur 52pt, fond `#2563EB`, `borderRadius: 12pt`, texte Bold 16px `#FFFFFF`. `accessibilityLabel="Retour à l'accueil"`. Dans ZoneBoutons fixe en bas.

### États

- **Default :** Liste des joueurs triée par performance (victoire d'abord, puis par sauts croissants, puis durée croissante pour départager). Joueurs ayant abandonné en dernier.

- **Loading :** Sans objet — les résultats sont en mémoire locale, aucun chargement réseau.

- **Error :** Sans objet.

- **Empty :** Sans objet — cet écran ne peut exister sans au moins 2 joueurs.

- **Tous abandonnés :** La liste est affichée normalement avec tous les badges "Abandonné". Aucun fond vert sur la row rang 1 (pas de gagnant). Le header reste "Résultats". Pas de message spécial — la liste parle d'elle-même.

### Tri des résultats

Règles de tri pour l'affichage du classement (à implémenter en fonction pure TDD) :

1. Les joueurs ayant une victoire passent avant les joueurs ayant abandonné
2. Parmi les victorieux : tri par nombre de sauts croissant (moins = mieux)
3. À égalité de sauts : tri par durée croissante (moins = mieux)
4. Parmi les abandonnés : ordre arbitraire (ordre de passage initial)

### Accessibilité

- [ ] `accessibilityRole="header"` sur le titre "Résultats"
- [ ] `gestureEnabled: false` — le swipe-back est désactivé sur cet écran
- [ ] Pas de bouton retour dans le header — `accessibilityLabel` du BoutonRetourAccueil est `"Retour à l'accueil"` pour être la seule action de sortie
- [ ] `accessibilityRole="button"` sur BoutonRetourAccueil
- [ ] Sur chaque PlayerResultRow : `accessibilityLabel` complet. Exemples :
  - Rang 1 victoire : `"Première place : Sophie — Victoire en 3 sauts et 1 minute 23 secondes"`
  - Rang 2 victoire : `"Deuxième place : Thomas — Victoire en 5 sauts et 2 minutes 4 secondes"`
  - Rang 3 abandonné : `"Troisième place : Claire — Partie abandonnée"`
  - Rang 4+ : `"Quatrième place : Marc — Partie abandonnée"` (écrire "Quatrième", "Cinquième", "Sixième" en toutes lettres dans le label)
- [ ] Aucune information transmise par la couleur seule : le statut est textuel dans le badge ET dans l'accessibilityLabel
- [ ] La mise en valeur de la row rang 1 (fond vert pâle + bandeau) n'est pas la seule façon d'identifier le vainqueur — l'accessibilityLabel indique "Première place"
- [ ] Contraste nom joueur `#1E293B` sur `#F0FDF4` (row rang 1) : `#1E293B`/`#F0FDF4` = 15.4:1 — conforme
- [ ] Contraste badge Victoire `#16A34A` sur `#DCFCE7` : 3.1:1 — acceptable (Bold 11px, seuil 3:1)
- [ ] Contraste badge Abandonné `#64748B` sur `#F1F5F9` : 4.6:1 — conforme
- [ ] Contraste stats texte `#64748B` sur `#FFFFFF` : 4.6:1 — conforme
- [ ] Contraste BoutonRetourAccueil `#FFFFFF` sur `#2563EB` : 4.6:1 — conforme
- [ ] Zone tactile BoutonRetourAccueil : 52pt hauteur, pleine largeur moins 16pt marges — conforme
- [ ] Ordre de lecture VoiceOver : titre "Résultats" → BlocPaireJouee → PlayerResultRow 1 → ... → PlayerResultRow N → BoutonRetourAccueil
- [ ] Animations : aucune animation automatique sur cet écran

### Notes pour Laurent

- `gestureEnabled: false` sur MultiplayerResultScreen — même traitement que PassPhoneScreen. L'utilisateur ne peut quitter cet écran qu'en tapant "Retour à l'accueil".
- BoutonRetourAccueil navigue vers `Home` en réinitialisant la stack de navigation (utiliser `navigation.reset({ index: 0, routes: [{ name: 'Home' }] })`). Cela évite qu'une pile de résultats multijoueur s'accumule.
- La fonction de tri des résultats est une fonction pure `sortMultiplayerResults(results: PlayerResult[]): PlayerResult[]` — candidate au TDD strict selon les règles du projet. À placer dans `multiplayer.utils.ts`.
- Le token de couleur `#F0FDF4` est un nouveau token — fond vert très pâle pour la row du rang 1. Il est spécifique à MultiplayerResultScreen. À documenter dans les tokens du design system.
- Les emojis de médailles (🥇🥈🥉) peuvent avoir un rendu différent selon OS/version. Si l'équipe préfère une approche plus contrôlée, utiliser des icônes de bibliothèque avec les couleurs or/argent/bronze (`#F59E0B` or, `#94A3B8` argent, `#B45309` bronze). Décision laissée à Laurent selon les outils disponibles dans le projet.
- Le header "Résultats" n'a pas de bouton retour — dans React Navigation, utiliser `headerLeft: () => null` dans les options ou `headerBackVisible: false` (React Navigation v7). Sinon le bouton retour natif apparaît par défaut.
- Format des durées dans les stats : utiliser la même fonction `formatSeconds` déjà utilisée dans VictoryScreen et GameHUD — cohérence garantie.

---

## Nouveau token à documenter

- `#F0FDF4` — fond vert très pâle — utilisé uniquement sur la row rang 1 de MultiplayerResultScreen quand le joueur a une victoire. Token sémantique "surface-winner".
