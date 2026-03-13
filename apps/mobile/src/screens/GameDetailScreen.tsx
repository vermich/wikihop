/**
 * GameDetailScreen — Vue détail d'une partie de l'historique (F3-11)
 *
 * Charge la partie depuis ScoreStorage via son recordId (paramètre de route).
 * Affiche les métriques, le statut et propose de rejouer ou supprimer.
 *
 * Note sur le "Chemin parcouru" :
 *   GameRecord ne stocke pas le champ path (décision périmètre F3-02).
 *   On affiche un message explicatif à la place.
 *
 * Gate device physique :
 *   Cette story modifie la navigation History → GameDetail → Game.
 *   Un test sur device physique est requis avant merge (voir CLAUDE.md).
 *
 * Layout :
 *   SafeAreaView (top + bottom)
 *   ├── Header fixe (← "Détail de la partie")
 *   ├── headerSeparator 1px
 *   └── [contenu selon état]
 *       ├── isLoading → ActivityIndicator
 *       ├── record null → "Partie introuvable" + Retour
 *       └── record trouvé → ScrollView métriques + ZoneBoutons
 *
 * Conventions :
 *   - Export nommé GameDetailScreen
 *   - StyleSheet.create() en bas du fichier
 *   - Zéro any, TypeScript strict
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GameRecord } from '@wikihop/shared';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RootStackParamList } from '../navigation/RootNavigator';
import * as ScoreStorage from '../services/score-storage.service';
import { useGameStore } from '../store/game.store';
import { formatDuration, formatRecordDate } from '../utils/history.utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type GameDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'GameDetail'>;

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

export function GameDetailScreen({ navigation, route }: GameDetailScreenProps): React.JSX.Element {
  const { recordId } = route.params;
  const [record, setRecord] = useState<GameRecord | null | undefined>(undefined);

  const clearSession = useGameStore((state) => state.clearSession);
  const startSession = useGameStore((state) => state.startSession);

  // Chargement du record au montage
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const all = await ScoreStorage.getAll();
      if (!cancelled) {
        const found = all.find((r) => r.id === recordId);
        setRecord(found ?? null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [recordId]);

  const handleBack = useCallback((): void => {
    navigation.goBack();
  }, [navigation]);

  const handleReplay = useCallback((): void => {
    if (record === null || record === undefined) return;

    void (async () => {
      await clearSession();
      await startSession(record.startArticle, record.targetArticle);
      navigation.navigate('Game', { articleTitle: record.startArticle.title });
    })();
  }, [record, clearSession, startSession, navigation]);

  const handleDelete = useCallback((): void => {
    if (record === null || record === undefined) return;

    Alert.alert(
      'Supprimer cette partie',
      'Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await ScoreStorage.deleteRecord(record.id);
              navigation.goBack();
            })();
          },
        },
      ],
    );
  }, [record, navigation]);

  // ── Header commun ─────────────────────────────────────────────────────────
  const headerEl = (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBack}
        accessibilityLabel="Retour"
        accessibilityRole="button"
      >
        <Text style={styles.backButtonText}>{'←'}</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle} accessibilityRole="header">
        {'Détail de la partie'}
      </Text>
    </View>
  );

  // ── État chargement (record === undefined) ────────────────────────────────
  if (record === undefined) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {headerEl}
        <View style={styles.headerSeparator} />
        <ActivityIndicator style={styles.loader} color="#2563EB" />
      </SafeAreaView>
    );
  }

  // ── Partie introuvable (record === null) ──────────────────────────────────
  if (record === null) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {headerEl}
        <View style={styles.headerSeparator} />
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundText}>{'Partie introuvable.'}</Text>
          <TouchableOpacity
            style={styles.notFoundButton}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Retour à l'historique"
          >
            <Text style={styles.notFoundButtonText}>{'Retour'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Partie trouvée ────────────────────────────────────────────────────────
  const isVictory = record.status === 'won';
  const jumpLabel = record.jumps <= 1 ? 'saut' : 'sauts';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {headerEl}
      <View style={styles.headerSeparator} />

      {/* Contenu défilable */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* BlocStatut */}
        <View style={styles.blocStatut}>
          <View
            style={[styles.badge, isVictory ? styles.badgeVictory : styles.badgeAbandoned]}
            accessible={false}
          >
            <Text style={[styles.badgeText, isVictory ? styles.badgeTextVictory : styles.badgeTextAbandoned]}>
              {isVictory ? 'Victoire' : 'Abandonné'}
            </Text>
          </View>
          <Text style={styles.trajetTitle} numberOfLines={2}>
            {`${record.startArticle.title} → ${record.targetArticle.title}`}
          </Text>
        </View>

        <View style={styles.sectionSeparator} />

        {/* BlocMetriques */}
        <View style={styles.blocMetriques}>
          {/* Ligne 1 : Durée + Sauts */}
          <View style={styles.metriquesRow}>
            <View
              style={styles.metriqueCell}
              accessible={true}
              accessibilityLabel={`Durée : ${formatDuration(record.durationMs)}`}
            >
              <Text style={styles.metriqueLabelText}>{'DURÉE'}</Text>
              <Text style={styles.metriqueValueText}>{formatDuration(record.durationMs)}</Text>
            </View>
            <View style={styles.metriqueVerticalSeparator} />
            <View
              style={styles.metriqueCell}
              accessible={true}
              accessibilityLabel={`${String(record.jumps)} ${jumpLabel}`}
            >
              <Text style={styles.metriqueLabelText}>{'SAUTS'}</Text>
              <Text style={styles.metriqueValueText}>{String(record.jumps)}</Text>
            </View>
          </View>
          {/* Ligne 2 : Date */}
          <View
            style={[styles.metriqueCell, styles.metriqueDateRow]}
            accessible={true}
            accessibilityLabel={`Date : ${formatRecordDate(record.completedAt)}`}
          >
            <Text style={styles.metriqueLabelText}>{'DATE'}</Text>
            <Text style={styles.metriqueValueDateText}>{formatRecordDate(record.completedAt)}</Text>
          </View>
        </View>

        <View style={styles.sectionSeparator} />

        {/* Section chemin parcouru */}
        <View style={styles.sectionChemin}>
          <Text style={styles.sectionCheminTitle}>{'CHEMIN PARCOURU'}</Text>
          <Text style={styles.sectionCheminMessage}>
            {'Détail du parcours non disponible'}
          </Text>
        </View>
      </ScrollView>

      {/* Zone boutons — en bas, hors du ScrollView */}
      <SafeAreaView edges={['bottom']} style={styles.zoneBoutons}>
        <TouchableOpacity
          style={styles.boutonRejouer}
          onPress={handleReplay}
          accessibilityRole="button"
          accessibilityLabel="Rejouer cette partie depuis le début"
        >
          <Text style={styles.boutonRejouerText}>{'Rejouer'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.boutonSupprimer}
          onPress={handleDelete}
          accessibilityRole="button"
          accessibilityLabel="Supprimer définitivement cette partie"
        >
          <Text style={styles.boutonSupprimerText}>{'Supprimer cette partie'}</Text>
        </TouchableOpacity>
      </SafeAreaView>
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
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  notFoundText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  notFoundButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2563EB',
  },
  notFoundButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  // BlocStatut
  blocStatut: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
  },
  badgeVictory: {
    backgroundColor: '#DCFCE7',
  },
  badgeAbandoned: {
    backgroundColor: '#F1F5F9',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  badgeTextVictory: {
    color: '#16A34A',
  },
  badgeTextAbandoned: {
    color: '#64748B',
  },
  trajetTitle: {
    fontSize: 15,
    color: '#1E293B',
  },
  sectionSeparator: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 16,
  },
  // BlocMetriques
  blocMetriques: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  metriquesRow: {
    flexDirection: 'row',
  },
  metriqueCell: {
    flex: 1,
  },
  metriqueVerticalSeparator: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 16,
  },
  metriqueDateRow: {
    marginTop: 12,
    flex: 0,
  },
  metriqueLabelText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metriqueValueText: {
    fontSize: 22,
    color: '#1E293B',
  },
  metriqueValueDateText: {
    fontSize: 16,
    color: '#1E293B',
  },
  // Section chemin
  sectionChemin: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  sectionCheminTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  sectionCheminMessage: {
    fontSize: 15,
    color: '#64748B',
  },
  // Zone boutons
  zoneBoutons: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  boutonRejouer: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boutonRejouerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  boutonSupprimer: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  boutonSupprimerText: {
    fontSize: 16,
    color: '#E11D48',
  },
});
