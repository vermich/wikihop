---
id: F3-04
title: Page donation Wikipedia
phase: 3-Features
priority: Must
agents: [Frontend Dev, UX/UI, DPO]
status: in-progress
created: 2026-02-28
completed:
---

# F3-04 — Page donation Wikipedia

## User Story
En tant que joueur qui apprécie Wikipedia, je veux pouvoir soutenir la Fondation Wikimedia depuis l'application, afin de contribuer au maintien de la ressource que le jeu utilise.

## Critères d'acceptance
- [ ] Une page "Soutenir Wikipedia" est accessible depuis le menu
- [ ] La page explique le lien entre WikiHop et Wikipedia (données ouvertes, API gratuite)
- [ ] Un bouton ouvre le lien `https://donate.wikimedia.org` dans le navigateur externe
- [ ] L'app ne collecte aucune information sur le don (le don est géré par Wikimedia)
- [ ] Le texte est validé par le DPO pour s'assurer qu'il n'induit pas en erreur sur la nature de l'app

## Notes de réalisation

### Contexte

Story F3-04 — Page donation Wikipedia.
Lien : `docs/stories/phase-3/🔄-F3-04-donation-page.md`

Cette story est entièrement frontend, purement stateless. Elle ne nécessite ni backend, ni store Zustand, ni hook custom. Elle requiert en revanche une validation du texte par le DPO (Maïté) avant la PR finale.

---

### Périmètre

**Dans scope :**
- Composant `DonationScreen` (purement stateless)
- Ajout de la route `Donation` dans `RootNavigator`
- Bouton d'accès depuis `HomeScreen`
- Ouverture du lien externe via `Linking`

