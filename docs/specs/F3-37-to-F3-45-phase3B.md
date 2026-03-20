# Spécifications techniques — Phase 3B (F3-37 à F3-45)

**Destinataires :** Laurent (Frontend Dev)
**Tech Lead :** Maxime
**Date :** 2026-03-20
**Stories :** F3-37, F3-38, F3-39, F3-40, F3-41, F3-42, F3-43, F3-44, F3-45

---

## Vue d'ensemble

Ces 9 stories constituent un lot de polish UI et de correctifs fonctionnels. Elles sont toutes
exclusivement frontend (React Native / Expo). Aucune modification backend n'est requise, à
l'exception de F3-38 qui touche le backend via l'ajout de fallback JSON statiques.

**Conventions communes :**
- TypeScript strict, zéro `any` non justifié
- Exports nommés, `StyleSheet.create()` en bas de fichier
- Clés i18n ajoutées dans les 8 locales : `fr`, `en`, `es`, `de`, `pt`, `it`, `nl`, `pl`
- Conventional Commits : `fix(mobile):` pour les bugs, `feat(mobile):` pour les ajouts de feature,
  `feat(backend):` pour F3-38 côté backend

---

## F3-37 — Fix contraste bouton défi du jour (FR locale)

**Story :** `docs/stories/phase-3/🔄-F3-37-fix-daily-challenge-button-contrast.md`

### Diagnostic

Le bouton défi du jour dispose de trois styles selon son état (défini dans `HomeScreen.tsx`) :

| État | Style | Fond | Texte |
|------|-------|------|-------|
| Chargement | `dailyButtonDisabled` | `#E2E8F0` | `#94A3B8` via `dailyButtonTextDisabled` |
| Disponible | `dailyButton` | `#D97706` | `#FFFFFF` via `dailyButtonText` |
| Complété | `dailyButtonCompleted` | `#92400E` | `#FFFFFF` via `dailyButtonTextCompleted` |

Le problème de contraste se produit dans l'**état de chargement** : fond `#E2E8F0` (gris clair)
avec texte `#94A3B8` — ratio WCAG AA ≈ 2.0:1, insuffisant (minimum requis : 4.5:1 pour texte normal).

La traduction FR (`"Défi du jour"`) est plus longue que EN (`"Daily Challenge"`) mais ce n'est pas
la cause du problème : c'est le style `dailyButtonTextDisabled` appliqué sur fond gris clair.

### Fichiers à modifier

- `apps/mobile/src/screens/HomeScreen.tsx`

### Changements à apporter

**Dans `StyleSheet.create()`, modifier `dailyButtonTextDisabled` :**

```
// Avant
dailyButtonTextDisabled: {
  color: '#94A3B8',
},

// Après — ratio WCAG AA 4.5:1 garanti sur fond #E2E8F0
dailyButtonTextDisabled: {
  color: '#475569',
},
```

Vérification ratios (outil de référence : [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)) :
- `#475569` sur `#E2E8F0` : ratio ≈ 5.0:1 — WCAG AA conforme (texte normal)
- `#FFFFFF` sur `#D97706` : ratio ≈ 3.0:1 — acceptable pour texte gras de grande taille (18px bold)
- `#FFFFFF` sur `#92400E` : ratio ≈ 5.2:1 — WCAG AA conforme

> Le style `dailyButtonTextDisabled` est utilisé dans deux branches du `renderContent()`
> (état loading ET état success quand désactivé). Les deux sont concernés par ce fix.

### Tests TDD

Aucune fonction pure n'est introduite. Pas de test requis pour cette story.

### Critères de validation

- [ ] Ratio contraste texte/fond du bouton en état désactivé ≥ 4.5:1 (WCAG AA)
- [ ] Aucune régression visuelle sur les états "disponible" et "complété"
- [ ] `npm run lint` et `tsc --noEmit` passent

---

## F3-38 — Fix articles non chargés pour ES/DE/PT/IT/NL/PL

**Story :** `docs/stories/phase-3/🔄-F3-38-fix-articles-not-loading-non-en-fr.md`

### Diagnostic

**Cause côté backend** : `popular-pages.service.ts` — la fonction `getPopularPages()` retourne
un tableau vide (`articles: []`) pour ES/DE/PT/IT/NL/PL quand l'API Wikimedia échoue, car aucun
fallback statique n'existe pour ces langues. La route `GET /api/game/random-pair` reçoit alors
un pool vide → 503.

**Cause côté WebView** : `WikipediaWebView.tsx` charge `https://{lang}.m.wikipedia.org/wiki/{titre}`
via `buildArticleUrl()`. Ce mapping est correct — si `lang = 'es'`, l'URL générée est bien
`https://es.m.wikipedia.org/wiki/...`. Pas de bug ici.

**Cause côté wikipedia.service.ts (frontend)** : `buildArticleUrl` dans `WikipediaWebView.tsx`
utilise directement `lang` comme sous-domaine Wikipedia — le mapping est direct et correct pour
toutes les 8 langues. Pas de bug frontend.

**La seule correction nécessaire est backend** : ajouter des fallbacks statiques JSON pour les
6 langues manquantes dans `apps/backend/src/assets/popular-pages.json`.

### Fichiers à modifier

**Backend :**
- `apps/backend/src/assets/popular-pages.json` — ajout des 6 langues
- `apps/backend/src/services/popular-pages.service.ts` — élargir `FallbackLanguage` et la logique

### Changements à apporter

#### 1. `apps/backend/src/assets/popular-pages.json`

Ajouter les 6 nouvelles clés. Chaque liste doit contenir **au minimum 50 titres** d'articles
encyclopédiques jouables, sans underscore, sans préfixes de namespace, en orthographe native.

Structure attendue (les listes réelles sont à remplir par Julien) :

