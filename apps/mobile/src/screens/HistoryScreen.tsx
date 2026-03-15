/**
 * HistoryScreen — Historique des parties (F3-02, F3-10, F3-11, F3-08)
 *
 * Affiche les 50 dernières parties (terminées ou abandonnées)
 * depuis le service ScoreStorage via le hook useGameHistory.
 *
 * F3-10 : SortBar avec chips de tri et persistance du critère (useHistorySort).
 * F3-11 : onPress sur HistoryItem navigue vers GameDetailScreen.
 * F3-08 : bouton Stats dans le header (point d'accès StatsScreen).
 *
 * Layout :
 *   [SafeAreaView top+bottom]
 *   ├── Header fixe : "← Historique" + "⊞" (stats)
 *   ├── Séparateur
 *   ├── SortBar (52px fixe, ScrollView horizontal)
 *   └── [loading]   ActivityIndicator centré
 *       [empty]     Message "Aucune partie jouée"
 *       [default]   FlatList + bouton Effacer en ListFooterComponent
 *
 * Conventions :
 *   - Export nommé HistoryScreen
 *   - FlatList (pas ScrollView) pour les 50 items
 *   - StyleSheet.create() en bas du fichier
 *   - Zéro any, TypeScript strict
 */

import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GameRecord } from '@wikihop/shared';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HistoryItem } from '../components/history/HistoryItem';
import { useGameHistory } from '../hooks/useGameHistory';
import { useHistorySort } from '../hooks/useHistorySort';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { sortRecords } from '../utils/history-sort.utils';
import type { SortButtonCriterion, SortDirection } from '../utils/history-sort.utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type HistoryScreenProps = NativeStackScreenProps<RootStackParamList, 'History'>;

// ─────────────────────────────────────────────────────────────────────────────
// Constantes — F3-25 : 3 boutons à 3 états cycliques
// ─────────────────────────────────────────────────────────────────────────────

const SORT_BUTTONS: ReadonlyArray<{ criterion: SortButtonCriterion; label: string }> = [
  { criterion: 'date', label: 'Date' },
  { criterion: 'jumps', label: 'Sauts' },
  { criterion: 'duration', label: 'Durée' },
];