**Hors scope :**
- Tout tracking du don (l'app ne collecte aucune information)
- Toute logique métier ou state management
- Intégration dans un menu dédié (il n'existe pas de menu séparé — entrée depuis HomeScreen)
- Validation définitive du texte (placeholder à valider par le DPO)

---

### 1. Composant `DonationScreen`

**Fichier :** `apps/mobile/src/screens/DonationScreen.tsx`

**Type de props :**
```typescript
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type DonationScreenProps = NativeStackScreenProps<RootStackParamList, 'Donation'>;
```

**Composants React Native à utiliser :**
- `SafeAreaView` (react-native-safe-area-context) avec `edges={['top', 'bottom']}`
- `ScrollView` pour le corps de la page (le texte peut être long sur petits écrans)
- `Text` pour les paragraphes
- `TouchableOpacity` pour le bouton d'ouverture du lien
- `View` pour la structure header + séparateur (cohérence avec HomeScreen et VictoryScreen)

**Ouverture du lien externe :**
```typescript
import { Linking } from 'react-native';

const DONATION_URL = 'https://donate.wikimedia.org';

async function handleDonate(): Promise<void> {
  const canOpen = await Linking.canOpenURL(DONATION_URL);
  if (canOpen) {
    await Linking.openURL(DONATION_URL);
  }
}
```

**Important :** `Linking` est importé depuis `'react-native'` (pas depuis `'expo-linking'`). Les deux sont disponibles, mais `react-native` est la dépendance déjà présente et suffit pour ce cas d'usage simple.

**Comportement du composant :**
- Pas de `useState`, pas de `useEffect`, pas de `useRef` — stateless pur
- Un seul `TouchableOpacity` pour le bouton de don : `onPress={() => { void handleDonate(); }}`
- Bouton retour dans le header : `navigation.goBack()`
- `accessibilityRole="button"` sur le bouton de don
- `accessibilityRole="link"` NON utilisé ici — le bouton ouvre le navigateur externe mais il s'agit d'un bouton d'action, pas d'un lien hypertexte inline

---

### 2. Navigation

**Fichier à modifier :** `apps/mobile/src/navigation/RootNavigator.tsx`

Ajouter `Donation` dans `RootStackParamList` :
```typescript
export type RootStackParamList = {
  Home: undefined;
  Game: { articleTitle: string };
  Victory: undefined;
  ArticleViewer: { url: string; title: string };
  History: undefined;   // F3-02
  Donation: undefined;  // F3-04 ← ajouter
};
```

Ajouter le `Stack.Screen` dans `RootNavigator` :
```tsx
<Stack.Screen
  name="Donation"
  component={DonationScreen}
  options={{ headerShown: false }}
/>
```

Import à ajouter : `import { DonationScreen } from '../screens/DonationScreen';`

---

### 3. Intégration dans HomeScreen

Ajouter un bouton "Soutenir Wikipedia" dans `HomeScreen`, positionné dans le header (à droite ou en bas selon les recommandations UX de Benjamin) ou en pied de la zone de contenu.

Recommandation technique : ajouter un `TouchableOpacity` de type lien secondaire (texte bleu simple, pas un bouton plein) sous les boutons "Jouer" et "Nouveaux articles", pour ne pas alourdir visuellement l'écran principal.

```tsx
<TouchableOpacity
  onPress={() => { navigation.navigate('Donation'); }}
  accessibilityLabel="Soutenir Wikipedia"
  accessibilityRole="button"
>
  <Text>Soutenir Wikipedia</Text>
</TouchableOpacity>
```

La position exacte et les styles sont délégués à l'UX/UI (Benjamin). Laurent peut utiliser un style placeholder cohérent avec la palette existante (`#2563EB`, taille 14px) en attendant la maquette.

---

### 4. Texte placeholder (à valider par le DPO — Maïté)

Le texte ci-dessous est un **placeholder provisoire**. Il doit être validé et éventuellement modifié par Maïté (DPO) avant que la PR ne soit mergée.

```
WikiHop et Wikipedia

WikiHop est un jeu de navigation qui utilise l'API publique et gratuite
de Wikipedia pour afficher les articles. Nous ne sommes pas affiliés à
la Fondation Wikimedia.

Wikipedia est maintenu grâce aux dons de millions de personnes dans le
monde. Si vous appréciez Wikipedia et WikiHop, vous pouvez soutenir la
Fondation Wikimedia directement.

Votre don est géré exclusivement par la Fondation Wikimedia. WikiHop
ne collecte aucune information sur votre don et ne reçoit aucune
commission.
```

Bouton : **"Faire un don à Wikipedia"**

**Contrainte DPO :** le texte doit rendre explicite que :
1. WikiHop n'est pas affilié à Wikimedia
2. Le don est géré exclusivement par Wikimedia
3. WikiHop ne collecte aucune donnée liée au don

---

### 5. Pas de state, pas de tests TDD stricts

Ce composant est purement stateless. Il n'y a aucune logique métier à tester en TDD strict.

**Test minimal recommandé (alongside) :**
- Vérifier que `Linking.openURL` est appelé avec `'https://donate.wikimedia.org'` lors du tap sur le bouton
- Vérifier que `navigation.goBack()` est appelé lors du tap sur le bouton retour

Ces tests peuvent être écrits en même temps que le code (pas de TDD strict nécessaire).

---

### 6. Critères de qualité (code review)

- `tsc --noEmit` passe sans erreur
- `npm run lint` passe sans erreur
- Zéro `useState`, `useEffect`, `useRef` dans `DonationScreen` — composant purement stateless
- `Linking` importé depuis `'react-native'` (pas `'expo-linking'`)
- URL hardcodée dans une constante nommée `DONATION_URL` (pas inline dans le JSX)
- `void handleDonate()` sur `onPress` (convention du projet)
- Texte validé par le DPO avant approbation finale de la PR
- `accessibilityLabel` sur le bouton de don
- Export nommé `DonationScreen` (pas de default export)

---

### 7. Points de vigilance

- **Validation DPO bloquante** : la PR peut être développée et reviewée techniquement, mais le merge est conditionné à la validation du texte par Maïté. Laurent doit indiquer dans la description de la PR que la validation DPO est en attente
- **`canOpenURL` sur iOS** : depuis iOS 9, `Linking.canOpenURL` nécessite que le schéma `https` soit déclaré dans `Info.plist` via `LSApplicationQueriesSchemes`. En pratique, `https` est toujours autorisé par défaut — pas de configuration supplémentaire requise pour ce cas
- **Pas de WebView** : le don doit obligatoirement s'ouvrir dans le navigateur externe (Safari/Chrome), pas dans une WebView in-app. La Fondation Wikimedia requiert un environnement de paiement sécurisé que la WebView ne garantit pas. `Linking.openURL` est le bon choix

---

## Spécifications visuelles — Benjamin

---

## Écran : DonationScreen

### Objectif
Informer le joueur du lien entre WikiHop et Wikipedia, et lui permettre d'ouvrir la page de don Wikimedia dans son navigateur.

### Layout (ASCII)

```
┌─────────────────────────────────┐  [FIXED - SafeAreaView top]
│  ←   Soutenir Wikipedia         │  Header 64pt
├─────────────────────────────────┤  Bordure #E2E8F0 1pt
│                                 │  [SCROLL]
│                                 │  paddingTop: 32pt
│           ❤  W                  │  Illustration — centré
│                                 │  marginBottom: 32pt
│  WikiHop et Wikipedia           │  Titre section Bold 18px
│                                 │  marginBottom: 12pt
│  WikiHop est un jeu de          │  Corps Regular 16px
│  navigation qui utilise l'API   │  lineHeight 24pt
│  publique et gratuite de        │
│  Wikipedia pour afficher les    │
│  articles. Nous ne sommes pas   │
│  affiliés à la Fondation        │
│  Wikimedia.                     │
│                                 │  marginBottom: 16pt
│  Wikipedia est maintenu grâce   │  Corps Regular 16px
│  aux dons de millions de        │
│  personnes dans le monde. Si    │
│  vous appréciez Wikipedia et    │
│  WikiHop, vous pouvez soutenir  │
│  la Fondation Wikimedia         │
│  directement.                   │
│                                 │  marginBottom: 16pt
│  ┌─────────────────────────┐    │  Bloc mention légale
│  │ Votre don est géré      │    │  Fond #F8FAFC, coins 8pt
│  │ exclusivement par la    │    │  bordure #E2E8F0 1pt
│  │ Fondation Wikimedia.    │    │  padding 12pt
│  │ WikiHop ne collecte     │    │  Caption 13px #64748B
│  │ aucune information sur  │    │
│  │ votre don et ne reçoit  │    │
│  │ aucune commission.      │    │
│  └─────────────────────────┘    │  marginBottom: 32pt
│                                 │
│  [ Faire un don à Wikipedia ]   │  CTA primaire 52pt
│                                 │  marginBottom: 16pt
│  donate.wikimedia.org           │  URL caption, centré #64748B
│                                 │  paddingBottom: 32pt
└─────────────────────────────────┘  [FIXED - SafeAreaView bottom]
```

### Composants

- **Header** — Hauteur 64pt, fond `#FFFFFF`, bordure bas `#E2E8F0` 1pt. Bouton retour "←" en `position: 'absolute', left: 16` (44×44pt). Titre "Soutenir Wikipedia" centré Bold 18px `#1E293B` (18px justifié : le titre est long, 24px déborderait sur mobile). `accessibilityRole="header"` sur le titre.

- **Illustration** — Composant purement décoratif `accessible={false}`. Deux caractères Unicode côte à côte : "❤" (U+2764) + "W" (lettre Wikipedia stylisée). Taille : 48px. Couleur `#2563EB`. Centré horizontalement. Marginale : marginTop 32pt, marginBottom 32pt. Note : pas d'image externe (composant stateless pur, pas de chargement réseau).

- **Titre de section** — "WikiHop et Wikipedia". Bold 18px `#1E293B`. marginBottom 12pt.

- **Corps texte paragraphe 1** — Regular 16px `#1E293B`, lineHeight 24pt. Texte du placeholder Tech Lead (à valider DPO).

- **Corps texte paragraphe 2** — Regular 16px `#1E293B`, lineHeight 24pt. Texte du placeholder Tech Lead. marginTop 16pt.

- **Bloc mention légale** — `View` avec fond `#F8FAFC`, bordure `#E2E8F0` 1pt, borderRadius 8pt, padding 12pt, marginTop 16pt, marginBottom 32pt. Texte du troisième paragraphe en Caption Regular 13px `#64748B`, lineHeight 20pt. Ce traitement visuel distinct (fond alternatif) différencie la mention légale du corps de texte — elle doit être identifiable comme note importante sans utiliser de couleur seule.

- **Bouton CTA "Faire un don à Wikipedia"** — Hauteur 52pt, fond `#2563EB`, texte Bold 16px blanc, borderRadius 12pt. Pleine largeur (marginHorizontal 0 dans le `contentContainerStyle` de 16pt). `accessibilityLabel="Faire un don à Wikimedia. Ouvre le navigateur."`, `accessibilityRole="button"`.

- **URL de référence** — Texte centré Caption Regular 13px `#64748B`, valeur `"donate.wikimedia.org"` (sans `https://` — plus lisible). marginTop 8pt. `accessible={false}` — information redondante avec le bouton et le label d'accessibilité.

### États

- **Default :** Contenu statique, bouton actif.
- **Loading :** Aucun état de chargement — composant stateless pur. Le bouton ne change pas visuellement pendant le `Linking.openURL` (instantané du point de vue utilisateur).
- **Error :** Aucun état d'erreur propre. Si `Linking.canOpenURL` retourne `false` (cas théorique sur iOS avec schéma `https` standard), le bouton n'exécute rien — pas de feedback visuel nécessaire au-delà de l'absence d'ouverture. Le Tech Lead a confirmé que `https` est toujours autorisé par défaut.
- **Empty :** Sans objet — écran purement statique.

### Accessibilité

- [x] `accessibilityLabel="Retour"` sur le bouton retour, `accessibilityRole="button"`
- [x] `accessibilityRole="header"` sur le titre "Soutenir Wikipedia"
- [x] `accessibilityLabel="Faire un don à Wikimedia. Ouvre le navigateur."` sur le CTA — le suffixe "Ouvre le navigateur." prévient l'utilisateur du changement de contexte (ouverture hors de l'app), exigé par WCAG 2.4.4
- [x] `accessibilityRole="button"` sur le CTA (pas `"link"` — décision confirmée par le Tech Lead dans les specs techniques)
- [x] Contraste titre "Soutenir Wikipedia" `#1E293B` sur `#FFFFFF` : 16.1:1 — conforme
- [x] Contraste corps `#1E293B` sur `#FFFFFF` : 16.1:1 — conforme
- [x] Contraste mention légale `#64748B` sur `#F8FAFC` : 4.5:1 — conforme WCAG AA (valeur limite atteinte — à vérifier impérativement avec un outil comme Colour Contrast Analyser)
- [x] Contraste bouton : blanc `#FFFFFF` sur `#2563EB` : 4.8:1 — conforme
- [x] Contraste URL caption `#64748B` sur `#FFFFFF` : 4.6:1 — conforme
- [x] Zone tactile bouton retour : 44×44pt minimum
- [x] Zone tactile CTA : 52pt hauteur, pleine largeur — conforme
- [x] Illustration "❤ W" : `accessible={false}` — purement décorative
- [x] URL "donate.wikimedia.org" : `accessible={false}` — redondant avec le label du bouton
- [x] Ordre VoiceOver : Header titre → Bouton retour → (ScrollView) Titre section → Paragraphe 1 → Paragraphe 2 → Bloc mention légale → CTA "Faire un don"
- [x] Aucune animation — `reduceMotion` sans impact
- [x] Information de navigation externe communiquée par le texte du label (pas uniquement par la couleur ou une icône)

### Notes pour Laurent

- Le titre du header est "Soutenir Wikipedia" en 18px Bold (pas 24px comme les autres headers). La longueur du titre justifie ce choix — à 24px il déborderait sur les petits écrans (iPhone SE) avec le bouton retour. Laurent peut implémenter en `fontSize: 18` directement dans les styles.
- L'illustration "❤ W" est rendue avec deux `Text` côte à côte dans un `View` en `flexDirection: row`. Pas d'image externe, pas de SVG — cohérence avec l'approche text-only du reste de l'app.
- Le bloc mention légale a un fond `#F8FAFC` pour le différencier du corps. C'est le même token que le fond de GameHUD — pas de nouvelle couleur introduite.
- La contrainte de contraste `#64748B` sur `#F8FAFC` est à la limite du 4.5:1 WCAG AA pour le texte normal 13px. Laurent doit vérifier avec un outil de contraste. Si la valeur mesurée est inférieure à 4.5:1, utiliser `#475569` (qui donne ~6.1:1) pour le texte de ce bloc uniquement.
- L'URL "donate.wikimedia.org" sous le bouton est une aide visuelle pour les utilisateurs qui voudraient noter l'URL — elle n'est pas cliquable.

---

## Modification HomeScreen — ajout bouton Soutenir Wikipedia

**Position décidée par Benjamin :** En bas de la zone `buttonsContainer`, sous le bouton "Historique" (introduit par F3-02). Si F3-02 n'est pas implémenté au moment de cette story, placer "Soutenir Wikipedia" directement sous "Nouveaux articles".

### Layout (ASCII) — zone buttonsContainer complète (F3-02 + F3-04)

```
┌─────────────────────────────────────────┐
│  [ Jouer ]                              │  Bouton primaire plein 52pt #2563EB
│                                         │
│  Nouveaux articles  ↺                   │  Bouton texte 44pt #2563EB
│                                         │
│          Historique                     │  Bouton texte 44pt #64748B
│                                         │
│        Soutenir Wikipedia               │  Bouton texte 44pt #64748B
└─────────────────────────────────────────┘
```

**Spécification du bouton "Soutenir Wikipedia" :**
- Type : bouton texte seul (même traitement que "Historique")
- Hauteur : 44pt minimum
- Texte : "Soutenir Wikipedia" Regular 16px `#64748B`
- Alignement : centré horizontalement
- Marge top : 4pt après le bouton "Historique" (ou "Nouveaux articles" si F3-02 absent)
- `accessibilityLabel="Soutenir Wikipedia — faire un don à Wikimedia"`
- `accessibilityRole="button"`

**Justification de la hiérarchie :** "Jouer" domine (primaire bleu). "Nouveaux articles" est une action liée directement au jeu (secondaire bleu). "Historique" et "Soutenir Wikipedia" sont des accès à des écrans informatifs (tertiaires `#64748B`). L'ordre reflète la fréquence d'usage attendue.

---

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
