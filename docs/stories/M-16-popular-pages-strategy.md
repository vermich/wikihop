---
id: M-16
title: Pages populaires — stratégie hybride API + cache + fallback JSON
phase: 2-MVP
priority: Must
agents: [Frontend Dev, Backend Dev]
status: in-progress
created: 2026-03-01
completed:
---

# M-16 — Pages populaires — stratégie hybride API + cache + fallback JSON

## User Story
En tant que joueur, je veux que la paire d'articles proposée soit issue de pages Wikipedia connues et intéressantes, même sans connexion internet, afin de toujours pouvoir jouer.

## Critères d'acceptance
- [ ] Le service `popular-pages` interroge l'API Wikimedia (`/api/rest_v1/metrics/pageviews/top/...`) pour récupérer les pages les plus consultées du mois en cours
- [ ] Les pages populaires récupérées depuis l'API sont stockées en cache AsyncStorage avec un TTL de 24 heures
- [ ] Si l'API Wikimedia est inaccessible (pas de réseau ou erreur), le service utilise un fichier JSON statique embarqué dans l'app (`assets/popular-pages.json`) comme fallback
- [ ] Le fichier JSON statique contient au minimum 200 articles par langue (FR et EN) pour assurer une bonne variété
- [ ] Un bouton "Recharger" en HomeScreen déclenche un rechargement manuel des pages populaires depuis l'API (avec animation de chargement)
- [ ] La date de dernière mise à jour des pages populaires est affichée dans la HomeScreen (ex : "Mis à jour il y a 2 heures")
- [ ] Les pages dont le titre contient des termes à exclure (pages de désambiguïsation, listes, portails) sont filtrées
- [ ] La langue du service s'adapte à la langue sélectionnée dans l'app (FR ou EN)

## Notes de réalisation

> **Specs rédigées par Tech Lead (Maxime)**
> Référence : ADR-005, ADR-007 | Story : `docs/stories/M-16-popular-pages-strategy.md`
> Destinataires : Backend Dev (Julien) + Frontend Dev (Laurent)

---

### Périmètre

**Dans scope :**
- Service backend interrogeant l'API Wikimedia Pageviews
- Fichier JSON statique fallback (`popular-pages.json`) embarqué dans le backend
- Service mobile avec cache AsyncStorage TTL 24h
- Slice `popularPages` dans le store Zustand
- Filtre d'exclusion des titres non jouables (portails, catégories, etc.)

**Hors scope :**
- L'endpoint `/api/game/random-pair` (story M-02) — M-16 fournit uniquement le service consommé par M-02
- L'affichage "Mis à jour il y a X heures" sur HomeScreen (story M-01 / UX)
- Le bouton "Recharger" sur HomeScreen (story M-01 / UX)
- La sélection de la paire de départ/destination (story M-02)

---

## Partie A — Backend Dev (Julien)

### A1. Service `popular-pages` — `apps/backend/src/services/popular-pages.service.ts`

#### Endpoint Wikimedia

```
GET https://{lang}.wikipedia.org/api/rest_v1/metrics/pageviews/top/{lang}.wikipedia/all-access/{YYYY}/{MM}/all-days
```

Exemple pour le mois en cours en français :
```
GET https://fr.wikipedia.org/api/rest_v1/metrics/pageviews/top/fr.wikipedia/all-access/2026/03/all-days
```

La date `{YYYY}/{MM}` doit être calculée dynamiquement à partir de `new Date()` côté serveur — jamais codée en dur.

#### Schéma de réponse Wikimedia à parser

L'API Wikimedia retourne un objet JSON avec cette structure (simplifiée) :

```typescript
interface WikimediaPageviewsResponse {
  items: Array<{
    project: string;
    access: string;
    year: string;
    month: string;
    day: string;
    articles: Array<{
      article: string;  // Titre avec underscores (ex: "Albert_Einstein")
      views: number;
      rank: number;
    }>;
  }>;
}
```

Le service doit extraire `items[0].articles` (le premier et unique élément du tableau `items`). Utiliser `noUncheckedIndexedAccess` : vérifier que `items[0]` existe avant d'accéder à `.articles`.

