/**
 * RootNavigator — WikiHop Mobile
 *
 * Navigateur racine de l'application. Définit le stack principal
 * et les types de routes disponibles.
 *
 * Convention : export nommé (seul App.tsx utilise default export).
 * ADR-002 : React Navigation v7 native-stack
 */

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, type NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';

import { ArticleScreen } from '../screens/ArticleScreen';
import { ArticleViewerScreen } from '../screens/ArticleViewerScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { VictoryScreen } from '../screens/VictoryScreen';

/**
 * Paramètres de chaque route du stack principal.
 *
 * Wave 3 :
 *   - Game : ajout de la route article (M-03)
 *
 * Wave 4 :
 *   - Victory : écran de résultat après victoire (M-06)
 *   - Home : route explicitement déclarée pour navigation.navigate('Home') (M-01)
 *
 * Note sur detachInactiveScreens (M-04) :
 *   La navigation inter-articles utilise navigation.push('Game', ...) qui empile
 *   des instances successives de Game dans le stack. Par défaut, react-navigation
 *   peut détacher les écrans inactifs selon la plateforme. Pour garantir que
 *   le retour arrière (goBack) affiche l'article précédent sans re-fetch réseau,
 *   on ne configure pas detachInactiveScreens ici en Phase 2 — React Navigation
 *   native-stack maintient les composants en vie via le stack natif iOS/Android.
 *   Si un re-fetch est observé en QA, envisager detachInactiveScreens={false}.
 *
 * TODO(QA-M04): monitorer le comportement de détachement des écrans inactifs
 *   lors du retour arrière — vérifier qu'aucun re-fetch réseau n'est déclenché
 *   sur l'article précédemment visité (iOS + Android).
 */
export type RootStackParamList = {
  Home: undefined;
  /**
   * Route Game : affichage d'un article Wikipedia.
   * articleTitle : titre non encodé (ex: "Tour Eiffel").
   */
  Game: {
    articleTitle: string;
  };
  /**
   * Route Victory : écran de résultat après une partie gagnée.
   * La session complétée est lue depuis useGameStore (currentSession).
   * Aucun paramètre de navigation — les données viennent du store.
   */
  Victory: undefined;
  /**
   * Route ArticleViewer : lecture d'un article Wikipedia hors-jeu (depuis VictoryScreen).
   */
  ArticleViewer: {
    url: string;
    title: string;
  };
};

/** Type NavigationProp pour le stack racine — exporté pour usage dans les écrans */
export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator(): React.JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Game"
          component={ArticleScreen}
          options={{
            /**
             * headerShown: false obligatoire — le header est géré manuellement
             * dans ArticleScreen pour un contrôle total du rendu (M-03 spec).
             */
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="Victory"
          component={VictoryScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ArticleViewer"
          component={ArticleViewerScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
