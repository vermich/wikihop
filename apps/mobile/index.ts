/**
 * Point d'entrée Expo — WikiHop Mobile
 *
 * Enregistre le composant racine App auprès d'Expo.
 * Ce fichier ne contient aucune logique — uniquement le wiring d'entrée.
 *
 * Reactotron doit être importé EN PREMIER pour intercepter les logs dès le démarrage.
 */

// Reactotron uniquement en mode __DEV__ — ne pas bundler en production
// require() conditionnel : Metro ne bundle pas ce module dans les builds de production
if (__DEV__) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./src/config/ReactotronConfig');
}

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent appelle AppRegistry.registerComponent('main', () => App)
// et s'assure que l'environnement est correctement initialisé pour Expo Go ou les builds natifs.
registerRootComponent(App);
