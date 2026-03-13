/**
 * StatsScreen — Statistiques personnelles (F3-08)
 *
 * Affiche un résumé des performances de l'utilisateur :
 *   - Grille de métriques (parties jouées, taux de victoire, moyenne sauts, meilleur temps)
 *   - Graphique des 7 dernières parties (MiniBarChart)
 *
 * Chargement : ScoreStorage.getAll() au montage (pas useGameHistory).
 * Calculs : computeStats et computeChartData via useMemo.
 *
 * État vide :
 *   - Blocs métriques affichent "—"
 *   - Graphique affiche un message d'invitation
 *
 * Conventions :
 *   - Export nommé StatsScreen
 *   - StyleSheet.create() en bas du fichier
 *   - Zéro any, TypeScript strict
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GameRecord } from '@wikihop/shared';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MiniBarChart } from '../components/stats/MiniBarChart';
import type { RootStackParamList } from '../navigation/RootNavigator';
import * as ScoreStorage from '../services/score-storage.service';
import { formatDuration } from '../utils/history.utils';
import { computeChartData, computeStats } from '../utils/stats.utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type StatsScreenProps = NativeStackScreenProps<RootStackParamList, 'Stats'>;

// ─────────────────────────────────────────────────────────────────────────────
// Composant BlocStat
// ─────────────────────────────────────────────────────────────────────────────

interface BlocStatProps {
  label: string;
  value: string;
  valueFontSize?: number;
  accessibilityLabel: string;
  borderLeft?: boolean;
}

function BlocStat({
  label,
  value,
  valueFontSize = 28,
  accessibilityLabel,
  borderLeft = false,
}: BlocStatProps): React.JSX.Element {
  return (
    <View
      style={[styles.blocStat, borderLeft && styles.blocStatBorderLeft]}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
    >
      <Text style={styles.blocStatLabel}>{label}</Text>
      <Text style={[styles.blocStatValue, { fontSize: valueFontSize }]}>{value}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

export function StatsScreen({ navigation }: StatsScreenProps): React.JSX.Element {
  const [records, setRecords] = useState<ReadonlyArray<GameRecord>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Chargement au montage
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const all = await ScoreStorage.getAll();
      if (!cancelled) {
        setRecords(all);
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => computeStats(records), [records]);
  const chartData = useMemo(() => computeChartData(records), [records]);

  const isEmpty = records.length === 0;

  // Valeurs affichées — "—" si null ou état vide
  const totalGamesDisplay = isEmpty ? '—' : String(stats.totalGames);
  const winRateDisplay = isEmpty ? '—' : `${String(stats.winRatePercent)} %`;
  const avgJumpsDisplay =
    stats.avgJumpsWon !== null ? String(stats.avgJumpsWon) : '—';
  const bestTimeDisplay =
    stats.bestTimeMs !== null ? formatDuration(stats.bestTimeMs) : '—';

  // Chargement initial
  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => { navigation.goBack(); }}
            accessibilityLabel="Retour à l'historique"
            accessibilityRole="button"
          >
            <Text style={styles.backButtonText}>{'←'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} accessibilityRole="header">
            {'Mes statistiques'}
          </Text>
        </View>
        <View style={styles.headerSeparator} />
        <ActivityIndicator style={styles.loader} color="#2563EB" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => { navigation.goBack(); }}
          accessibilityLabel="Retour à l'historique"
          accessibilityRole="button"
        >
          <Text style={styles.backButtonText}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} accessibilityRole="header">
          {'Mes statistiques'}
        </Text>
      </View>
      <View style={styles.headerSeparator} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Grille de métriques */}
        <View style={styles.grilleMetriques}>
          {/* Ligne 1 : Parties jouées (pleine largeur) */}
          <BlocStat
            label="PARTIES JOUÉES"
            value={totalGamesDisplay}
            valueFontSize={36}
            accessibilityLabel={`Parties jouées : ${totalGamesDisplay}`}
          />

          {/* Séparateur horizontal */}
          <View style={styles.grilleHorizontalSeparator} />

          {/* Ligne 2 : Taux de victoire + Moyenne sauts */}
          <View style={styles.grilleRow}>
            <BlocStat
              label="TAUX DE VICTOIRE"
              value={winRateDisplay}
              accessibilityLabel={`Taux de victoire : ${winRateDisplay}`}
            />
            <BlocStat
              label="MOYENNE SAUTS"
              value={avgJumpsDisplay}
              accessibilityLabel={`Moyenne de sauts en victoire : ${avgJumpsDisplay}`}
              borderLeft={true}
            />
          </View>

          {/* Séparateur horizontal */}
          <View style={styles.grilleHorizontalSeparator} />

          {/* Ligne 3 : Meilleur temps (pleine largeur) */}
          <BlocStat
            label="MEILLEUR TEMPS"
            value={bestTimeDisplay}
            accessibilityLabel={`Meilleur temps : ${bestTimeDisplay}`}
          />
        </View>

        {/* Section graphique */}
        <View style={styles.sectionGraphique}>
          <Text style={styles.sectionGraphiqueTitle}>{'7 DERNIÈRES PARTIES'}</Text>
          {isEmpty ? (
            <Text style={styles.emptyChartMessage}>
              {'Jouez votre première partie pour voir votre progression ici.'}
            </Text>
          ) : (
            <MiniBarChart data={chartData} />
          )}
        </View>
      </ScrollView>
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
    fontSize: 22,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  // Grille métriques
  grilleMetriques: {
    marginHorizontal: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  grilleRow: {
    flexDirection: 'row',
  },
  grilleHorizontalSeparator: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  blocStat: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  blocStatBorderLeft: {
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
  },
  blocStatLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  blocStatValue: {
    fontWeight: 'bold',
    color: '#1E293B',
  },
  // Section graphique
  sectionGraphique: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionGraphiqueTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  emptyChartMessage: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    paddingVertical: 16,
  },
});
