/**
 * MultiplayerResultScreen — WikiHop Mobile — Multijoueur local (F3-12, F3-29, F3-33)
 *
 * Écran de résultats final du mode multijoueur hot-seat.
 * Affiche le classement de tous les joueurs après que chacun a joué son tour.
 *
 * F3-29 : ajout du bouton "Rejouer" qui charge une nouvelle paire silencieusement
 * au montage et lance une nouvelle session avec les mêmes joueurs.
 *
 * F3-33 :
 *   - Section "PAR MANCHE" conditionnelle (si roundHistory.length > 1)
 *   - MancheSummaryRow : chips victoire/abandon par joueur pour chaque manche
 *   - rankPlayersGlobalWithRank : rangs partagés (médaille d'or partagée)
 *   - Label "CLASSEMENT FINAL" ajouté
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
 *       ├── [Si roundHistory.length > 1 : Section "PAR MANCHE" + MancheSummaryRows]
 *       ├── Label "CLASSEMENT FINAL"
 *       ├── Liste classement rankPlayersGlobalWithRank(players)
 *       └── Zone bouton fixe bas : [Rejouer] + [Retour à l'accueil]
 *
 * Conventions :
 *   - Export nommé MultiplayerResultScreen
 *   - StyleSheet.create() en bas du fichier
 *   - Zéro any, TypeScript strict
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Article, MultiplayerRoundResult } from '@wikihop/shared';
import React, { useCallback, useEffect, useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRandomPair } from '../hooks/useRandomPair';
import type { RootStackParamList } from '../navigation/RootNavigator';
import * as MultiplayerScoreStorage from '../services/multiplayer-score-storage.service';
import { useGameStore } from '../store/game.store';
import { useMultiplayerStore } from '../store/multiplayer.store';
import { buildMultiplayerRecord } from '../utils/multiplayer-history.utils';
import { rankPlayersGlobalWithRank } from '../utils/multiplayer.utils';
import type { GlobalRankEntryWithRank } from '../utils/multiplayer.utils';

import { formatElapsed } from './VictoryScreen';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type MultiplayerResultScreenProps = NativeStackScreenProps<RootStackParamList, 'MultiplayerResult'>;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers internes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Génère un UUID v4 conforme RFC 4122 sans dépendance sur l'API Web Crypto.
 * Pattern identique à game.store.ts — crypto.randomUUID() non disponible sur Hermes.
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const RANK_MEDALS = ['🥇', '🥈', '🥉'] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Composant MancheSummaryRow (interne) — F3-33
// ─────────────────────────────────────────────────────────────────────────────

interface MancheSummaryRowProps {
  /** Numéro de manche (1-indexed) */
  mancheNumber: number;
  /** Résultats des joueurs pour cette manche — dans l'ordre de leurs index */
  results: MultiplayerRoundResult[];
  /** Noms des joueurs dans l'ordre de leurs index */
  playerNames: string[];
}

