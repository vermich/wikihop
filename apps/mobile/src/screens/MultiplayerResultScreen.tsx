/**
 * MultiplayerResultScreen — WikiHop Mobile — Multijoueur local (F3-12, F3-29)
 *
 * Écran de résultats final du mode multijoueur hot-seat.
 * Affiche le classement de tous les joueurs après que chacun a joué son tour.
 *
 * F3-29 : ajout du bouton "Rejouer" qui charge une nouvelle paire silencieusement
 * au montage et lance une nouvelle session avec les mêmes joueurs.
 *
 * gestureEnabled: false défini dans RootNavigator (pas de swipe back).
 * PAS de bouton retour dans le header.
 *
 * Layout :
 *   [SafeAreaView top+bottom]
 *   ├── Header : "Résultats" centré
 *   └── ScrollView
 *       ├── Bloc paire jouée
 *       ├── Séparateur
 *       ├── Liste classement rankPlayers(players)
 *       └── Zone bouton fixe bas : [Rejouer] + [Retour à l'accueil]
 *
 * Navigation "Retour à l'accueil" :
 *   resetSession() + navigation.reset({ index: 0, routes: [{ name: 'Home' }] })
 *
 * Navigation "Rejouer" :
 *   restartSession(start, target) + startSession + navigate PassPhone joueur 1
 *
 * Conventions :
 *   - Export nommé MultiplayerResultScreen
 *   - StyleSheet.create() en bas du fichier
 *   - Zéro any, TypeScript strict
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Article } from '@wikihop/shared';
import React, { useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRandomPair } from '../hooks/useRandomPair';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useGameStore } from '../store/game.store';
import { useMultiplayerStore, type MultiplayerPlayer } from '../store/multiplayer.store';
import { rankPlayers } from '../utils/multiplayer.utils';

import { formatElapsed } from './VictoryScreen';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type MultiplayerResultScreenProps = NativeStackScreenProps<RootStackParamList, 'MultiplayerResult'>;

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const RANK_MEDALS = ['🥇', '🥈', '🥉'] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Composant PlayerResultRow (interne)
// ─────────────────────────────────────────────────────────────────────────────

interface PlayerResultRowProps {
  player: MultiplayerPlayer;
  rank: number;
}

function PlayerResultRow({ player, rank }: PlayerResultRowProps): React.JSX.Element {
  const isFirstAndWon = rank === 1 && player.won;
  const medal = rank <= 3 ? RANK_MEDALS[rank - 1] : undefined;

  // Stats texte
  let statsText = '—';
  if (player.won && player.jumps !== null && player.durationMs !== null) {
    const elapsedSeconds = Math.floor(player.durationMs / 1000);
    statsText = `${String(player.jumps)} saut${player.jumps <= 1 ? '' : 's'} · ${formatElapsed(elapsedSeconds)}`;
  }

  // Accessibilité
  const rankWord =
    rank === 1 ? 'Première place' :
    rank === 2 ? 'Deuxième place' :
    rank === 3 ? 'Troisième place' :
    `${String(rank)}e place`;

  const statusWord = player.won ? 'Victoire' : 'Abandonné';
  const a11yLabel = player.won && player.jumps !== null && player.durationMs !== null
    ? `${rankWord} : ${player.name} — ${statusWord} en ${statsText}`
    : `${rankWord} : ${player.name} — ${statusWord}`;

  return (
    <View
      style={[styles.resultRow, isFirstAndWon && styles.resultRowFirst]}
      accessible={true}
      accessibilityLabel={a11yLabel}
    >
      {/* Zone rang — médaille ou numéro */}
      <View style={styles.rankZone}>
        {medal !== undefined ? (
          <Text style={styles.rankMedal} accessible={false}>{medal}</Text>
        ) : (
          <Text style={styles.rankNumber} accessible={false}>{`${String(rank)}.`}</Text>
        )}
      </View>

      {/* Zone info */}
      <View style={styles.infoZone} accessible={false}>
        <Text style={styles.playerName}>{player.name}</Text>
        <View style={styles.statsRow}>
          <View style={[
            styles.statusBadge,
            player.won ? styles.statusBadgeWon : styles.statusBadgeAbandoned,
          ]}>
            <Text style={[
              styles.statusBadgeText,
              player.won ? styles.statusBadgeTextWon : styles.statusBadgeTextAbandoned,
            ]}>
              {player.won ? 'Victoire' : 'Abandonné'}
            </Text>
          </View>
          {player.won && player.jumps !== null && (
            <Text style={styles.statsText}>{statsText}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

export function MultiplayerResultScreen({ navigation }: MultiplayerResultScreenProps): React.JSX.Element {
  const players = useMultiplayerStore((s) => s.players);
  const startArticle = useMultiplayerStore((s) => s.startArticle);
  const targetArticle = useMultiplayerStore((s) => s.targetArticle);
  const resetSession = useMultiplayerStore((s) => s.resetSession);
  const restartSession = useMultiplayerStore((s) => s.restartSession);
  const clearSession = useGameStore((s) => s.clearSession);
  const startSession = useGameStore((s) => s.startSession);

  // Chargement silencieux d'une nouvelle paire en arrière-plan (F3-29)
  // Le bouton Rejouer est activé dès que pairState.status === 'success'
  const { state: pairState } = useRandomPair('normal');

  const rankedPlayers = rankPlayers(players);

  const handleHome = useCallback((): void => {
    resetSession();
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  }, [resetSession, navigation]);

  // F3-29 : lancer une nouvelle session avec les mêmes joueurs + nouvelle paire
  const handleReplay = useCallback(async (): Promise<void> => {
    if (pairState.status !== 'success') return;

    // Construction explicite Article — pas de spread depuis ArticleSummary
    const newStartArticle: Article = {
      id: pairState.start.id,
      title: pairState.start.title,
      url: pairState.start.url,
      language: pairState.start.language,
    };
    const newTargetArticle: Article = {
      id: pairState.target.id,
      title: pairState.target.title,
      url: pairState.target.url,
      language: pairState.target.language,
    };

    // Réinitialiser le store multijoueur avec la nouvelle paire
    restartSession(newStartArticle, newTargetArticle);

    // Démarrer la session de jeu pour le joueur 1
    await clearSession();
    // F3-30 : isMultiplayer: true → non enregistré dans l'historique solo
    await startSession(newStartArticle, newTargetArticle, { isMultiplayer: true });

    const firstPlayer = players[0];
    // navigate (pas replace) — Home est toujours accessible en bas du stack
    navigation.navigate('PassPhone', { playerName: firstPlayer?.name ?? '' });
  }, [pairState, players, restartSession, clearSession, startSession, navigation]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle} accessibilityRole="header">
          {'Résultats'}
        </Text>
      </View>
      <View style={styles.headerSeparator} />

      {/* Contenu scrollable */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Bloc paire jouée */}
        {startArticle !== null && targetArticle !== null && (
          <View style={styles.pairBlock}>
            <Text style={styles.pairLabel}>{'Paire jouée :'}</Text>
            <Text style={styles.pairArticles} numberOfLines={2}>
              {`${startArticle.title} → ${targetArticle.title}`}
            </Text>
          </View>
        )}

        {/* Séparateur */}
        <View style={styles.separator} />

        {/* Classement */}
        {rankedPlayers.map((player, index) => (
          <PlayerResultRow
            key={player.name}
            player={player}
            rank={index + 1}
          />
        ))}
      </ScrollView>

      {/* Zone boutons fixe bas — F3-29 : deux boutons côte à côte */}
      <View style={styles.bottomZone}>
        <View style={styles.bottomButtons}>
          <TouchableOpacity
            style={[styles.replayButton, pairState.status !== 'success' && styles.replayButtonDisabled]}
            onPress={() => { void handleReplay(); }}
            disabled={pairState.status !== 'success'}
            accessibilityLabel="Rejouer avec les mêmes joueurs"
            accessibilityRole="button"
            accessibilityState={{ disabled: pairState.status !== 'success' }}
          >
            <Text style={[
              styles.replayButtonText,
              pairState.status !== 'success' && styles.replayButtonTextDisabled,
            ]}>
              {'Rejouer'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.homeButton}
            onPress={handleHome}
            accessibilityLabel="Retour à l'accueil"
            accessibilityRole="button"
          >
            <Text style={styles.homeButtonText}>{"Retour à l'accueil"}</Text>
          </TouchableOpacity>
        </View>
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
  header: {
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
  },
  headerSeparator: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  pairBlock: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  pairLabel: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  pairArticles: {
    fontSize: 14,
    color: '#1E293B',
  },
  separator: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 16,
  },
  resultRow: {
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  resultRowFirst: {
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 3,
    borderLeftColor: '#16A34A',
  },
  rankZone: {
    minWidth: 36,
    alignItems: 'center',
    paddingTop: 2,
  },
  rankMedal: {
    fontSize: 24,
  },
  rankNumber: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#94A3B8',
  },
  infoZone: {
    flex: 1,
    paddingLeft: 8,
  },
  playerName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusBadgeWon: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeAbandoned: {
    backgroundColor: '#F1F5F9',
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  statusBadgeTextWon: {
    color: '#16A34A',
  },
  statusBadgeTextAbandoned: {
    color: '#64748B',
  },
  statsText: {
    fontSize: 13,
    color: '#64748B',
  },
  bottomZone: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  bottomButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  replayButton: {
    flex: 1,
    height: 52,
    borderWidth: 2,
    borderColor: '#2563EB',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replayButtonDisabled: {
    borderColor: '#CBD5E1',
  },
  replayButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  replayButtonTextDisabled: {
    color: '#94A3B8',
  },
  homeButton: {
    flex: 1,
    height: 52,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
