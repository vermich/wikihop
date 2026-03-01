# 📱 WikiHop — Guide d'installation

Bienvenue ! Ce guide vous explique étape par étape comment installer et lancer WikiHop sur votre Mac, même si vous n'êtes pas développeur.

WikiHop est un jeu mobile : vous reliez deux articles Wikipedia en naviguant uniquement via les liens internes, le plus vite possible.

---

## Ce dont vous aurez besoin

Avant de commencer, voici une vue d'ensemble de ce que vous allez installer :

| Outil | À quoi ça sert |
|-------|----------------|
| **Node.js** | Le moteur qui fait tourner le code |
| **Docker Desktop** | Fait tourner la base de données dans une "boîte" isolée |
| **Expo Go** | L'application sur votre téléphone pour voir le jeu |

---

## 1. ✅ Prérequis — Ce qu'il faut installer

### 1.1 Node.js (version 20 ou plus récente)

Node.js est le moteur qui fait fonctionner le projet sur votre ordinateur.

1. Rendez-vous sur [https://nodejs.org/fr/](https://nodejs.org/fr/)
2. Téléchargez la version **LTS** (c'est la version stable recommandée)
3. Lancez l'installeur et suivez les étapes (tout par défaut)

Pour vérifier que l'installation a réussi, ouvrez le **Terminal** et tapez :

```bash
node --version
```

Vous devriez voir quelque chose comme `v20.x.x`. Si c'est le cas, c'est bon !

> 💡 **Comment ouvrir le Terminal ?** Appuyez sur `Cmd + Espace`, tapez "Terminal", puis appuyez sur Entrée.

---

### 1.2 Docker Desktop

Docker crée une "boîte" isolée sur votre Mac pour faire tourner la base de données du jeu, sans rien installer directement sur votre système.

1. Rendez-vous sur [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
2. Cliquez sur **Download for Mac**
3. Choisissez la version correspondant à votre Mac :
   - **Apple Silicon** si vous avez un Mac avec puce M1, M2, M3 ou M4
   - **Intel** si vous avez un Mac plus ancien
4. Lancez l'installeur et faites glisser Docker dans votre dossier Applications
5. Ouvrez Docker Desktop depuis votre dossier Applications
6. Acceptez les conditions d'utilisation

> ✅ Docker est prêt quand vous voyez une icône de baleine 🐳 dans la barre des menus en haut à droite de votre écran.

---

### 1.3 Expo Go (sur votre téléphone)

Expo Go est l'application qui affiche WikiHop sur votre téléphone pendant le développement.

- **iPhone** : [Télécharger sur l'App Store](https://apps.apple.com/fr/app/expo-go/id982107779)
- **Android** : [Télécharger sur Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

Installez-la maintenant, vous en aurez besoin à l'étape 7.

---

## 2. 📥 Récupérer le projet

> **Si vous travaillez dans Cursor (ou tout autre éditeur avec le projet déjà ouvert) — passez directement à l'étape 3.** Le projet est déjà sur votre machine.

Si vous partez de zéro sur un nouvel ordinateur, ouvrez le **Terminal** et tapez :

```bash
git clone https://github.com/vermich/wikihop.git
cd wikihop
```

**Dans Cursor**, utilisez le Terminal intégré (`Ctrl + \`` ou menu *Terminal > New Terminal*) — il s'ouvre automatiquement à la racine du projet, vous n'avez rien d'autre à faire.

> 💡 Toutes les commandes qui suivent doivent être exécutées depuis le dossier racine `wikihop` (celui qui contient `package.json`).

---

## 3. ⚙️ Configuration — Les fichiers de réglages

L'application utilise des fichiers de configuration pour connaître ses paramètres (port, base de données, langue…). Ces fichiers ne sont pas inclus dans le projet pour des raisons de sécurité, mais des modèles sont fournis.

### 3.1 Configuration de la base de données (à la racine)

```bash
cp .env.example .env
```

Ce fichier contient les réglages de la base de données Docker. Vous n'avez pas besoin de le modifier — les valeurs par défaut fonctionnent telles quelles.

| Variable | Valeur par défaut | Ce que ça signifie |
|----------|-------------------|--------------------|
| `POSTGRES_USER` | `wikihop` | Le nom d'utilisateur de la base de données |
| `POSTGRES_PASSWORD` | `wikihop` | Le mot de passe de la base de données |
| `POSTGRES_DB` | `wikihop_dev` | Le nom de la base de données |
| `POSTGRES_PORT` | `5432` | Le "numéro de port" (porte d'entrée) de la base de données |

---

### 3.2 Configuration du serveur backend

```bash
cp apps/backend/.env.example apps/backend/.env
```

Ce fichier configure le serveur qui fait tourner la logique du jeu.

| Variable | Valeur par défaut | Ce que ça signifie |
|----------|-------------------|--------------------|
| `NODE_ENV` | `development` | Mode de fonctionnement (development = pour tester en local) |
| `PORT` | `3000` | Le "numéro de porte" du serveur (ne pas modifier) |
| `HOST` | `0.0.0.0` | L'adresse d'écoute du serveur (ne pas modifier) |
| `LOG_LEVEL` | `info` | Le niveau de détail des messages dans le Terminal |
| `DATABASE_URL` | `postgresql://wikihop:wikihop_local@localhost:5432/wikihop_dev` | L'adresse complète pour se connecter à la base de données |
| `WIKIPEDIA_LANG` | `fr` | La langue de Wikipedia utilisée (fr = français) |
| `CACHE_TTL_SECONDS` | `3600` | Durée de mise en cache des données Wikipedia (en secondes) |

> ✅ Vous n'avez pas besoin de modifier ces valeurs pour un usage local.

---

## 4. 📦 Installation des dépendances

Les "dépendances" sont des outils et bibliothèques dont le projet a besoin pour fonctionner. Une seule commande suffit pour tout installer :

```bash
npm install
```

Cette commande peut prendre 1 à 2 minutes. Vous verrez des lignes défiler dans le Terminal — c'est normal !

> ✅ Quand c'est terminé, vous retrouvez votre invite de commande (le curseur qui clignote).

---

## 5. 🐘 Démarrer la base de données

La base de données stocke les informations du jeu (parties, scores, etc.). Elle tourne dans Docker.

Assurez-vous que **Docker Desktop est bien lancé** (l'icône baleine 🐳 dans la barre des menus), puis tapez :

```bash
npm run db:up
```

Au premier lancement, Docker télécharge l'image PostgreSQL — cela peut prendre quelques minutes selon votre connexion.

**Pour vérifier que la base de données fonctionne :**

```bash
docker ps
```

Vous devriez voir une ligne mentionnant `wikihop-postgres` avec le statut `Up`.

> 💡 La base de données reste active tant que Docker Desktop est ouvert. Elle redémarre automatiquement la prochaine fois que vous ouvrez Docker Desktop.

---

## 6. 🖥️ Démarrer le serveur backend

Le backend est le "cerveau" du jeu : il gère les parties, communique avec Wikipedia et répond aux demandes de l'application mobile.

Ouvrez un **nouveau Terminal** (ou un nouvel onglet Terminal avec `Cmd + T`), puis tapez :

```bash
npm run dev:backend
```

Vous verrez des messages s'afficher, dont quelque chose comme :

```
Server listening at http://0.0.0.0:3000
```

**Pour vérifier que le backend fonctionne**, ouvrez votre navigateur web et rendez-vous sur :

```
http://localhost:3000/health
```

Si vous voyez une réponse du type `{"status":"ok"}` ou similaire, le backend est opérationnel ! 🎉

> ⚠️ Gardez ce Terminal ouvert pendant que vous utilisez l'application. Fermer le Terminal arrêtera le serveur.

---

## 7. 📱 Démarrer l'application mobile

L'application mobile est ce que vous verrez sur votre téléphone. Vous avez besoin que le backend (étape 6) soit déjà lancé.

Ouvrez un **nouveau Terminal** (ou un nouvel onglet avec `Cmd + T`), puis tapez :

```bash
cd apps/mobile && npx expo start
```

Après quelques secondes, un **QR code** apparaît dans le Terminal.

**Sur votre téléphone :**

- **iPhone** : Ouvrez l'application **Appareil photo**, pointez-la vers le QR code — un lien apparaît en haut, appuyez dessus
- **Android** : Ouvrez l'application **Expo Go**, appuyez sur "Scan QR Code" et pointez vers le QR code

L'application WikiHop va se charger sur votre téléphone ! 🎉

> 💡 Votre téléphone et votre Mac doivent être connectés au **même réseau Wi-Fi**.

> ⚠️ Gardez ce Terminal ouvert. Fermer le Terminal arrêtera l'application.

---

## 8. 🛠️ Scripts utiles — Commandes du quotidien

Voici un récapitulatif des commandes les plus utiles, à taper depuis le dossier racine `wikihop` :

| Commande | Ce qu'elle fait |
|----------|----------------|
| `npm run db:up` | Démarre la base de données PostgreSQL |
| `npm run db:down` | Arrête la base de données PostgreSQL |
| `npm run db:reset` | Remet la base de données à zéro (efface toutes les données) |
| `npm run dev:backend` | Démarre le serveur backend |
| `npm run dev` | Démarre la base de données ET le backend en une seule commande |
| `npm test` | Lance les tests automatiques |
| `npm run lint` | Vérifie la qualité du code |

**Pour l'application mobile (depuis le dossier `apps/mobile`) :**

| Commande | Ce qu'elle fait |
|----------|----------------|
| `npx expo start` | Démarre l'application mobile |
| `npx expo start --clear` | Démarre l'application en vidant le cache (si quelque chose ne s'affiche pas) |

---

## 9. 🔧 Résolution de problèmes courants

### Problème 1 : "command not found: node" ou "command not found: npm"

**Symptôme :** Le Terminal affiche `command not found` quand vous tapez `node` ou `npm`.

**Solution :** Node.js n'est pas installé correctement. Retournez à l'étape 1.1 et réinstallez Node.js. Pensez à **fermer et rouvrir votre Terminal** après l'installation.

---

### Problème 2 : La base de données ne démarre pas / Docker refuse de lancer

**Symptôme :** `npm run db:up` affiche une erreur, ou `docker ps` ne montre pas `wikihop-postgres`.

**Solutions à essayer dans l'ordre :**

1. Vérifiez que **Docker Desktop est bien ouvert** — cherchez l'icône baleine 🐳 dans la barre des menus
2. Si Docker est ouvert mais l'erreur persiste, cliquez sur l'icône Docker > **Restart**
3. Si le port 5432 est déjà utilisé, arrêtez d'abord l'ancien conteneur :
   ```bash
   npm run db:down
   npm run db:up
   ```

---

### Problème 3 : L'application mobile ne se charge pas sur le téléphone

**Symptôme :** Le QR code est affiché dans le Terminal mais rien ne se passe sur le téléphone, ou l'application reste bloquée sur l'écran de chargement.

**Solutions à essayer dans l'ordre :**

1. Vérifiez que votre **téléphone et votre Mac sont sur le même réseau Wi-Fi**
2. Si vous utilisez un réseau d'entreprise ou un VPN, essayez de le désactiver
3. Dans le Terminal où Expo est lancé, appuyez sur la touche `r` pour forcer un rechargement
4. Essayez de vider le cache :
   ```bash
   npx expo start --clear
   ```
5. Désinstallez et réinstallez l'application **Expo Go** sur votre téléphone

---

### Problème 4 : Le backend affiche une erreur de connexion à la base de données

**Symptôme :** Au démarrage du backend, vous voyez une erreur mentionnant `connection refused` ou `ECONNREFUSED 5432`.

**Signification :** Le backend ne trouve pas la base de données.

**Solutions :**

1. Assurez-vous que la base de données est bien démarrée (étape 5) :
   ```bash
   docker ps
   ```
   Vous devez voir `wikihop-postgres` avec le statut `Up`.

2. Si la base de données n'est pas démarrée :
   ```bash
   npm run db:up
   ```
   Puis attendez 10 secondes et relancez le backend.

3. Vérifiez que le fichier `apps/backend/.env` existe. S'il est absent, revenez à l'étape 3.2.

---

## ✅ Tout fonctionne — récapitulatif

Quand tout est en ordre, vous devez avoir :

- [ ] Docker Desktop ouvert (icône baleine 🐳 dans la barre des menus)
- [ ] Un Terminal avec `npm run db:up` exécuté avec succès
- [ ] Un Terminal avec `npm run dev:backend` affichant `Server listening at http://0.0.0.0:3000`
- [ ] Un Terminal avec `npx expo start` affichant un QR code
- [ ] L'application WikiHop chargée sur votre téléphone via Expo Go

Bonne partie ! 🏆
