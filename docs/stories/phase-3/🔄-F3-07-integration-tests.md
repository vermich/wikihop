---
id: F3-07
title: Tests d'intégration — parcours de jeu complet
phase: 3-Features
priority: Should
agents: [QA]
status: in-progress
created: 2026-02-28
completed:
---

# F3-07 — Tests d'intégration — parcours de jeu complet

## User Story
En tant qu'équipe, nous voulons un test de bout en bout validant le parcours de jeu principal, afin de détecter les régressions sur le flux critique.

## Critères d'acceptance
- [ ] Test E2E : démarrer une partie → naviguer 3 articles → atteindre la destination → voir le résultat
- [ ] Test E2E : abandonner une partie en cours
- [ ] Test E2E : jouer le défi quotidien → vérifier qu'il ne peut pas être rejoué
- [ ] Tests d'intégration API : paire aléatoire, défi quotidien, gestion des erreurs Wikipedia
- [ ] Les tests E2E s'exécutent dans la CI (Detox ou Maestro — décision Tech Lead)

## Notes de réalisation

### Décision framework E2E — Maestro retenu

**Analyse comparative pour Expo SDK 54 + React Native 0.81 :**

| Critère | Detox | Maestro |
|---------|-------|---------|
| Config Expo | Nécessite bare workflow ou Expo Dev Client — incompatible avec managed workflow | Fonctionne avec Expo Go et managed workflow sans éjection |
| CI intégration | Nécessite simulateur iOS/Android en CI, configuration lourde (Xcode CLI, AVD) | CLI léger, YAML déclaratif, runner GitHub Actions disponible (`mobile-dev-ci/maestro-action`) |
| Maintenance | Élevée — dépend des versions native, à reconfigurer à chaque upgrade SDK | Faible — les flows YAML sont stables, indépendants du code natif |
| Débogage | Traces détaillées mais setup initial complexe | Screenshots automatiques à chaque étape, réexécution rapide |
| Maturité sur RN | Solide mais complexe | Bonne sur les flux UI standards, limitations sur les WebView (interaction JS cross-frame) |

**Décision : Maestro est retenu.** WikiHop est en managed workflow Expo SDK 54 — une éjection pour Detox introduirait une dette technique et une surface de maintenance disproportionnée par rapport au bénéfice.

**Limitation connue.** Les interactions dans la WebView (navigation inter-articles via tap sur lien) ne sont pas testables avec Maestro car les taps dans un WebView ne sont pas interceptés au niveau Maestro. Le test E2E du parcours complet utilisera des boutons natifs (démarrage de partie) et ne pourra pas simuler les taps de liens Wikipedia. Ce point est accepté pour la Phase 3.

---

### 1. Structure des fichiers

```
apps/mobile/
└── .maestro/
    ├── config.yaml              ← configuration globale (appId, timeout)
    ├── helpers/
    │   └── start-game.yaml      ← flow réutilisable : démarrage d'une partie
    └── flows/
        ├── F3-07-solo-victory.yaml          ← Test 1 : parcours solo complet
        ├── F3-07-abandon-game.yaml          ← Test 2 : abandon de partie
        └── F3-07-daily-non-replayable.yaml  ← Test 3 : défi quotidien non rejouable
```

Installer Maestro CLI localement (pas dans `devDependencies` npm — exécutable externe) :
```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

Ajouter dans `.gitignore` de `apps/mobile/` : `.maestro/videos/` (screenshots de debug).

---

### 2. Test 1 — Parcours solo : démarrage → navigation → victoire

**Fichier :** `.maestro/flows/F3-07-solo-victory.yaml`

Ce test couvre le flux HomeScreen → GameScreen → VictoryScreen sur un parcours simulé. La navigation inter-articles via WebView n'est pas testable (limitation Maestro/WebView). Le test vérifie que :

1. L'application démarre sur HomeScreen
2. Tap sur "Nouvelle partie" lance une partie (bouton accessible par label)
3. L'article de départ s'affiche dans GameScreen (GameHUD visible)
4. Le timer démarre (texte HUD présent)
5. Tap sur "Abandon" depuis le GameHUD
6. L'écran Victory/confirmation d'abandon s'affiche

```yaml
appId: com.wikihop.app  # à ajuster selon eas.json
---
- launchApp
- assertVisible: "Jouer"          # bouton HomeScreen
- tapOn: "Nouvelle partie"
- waitForAnimationToEnd
- assertVisible:
    id: "game-hud"                # accessibilityLabel ou testID à ajouter dans GameHUD
- tapOn:
    id: "abandon-button"          # testID à ajouter dans GameHUD
- assertVisible: "Abandonné"      # badge VictoryScreen
```

**Note pour Laurent.** Ajouter les `testID` suivants aux composants concernés :
- `GameHUD` : `testID="game-hud"` sur le conteneur racine
- Bouton abandon : `testID="abandon-button"`
- Ces `testID` n'ont pas d'impact sur le comportement applicatif.

---

### 3. Test 2 — Abandon de partie

**Fichier :** `.maestro/flows/F3-07-abandon-game.yaml`

Cas : une partie est démarrée puis abandonnée via le bouton dédié. Le test vérifie :

1. Lancement de l'app → HomeScreen
2. Tap "Nouvelle partie" → GameScreen
3. Tap bouton abandon → VictoryScreen avec statut `'abandoned'`
4. Badge "Abandonné" visible
5. Bouton "Retour" visible

```yaml
appId: com.wikihop.app
---
- launchApp
- tapOn: "Nouvelle partie"
- waitForAnimationToEnd
- assertVisible:
    id: "game-hud"
