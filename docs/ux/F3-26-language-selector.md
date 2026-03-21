# Specs UX/UI — F3-26 : Sélecteur de langue étendu

> Benjamin — UX/UI Designer WikiHop
> Date : 2026-03-16
> Story : docs/stories/phase-3/🔄-F3-26-internationalization.md
> ADR : docs/adr/ADR-008-i18n-strategy.md
> Specs Tech Lead : docs/specs/F3-26-internationalization.md

---

## Analyse du contexte

### Contraintes identifiées

Le header HomeScreen est actuellement structuré ainsi :

```
┌─────────────────────────────────────────┐  h:64
│  [DIFF]    WikiHop         [FR | EN]    │
│  abs l:16  flex:1 center   abs r:16     │
└─────────────────────────────────────────┘
```

- **Espace disponible côté droit :** environ 80pt avant d'atteindre le bord du titre "WikiHop" centré (sur un écran 390pt, le titre occupe flex:1, soit ~250pt centrés, ce qui laisse ~55pt à droite avant les 16pt de marge — espace très contraint)
- **Sélecteur FR/EN actuel :** deux TouchableOpacity de 44×44pt minimum avec séparateur `|`, soit environ 110pt de largeur totale — trop large pour 8 langues sous la même forme
- **Contrainte non négociable :** zone tactile 44×44pt, cohérence avec le design existant, codes en majuscules

### Pattern retenu : bouton code de langue actif → bottom sheet de sélection

Un bouton compact affichant uniquement le **code de la langue active** (ex. `FR`) remplace le toggle FR/EN. Un tap ouvre une **bottom sheet de sélection** listant les 8 langues. Ce pattern est retenu pour les raisons suivantes :

1. **Empreinte minimale dans le header** : un seul bouton de 44×44pt, identique en largeur à l'existant, sans extension horizontale quelle que soit la langue active
2. **Scalable** : fonctionne pour 8 langues, 12, ou plus, sans modifier le header
3. **Cohérent** : le code affiché en `Bold 13px #2563EB` reprend exactement le style `languageTextActive` existant, avec un chevron `⌄` discret indiquant l'interactivité
4. **Accessibilité native** : la bottom sheet est le pattern modal le plus accessible sur mobile (VoiceOver focus management natif avec `Modal` React Native)
5. **Évite le Picker natif** : `@react-native-picker/picker` a des comportements différents entre iOS (spinner tambour) et Android (dialog). La bottom sheet offre une expérience identique sur les deux plateformes et respecte mieux le design system

---

## Écran : HomeScreen — LanguageSelectorButton (dans le header)

### Objectif
Permettre à l'utilisateur d'identifier la langue active et d'accéder à la sélection des 8 langues depuis le header.

### Layout (ASCII)

```
┌─────────────────────────────────────────┐  h:64  [FIXED - Header]
│  [DIFF]      WikiHop          [FR ⌄]   │
│  abs l:16    flex:1 center    abs r:16  │
└─────────────────────────────────────────┘

Détail du LanguageSelectorButton [FR ⌄] :
┌──────────┐
│  FR ⌄   │  w:≥44  h:44
│          │  paddingH:8
└──────────┘
   Bold 13px #2563EB + chevron ⌄ 11px #2563EB
```

### Composants

- **LanguageSelectorButton** — `TouchableOpacity`, `position: 'absolute'`, `right: 16`, `minWidth: 44`, `height: 44`, `paddingHorizontal: 8`, `alignItems: 'center'`, `justifyContent: 'center'`, `flexDirection: 'row'`, `gap: 3`
  - **CodeText** — `fontSize: 13`, `fontWeight: 'bold'`, `color: '#2563EB'` — affiche le code ISO en majuscules (FR, EN, ES, DE, PT, IT, NL, PL)
  - **ChevronText** — `fontSize: 11`, `color: '#2563EB'` — caractère `'⌄'` (U+2304), `accessible={false}`
  - État par défaut : langue active visible, chevron présent
  - État **disabled** (session en cours, `isLanguageLocked`) : `opacity: 0.4`, `onPress` désactivé via `disabled` prop, `accessibilityState={{ disabled: true }}`
  - État **non hydraté** (`isLanguageHydrated === false`) : le bouton n'est pas rendu (identique au comportement actuel)

