/**
 * MultiplayerHistoryScreen — Historique des parties multijoueur (F3-31)
 *
 * Affiche les 20 dernières sessions multijoueur depuis MultiplayerScoreStorage.
 * Recharge la liste à chaque fois que l'écran devient actif (useFocusEffect).
 *
 * Layout :
 *   [SafeAreaView top+bottom]
 *   ├── Header 64pt : bouton "←" gauche + titre "Historique multijoueur" centré
 *   └── FlatList (du plus récent au plus ancien)
 *       ├── [Vide] View centrée "Aucune partie multijoueur pour l'instant"
 *       └── [Données] MultiplayerHistoryItem par session
 *
 * Conventions :
 *   - Export nommé MultiplayerHistoryScreen
 *   - FlatList pour les listes potentiellement longues
 *   - StyleSheet.create() en bas du fichier
 *   - Zéro any, TypeScript strict
 *
 * Story : F3-31
 */

import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MultiplayerGameRecord } from '@wikihop/shared';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RootStackParamList } from '../navigation/RootNavigator';
import { loadAll } from '../services/multiplayer-score-storage.service';
import { formatMultiplayerDate } from '../utils/multiplayer-history.utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type MultiplayerHistoryScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'MultiplayerHistory'
>;

// ─────────────────────────────────────────────────────────────────────────────
// Composant MultiplayerHistoryItem (interne)
// ─────────────────────────────────────────────────────────────────────────────

interface MultiplayerHistoryItemProps {
  record: MultiplayerGameRecord;
}

function MultiplayerHistoryItem({ record }: MultiplayerHistoryItemProps): React.JSX.Element {
  const { t } = useTranslation();
  const dateFormatted = formatMultiplayerDate(record.date);
  const playersText = record.playerNames.join(' vs ');
  const roundsText = `${String(record.roundCount)} ${t(`multiplayer_history.rounds_label`, { count: record.roundCount })}`;
  const winnerText =
    record.winner !== null
      ? t('multiplayer_history.winner_prefix', { name: record.winner })
      : t('multiplayer_history.draw_label');

  const a11yLabel = [dateFormatted, playersText, roundsText, winnerText].join(', ');

  return (
    <View
      style={styles.item}
      accessible={true}
      accessibilityLabel={a11yLabel}
    >
      <Text style={styles.itemDate}>{dateFormatted}</Text>
      <Text style={styles.itemPlayers} numberOfLines={1}>{playersText}</Text>
      <Text style={styles.itemRounds}>{roundsText}</Text>
      <View style={[
        styles.winnerBadge,
        record.winner !== null ? styles.winnerBadgeWon : styles.winnerBadgeDraw,
      ]}>
        <Text style={[
          styles.winnerBadgeText,
          record.winner !== null ? styles.winnerBadgeTextWon : styles.winnerBadgeTextDraw,
        ]}>
          {winnerText}
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

export function MultiplayerHistoryScreen({
  navigation,
}: MultiplayerHistoryScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const [records, setRecords] = useState<ReadonlyArray<MultiplayerGameRecord>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Recharger les données à chaque fois que l'écran devient actif (pattern HistoryScreen)
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const fetchRecords = async (): Promise<void> => {
        setIsLoading(true);
        const loaded = await loadAll();
        if (!cancelled) {
          setRecords(loaded);
          setIsLoading(false);
        }
      };

      void fetchRecords();

      return () => {
        cancelled = true;
      };
    }, []),
  );

  const handleBack = useCallback((): void => {
    navigation.goBack();
  }, [navigation]);

  // ── keyExtractor ──────────────────────────────────────────────────────────
  const keyExtractor = useCallback(
    (item: MultiplayerGameRecord): string => item.id,
    [],
  );

  // ── renderItem ────────────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }: { item: MultiplayerGameRecord }): React.JSX.Element => (
      <MultiplayerHistoryItem record={item} />
    ),
    [],
  );

  // ── ItemSeparatorComponent ────────────────────────────────────────────────
  const renderSeparator = useCallback(
    (): React.JSX.Element => <View style={styles.separator} />,
    [],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          accessibilityLabel={t('multiplayer_history.back_button_a11y')}
          accessibilityRole="button"
        >
          <Text style={styles.backButtonText}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} accessibilityRole="header">
          {t('multiplayer_history.header_title')}
        </Text>
      </View>

      <View style={styles.headerSeparator} />

      {/* État chargement */}
      {isLoading && (
        <ActivityIndicator
          style={styles.loader}
          color="#2563EB"
          accessibilityElementsHidden={true}
        />
      )}

      {/* État vide */}
      {!isLoading && records.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {t('multiplayer_history.empty_message')}
          </Text>
        </View>
      )}

      {/* Liste */}
      {!isLoading && records.length > 0 && (
        <FlatList<MultiplayerGameRecord>
          data={records}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={renderSeparator}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          windowSize={5}
          maxToRenderPerBatch={10}
          initialNumToRender={10}
        />
      )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#1E293B',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
  },
  headerSeparator: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  loader: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 24,
  },
  separator: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginLeft: 16,
  },
  // ── MultiplayerHistoryItem ────────────────────────────────────────────────
  item: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 80,
    justifyContent: 'center',
  },
  itemDate: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 2,
  },
  itemPlayers: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  itemRounds: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 6,
  },
  winnerBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  winnerBadgeWon: {
    backgroundColor: '#DCFCE7',
  },
  winnerBadgeDraw: {
    backgroundColor: '#F1F5F9',
  },
  winnerBadgeText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  winnerBadgeTextWon: {
    color: '#16A34A',
  },
  winnerBadgeTextDraw: {
    color: '#64748B',
  },
});
