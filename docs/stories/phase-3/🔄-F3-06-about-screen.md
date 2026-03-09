---
id: F3-06
title: Écran "À propos" et crédits
phase: 3-Features
priority: Should
agents: [Frontend Dev, UX/UI, DPO]
status: in-progress
created: 2026-02-28
completed:
---

# F3-06 — Écran "À propos" et crédits

## User Story
En tant que joueur curieux, je veux savoir qui a créé ce jeu et comprendre son fonctionnement, afin de lui faire confiance.

## Critères d'acceptance
- [ ] Page "À propos" accessible depuis le menu
- [ ] Contient : description du jeu, utilisation de l'API Wikipedia, lien vers la politique de confidentialité
- [ ] Lien vers le dépôt GitHub du projet (open source)
- [ ] Version de l'application affichée
- [ ] Validé par le DPO pour la conformité RGPD

## Notes de réalisation

### Spécifications techniques — Maxime (Tech Lead) — 2026-03-08

**Story concernée :** F3-06 — Écran "À propos" et crédits
**Fichiers à créer :** `apps/mobile/src/screens/AboutScreen.tsx`
**Fichiers à modifier :** `apps/mobile/src/navigation/RootNavigator.tsx`, `apps/mobile/src/screens/HomeScreen.tsx`

---

#### 1. Périmètre

**Dans scope :**
- Composant `AboutScreen` (stateless, lecture de version dynamique)
- Ajout de la route `About` dans `RootStackParamList` et `RootNavigator`
- Ajout du bouton "À propos" dans `HomeScreen`
- Ouverture des liens externes via `Linking`

**Hors scope :**
- Contenu RGPD validé par le DPO (placeholder suffisant pour cette PR)
- Lien vers politique de confidentialité réelle (URL placeholder `https://wikihop.app/privacy`)
- Design maquetté par Benjamin (composant déclaratif — pas de TDD strict requis)

---

#### 2. Modification de RootNavigator — ajout de la route About

Dans `apps/mobile/src/navigation/RootNavigator.tsx` :

**a) Ajout dans `RootStackParamList` :**
```typescript
/**
 * Route About : écran crédits et informations légales (F3-06).
 * Accessible depuis HomeScreen.
 */
About: undefined;
```

**b) Ajout dans `<Stack.Navigator>` :**
```typescript
<Stack.Screen
  name="About"
  component={AboutScreen}
  options={{ headerShown: false }}
/>
```

**c) Import à ajouter :**
```typescript
import { AboutScreen } from '../screens/AboutScreen';
```

---

#### 3. Composant AboutScreen — structure

**Fichier :** `apps/mobile/src/screens/AboutScreen.tsx`

**Import Constants (syntaxe exacte Expo SDK 52) :**
```typescript
import Constants from 'expo-constants';
```

`expo-constants` est déjà une dépendance d'Expo SDK 52 — pas d'installation supplémentaire.

**Lecture de la version :**
```typescript
const version = Constants.expoConfig?.version ?? '—';
```

`Constants.expoConfig` peut être `null` en dehors du contexte Expo managed workflow — le `?? '—'` couvre ce cas.

**Import Linking :**
```typescript
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
```

**Structure du composant (interface) :**

```typescript
type AboutScreenProps = NativeStackScreenProps<RootStackParamList, 'About'>;

export function AboutScreen({ navigation }: AboutScreenProps): React.JSX.Element
```

**Layout attendu :**