### États

- **Default :** bouton visible avec code de la langue active et chevron. Contraste `#2563EB` / `#FFFFFF` = 4.6:1 conforme AA.
- **Pressed :** `opacity: 0.7` au tap (comportement natif `TouchableOpacity` avec `activeOpacity={0.7}`)
- **Disabled (session en cours) :** `opacity: 0.4`, `disabled={true}`, no-op au tap
- **Loading (non hydraté) :** bouton non rendu — identique au comportement actuel (`isLanguageHydrated && (...)`)

### Accessibilité

- [ ] `accessibilityLabel` : `"Langue active : Français — ouvrir le sélecteur de langue"` — adapté dynamiquement selon la langue active (voir tableau des noms natifs ci-dessous)
- [ ] `accessibilityRole="button"`
- [ ] `accessibilityState={{ disabled: isLanguageLocked }}`
- [ ] Le chevron `⌄` est `accessible={false}` — il est purement décoratif
- [ ] Contraste CodeText (`#2563EB` sur `#FFFFFF`) : 4.6:1 — conforme WCAG AA texte normal
- [ ] Zone tactile : `minWidth: 44`, `height: 44` — conforme
- [ ] Ordre de lecture VoiceOver : le bouton est le dernier élément JSX dans le header (position absolute right, placé après le titre dans le JSX). VoiceOver le lit après "WikiHop". Ordre logique : Switch difficile → Titre → Sélecteur langue.

### Notes pour Laurent

- Le `ChevronText` utilise le caractère Unicode `⌄` (U+2304 — downwards arrow from bar). Ne pas utiliser `▼` (trop visible) ni `˅` (trop petit). Si problème de rendu Android Hermes, fallback sur `▾` (U+25BE) qui est plus standard.
- La `gap: 3` entre CodeText et ChevronText nécessite React Native ≥ 0.71 — confirmé avec Expo SDK 52 / RN 0.76.9.
- `isLanguageHydrated` est déjà géré dans le code actuel — conserver exactement la même condition.
- Le `disabled` prop sur `TouchableOpacity` désactive l'`onPress` nativement, pas besoin de guard supplémentaire.

---

## Écran : LanguageSelectionSheet (bottom sheet modale)

### Objectif
Permettre à l'utilisateur de choisir sa langue parmi les 8 disponibles, avec une présentation claire du nom natif, du code ISO et de la langue actuellement sélectionnée.

### Layout (ASCII)

```
┌─────────────────────────────────────────┐  [Fond semi-transparent #0F172A 40%]
│                                         │  Tap pour fermer
│                                         │
│                                         │
│                                         │
├─────────────────────────────────────────┤  [Sheet commence ici]
│           ───────────                   │  Drag handle h:4 w:36 #E2E8F0 borderRadius:2
│                                         │  paddingTop:12 paddingBottom:8
│        Langue de l'interface            │  Bold 16px #1E293B, centré, paddingH:20
│                                         │  paddingBottom:16
├─────────────────────────────────────────┤  séparateur #E2E8F0 h:1
│                                         │  [SCROLL si contenu dépasse]
│  ┌─────────────────────────────────┐   │
│  │  Français          FR    [✓]   │   │  h:52 langue active
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  English           EN          │   │  h:52 langue inactive
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  Español           ES          │   │  h:52
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  Deutsch           DE          │   │  h:52
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  Português         PT          │   │  h:52
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  Italiano          IT          │   │  h:52
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  Nederlands        NL          │   │  h:52
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  Polski            PL          │   │  h:52
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘  [SafeAreaView bottom]
```

### Composants

