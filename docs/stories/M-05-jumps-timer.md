---
id: M-05
title: Compteur de sauts et timer en temps réel
phase: 2-MVP
priority: Must
agents: [Frontend Dev]
status: in-progress
created: 2026-02-28
completed:
---

# M-05 — Compteur de sauts et timer en temps réel

## User Story
En tant que joueur, je veux voir le nombre de sauts effectués et le temps écoulé pendant ma partie, afin de mesurer ma performance en cours de jeu.

## Critères d'acceptance
- [ ] Le compteur de sauts est visible à tout moment pendant la partie (header ou bandeau fixe)
- [ ] Le timer démarre quand le joueur appuie sur "Jouer" et s'arrête quand il atteint la destination
- [ ] Le timer affiche le format `mm:ss`
- [ ] Le timer et le compteur se mettent à jour en temps réel sans affecter les performances de scroll
- [ ] En cas de mise en arrière-plan de l'app, le timer continue (ou est mis en pause — décision UX à documenter)

## Notes de réalisation

### Décision UX — comportement en arrière-plan

**Le timer continue quand l'app passe en arrière-plan.** Justification : le timer est calculé dynamiquement depuis `session.startedAt` (timestamp de démarrage de session). Le temps affiché est toujours `Date.now() - session.startedAt.getTime()`. Quand l'app revient au premier plan, le calcul reprend automatiquement avec le vrai temps écoulé — sans logique de pause/reprise à implémenter. Ce comportement est cohérent avec le fait que le joueur peut quitter l'app et revenir sans perdre sa session.

Cette décision est documentée ici — pas d'implémentation de mise en pause en Phase 2.

### Ordre d'implémentation dans la Wave 3

M-05 peut être développé en parallèle avec M-03 une fois M-15 livré. `GameHUD` est un composant de présentation qui lit le store — il n'a pas de dépendance sur `ArticleScreen`. Il peut être rendu dans un écran de test ou dans un stub avant d'être intégré dans `ArticleScreen`.

### Localisation des fichiers

```
apps/mobile/src/components/game/GameHUD.tsx
apps/mobile/src/hooks/useGameTimer.ts
```

### Hook useGameTimer

Le timer est encapsulé dans un hook dédié. La logique de `setInterval` ne doit pas être dans le composant.

```typescript
// apps/mobile/src/hooks/useGameTimer.ts

export interface UseGameTimerResult {
  /** Temps écoulé formaté "mm:ss". Retourne "00:00" si pas de session active. */
  formattedTime: string;
  /** Secondes entières écoulées depuis startedAt. Utile pour les tests. */
  elapsedSeconds: number;
}

/**
 * Calcule le temps écoulé depuis session.startedAt en temps réel.
 *
 * - Met à jour toutes les secondes via setInterval.
 * - S'arrête automatiquement si status !== 'in_progress'.
 * - Retourne "00:00" et 0 si currentSession est null.
 * - Nettoie l'intervalle au démontage du composant.
 *
 * Pas de dépendance à AppState — le timer continue en arrière-plan
 * (voir décision UX dans M-05).
 */
export function useGameTimer(): UseGameTimerResult;
```

**Implémentation attendue** :

```typescript
// Squelette d'implémentation (non normatif — Laurent adapte selon ses conventions)

export function useGameTimer(): UseGameTimerResult {
  const currentSession = useGameStore((state) => state.currentSession);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (currentSession === null || currentSession.status !== 'in_progress') {
      setElapsedSeconds(0);
      return;
    }

    // Calcul initial immédiat pour éviter la seconde de délai au montage
    const computeElapsed = (): number =>
      Math.floor((Date.now() - currentSession.startedAt.getTime()) / 1000);

    setElapsedSeconds(computeElapsed());

    const interval = setInterval(() => {
      setElapsedSeconds(computeElapsed());
    }, 1000);

    return () => { clearInterval(interval); };
  }, [currentSession]);

  const formattedTime = formatSeconds(elapsedSeconds);

  return { formattedTime, elapsedSeconds };
}
```