```typescript
{
  "fr": [ /* existant — 259 items */ ],
  "en": [ /* existant — 268 items */ ],
  "es": [
    "Albert Einstein", "Charles Darwin", "Segunda Guerra Mundial",
    "Estados Unidos", "España", "México", "Argentina", "Colombia",
    "Napoleón Bonaparte", "Adolf Hitler", "Isaac Newton", "Leonardo da Vinci",
    "William Shakespeare", "Cristóbal Colón", "Francisco Franco",
    "Imperio Romano", "Primera Guerra Mundial", "Revolución Francesa",
    "Edad Media", "Renacimiento", "Civilización griega", "Imperio Azteca",
    "Simón Bolívar", "Che Guevara", "Pablo Picasso", "Salvador Dalí",
    "Miguel de Cervantes", "Gabriel García Márquez", "Mario Vargas Llosa",
    "Frida Kahlo", "Diego Rivera", "Jorge Luis Borges", "Octavio Paz",
    "Gustavo Adolfo Bécquer", "Federico García Lorca", "Antonio Gaudí",
    "Santiago Ramón y Cajal", "Severo Ochoa", "Sistema solar", "Galaxia",
    "Agujero negro", "Evolución", "ADN", "Célula", "Fotosíntesis",
    "Cambio climático", "Energía renovable", "Inteligencia artificial",
    "Internet", "Ordenador", "Teléfono móvil", "Televisión", "Cine",
    "Música clásica", "Ópera", "Ballet", "Fútbol", "Olimpiadas"
    /* ... compléter jusqu'à 80+ titres */
  ],
  "de": [
    "Albert Einstein", "Adolf Hitler", "Karl Marx", "Friedrich Nietzsche",
    "Martin Luther", "Immanuel Kant", "Johann Wolfgang von Goethe",
    "Friedrich Schiller", "Ludwig van Beethoven", "Johann Sebastian Bach",
    "Wolfgang Amadeus Mozart", "Richard Wagner", "Friedrich der Große",
    "Otto von Bismarck", "Kaiser Wilhelm II", "Zweiter Weltkrieg",
    "Erster Weltkrieg", "Deutsche Demokratische Republik",
    "Berlin", "Bundesrepublik Deutschland", "Weimarer Republik",
    "Reformation", "Dreißigjähriger Krieg", "Heiliges Römisches Reich",
    "Nazis", "Drittes Reich", "Holocaust", "Kalter Krieg",
    "Wiedervereinigung Deutschlands", "Europäische Union",
    "Sonnensystem", "Schwarzes Loch", "Quantenmechanik", "Relativitätstheorie",
    "DNA", "Evolution", "Klimawandel", "Künstliche Intelligenz",
    "Internet", "Photosynthese", "Periodensystem", "Atomkern",
    "Sigmund Freud", "Carl Gustav Jung", "Max Planck", "Werner Heisenberg",
    "Robert Koch", "Alexander von Humboldt", "Carl Friedrich Gauss",
    "Gottfried Wilhelm Leibniz", "Johannes Kepler", "Nikolaus Kopernikus",
    "Roman (Literatur)", "Symphonie", "Oper", "Fußball", "Olympische Spiele"
    /* ... compléter jusqu'à 80+ titres */
  ],
  "pt": [
    "Albert Einstein", "Brasil", "Portugal", "Lisboa", "São Paulo",
    "Rio de Janeiro", "Luís de Camões", "Fernando Pessoa", "José Saramago",
    "Dom Pedro I", "Marquês de Pombal", "Vasco da Gama", "Pedro Álvares Cabral",
    "Inquisição portuguesa", "Revolução Francesa", "Segunda Guerra Mundial",
    "Idade Média", "Renascimento", "Sistema Solar", "Buraco negro",
    "ADN", "Evolução", "Mudanças climáticas", "Inteligência artificial",
    "Internet", "Fotossíntese", "Célula", "Napoleão Bonaparte",
    "Isaac Newton", "Charles Darwin", "Leonardo da Vinci", "Galileu Galilei",
    "Nikola Tesla", "Marie Curie", "William Shakespeare", "Dante Alighieri",
    "Miguel de Cervantes", "Machado de Assis", "Jorge Amado", "Eça de Queirós",
    "Getúlio Vargas", "Lula", "Salazar", "Tiradentes", "Zumbi",
    "Futebol", "Carnaval do Brasil", "Samba", "Bossa nova", "Capoeira",
    "Amazónia", "Floresta Tropical", "Oceano Atlântico", "Café", "Borracha"
    /* ... compléter jusqu'à 80+ titres */
  ],
  "it": [
    "Dante Alighieri", "Leonardo da Vinci", "Michelangelo Buonarroti",
    "Galileo Galilei", "Alessandro Volta", "Giuseppe Verdi", "Giuseppe Garibaldi",
    "Benito Mussolini", "Giulio Cesare", "Augusto", "Impero Romano",
    "Repubblica Romana", "Rinascimento", "Risorgimento", "Prima guerra mondiale",
    "Seconda guerra mondiale", "Federico II di Svevia", "Marco Polo",
    "Amerigo Vespucci", "Cristoforo Colombo", "Niccolò Machiavelli",
    "Giovanni Boccaccio", "Francesco Petrarca", "Alessandro Manzoni",
    "Giacomo Leopardi", "Luigi Pirandello", "Umberto Eco", "Italo Calvino",
    "Roma", "Milano", "Venezia", "Firenze", "Napoli", "Sicilia",
    "Sistema solare", "Buco nero", "DNA", "Evoluzione", "Fotosintesi",
    "Intelligenza artificiale", "Internet", "Cambiamento climatico",
    "Albert Einstein", "Isaac Newton", "Charles Darwin", "Marie Curie",
    "Nikola Tesla", "Enrico Fermi", "Guglielmo Marconi", "Antonio Meucci",
    "Calcio", "Giochi olimpici", "Opera lirica", "Cinema", "Arte"
    /* ... compléter jusqu'à 80+ titres */
  ],
  "nl": [
    "Albert Einstein", "Anne Frank", "Rembrandt van Rijn", "Vincent van Gogh",
    "Erasmus", "Hugo de Groot", "Spinoza", "René Descartes",
    "Willem van Oranje", "Napoleon Bonaparte", "Tweede Wereldoorlog",
    "Eerste Wereldoorlog", "Gouden Eeuw", "VOC", "Tachtigjarige Oorlog",
    "Nederlandse Opstand", "Republiek der Zeven Verenigde Nederlanden",
    "Amsterdam", "Rotterdam", "Den Haag", "Nederland", "België",
    "Zonnestelsel", "Zwart gat", "DNA", "Evolutie", "Fotosynthese",
    "Klimaatverandering", "Kunstmatige intelligentie", "Internet",
    "Isaac Newton", "Charles Darwin", "Marie Curie", "Nikola Tesla",
    "Leonardo da Vinci", "William Shakespeare", "Mozart", "Beethoven",
    "Christiaan Huygens", "Antonie van Leeuwenhoek", "Jan Tinbergen",
    "Simon Stevin", "Pieter Zeeman", "Heike Kamerlingh Onnes",
    "Voetbal", "Olympische Spelen", "Schilderkunst", "Architectuur",
    "Tulp", "Windmolen", "Fiets", "Kaas", "Chocolade"
    /* ... compléter jusqu'à 80+ titres */
  ],
  "pl": [
    "Albert Einstein", "Mikołaj Kopernik", "Maria Skłodowska-Curie",
    "Fryderyk Chopin", "Adam Mickiewicz", "Jan III Sobieski",
    "Tadeusz Kościuszko", "Józef Piłsudski", "Lech Wałęsa", "Jan Paweł II",
    "Bolesław I Chrobry", "Kazimierz Wielki", "Stefan Batory",
    "Polska", "Warszawa", "Kraków", "Gdańsk", "Wrocław",
    "II Rzeczpospolita", "PRL", "Solidarność", "II wojna światowa",
    "I wojna światowa", "Bitwa pod Grunwaldem", "Powstanie Warszawskie",
    "Holokaust", "Zimna Wojna", "Unia Europejska",
    "Układ Słoneczny", "Czarna dziura", "DNA", "Ewolucja", "Fotosynteza",
    "Sztuczna inteligencja", "Internet", "Zmiany klimatyczne",
    "Izaak Newton", "Karol Darwin", "Mikołaj Kopernik",
    "Władysław Reymont", "Henryk Sienkiewicz", "Wisława Szymborska",
    "Czesław Miłosz", "Stanisław Lem", "Bruno Schulz", "Juliusz Słowacki",
    "Piłka nożna", "Igrzyska olimpijskie", "Muzyka klasyczna", "Film"
    /* ... compléter jusqu'à 80+ titres */
  ]
}
```