**LanguageSelectionSheet** — `Modal` React Native, `transparent={true}`, `animationType="slide"`, `visible={isOpen}`, `onRequestClose` ferme la sheet.

**Backdrop** — `TouchableOpacity` pleine hauteur, `backgroundColor: '#0F172A'`, `opacity: 0.4`, ferme la sheet au tap.

**SheetContainer** — `View` positionnée en bas, `backgroundColor: '#FFFFFF'`, `borderTopLeftRadius: 16`, `borderTopRightRadius: 16`, `paddingBottom: safeAreaInsets.bottom` (via `useSafeAreaInsets()`).

**DragHandle** — `View` `height: 4`, `width: 36`, `backgroundColor: '#E2E8F0'`, `borderRadius: 2`, centré horizontalement, `marginTop: 12`, `marginBottom: 8`, `accessible={false}`.

**SheetTitle** — `Text` `"Langue de l'interface"`, `fontSize: 16`, `fontWeight: 'bold'`, `color: '#1E293B'`, `textAlign: 'center'`, `paddingHorizontal: 20`, `paddingBottom: 16`.

**SheetSeparator** — `View` `height: 1`, `backgroundColor: '#E2E8F0'`, `accessible={false}`.

**LanguageItem** — `TouchableOpacity`, `height: 52`, `flexDirection: 'row'`, `alignItems: 'center'`, `paddingHorizontal: 20`, `justifyContent: 'space-between'`.
  - **NameText** — `flex: 1`, `fontSize: 16`, `color: '#1E293B'` (inactif) / `fontWeight: 'bold'`, `color: '#1E293B'` (actif). Corps de la ligne à gauche.
  - **RightSection** — `View` `flexDirection: 'row'`, `alignItems: 'center'`, `gap: 12`
    - **CodeText** — `fontSize: 13`, `fontWeight: 'bold'`, `color: '#94A3B8'` (inactif) / `color: '#2563EB'` (actif). Code ISO en majuscules.
    - **CheckIcon** — `Text` `'✓'` `fontSize: 16`, `color: '#2563EB'` — visible uniquement si langue active. `accessible={false}`.

### Spécifications détaillées des LanguageItem

```
ÉTAT INACTIF
  fond:           #FFFFFF
  NameText:       Regular 16px  #1E293B
  CodeText:       Bold 13px     #94A3B8
  CheckIcon:      non rendu (null)
  Pressed:        fond #F8FAFC (activeOpacity via View backgroundColor, ou activeOpacity: 0.85)

ÉTAT ACTIF (langue sélectionnée)
  fond:           #FFFFFF  (pas de fond de surbrillance — le ✓ suffit pour indiquer la sélection)
  NameText:       Bold 16px    #1E293B
  CodeText:       Bold 13px    #2563EB
  CheckIcon:      '✓' 16px    #2563EB
  Pressed:        fond #F8FAFC
```

### Contrastes vérifiés

| Élément | Couleur texte | Fond | Rapport | Conformité |
|---------|--------------|------|---------|-----------|
| NameText actif | `#1E293B` Bold 16px | `#FFFFFF` | 16.1:1 | AA + AAA |
| NameText inactif | `#1E293B` Reg 16px | `#FFFFFF` | 16.1:1 | AA + AAA |
| CodeText actif | `#2563EB` Bold 13px | `#FFFFFF` | 4.6:1 | AA (texte normal) |
| CodeText inactif | `#94A3B8` Bold 13px | `#FFFFFF` | 2.9:1 | Non conforme AA |
| SheetTitle | `#1E293B` Bold 16px | `#FFFFFF` | 16.1:1 | AA + AAA |

