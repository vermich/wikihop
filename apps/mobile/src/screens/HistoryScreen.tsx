/**
 * HistoryScreen — Historique des parties (F3-02)
 *
 * Affiche les 50 dernières parties (terminées ou abandonnées)
 * depuis le service ScoreStorage via le hook useGameHistory.
 *
 * Layout :
 *   [SafeAreaView top+bottom]
 *   ├── Header fixe : "← Historique"
 *   ├── Séparateur
 *   └── [loading]   ActivityIndicator centré
 *       [empty]     Message "Aucune partie jouée"
 *       [default]   FlatList + bouton Effacer en ListFooterComponent
 *
 * Refresh au focus :
 *   useFocusEffect garantit que la liste est à jour après chaque partie.
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
import React, { useCallback } from 'react';
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
import type { RootStackParamList } from '../navigation/RootNavigator';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type HistoryScreenProps = NativeStackScreenProps<RootStackParamList, 'History'>;

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

export function HistoryScreen({ navigation }: HistoryScreenProps): React.JSX.Element {
  const { records, isLoading, refresh, deleteAll } = useGameHistory();

  // Rafraîchir au focus — garantit que la liste est à jour après une partie
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  // Annonce accessibilité pendant le chargement
  // (useEffect serait cyclique avec isLoading — on utilise useFocusEffect séparé)
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

  // ── keyExtractor ──────────────────────────────────────────────────────────
  const keyExtractor = useCallback((item: GameRecord): string => item.id, []);

  // ── renderItem ────────────────────────────────────────────────────────────
  const renderItem = useCallback(({ item }: { item: GameRecord }): React.JSX.Element => (
    <HistoryItem record={item} />
  ), []);

  // ── ItemSeparatorComponent ────────────────────────────────────────────────
  const renderSeparator = useCallback((): React.JSX.Element => (
    <View style={styles.separator} />
  ), []);

  // ── ListFooterComponent — bouton Effacer (uniquement si liste non vide) ──
  const renderFooter = useCallback((): React.JSX.Element | null => {
    if (records.length === 0) return null;
    return (
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={handleDeleteAll}
        accessibilityLabel="Effacer tout l'historique"
        accessibilityRole="button"
      >
        <Text style={styles.deleteButtonText}>{'Effacer l\'historique'}</Text>
      </TouchableOpacity>
    );
  }, [records.length, handleDeleteAll]);

  // ── État loading ──────────────────────────────────────────────────────────
  if (isLoading) {
    void AccessibilityInfo.announceForAccessibility("Chargement de l'historique");
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => { navigation.goBack(); }}
            accessibilityLabel="Retour"
            accessibilityRole="button"
          >
            <Text style={styles.backButtonText}>{'←'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} accessibilityRole="header">
            {'Historique'}
          </Text>
        </View>
        <View style={styles.headerSeparator} />
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
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => { navigation.goBack(); }}
            accessibilityLabel="Retour"
            accessibilityRole="button"
          >
            <Text style={styles.backButtonText}>{'←'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} accessibilityRole="header">
            {'Historique'}
          </Text>
        </View>
        <View style={styles.headerSeparator} />
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => { navigation.goBack(); }}
          accessibilityLabel="Retour"
          accessibilityRole="button"
        >
          <Text style={styles.backButtonText}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} accessibilityRole="header">
          {'Historique'}
        </Text>
      </View>
      <View style={styles.headerSeparator} />

      {/* FlatList — éco-conception : windowSize, maxToRenderPerBatch, initialNumToRender */}
      <FlatList<GameRecord>
        data={records}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ItemSeparatorComponent={renderSeparator}
        ListFooterComponent={renderFooter}
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
    fontSize: 24,
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
