# WebView Android — Leçons apprises

Version : 1.0 — issu de la rétro Phase 2 (2026-03-06)
Auteur : Tech Lead (Maxime)

Consulter ce fichier EN PREMIER avant tout debug impliquant la WebView,
la navigation inter-articles, ou le comptage de sauts.

---

## Bug Phase 2 — Compteur de sauts et victoire non déclenchée (Android)

### Symptôme

Sur Android, le compteur de sauts ne s'incrémentait pas et la victoire n'était
pas déclenchée lors de la navigation inter-articles via la WebView.

### Hypothèses testées et résultats

| # | Hypothèse | Résultat |
|---|-----------|----------|
| 1 | Stale closure dans le handler | INVALIDÉE — correction sans effet |
| 2 | Filtre `if (navState.loading) return` trop agressif | INVALIDÉE — suppression sans effet |
| 3 | Source fixe (`initialUri.current`) pour éviter les re-renders | INVALIDÉE — sans effet |
| 4 | Extraction d'URL trop stricte (`startsWith(domain)`) + source dynamique | RÉSOLUE — alignement avec V1 |

### Cause racine

L'extraction d'URL utilisait `startsWith(domain)` pour filtrer les URLs Wikipedia.
Sur Android, la WebView peut produire des URLs légèrement différentes (redirections,
variantes de protocole, paramètres ajoutés) qui ne matchaient pas ce filtre strict.

La V1 utilisait une comparaison plus permissive. Le diff V1/V2 aurait identifié
ce delta dès le départ.

### Leçon principale

Le diff V1 → V2 était la première action à faire, pas la dernière.
Voir `docs/debug-protocol.md` Règle 2.

---

## Patterns à risque — WebView Android

### 1. Extraction d'URL — ne pas utiliser startsWith strict

```typescript
// RISQUE — peut rater des variantes d'URL Android
if (url.startsWith('https://fr.wikipedia.org')) { ... }

// PLUS ROBUSTE — inclure les variantes
if (url.includes('wikipedia.org/wiki/')) { ... }
```

Android peut produire des variantes : redirections HTTP→HTTPS, paramètres
de session, URLs canoniques vs mobiles. Tester les deux plateformes avant
de valider un filtre d'URL.

### 2. Source fixe vs dynamique

Utiliser une source fixe (`uri` constant) réduit les re-renders mais peut
bloquer la mise à jour de l'article affiché si le state change.
Tester le comportement de rechargement sur Android (plus strict que iOS).

### 3. Stale closures dans onNavigationStateChange

Le handler `onNavigationStateChange` est souvent mémorisé. S'assurer que
les valeurs de store Zustand sont lues via `useRef` ou via un getter,
pas capturées dans la closure initiale.

Pattern recommandé :
```typescript
const sessionRef = useRef(session);
useEffect(() => { sessionRef.current = session; }, [session]);
```

### 4. injectedJavaScriptBeforeContentLoaded

- Doit se terminer par `true;` (obligatoire Android, silencieusement ignoré iOS)
- Ne pas imbriquer des backticks dans la template string — utiliser `JSON.stringify()`
- `useCapture: true` dans `addEventListener` obligatoire pour capturer les clics avant propagation

### 5. onShouldStartLoadWithRequest — comportement non uniforme

Cette prop a un comportement asynchrone non garanti sur Android.
Préférer l'interception via `postMessage` depuis le script injecté.
Ne pas utiliser `onShouldStartLoadWithRequest` pour la logique de navigation critique.

---

## Checklist avant tout commit WebView

- [ ] Diff consulté avec la version précédente fonctionnelle
- [ ] Filtre d'URL testé avec variantes Android (redirections, HTTP/HTTPS)
- [ ] Script injecté se termine par `true;`
- [ ] Pas de backticks imbriqués dans les template strings d'injection
- [ ] Test sur device physique Android (simulateur insuffisant pour WebView)
- [ ] Gate device physique coché (voir CLAUDE.md)