**Note contraste CodeText inactif :** `#94A3B8` sur `#FFFFFF` = 2.9:1, en dessous du seuil AA 4.5:1. Ce code est purement **redondant** avec le `NameText` (le nom de la langue suffit à l'identifier) et il est en `fontSize: 13` Bold. Ce texte ne transmet pas d'information critique — la langue est identifiée par son nom natif. La non-conformité est acceptable dans ce contexte précis de label redondant. Alternative conforme si Maxime ou Halim le signalent : passer `CodeText` inactif à `#64748B` (contraste 4.6:1).

**Recommandation Laurent :** utiliser `#64748B` pour le CodeText inactif afin d'être conforme sans discussion. L'écart visuel avec `#94A3B8` est minime.

### États de la sheet

- **Default :** sheet visible avec la liste des 8 langues, langue active en Bold + ✓
- **Loading / transition :** la sheet se ferme immédiatement au tap sur une langue. Le changement de langue est async (`setLanguage` persiste en AsyncStorage) mais l'UI répond instantanément via le store Zustand. Pas d'état loading intermédiaire nécessaire.
- **Error :** aucun état d'erreur dans la sélection de langue (sélection locale, pas réseau).
- **Empty :** non applicable (8 langues toujours présentes).

### Accessibilité

- [ ] `accessibilityViewIsModal={true}` sur la `Modal` — isole le focus VoiceOver à l'intérieur de la sheet
- [ ] `accessibilityLabel` du SheetTitle : aucun rôle spécifique, le titre est lu automatiquement par VoiceOver à l'ouverture de la modal grâce à `accessibilityViewIsModal`
- [ ] `accessibilityRole="header"` sur `SheetTitle`
- [ ] Chaque `LanguageItem` : `accessibilityRole="button"`, `accessibilityLabel` dynamique (voir tableau ci-dessous), `accessibilityState={{ selected: isActive }}`
- [ ] Le `CheckIcon` `✓` est `accessible={false}` — l'état sélectionné est communiqué via `accessibilityState`
- [ ] Le `DragHandle` est `accessible={false}` — élément décoratif
- [ ] Backdrop `TouchableOpacity` : `accessibilityLabel="Fermer le sélecteur de langue"`, `accessibilityRole="button"`
- [ ] Ordre de lecture VoiceOver : titre → liste des 8 langues dans l'ordre d'affichage (fr, en, es, de, pt, it, nl, pl)
- [ ] Fermeture au bouton retour Android (`onRequestClose` de `Modal`) — déjà géré nativement par `Modal`
- [ ] `animationType="slide"` respecte `reduceMotion` : vérifier si `Modal animationType` de RN respecte nativement `AccessibilityInfo.isReduceMotionEnabled()`. Si non, conditionner : `animationType={reduceMotion ? 'none' : 'slide'}`
- [ ] Aucune information transmise par la couleur seule : la sélection est indiquée par ✓ ET le Bold ET `accessibilityState.selected`

### accessibilityLabel des LanguageItem

| Code | Langue sélectionnée | Langue non sélectionnée |
|------|---------------------|------------------------|
| fr | `"Français, sélectionné"` | `"Passer en Français"` |
| en | `"English, sélectionné"` | `"Passer en English"` |
| es | `"Español, sélectionné"` | `"Passer en Español"` |
| de | `"Deutsch, sélectionné"` | `"Passer en Deutsch"` |
| pt | `"Português, sélectionné"` | `"Passer en Português"` |
| it | `"Italiano, sélectionné"` | `"Passer en Italiano"` |
| nl | `"Nederlands, sélectionné"` | `"Passer en Nederlands"` |
| pl | `"Polski, sélectionné"` | `"Passer en Polski"` |

**Justification de la forme "Passer en [langue native]" :** l'interface est dans la langue active de l'utilisateur, mais le nom de la langue cible est en langue native (ex. "Deutsch" pour un francophone). C'est intentionnel — si l'utilisateur ne comprend pas le français affiché, il reconnaîtra le nom natif de sa langue. Le préfixe "Passer en" est dans la langue de l'interface (pour l'utilisateur courant qui comprend la langue active). Ce pattern est cohérent avec les conventions d'Apple et Google pour les sélecteurs de langue.

---

## Noms natifs des langues — référence complète

