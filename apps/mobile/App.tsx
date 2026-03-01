/**
 * Composant racine — WikiHop Mobile
 *
 * Point d'entrée React de l'application. Monte le RootNavigator
 * qui gère toute la navigation de l'app.
 *
 * Note : default export requis ici par Expo (registerRootComponent).
 * Tous les autres composants utilisent des exports nommés.
 */

import { StatusBar } from 'expo-status-bar';
import React from 'react';

import { RootNavigator } from './src/navigation/RootNavigator';

export default function App(): React.JSX.Element {
  return (
    <>
      <RootNavigator />
      <StatusBar style="auto" />
    </>
  );
}
