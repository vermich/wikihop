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

import { HomeScreen } from '../screens/HomeScreen';

/**
 * Paramètres de chaque route du stack principal.
 * Étendu en Phase 2 avec Game, Victory, etc.
 */
export type RootStackParamList = {
  Home: undefined;
  // Phase 2 : Game, Victory, Settings, etc.
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
          options={{ title: 'WikiHop' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
