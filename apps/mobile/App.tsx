/**
 * Composant racine — WikiHop Mobile
 *
 * Point d'entrée React de l'application. Monte le RootNavigator
 * qui gère toute la navigation de l'app.
 *
 * Hydratation des stores (M-07 + M-12) :
 *   hydrate() et hydrateLanguage() sont appelées en parallèle une seule fois
 *   au montage (useEffect), avant que les écrans ne rendent leur contenu métier.
 *   Les écrans consultent useGameStore(state => state.isHydrated) et
 *   useLanguageStore(state => state.isLanguageHydrated) pour afficher un
 *   indicateur de chargement si nécessaire.
 *
 * Note : default export requis ici par Expo (registerRootComponent).
 * Tous les autres composants utilisent des exports nommés.
 */

import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';

import { RootNavigator } from './src/navigation/RootNavigator';
import { useGameStore } from './src/store/game.store';
import { useLanguageStore } from './src/store/language.store';

export default function App(): React.JSX.Element {
  // Les deux hydratations sont indépendantes — elles s'exécutent en parallèle.
  // void : useEffect ne peut pas être async, les erreurs sont gérées dans chaque action.
  useEffect(() => {
    void Promise.all([
      useGameStore.getState().hydrate(),
      useLanguageStore.getState().hydrateLanguage(),
    ]);
  }, []);

  return (
    <>
      <RootNavigator />
      <StatusBar style="dark" />
    </>
  );
}