**Règles de qualité pour les listes :**
- Pas d'underscores (les remplacer par des espaces)
- Pas de préfixes namespace (`Portail:`, `Category:`, etc.)
- Pas de pages d'homonymie simples (titre = `"Napoléon"` risqué — préférer `"Napoléon Bonaparte"`)
- Titres en langue native (ex: `"Zweiter Weltkrieg"` pas `"Second World War"` pour `de`)
- Minimum 80 titres par langue pour que le mode difficile (dernier tiers) reste viable

#### 2. `apps/backend/src/services/popular-pages.service.ts`

Étendre `FallbackLanguage` et la logique de fallback :

```typescript
// Avant
type FallbackLanguage = 'fr' | 'en';

// Après
type FallbackLanguage = 'fr' | 'en' | 'es' | 'de' | 'pt' | 'it' | 'nl' | 'pl';
```

```typescript
// Avant — dans popularPagesData type
type PopularPagesData = { fr: string[]; en: string[] };

// Après
type PopularPagesData = {
  fr: string[];
  en: string[];
  es: string[];
  de: string[];
  pt: string[];
  it: string[];
  nl: string[];
  pl: string[];
};
```

```typescript
// Avant — condition fallback dans getPopularPages()
if (language === 'fr' || language === 'en') {

// Après
if (
  language === 'fr' || language === 'en' || language === 'es' ||
  language === 'de' || language === 'pt' || language === 'it' ||
  language === 'nl' || language === 'pl'
) {
```

Le commentaire `Autres langues : pas de fallback statique` est à supprimer — la condition couvre
désormais toutes les langues supportées. Le bloc `return { articles: [], ... }` final devient
unreachable (le type `SupportedLanguage` est exhaustif) — le garder comme garde défensive.

### Tests TDD

Aucune fonction pure nouvelle n'est introduite. Les tests existants de `popular-pages.service.ts`
doivent continuer à passer.

Ajouter un test d'intégration dans le fichier de tests existant du service pour chaque nouvelle
langue : `getPopularPages('es')`, `getPopularPages('de')`, etc., en mockant `fetchPopularPagesFromWikimedia`
pour retourner `null` → vérifier que le fallback JSON est utilisé et retourne un tableau non vide.

### Critères de validation

- [ ] `GET /api/game/random-pair?lang=es` retourne 200 (pas 503) quand l'API Wikimedia est down
- [ ] Même test pour `de`, `pt`, `it`, `nl`, `pl`
- [ ] Chaque langue a ≥ 80 articles dans le JSON statique
- [ ] Aucune régression sur `fr` et `en`
- [ ] `tsc --noEmit` passe (types `PopularPagesData` et `FallbackLanguage` à jour)

---

## F3-39 — Retirer la pillule "DIFF" du GameHUD

**Story :** `docs/stories/phase-3/🔄-F3-39-remove-diff-pill-gamehud.md`

### Diagnostic

