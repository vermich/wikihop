---
id: F3-06
title: Écran "À propos" et crédits
phase: 3-Features
priority: Should
agents: [Frontend Dev, UX/UI, DPO]
status: pending
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

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
