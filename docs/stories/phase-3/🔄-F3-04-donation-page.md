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

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
