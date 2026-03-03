/**
 * ReactotronConfig — WikiHop Mobile
 *
 * Configuration Reactotron pour le debug sur device physique.
 * Actif uniquement en mode __DEV__.
 *
 * Utilisation :
 *   - Importer ce fichier EN PREMIER dans index.ts (avant App)
 *   - Lancer l'app Reactotron Desktop sur la machine de dev
 *   - Mettre à jour `host` avec l'IP de la machine de dev si nécessaire
 *
 * IP par défaut : 192.168.1.30 (à adapter selon le réseau local)
 */

import Reactotron from 'reactotron-react-native';

if (__DEV__) {
  Reactotron
    .configure({ host: '192.168.1.30' })
    .useReactNative()
    .connect();
}
