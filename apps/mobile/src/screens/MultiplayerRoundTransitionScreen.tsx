/**
 * MultiplayerRoundTransitionScreen — WikiHop Mobile — F3-28 (mod. F3-32)
 *
 * Écran de transition entre deux manches multijoueur.
 *
 * Responsabilité (F3-32 : paires préchargées) :
 *   - Lit la paire de la prochaine manche depuis allPairs[currentRound] du store
 *     (plus de fetch dynamique — paires préchargées dans MultiplayerSetupScreen)
 *   - Appelle startNextRound() sur le store multijoueur
 *   - Démarre la session de jeu pour le joueur 1 de la nouvelle manche
 *   - Navigue vers PassPhone via navigation.replace (pas navigate, pour ne pas
 *     laisser cet écran accessible par retour arrière)
 *
 * Gestion d'erreur :
 *   - Si allPairs[currentRound] === undefined : cas défensif, navigue vers MultiplayerResult
 *
 * Conventions :
 *   - Export nommé MultiplayerRoundTransitionScreen
 *   - StyleSheet.create() en bas du fichier
 *   - Zéro any, TypeScript strict
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Article } from '@wikihop/shared';
import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RootStackParamList } from '../navigation/RootNavigator';
import { useGameStore } from '../store/game.store';
import { useMultiplayerStore } from '../store/multiplayer.store';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type MultiplayerRoundTransitionScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'MultiplayerRoundTransition'
>;

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

export function MultiplayerRoundTransitionScreen(
  { navigation }: MultiplayerRoundTransitionScreenProps,
): React.JSX.Element {
  // F3-32 : lecture des paires préchargées depuis le store — plus de useRandomPair
  const allPairs = useMultiplayerStore((s) => s.allPairs);
  const currentRound = useMultiplayerStore((s) => s.currentRound);
  const roundCount = useMultiplayerStore((s) => s.roundCount);
  const players = useMultiplayerStore((s) => s.players);
  const startNextRound = useMultiplayerStore((s) => s.startNextRound);
  const clearSession = useGameStore((s) => s.clearSession);
  const startSession = useGameStore((s) => s.startSession);

  // Déclencher la transition dès le montage — la paire est déjà disponible dans le store
  useEffect(() => {
    // La paire pour la prochaine manche est allPairs[currentRound]
    // (currentRound est 1-indexed, allPairs est 0-indexed)
    const nextPair = allPairs[currentRound];
    if (nextPair === undefined) {
      // Cas défensif — ne devrait pas arriver si allPairs est correctement rempli
      navigation.navigate('MultiplayerResult');
      return;
    }

    // Construction explicite Article — pas de spread depuis le type du store
    const startArticle: Article = {
      id: nextPair.start.id,
      title: nextPair.start.title,
      url: nextPair.start.url,
      language: nextPair.start.language,
    };
    const targetArticle: Article = {
      id: nextPair.target.id,
      title: nextPair.target.title,
      url: nextPair.target.url,
      language: nextPair.target.language,
    };

    // Ordre strict :
    // 1. Transition de manche dans le store multijoueur (snapshot + reset joueurs)
    startNextRound(startArticle, targetArticle);

    // 2. Démarrer la session de jeu solo pour le joueur 1 de la nouvelle manche
    void (async () => {
      await clearSession();
      // F3-30 : isMultiplayer: true → non enregistré dans l'historique solo
      await startSession(startArticle, targetArticle, { isMultiplayer: true });
      const firstPlayer = players[0];
      navigation.replace('PassPhone', {
        playerName: firstPlayer?.name ?? '',
      });
    })();
  // Dépendance intentionnellement limitée à currentRound :
  // allPairs, startNextRound, clearSession, startSession, navigation, players
  // ont une identité stable (Zustand create) ou sont capturés au mount.
  // eslint-plugin-react-hooks non installé dans ce projet.
  }, [currentRound]);

  // ── Affichage de chargement ────────────────────────────────────────────────
  // F3-32 : plus d'état loading/error lié à un fetch — transition quasi-instantanée.
  // Le spinner s'affiche pendant la fraction de seconde avant que useEffect s'exécute.
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>
          {`Chargement de la manche ${String(currentRound)}/${String(roundCount)}...`}
        </Text>
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
});
