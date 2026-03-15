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

import { AboutScreen } from '../screens/AboutScreen';
import { ArticleScreen } from '../screens/ArticleScreen';
import { ArticleViewerScreen } from '../screens/ArticleViewerScreen';
import { DonationScreen } from '../screens/DonationScreen';
import { GameDetailScreen } from '../screens/GameDetailScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { MultiplayerHistoryScreen } from '../screens/MultiplayerHistoryScreen';
import { MultiplayerResultScreen } from '../screens/MultiplayerResultScreen';
import { MultiplayerRoundTransitionScreen } from '../screens/MultiplayerRoundTransitionScreen';
import { MultiplayerSetupScreen } from '../screens/MultiplayerSetupScreen';
import { PassPhoneScreen } from '../screens/PassPhoneScreen';
import { StatsScreen } from '../screens/StatsScreen';
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
  /**
   * Route History : historique des parties (F3-02).
   * Accessible depuis HomeScreen et VictoryScreen.
   */
  History: undefined;
  /**
   * Route Donation : page de soutien Wikipedia (F3-04).
   * Accessible depuis HomeScreen.
   */
  Donation: undefined;
  /**
   * Route About : écran crédits et informations légales (F3-06).
   * Accessible depuis HomeScreen.
   */
  About: undefined;
  /**
   * Route GameDetail : vue détail d'une partie de l'historique (F3-11).
   * recordId : identifiant UUID de la partie, chargée depuis ScoreStorage.
   */
  GameDetail: {
    recordId: string;
  };
  /**
   * Route Stats : statistiques personnelles (F3-08).
   * Accessible depuis HistoryScreen.
   */
  Stats: undefined;
  /**
   * Route MultiplayerSetup : configuration d'une session multijoueur hot-seat (F3-12).
   * Saisie des noms de joueurs (2-6) et chargement de la paire d'articles.
   */
  MultiplayerSetup: undefined;
  /**
   * Route PassPhone : transition entre deux tours en mode multijoueur (F3-12).
   * playerName : nom du joueur qui doit maintenant jouer.
   * gestureEnabled: false — empêche le swipe back accidentel.
   */
  PassPhone: {
    playerName: string;
  };
  /**
   * Route MultiplayerResult : classement final après la session multijoueur (F3-12).
   * Les données (joueurs, résultats) viennent de useMultiplayerStore.
   * gestureEnabled: false — pas de retour arrière depuis cet écran.
   */
  MultiplayerResult: undefined;
  /**
   * Route MultiplayerRoundTransition : transition entre deux manches (F3-28).
   * Charge une nouvelle paire d'articles et déclenche startNextRound.
   * gestureEnabled: false — empêche tout retour accidentel.
   */
  MultiplayerRoundTransition: undefined;
  /**
   * Route MultiplayerHistory : historique des sessions multijoueur (F3-31).
   * Accessible depuis MultiplayerSetupScreen.
   */
  MultiplayerHistory: undefined;
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
        <Stack.Screen
          name="History"
          component={HistoryScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Donation"
          component={DonationScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="About"
          component={AboutScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="GameDetail"
          component={GameDetailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Stats"
          component={StatsScreen}
          options={{ headerShown: false }}
        />
        {/* Routes multijoueur (F3-12) */}
        <Stack.Screen
          name="MultiplayerSetup"
          component={MultiplayerSetupScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PassPhone"
          component={PassPhoneScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="MultiplayerResult"
          component={MultiplayerResultScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="MultiplayerRoundTransition"
          component={MultiplayerRoundTransitionScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="MultiplayerHistory"
          component={MultiplayerHistoryScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