function MancheSummaryRow({
  mancheNumber,
  results,
  playerNames,
}: MancheSummaryRowProps): React.JSX.Element {
  const { t } = useTranslation();
  // Construction du résumé textuel pour l'accessibilité
  const a11ySummary = results.map((r, i) => {
    const name = playerNames[i] ?? t('multiplayer_result.player_default_name', { number: i + 1 });
    if (r.won) {
      const jumps = r.jumps ?? 0;
      const key = jumps <= 1 ? 'manche_victory_a11y' : 'manche_victory_a11y_plural';
      return t(`multiplayer_result.${key}`, { name, jumps });
    }
    return t('multiplayer_result.manche_abandoned_a11y', { name });
  }).join(', ');

  return (
    <View
      style={styles.mancheRow}
      accessible={true}
      accessibilityLabel={t('multiplayer_result.round_a11y', { number: mancheNumber, summary: a11ySummary })}
    >
      {/* Label manche */}
      <Text style={styles.mancheLabel} accessible={false}>
        {t('multiplayer_result.round_label', { number: mancheNumber })}
      </Text>

      {/* Zone chips */}
      <View style={styles.mancheChipsZone} accessible={false}>
        {results.map((r, i) => {
          const name = playerNames[i] ?? `J${String(i + 1)}`;
          if (r.won) {
            const jumps = r.jumps ?? 0;
            const jumpsText = t('multiplayer_result.win_chip_jumps', { count: jumps, jumps });
            return (
              <View key={String(i)} style={styles.chipVictoire}>
                <Text style={styles.chipVictoireText} numberOfLines={1}>
                  {`${name} ✓ ${jumpsText}`}
                </Text>
              </View>
            );
          }
          return (
            <View key={String(i)} style={styles.chipAbandon}>
              <Text style={styles.chipAbandonText} numberOfLines={1}>
                {`${name} ✗`}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant PlayerResultRow (interne) — F3-33 : utilise entry.rank
// ─────────────────────────────────────────────────────────────────────────────

interface PlayerResultRowProps {
  entry: GlobalRankEntryWithRank;
  /** Tous les joueurs classés — pour détecter les ex-aequo (accessibilité) */
  allRanked: GlobalRankEntryWithRank[];
}

function PlayerResultRow({ entry, allRanked }: PlayerResultRowProps): React.JSX.Element {
  const { t } = useTranslation();
  const rank = entry.rank;
  const isFirstAndLeading = rank === 1 && entry.wins > 0;
  // medal basé sur entry.rank — pas sur la position dans le tableau
  const medal = rank <= 3 ? RANK_MEDALS[rank - 1] : undefined;

  // Détection ex-aequo au même rang
  const isSharedRank = allRanked.filter((r) => r.rank === rank).length > 1;

  // Stats texte globales
  let statsText: string;
  if (entry.wins > 0) {
    const elapsedSeconds = Math.floor(entry.totalDurationMs / 1000);
    statsText = `${t('multiplayer_result.stat_jumps', { count: entry.totalJumps })} · ${formatElapsed(elapsedSeconds)}`;
  } else {
    statsText = '—';
  }

  // Accessibilité
  const rankWord =
    rank === 1 ? t('multiplayer_result.rank_1st') :
    rank === 2 ? t('multiplayer_result.rank_2nd') :
    rank === 3 ? t('multiplayer_result.rank_3rd') :
    t('multiplayer_result.rank_nth', { rank });

  const exAequoSuffix = isSharedRank ? t('multiplayer_result.ex_aequo_suffix') : '';
  const winsLabel = t('multiplayer_result.wins', { count: entry.wins });
  const a11yLabel = entry.wins > 0
    ? t('multiplayer_result.player_row_a11y_won', {
        rankWord,
        exAequo: exAequoSuffix,
        name: entry.name,
        wins: winsLabel,
        stats: statsText,
      })
    : t('multiplayer_result.player_row_a11y_lost', {
        rankWord,
        exAequo: exAequoSuffix,
        name: entry.name,
      });

  return (
    <View
      style={[styles.resultRow, isFirstAndLeading && styles.resultRowFirst]}
      accessible={true}
      accessibilityLabel={a11yLabel}
    >
      {/* Zone rang — médaille ou numéro */}
      <View style={styles.rankZone}>
        {medal !== undefined ? (
          <Text style={styles.rankMedal} accessible={false}>{medal}</Text>
        ) : (
          <Text style={styles.rankNumber} accessible={false}>{t('multiplayer_result.rank_label', { rank })}</Text>
        )}
      </View>

      {/* Zone info */}
      <View style={styles.infoZone} accessible={false}>
        <Text style={styles.playerName}>{entry.name}</Text>
        <View style={styles.statsRow}>
          <View style={[
            styles.statusBadge,
            entry.wins > 0 ? styles.statusBadgeWon : styles.statusBadgeAbandoned,
          ]}>
            <Text style={[
              styles.statusBadgeText,
              entry.wins > 0 ? styles.statusBadgeTextWon : styles.statusBadgeTextAbandoned,
            ]}>
              {t('multiplayer_result.wins', { count: entry.wins })}
            </Text>
          </View>
          {entry.wins > 0 && (
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
  const { t } = useTranslation();
  const players = useMultiplayerStore((s) => s.players);
  const roundHistory = useMultiplayerStore((s) => s.roundHistory);
  const roundCount = useMultiplayerStore((s) => s.roundCount);
  const startArticle = useMultiplayerStore((s) => s.startArticle);
  const targetArticle = useMultiplayerStore((s) => s.targetArticle);
  const resetSession = useMultiplayerStore((s) => s.resetSession);
  const restartSession = useMultiplayerStore((s) => s.restartSession);
  const clearSession = useGameStore((s) => s.clearSession);
  const startSession = useGameStore((s) => s.startSession);

  // Chargement silencieux d'une nouvelle paire en arrière-plan (F3-29)
  const { state: pairState } = useRandomPair('normal');

  const playerNames = players.map((p) => p.name);

  // F3-36 : reconstruire completeRoundHistory dans le corps du composant.
  // startNextRound() flush roundHistory AVANT de passer à la manche suivante —
  // la dernière manche reste dans players[] et n'est PAS dans roundHistory du store.
  // completeRoundHistory est utilisé à la fois pour la sauvegarde ET le classement.
  const lastRoundSnapshot: MultiplayerRoundResult[] = players.map((p) => ({
    jumps: p.jumps,
    durationMs: p.durationMs,
    won: p.won,
  }));
  const completeRoundHistory = [...roundHistory, lastRoundSnapshot];

  // F3-33/F3-36 : utiliser completeRoundHistory (toutes les manches, y compris la dernière)
  const rankedPlayers = rankPlayersGlobalWithRank(completeRoundHistory, playerNames);

  // F3-31 : sauvegarde unique au montage — ref pour éviter la double sauvegarde
  // si le composant se remonte (rare mais possible, ex. React strict mode).
  const sessionSavedRef = useRef(false);

  useEffect(() => {
    if (sessionSavedRef.current) return;
    sessionSavedRef.current = true;

    const record = buildMultiplayerRecord(
      generateUUID(),
      new Date().toISOString(),
      playerNames,
      roundCount,
      completeRoundHistory,
    );

    // deps vide intentionnel : sauvegarde unique au montage — sessionSavedRef garantit l'unicité
    void MultiplayerScoreStorage.save(record);
  // eslint-plugin-react-hooks non installé dans ce projet — deps vides justifiées
  }, []);

  const handleHome = useCallback((): void => {
    resetSession();
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  }, [resetSession, navigation]);

  // F3-29 / F3-33 : lancer une nouvelle session avec les mêmes joueurs + nouvelle paire
  // Compromis documenté : le Rejouer charge une seule paire et la duplique pour N manches.
  // TODO F3-35 : précharger N paires distinctes pour le Rejouer si nécessaire.
  const handleReplay = useCallback(async (): Promise<void> => {
    if (pairState.status !== 'success') return;

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

    // Construire N paires identiques (même paire pour toutes les manches du Rejouer)
    // Compromis F3-33 : une seule paire chargée, dupliquée N fois
    const pairs = Array.from({ length: roundCount }, () => ({
      start: newStartArticle,
      target: newTargetArticle,
    }));

    restartSession(pairs);
    await clearSession();
    // F3-30 : isMultiplayer: true → non enregistré dans l'historique solo
    await startSession(newStartArticle, newTargetArticle, { isMultiplayer: true });

    const firstPlayer = players[0];
    navigation.navigate('PassPhone', { playerName: firstPlayer?.name ?? '' });
  }, [pairState, players, roundCount, restartSession, clearSession, startSession, navigation]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle} accessibilityRole="header">
          {t('multiplayer_result.header_title')}
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
            <Text style={styles.pairLabel}>{t('multiplayer_result.pair_label')}</Text>
            <Text style={styles.pairArticles} numberOfLines={2}>
              {`${startArticle.title} → ${targetArticle.title}`}
            </Text>
          </View>
        )}

        {/* Séparateur */}
        <View style={styles.separator} />

        {/* Section PAR MANCHE — F3-33/F3-36 — conditionnelle si > 1 manche (completeRoundHistory inclut la dernière) */}
        {completeRoundHistory.length > 1 && (
          <>
            <Text
              style={styles.sectionLabel}
              accessible={true}
              accessibilityRole="header"
              accessibilityLabel={t('multiplayer_result.section_by_round_a11y')}
            >
              {t('multiplayer_result.section_by_round')}
            </Text>
            {completeRoundHistory.map((mancheResults, mancheIndex) => (
              <React.Fragment key={String(mancheIndex)}>
                <MancheSummaryRow
                  mancheNumber={mancheIndex + 1}
                  results={mancheResults}
                  playerNames={playerNames}
                />
                {mancheIndex < completeRoundHistory.length - 1 && (
                  <View style={styles.mancheSeparator} />
                )}
              </React.Fragment>
            ))}
            <View style={styles.separator} />
          </>
        )}

        {/* Label CLASSEMENT FINAL — F3-33 */}
        <Text
          style={styles.sectionLabel}
          accessible={true}
          accessibilityRole="header"
          accessibilityLabel={t('multiplayer_result.section_final_ranking_a11y')}
        >
          {t('multiplayer_result.section_final_ranking')}
        </Text>

        {/* Classement */}
        {rankedPlayers.map((entry) => (
          <React.Fragment key={entry.name}>
            <PlayerResultRow
              entry={entry}
              allRanked={rankedPlayers}
            />
            <View style={styles.resultSeparator} />
          </React.Fragment>
        ))}
      </ScrollView>

      {/* Zone boutons fixe bas — F3-29 : deux boutons côte à côte */}
      <View style={styles.bottomZone}>
        <View style={styles.bottomButtons}>
          <TouchableOpacity
            style={[styles.replayButton, pairState.status !== 'success' && styles.replayButtonDisabled]}
            onPress={() => { void handleReplay(); }}
            disabled={pairState.status !== 'success'}
            accessibilityLabel={t('multiplayer_result.replay_button_a11y')}
            accessibilityRole="button"
            accessibilityState={{ disabled: pairState.status !== 'success' }}
          >
            <Text style={[
              styles.replayButtonText,
              pairState.status !== 'success' && styles.replayButtonTextDisabled,
            ]}>
              {t('multiplayer_result.replay_button')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.homeButton}
            onPress={handleHome}
            accessibilityLabel={t('multiplayer_result.home_button_a11y')}
            accessibilityRole="button"
          >
            <Text style={styles.homeButtonText}>{t('multiplayer_result.home_button')}</Text>
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
    paddingBottom: 24,
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
    marginVertical: 8,
  },
  // ── Section labels ────────────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  // ── MancheSummaryRow ─────────────────────────────────────────────────────────
  mancheRow: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mancheLabel: {
    fontSize: 13,
    color: '#64748B',
    minWidth: 72,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  mancheChipsZone: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  chipVictoire: {
    backgroundColor: '#DCFCE7',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipVictoireText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#16A34A',
  },
  chipAbandon: {
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipAbandonText: {
    fontSize: 12,
    color: '#64748B',
  },
  mancheSeparator: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  // ── PlayerResultRow ──────────────────────────────────────────────────────────
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
  resultSeparator: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 16,
  },
  // ── Zone bas ─────────────────────────────────────────────────────────────────
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
