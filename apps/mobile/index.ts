/**
 * Point d'entrée Expo — WikiHop Mobile
 *
 * Enregistre le composant racine App auprès d'Expo.
 * Ce fichier ne contient aucune logique — uniquement le wiring d'entrée.
 */

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent appelle AppRegistry.registerComponent('main', () => App)
// et s'assure que l'environnement est correctement initialisé pour Expo Go ou les builds natifs.
registerRootComponent(App);