function getSortButtonA11yLabel(
  criterion: SortButtonCriterion,
  direction: SortDirection,
  activeCriterion: SortButtonCriterion,
): string {
  const isActive = criterion === activeCriterion && direction !== null;
  const labelMap: Record<SortButtonCriterion, string> = {
    date: 'date',
    jumps: 'sauts',
    duration: 'durée',
  };
  const name = labelMap[criterion];
  if (!isActive) {
    return `Trier par ${name} — tap pour trier du plus ancien au plus récent`;
  }
  if (direction === 'asc') {
    return `${name.charAt(0).toUpperCase()}${name.slice(1)}, tri croissant actif — tap pour inverser`;
  }
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}, tri décroissant actif — tap pour désactiver`;
}

function getSortButtonLabel(criterion: SortButtonCriterion, baseLabel: string, activeCriterion: SortButtonCriterion, direction: SortDirection): string {
  if (criterion !== activeCriterion || direction === null) return baseLabel;
  return direction === 'asc' ? `${baseLabel} ↑` : `${baseLabel} ↓`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant Header (partagé entre les 3 états)
// ─────────────────────────────────────────────────────────────────────────────

interface HeaderProps {
  onBack: () => void;
  onStats: () => void;
}

function Header({ onBack, onStats }: HeaderProps): React.JSX.Element {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
        accessibilityLabel="Retour"
        accessibilityRole="button"
      >
        <Text style={styles.backButtonText}>{'←'}</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle} accessibilityRole="header">
        {'Historique des parties'}
      </Text>
      <TouchableOpacity
        style={styles.statsButton}
        onPress={onStats}
        accessibilityLabel="Voir mes statistiques"
        accessibilityRole="button"
      >
        <Text style={styles.statsButtonText}>{'Stats'}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant SortBar — F3-25 : 3 boutons à 3 états cycliques
// ─────────────────────────────────────────────────────────────────────────────

interface SortBarProps {
  activeCriterion: SortButtonCriterion;
  direction: SortDirection;
  isLoading: boolean;
  onSelect: (c: SortButtonCriterion) => Promise<void>;
}

function SortBar({ activeCriterion, direction, isLoading, onSelect }: SortBarProps): React.JSX.Element {
  return (
    <View style={[styles.sortBarWrapper, isLoading && styles.sortBarDisabled]}>
      <View style={styles.sortBarContent}>
        {SORT_BUTTONS.map(({ criterion, label }) => {
          const isActive = criterion === activeCriterion && direction !== null;
          return (
            <TouchableOpacity
              key={criterion}
              style={[styles.sortChip, isActive && styles.sortChipActive]}
              onPress={() => { void onSelect(criterion); }}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel={getSortButtonA11yLabel(criterion, direction, activeCriterion)}
              accessibilityState={{ selected: isActive }}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              <Text style={[styles.sortChipText, isActive && styles.sortChipTextActive]}>
                {getSortButtonLabel(criterion, label, activeCriterion, direction)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

export function HistoryScreen({ navigation }: HistoryScreenProps): React.JSX.Element {
  const { records, isLoading: historyLoading, refresh, deleteAll } = useGameHistory();
  const { criterion, direction, legacyCriterion, selectCriterion, isLoading: sortLoading } = useHistorySort();

  // Records triés selon le critère courant (via mapping legacy)
  const sortedRecords = useMemo(
    () => sortRecords(records, legacyCriterion),
    [records, legacyCriterion],
  );

  // Rafraîchir au focus — garantit que la liste est à jour après une partie
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const handleBack = useCallback((): void => {
    navigation.goBack();
  }, [navigation]);

  const handleStats = useCallback((): void => {
    navigation.navigate('Stats');
  }, [navigation]);

  const handleDeleteAll = useCallback((): void => {
    Alert.alert(
      'Effacer l\'historique',
      'Cette action supprimera définitivement toutes les parties. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Effacer tout',
          style: 'destructive',
          onPress: () => { void deleteAll(); },
        },
      ],
    );
  }, [deleteAll]);

  // Annonce accessibilité lors du chargement — dans useEffect pour éviter les appels
  // répétés en cas de re-render pendant que historyLoading est vrai
  useEffect(() => {
    if (historyLoading) {
      void AccessibilityInfo.announceForAccessibility("Chargement de l'historique");
    }
  }, [historyLoading]);

  // F3-11 — navigation vers GameDetail au tap sur un item
  const handleItemPress = useCallback((record: GameRecord): void => {
    navigation.navigate('GameDetail', { recordId: record.id });
  }, [navigation]);

  // F3-09 : wrapper haptique autour de selectCriterion
  // Déclenche Haptics.impactAsync à chaque changement (F3-09-C)
  const handleCriterionSelect = useCallback(async (c: SortButtonCriterion): Promise<void> => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
      // Silencieux — certains appareils n'ont pas de retour haptique
    });
    await selectCriterion(c);
  }, [selectCriterion]);

  // ── keyExtractor ──────────────────────────────────────────────────────────
  const keyExtractor = useCallback((item: GameRecord): string => item.id, []);

  // ── renderItem ────────────────────────────────────────────────────────────
  const renderItem = useCallback(({ item }: { item: GameRecord }): React.JSX.Element => (
    <HistoryItem record={item} onPress={handleItemPress} />
  ), [handleItemPress]);

  // ── ItemSeparatorComponent ────────────────────────────────────────────────
  const renderSeparator = useCallback((): React.JSX.Element => (
    <View style={styles.separator} />
  ), []);

  // ── ListFooterComponent — bouton Effacer (uniquement si liste non vide) ──
  // F3-20 : le guard est géré via la prop ListFooterComponent directement
  // (listFooterComponent={sortedRecords.length > 0 ? renderFooter : null})
  // pour éviter un problème de clé React quand la liste devient vide.
  const renderFooter = useCallback((): React.JSX.Element => (
    <TouchableOpacity
      style={styles.deleteButton}
      onPress={handleDeleteAll}
      accessibilityLabel="Effacer tout l'historique"
      accessibilityRole="button"
    >
      <Text style={styles.deleteButtonText}>{'Effacer l\'historique'}</Text>
    </TouchableOpacity>
  ), [handleDeleteAll]);

  // ── État loading ──────────────────────────────────────────────────────────
  if (historyLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Header onBack={handleBack} onStats={handleStats} />
        <View style={styles.headerSeparator} />
        <SortBar activeCriterion={criterion} direction={direction} isLoading={sortLoading} onSelect={handleCriterionSelect} />
        <ActivityIndicator
          style={styles.loader}
          color="#2563EB"
          accessibilityElementsHidden={true}
        />
      </SafeAreaView>
    );
  }

  // ── État vide ─────────────────────────────────────────────────────────────
  if (records.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Header onBack={handleBack} onStats={handleStats} />
        <View style={styles.headerSeparator} />
        <SortBar activeCriterion={criterion} direction={direction} isLoading={sortLoading} onSelect={handleCriterionSelect} />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon} accessible={false}>{'📋'}</Text>
          <Text style={styles.emptyText}>
            {'Aucune partie jouée\npour l\'instant.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── État par défaut — liste ───────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Header onBack={handleBack} onStats={handleStats} />
      <View style={styles.headerSeparator} />
      <SortBar activeCriterion={criterion} direction={direction} isLoading={sortLoading} onSelect={handleCriterionSelect} />

      {/* FlatList — éco-conception : windowSize, maxToRenderPerBatch, initialNumToRender */}
      <FlatList<GameRecord>
        data={sortedRecords}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ItemSeparatorComponent={renderSeparator}
        ListFooterComponent={sortedRecords.length > 0 ? renderFooter : null}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        windowSize={5}
        maxToRenderPerBatch={10}
        initialNumToRender={15}
      />
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
    // F3-25 : réduit à 20 pour accommoder "Historique des parties" + bouton "Stats" sans chevauchement
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
  },
  statsButton: {
    position: 'absolute',
    right: 16,
    minWidth: 44,
    height: 44,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  headerSeparator: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  sortBarWrapper: {
    height: 52,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    justifyContent: 'center',
  },
  sortBarDisabled: {
    opacity: 0.5,
  },
  // F3-25 : View horizontale (remplace ScrollView horizontal — 3 boutons fixes)
  sortBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sortChip: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortChipActive: {
    backgroundColor: '#2563EB',
  },
  sortChipText: {
    fontSize: 13,
    color: '#64748B',
  },
  sortChipTextActive: {
    fontWeight: 'bold',
    color: '#FFFFFF',
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
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
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
  deleteButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  deleteButtonText: {
    fontSize: 16,
    color: '#E11D48',
  },
});