```
[SafeAreaView top+bottom]
├── Header : "À propos" + bouton retour (goBack)
├── [séparateur]
└── ScrollView :
    ├── Nom de l'app : "WikiHop"
    ├── Version : "Version X.Y.Z"
    ├── [séparateur]
    ├── Description : "WikiHop est un jeu de navigation Wikipedia..."
    ├── [séparateur]
    ├── Section "Sources" :
    │   ├── "Ce jeu utilise l'API Wikipedia (CC BY-SA)."
    │   └── Lien "Voir les conditions d'utilisation" → https://www.mediawiki.org/wiki/API:Main_page
    ├── [séparateur]
    ├── Section "Légal" :
    │   └── Lien "Politique de confidentialité" → https://wikihop.app/privacy (placeholder)
    ├── [séparateur]
    └── Section "Code source" :
        └── Lien "Voir sur GitHub" → https://github.com/wikihop/wikihop (placeholder)
```

**Texte de description (à utiliser tel quel) :**
> "WikiHop est un jeu de navigation : partez d'un article Wikipedia et rejoignez l'article destination en cliquant uniquement sur les liens internes. Combien de sauts vous faudra-t-il ?"

**Header avec bouton retour :**

Le header suit le pattern de `ArticleScreen` : header custom avec `SafeAreaView`, bouton retour à gauche appelant `navigation.goBack()`. Pas de React Navigation header natif (`headerShown: false` dans le navigator).

**Pattern ouverture de lien externe :**
```typescript
const handleOpenLink = (url: string): void => {
  void Linking.openURL(url);
};
```

Chaque lien est un `TouchableOpacity` avec `accessibilityRole="link"` et `accessibilityLabel` décrivant la destination.

---

#### 4. Intégration HomeScreen — bouton "À propos"

Dans `HomeScreen.tsx`, ajouter le bouton "À propos" **après** le bouton "Soutenir Wikipedia" dans la zone `buttonsContainer`. Il suit le pattern des boutons secondaires en texte (`secondaryTextButton`) déjà présents :

```typescript
<TouchableOpacity
  style={styles.secondaryTextButton}
  onPress={() => { navigation.navigate('About'); }}
  accessibilityLabel="À propos de WikiHop"
  accessibilityRole="button"
>
  <Text style={styles.secondaryTextButtonText}>{'À propos'}</Text>
</TouchableOpacity>
```

Ce bouton doit apparaître dans **les deux branches** de `renderContent()` qui affichent des boutons (état `loading` et état `success`). L'état `error` ne montre pas les boutons secondaires — comportement inchangé.

---

#### 5. Pas de TDD strict — composant déclaratif

`AboutScreen` est principalement déclaratif (lecture de constante, affichage de texte statique, liens). Pas de logique métier à tester en TDD. Tests optionnels : vérifier que la version s'affiche, que les liens appellent `Linking.openURL` avec la bonne URL.

---

#### 6. Critères de qualité (code review)

- [ ] `AboutScreen` est exportée en export nommé (pas de default export)
- [ ] `Constants.expoConfig?.version ?? '—'` — fallback obligatoire
- [ ] Tous les liens utilisent `Linking.openURL` (pas `Linking.canOpenURL` — inutile ici)
- [ ] Bouton "À propos" présent dans les deux états de `renderContent()` qui affichent des boutons
- [ ] Route `About` ajoutée dans `RootStackParamList` et dans le Stack
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `accessibilityRole="link"` sur tous les éléments de lien externe

---

#### 7. Points de vigilance

- **`Constants.expoConfig` vs `Constants.manifest`** : `manifest` est déprécié depuis Expo SDK 46. Utiliser exclusivement `expoConfig`. Ne pas importer `Constants.manifest2`.
- **`Linking.openURL` ne retourne pas d'erreur fiable** sur toutes les plateformes si l'URL est invalide — le `void` est intentionnel, pas de `.catch()` nécessaire pour les URLs statiques connues.
- **Double occurrence du bouton** : la fonction `renderContent()` dans HomeScreen contient deux blocs de boutons (états `loading` et `success`). Les deux doivent inclure le bouton "À propos" pour cohérence visuelle.

## Validation DPO — Maïté — 2026-03-08

### Avis RGPD — F3-06 Écran "À propos"

**Statut : Conforme — aucun consentement requis**

---

### Analyse

**1. Données identifiées**

