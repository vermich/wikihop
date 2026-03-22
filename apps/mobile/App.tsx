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
 * Sentry (P-14) :
 *   Sentry.init() est appelé en premier, avant tout import applicatif.
 *   Sentry.wrap() intercepte les crashs non catchés sur le thread JS.
 *   enabled: false en développement pour ne pas polluer le projet Sentry.
 *
 * Note : default export requis ici par Expo (registerRootComponent).
 * Tous les autres composants utilisent des exports nommés.
 */

import * as Sentry from '@sentry/react-native';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';

import './src/i18n/i18n';
import { useCriticalUpdateCheck } from './src/hooks/useCriticalUpdateCheck';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useGameStore } from './src/store/game.store';
import { useLanguageStore } from './src/store/language.store';
import { filterSentryEvent } from './src/utils/sentry.utils';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  // Désactiver en développement pour ne pas polluer le projet Sentry
  enabled: process.env.NODE_ENV === 'production',
  // Pas de sampling de sessions — on capture tous les crashs, pas de tracing de performance
  tracesSampleRate: 0,
  // Attacher la stack trace à tous les événements (pas uniquement les exceptions non catchées)
  attachStacktrace: true,
  // sendDefaultPii: false désactive la collecte automatique de l'IP — requis DPO
  sendDefaultPii: false,
  // Filtre obligatoire : supprime toute donnée potentiellement personnelle avant envoi
  beforeSend(event) {
    return filterSentryEvent(event);
  },
});

function App(): React.JSX.Element {
  // Vérification OTA critique au démarrage — no-op en simulateur/Expo Go
  useCriticalUpdateCheck();

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

// Sentry.wrap() intercepte les erreurs non catchées React Native (JS thread crash)
// C'est le mécanisme principal de détection des crashs — exception documentée
// au pattern "default export uniquement pour App.tsx" (requis Expo + Sentry.wrap)
export default Sentry.wrap(App);