**Fonction utilitaire de formatage** : définir `formatSeconds(seconds: number): string` comme fonction pure exportée dans le même fichier. Elle doit être testable unitairement sans mock du store.

```typescript
export function formatSeconds(seconds: number): string {
  const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
  const ss = (seconds % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}
```

### Composant GameHUD

```typescript
// apps/mobile/src/components/game/GameHUD.tsx

export interface GameHUDProps {
  /** Nombre de sauts à afficher. Passé en prop depuis ArticleScreen. */
  jumps: number;
  /** Titre de l'article cible — affiché pour rappel pendant la partie. */
  targetTitle: string;
}

/**
 * Bandeau fixe affiché pendant la partie.
 * Affiche le compteur de sauts et le timer en temps réel.
 *
 * - Lit useGameTimer() pour le temps.
 * - Reçoit jumps et targetTitle en props (données issues du store, passées par ArticleScreen).
 * - Composant de présentation pur : pas d'accès direct au store (sauf via le hook timer).
 */
export function GameHUD({ jumps, targetTitle }: GameHUDProps): React.JSX.Element;
```

**Pourquoi passer `jumps` en prop plutôt que le lire dans le store ?** L'écran `ArticleScreen` accède déjà au store pour obtenir `currentSession`. Passer `jumps` en prop évite une deuxième souscription au store dans `GameHUD` pour une donnée déjà disponible dans le parent. Cela simplifie les tests de `GameHUD` (pas de mock du store nécessaire).

### Disposition du HUD dans ArticleScreen

`GameHUD` est rendu dans la zone fixe entre le header et la WebView (voir layout M-03). Il est rendu en dehors de la WebView — il n'est donc pas affecté par le scroll de l'article.

```typescript
// Dans ArticleScreen
const currentSession = useGameStore((state) => state.currentSession);
const jumps = currentSession?.jumps ?? 0;
const targetTitle = currentSession?.targetArticle.title ?? '';

// Rendu
<GameHUD jumps={jumps} targetTitle={targetTitle} />
```

### Performance — isolation des re-rendus

Le `setInterval` dans `useGameTimer` déclenche un setState toutes les secondes. Pour éviter que cette mise à jour ne re-rende `ArticleScreen` entier (et donc ne perturbe le scroll de la WebView), `GameHUD` doit être mémoïsé avec `React.memo`.

```typescript
export const GameHUD = React.memo(function GameHUD({ jumps, targetTitle }: GameHUDProps) {
  // ...
});
```

`React.memo` évite le re-rendu de `GameHUD` si ses props `jumps` et `targetTitle` n'ont pas changé — seul le timer interne se met à jour via le hook.

**Point de vigilance** : si `ArticleScreen` re-rende à chaque seconde à cause du timer, cela n'impacte pas la WebView (composant natif indépendant du cycle de rendu React) mais peut provoquer des animations saccadées sur d'autres éléments de l'écran. Vérifier en profiling sur un device physique (pas le simulateur).

### Tests attendus

Les tests portent sur la logique pure :

1. **`formatSeconds`** (test unitaire, aucun mock) :
   - `formatSeconds(0)` → `"00:00"`
   - `formatSeconds(61)` → `"01:01"`
   - `formatSeconds(3600)` → `"60:00"`
   - `formatSeconds(59)` → `"00:59"`

2. **`useGameTimer`** (test avec `@testing-library/react-hooks` ou `renderHook` de RTL) :
   - Retourne `"00:00"` quand `currentSession === null`
   - Retourne `"00:00"` quand `status !== 'in_progress'`
   - Incrémente correctement après avance du temps (`jest.useFakeTimers()` + `jest.advanceTimersByTime`)
   - Nettoie l'intervalle au démontage (vérifier qu'aucun setState n'est appelé après le démontage)