Dans `GameHUD.tsx`, quand `isHardMode = true`, le composant rend une `View` avec le texte `'DIFF'`
(styles `hardModePill` / `hardModePillText`) suivie d'un `View separator`. Cette pillule occupe
de l'espace horizontal et compresse le `targetBlock` (flex:1), ce qui tronque le titre cible.

### Fichiers à modifier

- `apps/mobile/src/components/game/GameHUD.tsx`

### Changements à apporter

1. **Supprimer le bloc JSX de la pill DIFF** (lignes 91–99) :

```tsx
// Supprimer entièrement ce bloc conditionnel :
{isHardMode && (
  <>
    <View style={styles.hardModePill} accessible={false}>
      <Text style={styles.hardModePillText} accessible={false}>
        {'DIFF'}
      </Text>
    </View>
    <View style={styles.separator} accessible={false} />
  </>
)}
```

2. **Supprimer les styles** `hardModePill` et `hardModePillText` du `StyleSheet.create()`.

3. **Conserver** la prop `isHardMode?: boolean` dans l'interface `GameHUDProps` — elle est utilisée
   ailleurs (`ArticleScreen.tsx` la passe, et l'`accessibilityLabel` du container l'utilise via
   `difficultyPrefix`). Ne pas la retirer.

4. **Conserver** la variable `difficultyPrefix` et son usage dans `containerAccessibilityLabel`.
   L'indicateur de mode difficile reste présent dans l'accessibilité vocale, juste pas visuellement.

> **Point de vigilance** : ne pas toucher à `containerAccessibilityLabel` qui intègre
> `difficultyPrefix` — c'est du code de présentation, pas visuel. La suppression est
> uniquement visuelle.

### Tests TDD

Aucune fonction pure concernée. Pas de test requis.

### Critères de validation

- [ ] La pill "DIFF" n'est plus visible en mode difficile
- [ ] Le titre cible s'affiche sans troncature (vérifier avec un titre long > 20 caractères)
- [ ] `tsc --noEmit` et `npm run lint` passent (pas de style mort non utilisé)

---

## F3-40 — Titre article centré dans header ArticleScreen (sans bouton retour)

**Story :** `docs/stories/phase-3/🔄-F3-40-fix-article-header-title-centering.md`

### Diagnostic

Dans `ArticleScreen.tsx`, le header est composé de :
- Gauche : bouton "← Retour" (`backButton`, `minWidth: 44`) OU `backButtonPlaceholder` (`width: 44`)
- Centre : titre `currentTitle` (flex:1, `textAlign: 'left'`)
- Droite : bouton "Abandonner" (`homeButton`, `paddingHorizontal: 8`)

**Problème** : `textAlign: 'left'` sur le titre + le bouton droite (Abandonner) occupe une largeur
variable selon la traduction → le titre ne se centre pas optiquement.

Le `backButtonPlaceholder` (`width: 44`) existe déjà pour remplir l'espace gauche quand le bouton
retour est absent. Mais le bouton "Abandonner" à droite n'a pas de pendant symétrique, donc le
titre reste décalé visuellement même avec `textAlign: 'center'`.

### Solution

**Layout symétrique** : quand le bouton retour est visible, le titre s'aligne naturellement à gauche
(comportement actuel). Quand il est absent, on veut le centrer — ce qui nécessite que la contrainte
droite soit symétrique à gauche.

**Approche** : modifier `textAlign` en `'center'` dans le style `headerTitle` ET s'assurer que le
`backButtonPlaceholder` et le bouton `homeButton` ont des largeurs identiques ou que le layout
reste cohérent.

### Fichiers à modifier

- `apps/mobile/src/screens/ArticleScreen.tsx`

### Changements à apporter

1. **Modifier `headerTitle`** pour passer `textAlign: 'left'` en `textAlign: 'center'` :

```typescript
// Avant
headerTitle: {
  flex: 1,
  fontSize: 17,
  fontWeight: 'bold',
  color: '#1E293B',
  textAlign: 'left',
  marginHorizontal: 8,
},

// Après
headerTitle: {
  flex: 1,
  fontSize: 17,
  fontWeight: 'bold',
  color: '#1E293B',
  textAlign: 'center',
  marginHorizontal: 8,
},
```

2. **S'assurer que `backButtonPlaceholder` a la même largeur que `homeButton`**.
   Actuellement `backButtonPlaceholder` est `width: 44`. Le bouton `homeButton` est
   `paddingHorizontal: 8` sans `minWidth` fixe. Pour que le centrage soit optiquement correct,
   ajouter `minWidth: 44` sur `homeButton` :

```typescript
// Avant
homeButton: {
  minHeight: 44,
  justifyContent: 'center',
  paddingHorizontal: 8,
},

// Après
homeButton: {
  minWidth: 44,
  minHeight: 44,
  justifyContent: 'center',
  paddingHorizontal: 8,
},
```

> **Deux états résultants :**
> - `stackSize > 1` : bouton "← Retour" à gauche + "Abandonner" à droite, titre centré avec flex:1
> - `stackSize === 1` : placeholder `width:44` à gauche + "Abandonner" `minWidth:44` à droite,
>   titre centré optiquement

### Tests TDD

Aucune fonction pure concernée. Pas de test requis.

### Critères de validation

- [ ] Avec `stackSize === 1` : titre affiché centré dans le header
- [ ] Avec `stackSize > 1` : bouton retour présent, titre toujours lisible sans troncature
- [ ] Aucune régression sur la navigation inter-articles
- [ ] `tsc --noEmit` et `npm run lint` passent

---

## F3-41 — Bouton partage VictoryScreen : icône standard dans encadré stats

**Story :** `docs/stories/phase-3/🔄-F3-41-victory-share-icon-button.md`

### Contexte