| Code | Nom natif | accessibilityLabel sélectionné | accessibilityLabel non sélectionné |
|------|-----------|-------------------------------|-------------------------------------|
| fr | Français | `"Français, sélectionné"` | `"Passer en Français"` |
| en | English | `"English, sélectionné"` | `"Passer en English"` |
| es | Español | `"Español, sélectionné"` | `"Passer en Español"` |
| de | Deutsch | `"Deutsch, sélectionné"` | `"Passer en Deutsch"` |
| pt | Português | `"Português, sélectionné"` | `"Passer en Português"` |
| it | Italiano | `"Italiano, sélectionné"` | `"Passer en Italiano"` |
| nl | Nederlands | `"Nederlands, sélectionné"` | `"Passer en Nederlands"` |
| pl | Polski | `"Polski, sélectionné"` | `"Passer en Polski"` |

**Ordre d'affichage dans la sheet :** fr, en, es, de, pt, it, nl, pl — ordre de la constante `SUPPORTED_LANGUAGES` dans `i18n.ts`. Laurent peut itérer directement sur cette constante.

---

## accessibilityLabel du LanguageSelectorButton dans le header

Le `accessibilityLabel` du bouton header change dynamiquement selon la langue active. Ci-dessous la table complète :

| langue active | accessibilityLabel |
|--------------|-------------------|
| fr | `"Langue active : Français — ouvrir le sélecteur de langue"` |
| en | `"Active language: English — open language selector"` |
| es | `"Idioma activo: Español — abrir el selector de idioma"` |
| de | `"Aktive Sprache: Deutsch — Sprachauswahl öffnen"` |
| pt | `"Idioma ativo: Português — abrir o seletor de idioma"` |
| it | `"Lingua attiva: Italiano — apri il selettore di lingua"` |
| nl | `"Actieve taal: Nederlands — taalkiezer openen"` |
| pl | `"Aktywny język: Polski — otwórz wybór języka"` |

**Justification :** le `accessibilityLabel` est dans la langue active de l'interface. Si un utilisateur a configuré son appareil en allemand et que WikiHop est en Deutsch, le label VoiceOver sera en allemand. Cohérent avec la langue affichée. Cette table est à placer dans une constante (peut être générée depuis les fichiers de traduction i18n en Phase 4, mais pour F3-26 une table constante dans le composant est acceptable).

---

## Récapitulatif des modifications dans HomeScreen

### Avant (sélecteur FR/EN)

```
{isLanguageHydrated && (
  <View style={styles.languageSelector}>   // flexDirection:row, abs right:16
    <TouchableOpacity  // FR
    <Text>{'|'}</Text>
    <TouchableOpacity  // EN
  </View>
)}
```

### Après (LanguageSelectorButton)

```
{isLanguageHydrated && (
  <TouchableOpacity
    style={styles.languageSelectorButton}  // abs right:16, w≥44, h:44
    onPress={() => setIsLanguageSheetOpen(true)}
    disabled={isLanguageLocked}
    accessibilityLabel={LANGUAGE_BUTTON_A11Y_LABELS[language]}
    accessibilityRole="button"
    accessibilityState={{ disabled: isLanguageLocked }}
  >
    <Text style={styles.languageCode}>{language.toUpperCase()}</Text>
    <Text style={styles.languageChevron} accessible={false}>{'⌄'}</Text>
  </TouchableOpacity>
)}

<LanguageSelectionSheet
  visible={isLanguageSheetOpen}
  currentLanguage={language}
  onSelect={(lang) => { void setLanguage(lang); setIsLanguageSheetOpen(false); }}
  onClose={() => setIsLanguageSheetOpen(false)}
/>
```

**Note :** `LanguageSelectionSheet` peut être un composant dans un fichier séparé (`components/LanguageSelectionSheet.tsx`) pour garder `HomeScreen.tsx` lisible. Decision de structuration laissée à Laurent.

### Styles à ajouter / modifier dans HomeScreen