Aucune donnée personnelle n'est collectée, lue, modifiée ou supprimée par cet écran. Il s'agit d'un composant purement déclaratif qui affiche du texte statique et lit une constante de build (`Constants.expoConfig?.version`). Cette constante est une donnée technique de l'application, non une donnée personnelle au sens du RGPD.

**2. Base légale**

Sans objet — aucun traitement de données personnelles.

**3. Durée de conservation**

Sans objet.

**4. Minimisation des données**

Le principe est respecté par nature : l'écran n'interroge aucune API externe, ne consigne rien, ne génère aucun log applicatif propre.

**5. Droits des utilisateurs**

L'écran contribue positivement à la transparence (article 13 RGPD) en exposant la politique de confidentialité via un lien dédié. C'est une bonne pratique.

**6. Sous-traitants**

Les liens externes (`mediawiki.org`, `github.com`, `wikihop.app/privacy`) sont ouverts par le système d'exploitation de l'appareil via `Linking.openURL`. WikiHop ne transmet aucune donnée à ces tiers à l'occasion de l'ouverture du lien depuis l'écran.

**7. Mention Wikipedia**

L'API MediaWiki est une API publique sous licence ouverte. La mention d'usage ne constitue pas un traitement de données personnelles. La formulation proposée ci-dessous est claire, honnête et non trompeuse quant à l'absence d'affiliation officielle.

---

### Texte approuvé pour l'écran "À propos"

Les éléments ci-dessous sont les textes définitifs à intégrer tels quels dans `AboutScreen.tsx`.

**Description du jeu (section principale)**

> WikiHop est un jeu de navigation : partez d'un article Wikipedia et rejoignez l'article destination en cliquant uniquement sur les liens internes. Combien de sauts vous faudra-t-il ?

**Section "Sources" — texte + libellé du lien**

Texte : `Ce jeu utilise l'API Wikipedia (contenu sous licence CC BY-SA 4.0). WikiHop n'est pas affilié à la Wikimedia Foundation.`

Libellé du lien : `Conditions d'utilisation de l'API MediaWiki`

URL : `https://www.mediawiki.org/wiki/API:Main_page`

**Section "Légal" — libellé du lien**

Libellé du lien : `Politique de confidentialité`