#### Normalisation des titres

Les titres retournés par Wikimedia utilisent des underscores (`Albert_Einstein`). Normaliser vers des espaces (`Albert Einstein`) via `title.replace(/_/g, ' ')` avant de retourner la liste.

#### Filtre d'exclusion

Exclure tout titre contenant l'un des préfixes ou motifs suivants (insensible à la casse) :

```typescript
const EXCLUDED_PREFIXES = [
  'Portail:',
  'Catégorie:',
  'Aide:',
  'Wikipédia:',
  'Liste des ',
  'Liste de ',
  'Modèle:',
  'Spécial:',
  'Fichier:',
  // Équivalents anglais
  'Portal:',
  'Category:',
  'Help:',
  'Wikipedia:',
  'List of ',
  'Template:',
  'Special:',
  'File:',
] as const;
```

Exclure également la page `'Main_Page'` / `'Accueil'` (page d'accueil Wikipedia).

Implémentation du filtre :

```typescript
function isPlayableArticle(title: string): boolean {
  const normalized = title.replace(/_/g, ' ');
  return !EXCLUDED_PREFIXES.some((prefix) =>
    normalized.toLowerCase().startsWith(prefix.toLowerCase())
  ) && normalized !== 'Accueil' && normalized !== 'Main Page';
}
```

#### Timeout et gestion d'erreur

- Timeout : **3 secondes** sur l'appel Wikimedia (`AbortController` + `signal`)
- En cas d'échec (timeout, erreur réseau, HTTP non-2xx) : le service retourne `null`
- Le caller (`/api/game/random-pair`) est responsable du fallback vers `popular-pages.json`
- Logger l'erreur avec Pino (`app.log.warn`) — ne jamais utiliser `console.log`

#### Interface publique du service

```typescript
// apps/backend/src/services/popular-pages.service.ts

export interface PopularPagesResult {
  articles: string[];   // Titres normalisés (espaces, filtrés)
  language: 'fr' | 'en';
  source: 'wikimedia' | 'fallback';
}

/**
 * Récupère les pages populaires depuis l'API Wikimedia.
 * Retourne null en cas d'erreur — le caller doit gérer le fallback.
 *
 * @param language - Langue Wikipedia cible ('fr' | 'en')
 * @param limit    - Nombre max d'articles à retourner (défaut : 200)
 */
export async function fetchPopularPagesFromWikimedia(
  language: 'fr' | 'en',
  limit?: number
): Promise<string[] | null>;

/**
 * Retourne les pages populaires depuis le fichier JSON statique.
 * Ne peut pas échouer (données embarquées).
 *
 * @param language - Langue cible
 */
export function getPopularPagesFromFallback(language: 'fr' | 'en'): string[];

/**
 * Stratégie hybride : tente Wikimedia, fallback sur JSON statique.
 * Retourne toujours un résultat non vide.
 */
export async function getPopularPages(
  language: 'fr' | 'en',
  limit?: number
): Promise<PopularPagesResult>;
```

---

### A2. Fichier JSON statique — `apps/backend/src/assets/popular-pages.json`

Créer le répertoire `apps/backend/src/assets/` et y placer `popular-pages.json`.

Format exact :

```json
{
  "fr": ["<titre_1>", "<titre_2>", "..."],
  "en": ["<titre_1>", "<titre_2>", "..."]
}
```

Contraintes :
- **Minimum 200 titres par langue**
- Titres en clair (espaces, pas d'underscores)
- Titres variés : sciences, histoire, géographie, arts, sport, culture populaire
- Aucun titre de portail, catégorie, liste ou page de désambiguïsation
- Tous les titres doivent exister réellement sur Wikipedia (vérifier manuellement un échantillon)

**Liste de départ — français (200 titres) :**

```json
[
  "Albert Einstein", "Charles Darwin", "Marie Curie", "Isaac Newton",
  "Napoléon Bonaparte", "Jules César", "Cléopâtre", "Louis XIV",
  "Winston Churchill", "Nikola Tesla", "Leonardo da Vinci", "Galilée",
  "Christophe Colomb", "Marco Polo", "Magellan", "Alexandre le Grand",
  "Charlemagne", "Jeanne d'Arc", "Voltaire", "Victor Hugo",
  "Gustave Flaubert", "Marcel Proust", "Albert Camus", "Jean-Paul Sartre",
  "Simone de Beauvoir", "Molière", "Racine", "Corneille", "Balzac",
  "Zola", "Baudelaire", "Rimbaud", "Verlaine", "Apollinaire",
  "Tour Eiffel", "Notre-Dame de Paris", "Château de Versailles",
  "Louvre", "Arc de Triomphe", "Pont du Gard", "Mont-Saint-Michel",
  "Colossée", "Acropole d'Athènes", "Stonehenge", "Pyramides de Gizeh",
  "Grande Muraille de Chine", "Machu Picchu", "Angkor Vat",
  "Taj Mahal", "Alhambra", "Sagrada Família",
  "Paris", "Lyon", "Marseille", "Bordeaux", "Strasbourg", "Nantes",
  "Toulouse", "Nice", "Lille", "Montpellier", "Rennes", "Reims",
  "Londres", "Berlin", "Madrid", "Rome", "Lisbonne", "Amsterdam",
  "Vienne", "Prague", "Varsovie", "Budapest", "Athènes", "Stockholm",
  "New York", "Los Angeles", "Chicago", "Toronto", "Sydney", "Tokyo",
  "Pékin", "Shanghai", "Mumbai", "São Paulo", "Buenos Aires", "Le Caire",
  "France", "Allemagne", "Espagne", "Italie", "Royaume-Uni",
  "États-Unis", "Chine", "Russie", "Japon", "Brésil", "Inde",
  "Canada", "Australie", "Mexique", "Argentine", "Turquie",
  "Seine", "Loire", "Rhin", "Nil", "Amazone", "Mississippi",
  "Alpes", "Pyrénées", "Himalaya", "Andes", "Rocheuses",
  "Atlantique", "Pacifique", "Méditerranée", "Arctique",
  "Lune", "Mars", "Jupiter", "Saturne", "Soleil", "Voie lactée",
  "Trou noir", "Big Bang", "Relativité restreinte", "Mécanique quantique",
  "ADN", "Évolution", "Cellule", "Photosynthèse", "Gravitation",
  "Électromagnétisme", "Thermodynamique", "Radioactivité",
  "Football", "Tennis", "Cyclisme", "Natation", "Athlétisme",
  "Jeux olympiques", "Coupe du monde de football", "Tour de France",
  "Roland-Garros", "Tour de France cycliste",
  "Mozart", "Beethoven", "Bach", "Chopin", "Debussy",
  "Picasso", "Monet", "Van Gogh", "Rembrandt", "Léonard de Vinci",
  "Impressionnisme", "Surréalisme", "Renaissance", "Baroque",
  "Piano", "Violon", "Guitare", "Cinéma", "Photographie",
  "Première Guerre mondiale", "Seconde Guerre mondiale",
  "Révolution française", "Révolution industrielle",
  "Guerre froide", "Chute du mur de Berlin", "Apartheid",
  "Démocratie", "République", "Monarchie", "Fascisme", "Communisme",
  "Droit de vote", "Droits de l'homme", "Organisation des Nations unies",
  "Antibiotique", "Vaccin", "Pénicilline", "Cancer", "SIDA",
  "Intelligence artificielle", "Internet", "Ordinateur", "Smartphone",
  "Énergie solaire", "Énergie nucléaire", "Changement climatique",
  "Biodiversité", "Extinction des espèces",
  "Lion", "Éléphant", "Baleine bleue", "Aigle", "Requin blanc",
  "Dinosaure", "Mammouth", "Homère", "Platon", "Aristote",
  "Socrate", "Descartes", "Kant", "Nietzsche", "Hegel",
  "Bouddhisme", "Islam", "Christianisme", "Judaïsme", "Hindouisme",
  "Mythologie grecque", "Mythologie nordique", "Mythologie romaine",
  "Ulysse", "Achille", "Hercule", "Thor", "Zeus"
]
```

**Liste de départ — anglais (200 titres) :**

```json
[
  "Albert Einstein", "Charles Darwin", "Marie Curie", "Isaac Newton",
  "Napoleon Bonaparte", "Julius Caesar", "Cleopatra", "Louis XIV",
  "Winston Churchill", "Nikola Tesla", "Leonardo da Vinci", "Galileo Galilei",
  "Christopher Columbus", "Marco Polo", "Ferdinand Magellan", "Alexander the Great",
  "Charlemagne", "Joan of Arc", "William Shakespeare", "Charles Dickens",
  "Mark Twain", "Ernest Hemingway", "George Orwell", "Virginia Woolf",
  "Jane Austen", "Edgar Allan Poe", "Oscar Wilde", "Franz Kafka",
  "Fyodor Dostoevsky", "Leo Tolstoy", "Homer", "Dante Alighieri",
  "Eiffel Tower", "Notre-Dame de Paris", "Palace of Versailles",
  "Louvre Museum", "Arc de Triomphe", "Pont du Gard", "Mont Saint-Michel",
  "Colosseum", "Acropolis of Athens", "Stonehenge", "Pyramids of Giza",
  "Great Wall of China", "Machu Picchu", "Angkor Wat", "Taj Mahal",
  "Alhambra", "Sagrada Família", "Parthenon", "Big Ben",
  "Paris", "London", "Berlin", "Madrid", "Rome", "Lisbon",
  "Amsterdam", "Vienna", "Prague", "Warsaw", "Budapest",
  "Athens", "Stockholm", "Oslo", "Copenhagen",
  "New York City", "Los Angeles", "Chicago", "Toronto", "Sydney",
  "Tokyo", "Beijing", "Shanghai", "Mumbai", "São Paulo",
  "Buenos Aires", "Cairo", "Lagos", "Istanbul", "Seoul",
  "France", "Germany", "Spain", "Italy", "United Kingdom",
  "United States", "China", "Russia", "Japan", "Brazil",
  "India", "Canada", "Australia", "Mexico", "Argentina",
  "Turkey", "South Africa", "Egypt", "Indonesia", "Pakistan",
  "Amazon River", "Mississippi River", "Nile River", "Rhine", "Danube",
  "Alps", "Pyrenees", "Himalayas", "Andes", "Rocky Mountains",
  "Sahara Desert", "Amazon rainforest", "Arctic Ocean",
  "Moon", "Mars", "Jupiter", "Saturn", "Sun", "Milky Way",
  "Black hole", "Big Bang", "Special relativity", "Quantum mechanics",
  "DNA", "Evolution", "Cell biology", "Photosynthesis", "Gravity",
  "Electromagnetism", "Thermodynamics", "Radioactivity",
  "Football", "Tennis", "Basketball", "Baseball", "Swimming",
  "Olympic Games", "FIFA World Cup", "Tour de France",
  "Wimbledon Championships", "Super Bowl", "NBA",
  "Wolfgang Amadeus Mozart", "Ludwig van Beethoven", "Johann Sebastian Bach",
  "Frédéric Chopin", "Claude Debussy", "Franz Schubert",
  "Pablo Picasso", "Claude Monet", "Vincent van Gogh", "Rembrandt",
  "Impressionism", "Surrealism", "Renaissance", "Baroque",
  "Piano", "Violin", "Guitar", "Cinema", "Photography",
  "World War I", "World War II", "French Revolution",
  "Industrial Revolution", "Cold War", "Fall of the Berlin Wall",
  "Apartheid", "American Civil War", "American Revolution",
  "Democracy", "Republic", "Monarchy", "Fascism", "Communism",
  "Suffrage", "Human rights", "United Nations",
  "Antibiotic", "Vaccine", "Penicillin", "Cancer", "AIDS",
  "Artificial intelligence", "Internet", "Computer", "Smartphone",
  "Solar energy", "Nuclear energy", "Climate change",
  "Biodiversity", "Mass extinction",
  "Lion", "Elephant", "Blue whale", "Eagle", "Great white shark",
  "Dinosaur", "Mammoth", "Homo sapiens",
  "Plato", "Aristotle", "Socrates", "René Descartes",
  "Immanuel Kant", "Friedrich Nietzsche", "Georg Wilhelm Friedrich Hegel",
  "Buddhism", "Islam", "Christianity", "Judaism", "Hinduism",
  "Greek mythology", "Norse mythology", "Roman mythology",
  "Odysseus", "Achilles", "Hercules", "Thor", "Zeus",
  "Abraham Lincoln", "George Washington", "Thomas Jefferson",
  "Franklin D. Roosevelt", "John F. Kennedy",
  "Martin Luther King Jr.", "Mahatma Gandhi", "Nelson Mandela",
  "Vladimir Lenin", "Joseph Stalin", "Mao Zedong",
  "Alan Turing", "Stephen Hawking", "Carl Sagan",
  "Sigmund Freud", "Karl Marx", "Charles Baudelaire",
  "Michelangelo", "Raphael", "Salvador Dalí", "Andy Warhol"
]
```

**Import du JSON dans TypeScript :**

```typescript
// apps/backend/src/services/popular-pages.service.ts
import popularPagesData from '../assets/popular-pages.json';

// Type inféré automatiquement depuis le JSON
type PopularPagesData = { fr: string[]; en: string[] };
const data = popularPagesData as PopularPagesData;
```

Vérifier que `tsconfig.json` du backend a `"resolveJsonModule": true` — si absent, l'ajouter.

---

### A3. Tests backend — `apps/backend/__tests__/services/popular-pages.service.test.ts`

**Tests obligatoires :**

```
describe('fetchPopularPagesFromWikimedia')
  ✓ parse correctement la réponse Wikimedia et retourne un tableau de titres normalisés
  ✓ normalise les underscores en espaces
  ✓ filtre les portails (Portail:, Portal:)
  ✓ filtre les catégories (Catégorie:, Category:)
  ✓ filtre les listes (Liste des, List of)
  ✓ filtre Accueil / Main Page
  ✓ retourne null en cas de timeout (mock AbortController)
  ✓ retourne null si HTTP status non-2xx
  ✓ retourne null si la réponse JSON est malformée
  ✓ respecte le paramètre limit

describe('getPopularPagesFromFallback')
  ✓ retourne un tableau non vide pour 'fr'
  ✓ retourne un tableau non vide pour 'en'
  ✓ tous les titres sont des strings non vides

describe('getPopularPages')
  ✓ retourne source 'wikimedia' si l'API répond
  ✓ retourne source 'fallback' si l'API échoue (mock fetch)
  ✓ ne retourne jamais un tableau vide
```

Mocker `fetch` globalement avec `jest.spyOn(global, 'fetch')`.

---

## Partie B — Frontend Dev (Laurent)

### B1. Service mobile — `apps/mobile/src/services/popularPagesService.ts`

Ce service est le point d'entrée unique pour les pages populaires côté mobile. Il ne contacte **jamais** l'API Wikimedia directement — il appelle uniquement le backend WikiHop.

#### Interface publique

```typescript
// apps/mobile/src/services/popularPagesService.ts

export interface PopularPagesServiceResult {
  articles: Article[];
  fetchedAt: string;         // ISO 8601
  source: 'backend' | 'cache' | 'fallback';
}

/**
 * Retourne les pages populaires pour la langue donnée.
 * Stratégie : cache AsyncStorage (TTL 24h) → backend → fallback JSON.
 *
 * Ne rejette jamais — retourne toujours un résultat (fallback garanti).
 */
export async function getPopularPages(
  language: Language
): Promise<PopularPagesServiceResult>;

/**
 * Force un rechargement depuis le backend, ignore le cache TTL.
 * Utilisé par le bouton "Recharger" du HomeScreen.
 */
export async function refreshPopularPages(
  language: Language
): Promise<PopularPagesServiceResult>;
```

#### Contrat d'API backend appelé

Le service appelle l'endpoint `/api/popular-pages?lang={language}` du backend (route à définir dans M-02 ou dédiée — à confirmer avec Julien). Le format de réponse attendu :

```typescript
// Réponse HTTP du backend (enveloppe ApiResponse<T> standard)
ApiResponse<{
  articles: Array<{ title: string }>;  // Titres en clair
  language: Language;
}>
```

Le service transforme chaque `{ title }` en `Article` complet :

```typescript
const article: Article = {
  id: title.replace(/ /g, '_'), // Approximation locale — l'id réel sera résolu par M-02
  title,
  url: `https://${language}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
  language,
};
```

**Note :** l'`id` réel (`pageid` Wikipedia) sera résolu lors de la sélection de la paire dans M-02. Ici, l'`id` temporaire est le titre normalisé.

#### Stratégie cache AsyncStorage

Clé : `@wikihop/popular_pages`
Format stocké :

```typescript
interface PopularPagesCache {
  data: Article[];
  fetchedAt: string;   // ISO 8601
  language: Language;  // Langue du cache
}
```

Logique de lecture du cache dans `getPopularPages(language)` :

```
1. Lire AsyncStorage.getItem('@wikihop/popular_pages')
2. Si valeur présente :
   a. Parser le JSON
   b. Vérifier que cache.language === language (sinon invalide)
   c. Vérifier TTL : Date.now() - new Date(cache.fetchedAt).getTime() < 86_400_000
   d. Si valide → retourner { articles: cache.data, fetchedAt: cache.fetchedAt, source: 'cache' }
3. Sinon (cache absent, périmé ou mauvaise langue) :
   a. Appeler le backend avec timeout 5 secondes
   b. Si succès → persister dans AsyncStorage + retourner { ..., source: 'backend' }
   c. Si échec → charger le fallback JSON + retourner { ..., source: 'fallback' }
   d. fetchedAt = new Date().toISOString() dans tous les cas
```

**`refreshPopularPages`** suit le même chemin mais saute l'étape 2 (ignore le cache).

#### Fichier fallback mobile — `apps/mobile/src/assets/popular-pages.json`

Copier le même fichier `popular-pages.json` que le backend dans `apps/mobile/src/assets/`. Ce fichier est embarqué dans le bundle mobile via Metro. Import :

```typescript
import fallbackData from '../assets/popular-pages.json';
```

Vérifier que `tsconfig.json` mobile a `"resolveJsonModule": true`.

#### Filtre de défense en profondeur côté mobile

Appliquer le même filtre d'exclusion que le backend sur les titres reçus du backend, avant de les stocker en cache. Cela protège contre une régression backend :

```typescript
// apps/mobile/src/services/popularPagesService.ts

const EXCLUDED_PREFIXES = [
  'Portail:', 'Catégorie:', 'Aide:', 'Wikipédia:', 'Liste des ', 'Liste de ',
  'Modèle:', 'Spécial:', 'Fichier:',
  'Portal:', 'Category:', 'Help:', 'Wikipedia:', 'List of ',
  'Template:', 'Special:', 'File:',
] as const;

function isPlayableTitle(title: string): boolean {
  return !EXCLUDED_PREFIXES.some((prefix) =>
    title.toLowerCase().startsWith(prefix.toLowerCase())
  ) && title !== 'Accueil' && title !== 'Main Page';
}
```

---

### B2. Slice `popularPages` dans le store Zustand

Fichier : `apps/mobile/src/store/popular-pages.store.ts` (nouveau fichier, séparé de `game.store.ts`).

#### Interface

```typescript
interface PopularPagesSlice {
  // ── État ──────────────────────────────────────────
  popularPages: Article[];
  popularPagesFetchedAt: string | null;      // ISO 8601 ou null si jamais chargé
  popularPagesLanguage: Language | null;     // Langue du dernier fetch
  isPopularPagesLoading: boolean;

  // ── Actions ───────────────────────────────────────
  setPopularPages: (pages: Article[], language: Language) => Promise<void>;
  invalidatePopularPages: () => Promise<void>;
  loadPopularPages: (language: Language) => Promise<void>;
}
```

#### Comportement des actions

**`setPopularPages(pages, language)`**
- `set({ popularPages: pages, popularPagesFetchedAt: new Date().toISOString(), popularPagesLanguage: language })`
- Persiste via `AsyncStorage.setItem('@wikihop/popular_pages', JSON.stringify({ data: pages, fetchedAt: ..., language }))`

**`invalidatePopularPages()`**
- `set({ popularPages: [], popularPagesFetchedAt: null, popularPagesLanguage: null })`
- `await AsyncStorage.removeItem('@wikihop/popular_pages')`
- Appelé automatiquement par `setLanguage` dans le game store quand la langue change (ADR-007)

**`loadPopularPages(language)`**
- Setter `isPopularPagesLoading: true` en début
- Appelle `getPopularPages(language)` depuis le service
- Appelle `setPopularPages(result.articles, language)`
- Setter `isPopularPagesLoading: false` en fin (dans un `finally`)
- Ne rejette jamais — les erreurs sont absorbées par le service (fallback garanti)

#### Hydratation au démarrage

L'action `hydrate()` du game store (M-07) est étendue pour lire aussi `@wikihop/popular_pages`. Ajouter dans `hydrate()` de `game.store.ts` :

```typescript
// Dans hydrate() — après la lecture de @wikihop/game_session
const rawPopular = await AsyncStorage.getItem('@wikihop/popular_pages');
if (rawPopular !== null) {
  const cache = JSON.parse(rawPopular) as PopularPagesCache;
  // Vérifier TTL et langue avant de restaurer
  const isValid =
    cache.language === currentLanguage &&
    Date.now() - new Date(cache.fetchedAt).getTime() < 86_400_000;
  if (isValid) {
    setPopularPages(cache.data, cache.language); // sans ré-écrire AsyncStorage
  }
}
```

**Alternative :** créer une action `hydratePopularPages()` dédiée dans le popular-pages store, appelée depuis `App.tsx` en parallèle de `hydrate()`. Cette option est préférable pour la séparation des responsabilités — Laurent choisit l'approche la plus cohérente avec l'organisation du store qu'il aura définie pour M-07.

---

### B3. Tests frontend — `apps/mobile/__tests__/services/popularPagesService.test.ts`

**Tests obligatoires :**

```
describe('getPopularPages')
  ✓ retourne le cache si TTL valide et bonne langue
  ✓ appelle le backend si cache absent
  ✓ appelle le backend si cache périmé (TTL > 24h)
  ✓ appelle le backend si cache de mauvaise langue
  ✓ retourne le fallback JSON si le backend échoue
  ✓ applique le filtre isPlayableTitle sur les résultats backend
  ✓ ne rejette jamais (toujours un résultat)
  ✓ fetchedAt est une chaîne ISO 8601 valide

describe('refreshPopularPages')
  ✓ ignore le cache valide et appelle le backend
  ✓ retourne le fallback si le backend échoue

describe('popularPages store slice')
  ✓ setPopularPages met à jour l'état et persiste
  ✓ invalidatePopularPages vide l'état et supprime la clé AsyncStorage
  ✓ loadPopularPages passe isPopularPagesLoading à true puis false
  ✓ loadPopularPages appelle setPopularPages avec le résultat du service
```

---

### C. Critères de qualité communs (checklist PR)

- [ ] `tsc --noEmit` passe sans erreur dans les deux packages
- [ ] Zéro `any` non justifié
- [ ] `noUncheckedIndexedAccess` : `items[0]` vérifié avant usage (backend)
- [ ] Le service backend ne logue jamais avec `console.log` — utiliser `fastify.log`
- [ ] Le service mobile ne logue jamais avec `console.log` — utiliser `console.error` uniquement pour les erreurs inattendues
- [ ] `popular-pages.json` contient bien 200+ titres par langue
- [ ] Aucun titre de portail, catégorie ou liste dans le JSON fallback
- [ ] La stratégie cache → backend → fallback est correctement ordonnée
- [ ] `invalidatePopularPages` est bien appelée lors d'un changement de langue
- [ ] Coverage ≥ 70% sur les modules modifiés
- [ ] PR backend vers `develop`, branche `feat/julien-popular-pages`
- [ ] PR mobile vers `develop`, branche `feat/laurent-popular-pages`

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
