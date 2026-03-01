/**
 * Composant racine — WikiHop Mobile
 *
 * Point d'entrée React de l'application. Monte le RootNavigator
 * qui gère toute la navigation de l'app.
 *
 * Hydratation du store (M-07) :
 *   hydrate() est appelée une seule fois ici au montage (useEffect),
 *   avant que les écrans ne rendent leur contenu métier.
 *   Les écrans consultent useGameStore(state => state.isHydrated)
 *   pour afficher un indicateur de chargement si nécessaire.
 *
 * Note : default export requis ici par Expo (registerRootComponent).
 * Tous les autres composants utilisent des exports nommés.
 */

import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';

import { RootNavigator } from './src/navigation/RootNavigator';
import { useGameStore } from './src/store/game.store';

export default function App(): React.JSX.Element {
  // hydrate() lit AsyncStorage une seule fois et peuple le store.
  // void : on ne veut pas await ici (useEffect ne peut pas être async),
  // les erreurs sont gérées dans hydrate() elle-même.
  const hydrate = useGameStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <>
      <RootNavigator />
      <StatusBar style="auto" />
    </>
  );
}
