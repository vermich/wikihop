# Spec technique — F-12 : Configuration Expo EAS

**Destinataire :** Frontend Dev — Laurent
**Story :** [F-12](../stories/F-12-expo-eas-config.md)
**Références ADR :** ADR-002 (stack — EAS Build), ADR-004 (CI/CD)
**Branche à créer :** `feat/frontend-eas-config`
**PR cible :** `develop`
**Prérequis :** F-04 doit être complété (app Expo initialisée)

---

## Contexte

Expo EAS Build permet de générer des artefacts natifs (.ipa iOS, .apk/.aab Android) sans Xcode ni Android Studio locaux. La configuration EAS doit être mise en place dès la Phase 1 pour valider le pipeline de build en CI (workflow `release.yml`).

---

## Périmètre

### Dans le scope de F-12
- `eas.json` avec les profils `development`, `preview`, `production`
- `app.json` complet avec `expo.extra` et identifiants de bundle
- Script EAS dans `package.json`
- Documentation des secrets requis (jamais commités)
- Validation que le workflow `release.yml` CI passe

### Hors scope de F-12
- Soumission App Store / Play Store (Phase 4)
- Configuration des channels OTA (Phase 4)
- Credentials Apple/Google (à configurer dans EAS dashboard)

---

## Structure de fichiers

```
apps/mobile/
├── eas.json         ← config EAS Build (commité)
├── app.json         ← config Expo (mise à jour)
└── .env.example     ← variables d'environnement EAS (jamais le .env réel)
```

---

## `eas.json`

```json
{
  "cli": {
    "version": ">= 3.0.0",
    "appVersionSource": "local"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "developmentClient": false,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "developmentClient": false,
      "distribution": "store",
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "",
        "ascAppId": "",
        "appleTeamId": ""
      },
      "android": {
        "serviceAccountKeyPath": ""
      }
    }
  }
}
```

**Profils :**
- `development` : build avec `expo-dev-client`, pour le simulateur iOS en développement
- `preview` : APK Android distribué en interne (QR code), sans compte store
- `production` : artefacts store (IPA + AAB), nécessite les credentials Apple/Google

---

## `app.json` — champs obligatoires

Le fichier existant doit contenir au minimum :

```json
{
  "expo": {
    "name": "WikiHop",
    "slug": "wikihop",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.wikihop.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.wikihop.app"
    },
    "extra": {
      "eas": {
        "projectId": "REMPLACER_PAR_EAS_PROJECT_ID"
      }
    },
    "plugins": [
      "expo-router"
    ]
  }
}
```

**Note :** `projectId` EAS est obtenu en exécutant `eas init` depuis `apps/mobile/`. Cette valeur est publique et peut être commitée.

---

## Scripts dans `package.json` (à ajouter)

```json
{
  "scripts": {
    "eas:build:dev": "eas build --profile development --platform all",
    "eas:build:preview": "eas build --profile preview --platform all --non-interactive",
    "eas:build:prod": "eas build --profile production --platform all --non-interactive",
    "eas:submit": "eas submit --platform all"
  }
}
```

---

## Secrets GitHub requis

Ces valeurs **ne sont jamais commitées**. Elles sont configurées dans les Settings du dépôt GitHub > Secrets and variables > Actions.

| Secret | Description | Où le trouver |
|--------|-------------|--------------|
| `EXPO_TOKEN` | Token d'accès EAS | expo.dev > Account > Access Tokens |

**Dans `.env.example`** (fichier commité, sans valeurs réelles) :
```bash
# EAS Build — ne jamais commiter le .env réel
EXPO_TOKEN=your_expo_token_here
```

---

## Validation CI

Le workflow `.github/workflows/release.yml` existant utilise :
```yaml
- name: Setup Expo
  uses: expo/expo-github-action@v8
  with:
    eas-version: latest
    token: ${{ secrets.EXPO_TOKEN }}

- name: Build preview
  working-directory: apps/mobile
  run: eas build --platform all --profile preview --non-interactive
```

Pour que ce step passe, `EXPO_TOKEN` doit être configuré dans les secrets du repo.

---

## Critères de qualité (checklist PR)

- [ ] `eas.json` commité avec les trois profils (`development`, `preview`, `production`)
- [ ] `app.json` complet avec `bundleIdentifier` iOS et `package` Android
- [ ] `.env.example` documente les secrets EAS sans valeurs réelles
- [ ] `eas init` exécuté — `projectId` présent dans `app.json`
- [ ] La commande `eas build --profile preview --platform android --non-interactive` s'exécute sans erreur (peut demander la création du projet EAS si c'est la première fois)
- [ ] Secrets `EXPO_TOKEN` documentés dans `docs/git-conventions.md` (section secrets) ou dans ce document — pas dans le code

---

## Points de vigilance

1. **`eas init`** doit être exécuté **une seule fois** depuis `apps/mobile/` avec un compte Expo authentifié. Le `projectId` généré est ensuite persisté dans `app.json` et commité.

2. **Identifiants de bundle** : `com.wikihop.app` est un placeholder. Les identifiants réels devront être enregistrés sur developer.apple.com et play.google.com en Phase 4.

3. **Le profil `preview` génère un APK** (pas un AAB) : plus facile à distribuer en interne sans passer par le Play Store. Sur iOS, `distribution: "internal"` nécessite que les UDIDs des devices soient enregistrés dans EAS.

4. **Monorepo et EAS** : EAS doit être conscient qu'il build depuis un sous-répertoire du monorepo. La propriété `appVersionSource: "local"` dans `eas.json` gère les versions localement.