- tapOn:
    id: "abandon-button"
- assertVisible: "Abandonné"
- assertVisible: "Retour"
```

---

### 4. Test 3 — Défi quotidien non rejouable

**Fichier :** `.maestro/flows/F3-07-daily-non-replayable.yaml`

Ce test vérifie que le bouton "Défi du jour" est désactivé après qu'une partie a été jouée dans la même journée. Il ne peut pas mocker AsyncStorage directement — il s'appuie sur l'état réel de l'application après un premier cycle.

Séquence :
1. Lancer l'app → HomeScreen
2. Tap "Défi du jour" → partie démarre
3. Abandon immédiat → retour HomeScreen
4. Vérifier que le bouton "Défi du jour" est désactivé ou remplacé par un indicateur

```yaml
appId: com.wikihop.app
---
- launchApp
- tapOn: "Défi du jour"
- waitForAnimationToEnd
- assertVisible:
    id: "game-hud"
- tapOn:
    id: "abandon-button"
- waitForAnimationToEnd
- tapOn: "Retour"                           # retour HomeScreen depuis VictoryScreen
- assertNotVisible: "Défi du jour"          # bouton absent ou
- assertVisible:
    id: "daily-completed-indicator"         # indicateur de complétion (F3-16)
```

**Note pour Laurent.** Ajouter `testID="daily-completed-indicator"` sur le composant indicateur de complétion quotidienne (déjà implémenté en F3-16).

---

### 5. Configuration CI GitHub Actions

Ajouter un job `e2e-mobile` dans le workflow CI existant (`.github/workflows/ci.yml`).

**Contrainte importante.** Les tests Maestro nécessitent un simulateur iOS ou un émulateur Android. En GitHub Actions, iOS Simulator est disponible sur `macos-latest` uniquement. Ce job doit être marqué `continue-on-error: true` en Phase 3 (les tests E2E sont utiles localement mais ne doivent pas bloquer la CI faute d'environnement stable).

Structure du job :
```yaml
e2e-mobile:
  name: E2E Mobile (Maestro)
  runs-on: macos-latest
  needs: [mobile]
  continue-on-error: true
  steps:
    - uses: actions/checkout@v4
    - name: Install Maestro CLI
      run: curl -Ls "https://get.maestro.mobile.dev" | bash
    - name: Run Maestro flows
      run: maestro test apps/mobile/.maestro/flows/
```

Ce job ne fait pas partie du gate `ci-success` (critère bloquant) en Phase 3 — il est informatif. La promotion en gate bloquant est décidée en Phase 4 (P-XX).

---

### 6. Tests d'intégration API backend — lacunes identifiées

Les tests Supertest existants couvrent déjà exhaustivement :
- `GET /api/game/random-pair` : 200 FR/EN, 400 lang invalide, retry ébauche, timeout AbortController, 503, mode difficile (`game.route.test.ts`)
- `GET /api/game/daily` : 200 FR/EN, idempotence, format date, 400 lang invalide, 503 Wikipedia (`daily-challenge.route.test.ts`)
- `GET /health` : basic health check (`health.test.ts`)
- Connexion base de données (`db.test.ts`)
- Utilitaires (`daily-challenge.utils.test.ts`, `hard-mode.utils.test.ts`)

**Lacunes à combler (scope F3-07) :**

**a. Gestion des erreurs Wikipedia côté `/random-pair` — cas manquants :**
- Réponse Wikipedia avec body JSON malformé (JSON.parse qui jette) → le service ne crash pas, retrie
- Article Wikipedia avec `content_urls` absent → géré proprement (503, pas 500)

**b. Tests du service `popular-pages.service` en isolation (`popular-pages.service.test.ts`) :**
Le fichier existe déjà. Vérifier qu'il couvre :
- Retour cache (TTL non expiré)
- Fallback JSON embarqué si fetch Wikimedia échoue
- Invalidation cache si langue change

**c. Tests manquants sur routes — à créer :**
Fichier `apps/backend/__tests__/routes/wikipedia-errors.route.test.ts` :
- `/random-pair` : body Wikipedia malformé → retrie et échoue en 503 (pas 500)

---

### 7. Points de vigilance

**Maestro et WebView.** Les taps sur les liens dans la WebView Wikipedia ne sont pas interceptés par Maestro. Le flux complet de navigation inter-articles (Article A → Article B → Article C) ne peut pas être automatisé en E2E. Ce cas reste couvert par le gate device physique manuel (CLAUDE.md).

**`testID` vs `accessibilityLabel`.** Maestro supporte les deux. Utiliser `testID` pour les éléments interactifs spécifiquement ajoutés pour les tests (boutons fonctionnels existants peuvent être ciblés par `accessibilityLabel` déjà présent).

**Pas de dépendance npm à ajouter.** Maestro est une CLI externe, pas une dépendance Node. Le `package.json` de `apps/mobile` ne doit pas être modifié pour cette story.

**Isolation des flows.** Chaque flow `.yaml` doit commencer par `launchApp` (fresh start) pour éviter que l'état d'un test influence le suivant. Si l'état AsyncStorage persiste entre les runs, utiliser `clearState: true` dans la config Maestro (efface AsyncStorage et l'état de l'app).

## Validation QA — Halim
<!-- Rempli par QA après les tests -->

## Statut
pending → in-progress → done
