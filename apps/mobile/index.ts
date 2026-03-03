/**
 * Point d'entrée Expo — WikiHop Mobile
 *
 * Enregistre le composant racine App auprès d'Expo.
 * Ce fichier ne contient aucune logique — uniquement le wiring d'entrée.
 *
 * Reactotron doit être importé EN PREMIER pour intercepter les logs dès le démarrage.
 */

// Reactotron doit être importé avant tout autre module (actif uniquement en __DEV__)
import './src/config/ReactotronConfig';

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent appelle AppRegistry.registerComponent('main', () => App)
// et s'assure que l'environnement est correctement initialisé pour Expo Go ou les builds natifs.
registerRootComponent(App);