URL : `https://wikihop.app/privacy` (placeholder — à remplacer par l'URL réelle avant publication sur les stores)

**Section "Code source" — libellé du lien**

Libellé du lien : `Code source sur GitHub`

URL : `https://github.com/wikihop/wikihop` (placeholder)

---

### Points de vigilance pour les évolutions futures

- Si un système de compte utilisateur est ajouté, l'écran "À propos" devra être mis à jour pour référencer les droits exercables (accès, suppression) et un contact DPO réel.
- L'URL `https://wikihop.app/privacy` doit pointer vers la politique de confidentialité publiée avant toute soumission aux stores. Informer Maïté quand l'URL est réelle pour validation finale.
- La mention CC BY-SA 4.0 est correcte pour le contenu Wikipedia. Ne pas omettre le numéro de version de la licence.

---

### Conclusion

L'écran "À propos" dans sa version décrite par la story F3-06 est conforme au RGPD sans restriction. Aucun consentement n'est requis. Aucun registre de traitement ne nécessite de mise à jour pour cet écran.

Le critère d'acceptance "Validé par le DPO pour la conformité RGPD" est coché.

**Maïté — DPO WikiHop — 2026-03-08**

- [x] Validé par le DPO pour la conformité RGPD

---

## Spécifications visuelles — Benjamin (UX/UI)

---

## Écran : AboutScreen — "À propos"

### Objectif
Permettre au joueur de comprendre l'origine du jeu, consulter les informations légales et accéder aux liens externes, depuis un écran dédié accessible via un bouton texte en bas de l'accueil.

### Layout (ASCII)

```
┌─────────────────────────────────────┐  [FIXED — Header — h:52pt]
│  ←  À propos                        │  SafeAreaView edges top
├─────────────────────────────────────┤  bordure bas #E2E8F0 1pt
│                                     │  [SCROLL]
│  ┌─────────────────────────────┐    │
│  │  WikiHop                    │    │  Nom app — Bold 24px #1E293B
│  │  Version 1.0.0              │    │  Version — Regular 16px #64748B
│  └─────────────────────────────┘    │  paddingTop:32 paddingHorizontal:16
│                                     │
│  ─────────────────────────────────  │  Séparateur #E2E8F0 1pt marginV:24
│                                     │
│  WikiHop est un jeu de navigation   │  Description — Regular 16px #1E293B
│  : partez d'un article Wikipedia    │  lineHeight:24 paddingH:16
│  et rejoignez l'article destination │
│  en cliquant uniquement sur les     │
│  liens internes. Combien de sauts   │
│  vous faudra-t-il ?                 │
│                                     │
│  ─────────────────────────────────  │  Séparateur #E2E8F0 1pt marginV:24
│                                     │
│  SOURCES                            │  Titre section — Bold 13px #64748B
│                                     │  letterSpacing:1 uppercase marginB:12
│  Ce jeu utilise l'API Wikipedia     │  Regular 14px #64748B lineHeight:21
│  (contenu sous licence CC BY-SA     │
│  4.0). WikiHop n'est pas affilié    │
│  à la Wikimedia Foundation.         │
│                                     │
│  Conditions d'utilisation de        │  Lien — Regular 16px #2563EB
│  l'API MediaWiki  ↗                 │  paddingV:12 min-height:44pt
│                                     │
│  ─────────────────────────────────  │  Séparateur #E2E8F0 1pt marginV:24
│                                     │
│  LÉGAL                              │  Titre section — Bold 13px #64748B
│                                     │
│  Politique de confidentialité  ↗    │  Lien — Regular 16px #2563EB
│                                     │  paddingV:12 min-height:44pt
│                                     │
│  ─────────────────────────────────  │  Séparateur #E2E8F0 1pt marginV:24
│                                     │
│  CODE SOURCE                        │  Titre section — Bold 13px #64748B
│                                     │
│  Code source sur GitHub  ↗          │  Lien — Regular 16px #2563EB
│                                     │  paddingV:12 min-height:44pt
│                                     │
│  [paddingBottom:48]                 │
└─────────────────────────────────────┘
```

### Composants

- **Header** — `SafeAreaView edges={['top']}`, fond `#FFFFFF`, hauteur 52pt, `flexDirection: 'row'` `alignItems: 'center'` `paddingHorizontal: 8`. Bordure bas `#E2E8F0` 1pt.
  - Bouton retour : `TouchableOpacity` `minWidth: 44` `minHeight: 44`, libellé `"← Retour"`, texte Regular 16px `#2563EB`. Appelle `navigation.goBack()`.
  - Titre `"À propos"` : `Text` Bold 17px `#1E293B`, centré (`position: 'absolute'` + `left: 0` `right: 0` `textAlign: 'center'`), `pointerEvents: 'none'` pour laisser le retour cliquable.

- **Section app** — `paddingTop: 32` `paddingHorizontal: 16`.
  - Nom : `Text` Bold 24px `#1E293B`. Libellé : `"WikiHop"`.
  - Version : `Text` Regular 16px `#64748B` `marginTop: 4`. Libellé : `"Version X.Y.Z"` (valeur lue depuis `Constants.expoConfig?.version ?? '—'`).

- **Description** — `Text` Regular 16px `#1E293B` `lineHeight: 24` `paddingHorizontal: 16`. Texte validé par le DPO.

- **Titre de section** — `Text` Bold 13px `#64748B` `letterSpacing: 1` `textTransform: 'uppercase'` `marginBottom: 12` `paddingHorizontal: 16`.

- **Texte de section** — `Text` Regular 14px `#64748B` `lineHeight: 21` `paddingHorizontal: 16` `marginBottom: 8`.

- **Lien externe** — `TouchableOpacity` `minHeight: 44` `paddingVertical: 12` `paddingHorizontal: 16` `flexDirection: 'row'` `alignItems: 'center'`.
  - Texte du lien : Regular 16px `#2563EB`.
  - Icône `"↗"` : Regular 14px `#2563EB` `marginLeft: 6`.
  - Appelle `Linking.openURL(url)` au tap.

- **Séparateur** — `View` hauteur 1pt fond `#E2E8F0` `marginVertical: 24` `marginHorizontal: 16`.

### États

- **Default** : tout le contenu affiché, version lue depuis `Constants.expoConfig`.
- **Loading** : non applicable — composant stateless, aucun appel réseau, rendu immédiat.
- **Error** : si `Constants.expoConfig?.version` est `undefined`, afficher `"—"` (fallback). Aucun autre état d'erreur possible.
- **Empty** : non applicable.

### Accessibilité

- [ ] `accessibilityRole="header"` sur le titre `"À propos"` dans le header
- [ ] `accessibilityRole="button"` sur le bouton retour avec `accessibilityLabel="Retour à l'accueil"`
- [ ] `accessibilityRole="link"` sur chaque `TouchableOpacity` de lien externe
- [ ] `accessibilityLabel` explicite sur chaque lien : `"Conditions d'utilisation de l'API MediaWiki, ouvre une page externe"` / `"Politique de confidentialité de WikiHop, ouvre une page externe"` / `"Code source sur GitHub, ouvre une page externe"`
- [ ] Contraste texte principal `#1E293B` sur `#FFFFFF` : 16.1:1 — conforme
- [ ] Contraste texte secondaire `#64748B` sur `#FFFFFF` : 4.6:1 — conforme (texte normal)
- [ ] Contraste liens `#2563EB` sur `#FFFFFF` : 4.6:1 — conforme
- [ ] Contraste titres de section `#64748B` sur `#FFFFFF` : 4.6:1 — conforme pour Bold 13px (seuil texte large >= 3:1 — ici Bold 13px est borderline texte large ; appliquer seuil 4.5:1 texte normal — valeur 4.6:1 conforme)
- [ ] Zones tactiles liens >= 44pt de hauteur via `minHeight: 44` — conforme
- [ ] Zone tactile bouton retour : `minWidth: 44` `minHeight: 44` — conforme
- [ ] Ordre VoiceOver logique : header → nom app → version → description → section Sources → lien API → section Légal → lien Confidentialité → section Code Source → lien GitHub
- [ ] Icônes `"↗"` décoratives : `accessible={false}` (incluses dans le `accessibilityLabel` du lien parent)
- [ ] Aucune animation sur cet écran

### Notes pour Laurent

- Le titre du header est centré absolument pour éviter l'effet de décalage dû à la largeur du bouton retour. Utiliser `position: 'absolute'` + `alignSelf: 'center'` + `pointerEvents: 'none'` pour laisser le bouton retour intercepter les taps.
- Les `paddingHorizontal: 16` sur les composants texte et lien sont cohérents avec les marges globales du projet — ne pas utiliser de `paddingHorizontal` sur la `ScrollView` elle-même, car les séparateurs sont à 16pt du bord (ils doivent avoir leur propre `marginHorizontal: 16`).
- `paddingBottom: 48` en bas du `contentContainerStyle` du `ScrollView` pour que le dernier lien ne soit pas collé au bas de l'écran.
- L'icône `"↗"` après les liens signale visuellement qu'il s'agit d'un lien externe — cohérence avec la convention déjà utilisée dans `VictoryScreen` (même icône sur les items du chemin parcouru).
- Ne pas afficher de page de chargement ou de spinner — le composant est 100% stateless.

---

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