Actuellement le bouton "Partager" dans `VictoryScreen.tsx` est un `TouchableOpacity` avec du
texte (`"Partager  ↑"`) dans la zone sticky, séparé du bloc de stats. La demande est de le
remplacer par une icône standard positionnée **dans le bloc stats** (`statsBlock`).

### Fichiers à modifier

- `apps/mobile/src/screens/VictoryScreen.tsx`

### Changements à apporter

#### 1. Import de l'icône

Expo intègre `@expo/vector-icons` — Ionicons est disponible nativement :

```tsx
import { Ionicons } from '@expo/vector-icons';
```

> `@expo/vector-icons` est déjà disponible dans le projet Expo, pas d'installation requise.

#### 2. Repositionner le bouton partage dans `statsBlock`

Ajouter un `TouchableOpacity` icône dans l'`Animated.View` du `statsBlock`, positionné en absolu
dans le coin supérieur droit du bloc.

```tsx
{/* Dans Animated.View statsBlock, APRÈS les badges et AVANT congratsRow */}
<TouchableOpacity
  style={styles.shareIconButton}
  onPress={handleShare}
  accessibilityLabel={t('victory.a11y_share')}
  accessibilityRole="button"
  hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
>
  <Ionicons name="share-outline" size={22} color="#2563EB" />
</TouchableOpacity>
```

Le style `shareIconButton` est en `position: 'absolute'`, coin supérieur droit du `statsBlock` :

```typescript
shareIconButton: {
  position: 'absolute',
  top: 12,
  right: 12,
  width: 36,
  height: 36,
  alignItems: 'center',
  justifyContent: 'center',
},
```

#### 3. Supprimer l'ancien bouton texte "Partager" de la zone sticky

Dans le JSX de la zone `stickyButtons`, supprimer le `TouchableOpacity` portant le style
`shareButton` et son texte. Supprimer aussi les styles `shareButton` et `shareButtonText` du
`StyleSheet.create()`.

#### 4. Clés i18n

La clé `victory.a11y_share` existe déjà dans toutes les locales — ne pas la modifier.

> **Point de vigilance** : l'ordre JSX dans `statsBlock` doit respecter la logique de z-index.
> Placer le `TouchableOpacity` de l'icône comme **premier enfant** du bloc pour qu'il soit en
> position absolute sans impacter le flux des autres éléments.

### Tests TDD

Aucune fonction pure concernée. Pas de test requis.

### Critères de validation

- [ ] Icône `share-outline` visible dans l'encadré stats (coin supérieur droit)
- [ ] L'ancien bouton texte "Partager" n'est plus présent dans la zone sticky
- [ ] `Share.share()` s'ouvre au tap sur l'icône
- [ ] `accessibilityLabel` correct (`t('victory.a11y_share')`)
- [ ] `tsc --noEmit` et `npm run lint` passent (pas de style mort)

---

## F3-42 — Retirer "Félicitations !" de VictoryScreen

**Story :** `docs/stories/phase-3/🔄-F3-42-remove-congratulations-victory-screen.md`

### Contexte

Le texte "Félicitations !" (clé `victory.congrats_text`) est affiché dans `congratsRow` à
l'intérieur du `statsBlock`. Il est accompagné d'un `checkIcon` vert. La demande est de supprimer
cet élément sans laisser d'espace vide.

### Fichiers à modifier

- `apps/mobile/src/screens/VictoryScreen.tsx`
- `apps/mobile/src/i18n/locales/fr.json` (et 7 autres locales)

### Changements à apporter

#### 1. Supprimer le bloc `congratsRow` du JSX

Dans `VictoryScreen.tsx`, supprimer la `View` portant le style `congratsRow` et ses enfants
(`checkIcon` + `congratsText`) :

```tsx
// Supprimer entièrement :
<View style={styles.congratsRow} accessible={false}>
  <Text style={styles.checkIcon}>{'✓'}</Text>
  <Text style={styles.congratsText}>{t('victory.congrats_text')}</Text>
</View>
```

#### 2. Supprimer les styles associés

Dans `StyleSheet.create()`, supprimer `congratsRow`, `checkIcon` et `congratsText`.

#### 3. Supprimer les clés i18n

Dans chaque locale, supprimer la clé `"congrats_text"` dans la section `"victory"` :

| Locale | Valeur actuelle |
|--------|----------------|
| fr | `"Félicitations !"` |
| en | `"Congratulations!"` |
| es | (valeur dans es.json) |
| de | (valeur dans de.json) |
| pt | (valeur dans pt.json) |
| it | (valeur dans it.json) |
| nl | (valeur dans nl.json) |
| pl | (valeur dans pl.json) |

> **Point de vigilance** : la clé `victory.congrats_text` est utilisée uniquement dans ce bloc.
> Vérifier qu'elle n'est pas référencée ailleurs (tests, autres composants) avant suppression.
> Lancer `grep -r "congrats_text"` sur `apps/mobile/src/` pour confirmer.

#### 4. Vérifier l'espace vide