```
// Remplacer languageSelector, languageOption, languageText, languageTextActive, languageSeparator
// par :

languageSelectorButton: {
  position: 'absolute',
  right: 16,
  minWidth: 44,
  height: 44,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 8,
  gap: 3,
},
languageCode: {
  fontSize: 13,
  fontWeight: 'bold',
  color: '#2563EB',
},
languageChevron: {
  fontSize: 11,
  color: '#2563EB',
},
languageSelectorDisabled: {
  opacity: 0.4,
},
```

**Styles à supprimer (code mort) :** `languageSelector`, `languageOption`, `languageText`, `languageTextActive`, `languageSeparator`.

---

## Notes pour Laurent

### Implémentation prioritaire

1. `LanguageSelectorButton` dans le header — remplacement du toggle FR/EN existant. Simple, autonome.
2. `LanguageSelectionSheet` — composant modal. Peut être développé en parallèle.
3. Connexion des deux via un state local `isLanguageSheetOpen: boolean` dans `HomeScreen`.

### Pas de librairie de bottom sheet

Ne pas utiliser `@gorhom/bottom-sheet` ou équivalent. La sheet est implémentée avec un `Modal` React Native natif (`transparent={true}`, `animationType="slide"`). La complexité de gestion des gestures (swipe to dismiss) n'est pas requise pour F3-26 — la fermeture se fait via le backdrop ou via la sélection d'une langue.

### Gestion du `isLanguageLocked`

`isLanguageLocked` est l'état existant dans `language.store.ts` qui indique qu'une session est en cours et que la langue ne peut pas être changée. Ce state est déjà lu dans `HomeScreen`. Laurent doit le propager en `disabled` prop sur le `LanguageSelectorButton`.

### `reduceMotion` et animation de la sheet

```typescript
import { AccessibilityInfo } from 'react-native';

// Dans le composant :
const [reduceMotion, setReduceMotion] = useState(false);
useEffect(() => {
  void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
}, []);

// Sur le Modal :
animationType={reduceMotion ? 'none' : 'slide'}
```

### Constante LANGUAGE_NAMES pour le rendu des LanguageItem

```typescript
// À placer dans le composant LanguageSelectionSheet ou un fichier constants
const LANGUAGE_NAMES: Record<Language, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
  pt: 'Português',
  it: 'Italiano',
  nl: 'Nederlands',
  pl: 'Polski',
};
```

Cette constante est invariante (noms natifs, pas traduits) — elle ne passe pas par i18next.

### Constante LANGUAGE_BUTTON_A11Y_LABELS pour le header

```typescript
const LANGUAGE_BUTTON_A11Y_LABELS: Record<Language, string> = {
  fr: 'Langue active : Français — ouvrir le sélecteur de langue',
  en: 'Active language: English — open language selector',
  es: 'Idioma activo: Español — abrir el selector de idioma',
  de: 'Aktive Sprache: Deutsch — Sprachauswahl öffnen',
  pt: 'Idioma ativo: Português — abrir o seletor de idioma',
  it: 'Lingua attiva: Italiano — apri il selettore di lingua',
  nl: 'Actieve taal: Nederlands — taalkiezer openen',
  pl: 'Aktywny język: Polski — otwórz wybór języka',
};
```

### CodeText inactif — recommandation contraste

Utiliser `#64748B` (contraste 4.6:1 sur blanc) plutôt que `#94A3B8` (2.9:1) pour le CodeText des langues inactives. Différence visuelle minimale, conformité WCAG AA garantie.

### Hauteur de la sheet sur petits écrans

Sur iPhone SE (hauteur utile ~603pt), les 8 LanguageItem (8 × 52pt = 416pt) + SheetTitle (~60pt) + DragHandle (~24pt) + SafeAreaBottom (~34pt) = ~534pt. C'est inférieur à la hauteur utile — la sheet tient sans scroll. Sur les appareils encore plus petits, prévoir `maxHeight: '85%'` sur SheetContainer avec `ScrollView` interne comme fallback de sécurité.