3. **`GameHUD`** (test de rendu React) :
   - Affiche correctement `jumps` et `targetTitle` passés en props
   - Affiche le temps formaté issu du hook (mocker `useGameTimer`)

### Points de vigilance

1. **`setInterval` et temps réel** : l'intervalle de 1 seconde n'est pas garanti à la milliseconde près sur mobile. Le calcul basé sur `Date.now() - startedAt` est exact (pas de drift d'accumulation) contrairement à un compteur incrémental.
2. **Démontage et cleanup** : le `return () => { clearInterval(interval); }` dans `useEffect` est obligatoire. Sans cleanup, l'intervalle continue après le démontage et provoque un warning React sur un setState sur composant démonté.
3. **`currentSession.startedAt` est un objet `Date`** : vérifié dans le store (hydration M-07 reconstitue les Date). Ne pas appeler `new Date(currentSession.startedAt)` si c'est déjà une Date — cela provoquerait `NaN` en TypeScript strict. Vérifier le type à l'accès.
4. **`React.memo` et référence des props** : `targetTitle` est une string — la comparaison par valeur de `React.memo` fonctionne correctement. Pas de risque de re-rendu intempestif dû à une nouvelle référence d'objet.

---

## Spécifications visuelles — Benjamin (UX/UI)

## Composant : GameHUD

### Objectif
Informer le joueur de sa performance en cours de partie (sauts effectués et temps écoulé) sans distraire de la lecture de l'article.

### Layout (ASCII)

```
┌─────────────────────────────────────┐  [FIXED - hauteur 40pt]
│  ⬡ 3 sauts   ⏱ 01:24   → Louvre    │  fond #F8FAFC
└─────────────────────────────────────┘
```

Disposition horizontale, trois blocs séparés par des séparateurs verticaux discrets. Le HUD est intentionnellement compact — 40pt de hauteur totale.

Détail des trois zones :

```
┌──────────────┬──────────────┬──────────────────────┐
│  ⬡  3 sauts  │  ⏱  01:24   │  →  Louvre           │
│  Bold 13px   │  Bold 13px   │  Regular 12px truncat│
└──────────────┴──────────────┴──────────────────────┘
  flex: 0        flex: 0          flex: 1 (prend le reste)
  padding H 12pt  padding H 12pt   padding H 12pt
```

Le titre cible (troisième zone) prend le flex restant et tronque avec ellipsis si long.

### Composants

- **Conteneur HUD** — `height: 40pt`, `flexDirection: 'row'`, `alignItems: 'center'`, fond `#F8FAFC`, `borderBottomWidth: 1`, `borderBottomColor: '#E2E8F0'`. Aucun ombrage.
- **Icône sauts** — Caractère bullet ou icône simple (pas d'emoji en production — utiliser un vecteur simple ou le caractère `↗`). Couleur `#64748B`. Taille 14pt. `paddingLeft: 12pt`.
- **Compteur sauts** — `"3 sauts"` (ou `"1 saut"` au singulier). Bold 13px, couleur `#1E293B`. Mis à jour à chaque saut sans animation (mise à jour discrète, le chiffre change simplement). `accessibilityLabel="3 sauts effectués"`.
- **Séparateur** — `width: 1pt`, `height: 20pt`, `backgroundColor: '#E2E8F0'`, centré verticalement. Marge horizontale 8pt de chaque côté.
- **Icône timer** — Caractère `⏱` ou icône vecteur horloge. Couleur `#64748B`. Taille 14pt.
- **Timer** — Format `"mm:ss"`. Bold 13px, couleur `#1E293B`. Se met à jour toutes les secondes. `accessibilityLabel="Temps écoulé : 1 minute 24 secondes"` (calculé depuis `elapsedSeconds` pour l'accessibilité, pas depuis la chaîne formatée).
- **Séparateur 2** — identique au premier séparateur.
- **Icône cible** — Caractère `→` ou icône flèche. Couleur `#2563EB` (bleu primary, signale que c'est l'objectif actif). Taille 13pt.
- **Titre cible** — Libellé fixe `"Cible :"` en Regular 11px `#64748B` + titre en Regular 12px `#1E293B`, `numberOfLines={1}`, `ellipsizeMode="tail"`, `flex: 1`. `accessibilityLabel="Article cible : [titre]"`.

### États

- **Default (session active) :**
  ```
  │  ↗ 3 sauts  |  ⏱ 01:24  |  → Cible : Tour Eiffel  │
  ```
  Tous les éléments visibles. Timer s'incrémente en temps réel.

- **Loading (session non encore démarrée, `jumps = 0`, `time = 00:00`) :**
  ```
  │  ↗ 0 saut   |  ⏱ 00:00  |  → Cible : [titre]      │
  ```
  Le HUD est affiché dès que l'`ArticleScreen` est monté. `"00:00"` avant le premier tick du timer est le comportement normal.

- **Victoire (session terminée) :** Le HUD n'est plus affiché — l'`ArticleScreen` est dépilé au profit de l'écran Victory. Aucun état spécifique à designer pour le HUD.

- **Error / Empty :** Le HUD reçoit ses données en props depuis `ArticleScreen`. Si `currentSession` est null, `jumps = 0` et `targetTitle = ""`. Dans ce cas, afficher :
  ```
  │  ↗ 0 saut   |  ⏱ 00:00  |  → Cible :              │
  ```
  Titre cible vide est acceptable — c'est un état dégradé non visible en usage normal.

### Accessibilité

- [ ] `accessibilityLabel` sur le conteneur HUD entier : `"Progression : [N] sauts, [mm:ss] écoulé, cible [titre]"` — permettre aux lecteurs d'écran de lire l'état complet en une seule annonce, plutôt que de forcer la navigation element par element dans le bandeau.
- [ ] Les sous-éléments individuels (compteur, timer, titre cible) peuvent avoir `accessible={false}` si le conteneur parent porte l'`accessibilityLabel` complet — à discuter avec Laurent selon l'implémentation.
- [ ] Contraste ≥ 4.5:1 — `#1E293B` sur `#F8FAFC` : ratio ~14.5:1. `#64748B` sur `#F8FAFC` : ratio ~4.6:1 (passe AA). `#2563EB` sur `#F8FAFC` : ratio ~5.8:1.
- [ ] Zones tactiles — le HUD est un composant d'affichage pur, sans interaction. Aucune zone de tap à respecter.
- [ ] Timer mis à jour toutes les secondes — ne pas utiliser `LiveRegion` sur le timer (causerait une annonce VoiceOver toutes les secondes, inacceptable). Le HUD est lu à la demande du joueur, pas en continu.

### Notes pour Laurent

- Le `React.memo` sur `GameHUD` est confirmé nécessaire (spécifié par le Tech Lead). Sans mémoïsation, le `setInterval` du timer déclenche un re-rendu de `ArticleScreen` toutes les secondes.
- Les icônes `⏱`, `→`, `↗` sont des caractères Unicode. Si le rendu est incohérent entre iOS et Android, remplacer par des composants `Icon` vectoriels (ex: `@expo/vector-icons/Feather` : `watch`, `arrow-right`, `trending-up`). La décision de style final est à Laurent — l'important est la clarté fonctionnelle.
- Le libellé "saut" / "sauts" doit respecter le pluriel : `${jumps} ${jumps <= 1 ? 'saut' : 'sauts'}`. Ne pas afficher "1 sauts".
- Hauteur 40pt est une contrainte ferme — le HUD ne doit pas grandir avec le contenu. `height: 40` fixe, pas `minHeight`.
- Le fond `#F8FAFC` du HUD est un token du design system (Text Primary Dark légèrement adapté en fond clair). Pas de couleur inventée.

---

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
