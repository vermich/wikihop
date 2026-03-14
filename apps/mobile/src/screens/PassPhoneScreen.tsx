/**
 * PassPhoneScreen — WikiHop Mobile — Multijoueur local (F3-12)
 *
 * Écran de transition entre deux tours en mode hot-seat.
 * S'affiche avant chaque tour pour demander au joueur de passer l'appareil.
 *
 * Fond sombre #0F172A — rupture visuelle intentionnelle pour signaler le changement de joueur.
 * gestureEnabled: false défini dans RootNavigator pour empêcher le swipe back.
 *
 * Paramètre route : { playerName: string }
 *
 * Navigation au tap "Prêt !" :
 *   → navigate('Game', { articleTitle: startArticle.title })
 *
 * Conventions :
 *   - Export nommé PassPhoneScreen
 *   - StyleSheet.create() en bas du fichier
 *   - Zéro any, TypeScript strict
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RootStackParamList } from '../navigation/RootNavigator';
import { useMultiplayerStore } from '../store/multiplayer.store';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type PassPhoneScreenProps = NativeStackScreenProps<RootStackParamList, 'PassPhone'>;

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

export function PassPhoneScreen({ route, navigation }: PassPhoneScreenProps): React.JSX.Element {
  const { playerName } = route.params;

  const handleReady = (): void => {
    const startArticle = useMultiplayerStore.getState().startArticle;
    const startArticleTitle = startArticle?.title ?? '';
    navigation.navigate('Game', { articleTitle: startArticleTitle });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.phoneIcon} accessible={false}>{'📱'}</Text>
        <Text style={styles.title} accessibilityRole="header">
          {'À toi de jouer !'}
        </Text>
        <Text style={styles.subtitle}>{'Passe le téléphone à'}</Text>
        <Text style={styles.playerName} numberOfLines={1}>
          {playerName}
        </Text>
        <TouchableOpacity
          style={styles.readyButton}
          onPress={handleReady}
          accessibilityLabel="Je suis prêt à jouer"
          accessibilityRole="button"
        >
          <Text style={styles.readyButtonText}>{'Prêt !'}</Text>
        </TouchableOpacity>
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
    backgroundColor: '#0F172A',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 48,
    paddingHorizontal: 32,
  },
  phoneIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 4,
  },
  playerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 48,
  },
  readyButton: {
    height: 56,
    width: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