Après suppression, le `statsBlock` contient (dans l'ordre) :
1. Badge "Défi du jour" (conditionnel)
2. Badge "Mode difficile" (conditionnel)
3. Icône partage (F3-41, position absolute — pas dans le flux)
4. `statsRow` (sauts + durée)
5. `pathSummary`

Le `marginBottom: 12` de `congratsRow` disparaît avec lui — vérifier que `statsRow` conserve
un espacement visuel acceptable depuis le haut du bloc (le `paddingVertical: 16` du `statsBlock`
devrait suffire).

### Tests TDD

Aucune fonction pure concernée. Pas de test requis.

### Critères de validation

- [ ] Le texte "Félicitations !" (et ses équivalents locales) n'est plus visible
- [ ] Pas d'espace vide anormal entre le haut du bloc stats et les chiffres sauts/durée
- [ ] La clé `congrats_text` est supprimée des 8 fichiers de locale
- [ ] `tsc --noEmit` et `npm run lint` passent

---

## F3-43 — Libellé "Difficile" à côté du toggle HomeScreen

**Story :** `docs/stories/phase-3/🔄-F3-43-hard-mode-label-home-toggle.md`

### Contexte

Le `Switch` de mode difficile dans le header de `HomeScreen.tsx` est positionné en absolu à
gauche (`position: 'absolute', left: 16`). Il n'a pas de libellé textuel visible — seulement
un `accessibilityLabel`. La demande est d'ajouter un `Text` à côté du `Switch`.

### Fichiers à modifier

- `apps/mobile/src/screens/HomeScreen.tsx`
- `apps/mobile/src/i18n/locales/fr.json` (et 7 autres locales)

### Changements à apporter

#### 1. Modifier le container `difficultyHeaderToggle`

Passer de `flexDirection` implicite (column) à `flexDirection: 'row'` pour aligner
le `Switch` et le `Text` horizontalement :

```typescript
// Avant
difficultyHeaderToggle: {
  position: 'absolute',
  left: 16,
  width: 44,
  height: 44,
  justifyContent: 'center',
},

// Après
difficultyHeaderToggle: {
  position: 'absolute',
  left: 8,
  flexDirection: 'row',
  alignItems: 'center',
  height: 44,
  gap: 4,
},
```

> La `width: 44` est supprimée — le container s'adapte désormais à son contenu (Switch + Text).
> `left` passe de 16 à 8 pour compenser l'ajout du texte sans empiéter sur le titre "WikiHop".

#### 2. Ajouter le `Text` dans `difficultyHeaderToggle`

```tsx
<View style={styles.difficultyHeaderToggle}>
  <Switch
    value={isDifficultyHard}
    onValueChange={handleDifficultyToggle}
    trackColor={{ false: '#E2E8F0', true: '#FECACA' }}
    thumbColor={isDifficultyHard ? '#EF4444' : '#FFFFFF'}
    accessibilityLabel={isDifficultyHard ? t('home.difficulty_toggle_on_a11y') : t('home.difficulty_toggle_off_a11y')}
    accessibilityState={{ checked: isDifficultyHard }}
  />
  <Text style={styles.difficultyLabel} accessible={false}>
    {t('home.hard_mode_label')}
  </Text>
</View>
```

Le `Text` porte `accessible={false}` — l'`accessibilityLabel` du `Switch` suffit pour VoiceOver.

#### 3. Ajouter le style `difficultyLabel`

```typescript
difficultyLabel: {
  fontSize: 12,
  fontWeight: '600',
  color: '#64748B',
},
```

Quand `isDifficultyHard === true`, afficher la couleur en rouge pour cohérence avec le Switch :

```typescript
difficultyLabelActive: {
  color: '#EF4444',
},
```

Et dans le JSX :

```tsx
<Text
  style={[
    styles.difficultyLabel,
    isDifficultyHard && styles.difficultyLabelActive,
  ]}
  accessible={false}
>
  {t('home.hard_mode_label')}
</Text>
```

#### 4. Clés i18n à ajouter dans la section `"home"` de chaque locale

| Locale | Clé | Valeur |
|--------|-----|--------|
| fr | `home.hard_mode_label` | `"Difficile"` |
| en | `home.hard_mode_label` | `"Hard"` |
| es | `home.hard_mode_label` | `"Difícil"` |
| de | `home.hard_mode_label` | `"Schwer"` |
| pt | `home.hard_mode_label` | `"Difícil"` |
| it | `home.hard_mode_label` | `"Difficile"` |
| nl | `home.hard_mode_label` | `"Moeilijk"` |
| pl | `home.hard_mode_label` | `"Trudny"` |

#### 5. Vérification responsive

Sur iPhone SE (375pt de large), le header contient :
- Gauche : Switch (~51pt) + gap(4pt) + Text "Difficile" (~52pt en FR) ≈ 107pt
- Centre : titre "WikiHop" (flex:1)
- Droite : bouton langue ≈ 60pt

Vérifier que le titre "WikiHop" n'est pas tronqué sur SE. Si nécessaire, réduire `fontSize`
de `difficultyLabel` à 11 ou masquer le libellé en dessous de 360pt via `Dimensions.get('window').width`.

> **Décision de simplification** : ne pas implémenter la logique `Dimensions` pour cette story
> — le texte "Difficile" (7 caractères) tient en 12px sur SE. Valider sur device.

### Tests TDD

Aucune fonction pure concernée. Pas de test requis.

### Critères de validation

- [ ] Libellé visible à côté du Switch dans le header
- [ ] Libellé en couleur rouge (#EF4444) quand mode difficile activé, gris sinon
- [ ] Clé `home.hard_mode_label` présente dans les 8 locales
- [ ] Aucune troncature du titre "WikiHop" sur iPhone SE (375pt)
- [ ] `tsc --noEmit` et `npm run lint` passent

---

## F3-44 — Transformer lien "Historique des parties" en bouton HomeScreen

**Story :** `docs/stories/phase-3/🔄-F3-44-history-link-to-button-home.md`

### Contexte

Actuellement le lien "Historique des parties" est un `TouchableOpacity` avec le style
`secondaryTextButton` (hauteur 44, texte couleur `#64748B`). La demande est de le transformer
en **bouton à contour** (outline), cohérent avec le style du bouton Multijoueur.

### Fichiers à modifier

- `apps/mobile/src/screens/HomeScreen.tsx`

### Changements à apporter

#### 1. Modifier le style du bouton Histoire

Le bouton Multijoueur est le modèle de référence :

```typescript
// Style de référence : multiplayerButton
multiplayerButton: {
  height: 52,
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#2563EB',
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: 12,
},
multiplayerButtonText: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#2563EB',
},
```

Ajouter un style `historyButton` (et `historyButtonText`) identique au modèle Multijoueur :

```typescript
historyButton: {
  height: 52,
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#2563EB',
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: 12,
},
historyButtonText: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#2563EB',
},
```

#### 2. Remplacer le `secondaryTextButton` existant pour l'Historique

Dans les deux branches du `renderContent()` (loading ET success), remplacer :

```tsx
// Avant
<TouchableOpacity
  style={styles.secondaryTextButton}
  onPress={() => { navigation.navigate('History'); }}
  accessibilityLabel={t('home.history_a11y')}
  accessibilityRole="button"
>
  <Text style={styles.secondaryTextButtonText}>{t('home.history_link')}</Text>
</TouchableOpacity>

// Après
<TouchableOpacity
  style={styles.historyButton}
  onPress={() => { navigation.navigate('History'); }}
  accessibilityLabel={t('home.history_a11y')}
  accessibilityRole="button"
>
  <Text style={styles.historyButtonText}>{t('home.history_link')}</Text>
</TouchableOpacity>
```

> **Ordre dans `buttonsContainer`** : le bouton Historique doit rester à sa position actuelle,
> après le séparateur `secondaryLinksSeparator`. Cet ordre sera réorganisé par F3-45.

#### 3. Styles orphelins

Ne pas supprimer `secondaryTextButton` et `secondaryTextButtonText` tant que F3-45 n'est pas
livré — ils sont encore utilisés par les boutons "Soutenir Wikipedia" et "À propos".

### Tests TDD

Aucune fonction pure concernée. Pas de test requis.

### Critères de validation

- [ ] Le bouton "Historique des parties" a un contour bleu `#2563EB`, fond blanc, texte bleu bold
- [ ] La navigation vers `HistoryScreen` fonctionne
- [ ] Aucune régression sur les autres boutons du HomeScreen
- [ ] Les deux branches loading et success sont mises à jour
- [ ] `tsc --noEmit` et `npm run lint` passent

---

## F3-45 — Ligne de 3 boutons en bas du HomeScreen

**Story :** `docs/stories/phase-3/🔄-F3-45-home-bottom-action-row.md`

### Contexte

Actuellement les boutons secondaires ("Historique des parties", "Soutenir Wikipedia", "À propos")
sont empilés verticalement après un séparateur. La demande est de regrouper "Soutenir Wikipedia",
"Recharger les articles" et "À propos" dans une **ligne horizontale de 3 boutons compacts** en
bas de la zone de défilement. Le bouton "Historique des parties" (F3-44) reste seul au-dessus.

> **Scope de F3-45** : les 3 boutons de la ligne sont "Soutenir Wikipedia", "Recharger les articles"
> (actuellement `refreshButton`) et "À propos". Le bouton "Historique des parties" est géré par F3-44.

### Fichiers à modifier

- `apps/mobile/src/screens/HomeScreen.tsx`
- `apps/mobile/src/i18n/locales/fr.json` (et 7 autres locales) — si de nouveaux libellés courts
  sont nécessaires pour la ligne

### Changements à apporter

#### 1. Nouveaux styles pour la ligne de 3 boutons

```typescript
// Ligne conteneur
bottomActionRow: {
  flexDirection: 'row',
  marginTop: 12,
  gap: 8,
},
// Chaque bouton compact de la ligne
bottomActionButton: {
  flex: 1,
  height: 44,
  backgroundColor: '#F8FAFC',
  borderWidth: 1,
  borderColor: '#E2E8F0',
  borderRadius: 10,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 4,
},
bottomActionButtonText: {
  fontSize: 12,
  fontWeight: '600',
  color: '#64748B',
  textAlign: 'center',
},
```

> Sur iPhone SE (375pt) : 3 boutons flex:1 avec gap:8 → chaque bouton ≈ (375 - 32 - 16)/3 ≈ 109pt.
> Sur iPhone Pro Max (430pt) : chaque bouton ≈ 128pt. Les deux tailles sont compatibles avec
> des textes courts (12px, 2 lignes max si nécessaire).

#### 2. Remplacer les 3 boutons séparés par la ligne

Dans les deux branches du `renderContent()` (loading ET success), **remplacer** :
- Le `TouchableOpacity` `refreshButton` (et ses `Animated.View` enfants)
- Le `TouchableOpacity` `secondaryTextButton` pour "Soutenir Wikipedia"
- Le `TouchableOpacity` `secondaryTextButton` pour "À propos"
- La `View` `secondaryLinksSeparator`

**Par** la structure suivante :

```tsx
<View style={styles.bottomActionRow}>
  <TouchableOpacity
    style={styles.bottomActionButton}
    onPress={() => { navigation.navigate('Donation'); }}
    accessibilityLabel={t('home.donation_a11y')}
    accessibilityRole="button"
  >
    <Text style={styles.bottomActionButtonText}>{t('home.support_wikipedia_short')}</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.bottomActionButton}
    onPress={refresh}
    disabled={isLoading}
    accessibilityLabel={t('home.refresh_a11y')}
    accessibilityRole="button"
    accessibilityState={{ disabled: isLoading }}
  >
    <Text style={[styles.bottomActionButtonText, isLoading && styles.bottomActionButtonTextDisabled]}>
      {t('home.new_articles_short')}
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.bottomActionButton}
    onPress={() => { navigation.navigate('About'); }}
    accessibilityLabel={t('home.about_a11y')}
    accessibilityRole="button"
  >
    <Text style={styles.bottomActionButtonText}>{t('home.about_short')}</Text>
  </TouchableOpacity>
</View>
```

Le style `bottomActionButtonTextDisabled` :

```typescript
bottomActionButtonTextDisabled: {
  color: '#CBD5E1',
},
```

> **Comportement "Recharger les articles"** dans la ligne : même logique que l'ancien `refreshButton`.
> L'animation de rotation (rotateAnim) est à **supprimer** — trop complexe pour un bouton compact.
> Le bouton est simplement désactivé (`disabled={isLoading}`) pendant le chargement.

> **Branche loading** : dans cette branche, le bouton "Recharger" doit rester `disabled={true}` et
> porter le style `bottomActionButtonTextDisabled` inconditionnellement.

#### 3. Clés i18n à ajouter

Libellés courts pour la ligne de 3 boutons (les libellés longs existants restent pour l'`accessibilityLabel`) :

| Locale | Clé | Valeur |
|--------|-----|--------|
| fr | `home.support_wikipedia_short` | `"Don Wikipedia"` |
| en | `home.support_wikipedia_short` | `"Support Wikipedia"` |
| es | `home.support_wikipedia_short` | `"Apoyar Wikipedia"` |
| de | `home.support_wikipedia_short` | `"Wikipedia spenden"` |
| pt | `home.support_wikipedia_short` | `"Apoiar Wikipedia"` |
| it | `home.support_wikipedia_short` | `"Sostieni Wikipedia"` |
| nl | `home.support_wikipedia_short` | `"Steun Wikipedia"` |
| pl | `home.support_wikipedia_short` | `"Wspomóż Wikipedia"` |
| fr | `home.new_articles_short` | `"Recharger"` |
| en | `home.new_articles_short` | `"Refresh"` |
| es | `home.new_articles_short` | `"Recargar"` |
| de | `home.new_articles_short` | `"Aktualisieren"` |
| pt | `home.new_articles_short` | `"Atualizar"` |
| it | `home.new_articles_short` | `"Aggiorna"` |
| nl | `home.new_articles_short` | `"Vernieuwen"` |
| pl | `home.new_articles_short` | `"Odśwież"` |
| fr | `home.about_short` | `"À propos"` |
| en | `home.about_short` | `"About"` |
| es | `home.about_short` | `"Acerca de"` |
| de | `home.about_short` | `"Über uns"` |
| pt | `home.about_short` | `"Sobre"` |
| it | `home.about_short` | `"Info"` |
| nl | `home.about_short` | `"Info"` |
| pl | `home.about_short` | `"O aplikacji"` |

#### 4. Nettoyage des styles obsolètes

Après la mise en place de la ligne, supprimer les styles qui ne sont plus utilisés :
- `refreshButton`, `refreshButtonInner`, `refreshButtonDisabled`, `refreshButtonText`, `refreshIcon`
- `secondaryLinksSeparator`
- `secondaryTextButton`, `secondaryTextButtonText`

> **Point de vigilance — code mort** : les `Animated.Value` `rotateAnim` et `shimmerAnim` dans
> `HomeScreen.tsx` sont utilisées par la branche loading pour l'animation skeleton (shimmerAnim)
> et l'ancienne animation du bouton refresh (rotateAnim). Après suppression du bouton refresh
> animé, `rotateAnim` devient du code mort (déclarée, animée dans un useEffect, mais jamais
> consommée par du JSX). **Supprimer** :
> - La `const rotateAnim`
> - Le `useEffect` d'animation de rotation (le second useEffect commenté `Animation rotation icône refresh`)
> - La `const rotateInterpolated`

#### 5. Ordre final des éléments dans `buttonsContainer` (après F3-44 + F3-45)

```
[Jouer]
[Défi du jour]
[Multijoueur]
[Historique des parties]  ← bouton outline bleu (F3-44)
[Don Wikipedia | Recharger | À propos]  ← ligne 3 boutons (F3-45)
```

Le `secondaryLinksSeparator` disparaît (remplacé par le `marginTop: 12` du `bottomActionRow`).

### Tests TDD

Aucune fonction pure concernée. Pas de test requis.

### Critères de validation

- [ ] Ligne de 3 boutons affichée sous le bouton Historique
- [ ] Sur iPhone SE (375pt) : les 3 boutons sont visibles sans overflow
- [ ] Sur iPhone Pro Max (430pt) : les 3 boutons ont un ratio harmonieux
- [ ] "Don Wikipedia" ouvre `DonationScreen`
- [ ] "Recharger" appelle `refresh()` et est désactivé pendant le chargement
- [ ] "À propos" ouvre `AboutScreen`
- [ ] Aucun style mort (refreshButton, secondaryTextButton, rotateAnim, rotateInterpolated)
- [ ] Les clés i18n `support_wikipedia_short`, `new_articles_short`, `about_short` sont dans les 8 locales
- [ ] `tsc --noEmit` et `npm run lint` passent

---

## Ordre de développement recommandé

Les 9 stories sont indépendantes entre elles à l'exception du binôme F3-44 + F3-45 :

1. **F3-39** (5 min — suppression pure) — commencer par là
2. **F3-42** (10 min — suppression + i18n)
3. **F3-37** (5 min — une couleur)
4. **F3-40** (10 min — layout header)
5. **F3-41** (15 min — icône + repositionnement)
6. **F3-43** (20 min — ajout libellé + i18n)
7. **F3-44** (15 min — style bouton)
8. **F3-45** (30 min — refacto + i18n + nettoyage) — à faire après F3-44
9. **F3-38** (45 min — backend JSON + service) — peut être parallélisé

> F3-44 doit être mergé avant F3-45 pour éviter les conflits sur `HomeScreen.tsx`.

## Contraintes communes

- Les stories F3-39, F3-40, F3-41, F3-42, F3-43, F3-44, F3-45 ne touchent que `apps/mobile/`.
  Elles ne nécessitent aucune modification backend et aucun ADR.
- F3-38 touche `apps/backend/src/`. Elle est indépendante du frontend — peut être développée en
  parallèle par Julien si disponible, sinon Laurent peut se concentrer sur les autres stories.
- Toutes les PR vont vers `develop`.
- Convention de branches : `feat/laurent-F3-37`, `feat/laurent-F3-38`, etc.
- Chaque story doit faire l'objet d'une PR distincte (pas de PR groupée).
