/**
 * MultiplayerRoundTransitionScreen — WikiHop Mobile — F3-28
 *
 * Écran de transition entre deux manches multijoueur.
 *
 * Responsabilité :
 *   - Charge une nouvelle paire d'articles (useRandomPair)
 *   - Appelle startNextRound() sur le store multijoueur
 *   - Démarre la session de jeu pour le joueur 1 de la nouvelle manche
 *   - Navigue vers PassPhone via navigation.replace (pas navigate, pour ne pas
 *     laisser cet écran accessible par retour arrière)
 *
 * Gestion d'erreur :
 *   - Si pairState.status === 'error' : affiche un message et un bouton
 *     "Retour aux résultats" qui navigue vers MultiplayerResult
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
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRandomPair } from '../hooks/useRandomPair';
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
  const { state: pairState } = useRandomPair('normal');

  const currentRound = useMultiplayerStore((s) => s.currentRound);
  const roundCount = useMultiplayerStore((s) => s.roundCount);
  const players = useMultiplayerStore((s) => s.players);
  const startNextRound = useMultiplayerStore((s) => s.startNextRound);
  const clearSession = useGameStore((s) => s.clearSession);
  const startSession = useGameStore((s) => s.startSession);

  // Déclencher la transition dès que la paire est chargée
  useEffect(() => {
    if (pairState.status !== 'success') return;

    // Construction explicite Article — pas de spread depuis ArticleSummary
    const startArticle: Article = {
      id: pairState.start.id,
      title: pairState.start.title,
      url: pairState.start.url,
      language: pairState.start.language,
    };
    const targetArticle: Article = {
      id: pairState.target.id,
      title: pairState.target.title,
      url: pairState.target.url,
      language: pairState.target.language,
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
  // Dépendance intentionnellement limitée à pairState.status :
  // les actions Zustand (startNextRound, clearSession, startSession) sont stables
  // (identité de référence garantie par Zustand create).
  // players capturé au moment du mount — stable pendant la transition.
  // eslint-plugin-react-hooks non installé dans ce projet.
  }, [pairState.status]);

  // ── Gestion d'erreur de chargement de paire ────────────────────────────────
  if (pairState.status === 'error') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {'Impossible de charger la manche suivante.'}
          </Text>
          <Text style={styles.errorSubtext}>
            {'Vérifiez votre connexion internet.'}
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => { navigation.navigate('MultiplayerResult'); }}
            accessibilityLabel="Retour aux résultats"
            accessibilityRole="button"
          >
            <Text style={styles.backButtonText}>{'Retour aux résultats'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Affichage de chargement ────────────────────────────────────────────────
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    height: 52,
    paddingHorizontal: 24,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
