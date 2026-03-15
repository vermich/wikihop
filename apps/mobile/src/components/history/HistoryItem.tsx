/**
 * HistoryItem — Composant de ligne pour l'historique des parties (F3-02)
 *
 * Affiche les informations essentielles d'une partie terminée :
 *   - Badge statut (Victoire vert / Abandonné gris)
 *   - Badge DÉFI (F3-23) — visible si isDailyChallenge === true
 *   - Badge DIFF (F3-35) — visible si difficulty === 'hard'
 *   - Trajet : "[départ] → [destination]"
 *   - Date : formatRecordDate(completedAt)
 *   - Stats : "[N] saut(s) · formatDuration(durationMs)"
 *
 * Note sur onPress :
 *   En F3-02, onPress est undefined (F3-11 l'activera).
 *   Le TouchableOpacity est rendu avec activeOpacity={1} si pas de handler.
 *
 * Note sur le séparateur :
 *   Les séparateurs entre items sont gérés par ItemSeparatorComponent
 *   dans FlatList — ne pas mettre de bordure sur ce composant.
 *
 * Conventions :
 *   - Export nommé HistoryItem
 *   - StyleSheet.create() en bas du fichier
 */

import type { GameRecord } from '@wikihop/shared';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { isHardMode } from '../../utils/difficulty.utils';
import { formatDuration, formatRecordDate } from '../../utils/history.utils';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface HistoryItemProps {
  record: GameRecord;
  /** Prévu pour F3-11 — undefined en F3-02 */
  onPress?: (record: GameRecord) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────────────────────────────────────

export function HistoryItem({ record, onPress }: HistoryItemProps): React.JSX.Element {
  const isVictory = record.status === 'won';

  const formattedDuration = formatDuration(record.durationMs);
  const formattedDate = formatRecordDate(record.completedAt);
  const jumpLabel = record.jumps <= 1 ? 'saut' : 'sauts';

  // Label d'accessibilité complet (badge, date et stats sont accessible={false})
  // F3-35 : préfixe "Mode difficile." si difficulty === 'hard' (avant le préfixe défi)
  // F3-23 : préfixe "Défi du jour." si isDailyChallenge === true (=== true car champ optionnel)
  // Ordre : "Mode difficile. [si hard]" + "Défi du jour. [si daily]" + info article
  const hardModePrefix = isHardMode(record.difficulty) ? 'Mode difficile. ' : '';
  const dailyChallengePrefix = record.isDailyChallenge === true ? 'Défi du jour. ' : '';
  const accessibilityLabel = `${isVictory ? 'Victoire' : 'Abandonné'}. ${hardModePrefix}${dailyChallengePrefix}${record.startArticle.title} vers ${record.targetArticle.title}. ${String(record.jumps)} ${jumpLabel}. ${formattedDuration}. Le ${formattedDate}.`;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress !== undefined ? () => { onPress(record); } : undefined}
      activeOpacity={onPress !== undefined ? 0.7 : 1}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      {/* Ligne 1 : Badge statut + Badge défi (conditionnel) + Badge DIFF (conditionnel) + Trajet + Icône navigation */}
      <View style={styles.row}>
        <View
          style={[styles.badge, isVictory ? styles.badgeVictory : styles.badgeAbandoned]}
          accessible={false}
        >
          <Text style={[styles.badgeText, isVictory ? styles.badgeTextVictory : styles.badgeTextAbandoned]}>
            {isVictory ? 'Victoire' : 'Abandonné'}
          </Text>
        </View>

        {/* Badge défi du jour (F3-23) — conditionnel, utilise === true car champ optionnel */}
        {record.isDailyChallenge === true && (
          <View style={styles.badgeDaily} accessible={false}>
            <Text style={styles.badgeDailyText}>{'DÉFI'}</Text>
          </View>
        )}

        {/* Badge mode difficile (F3-35) — conditionnel via isHardMode */}
        {isHardMode(record.difficulty) && (
          <View style={styles.diffBadge} accessible={false}>
            <Text style={styles.diffBadgeText}>{'DIFF'}</Text>
          </View>
        )}

        <Text
          style={styles.trajet}
          numberOfLines={1}
          ellipsizeMode="tail"
          accessible={false}
        >
          {`${record.startArticle.title} → ${record.targetArticle.title}`}
        </Text>
        <Text style={styles.navIcon} accessible={false}>{'↗'}</Text>
      </View>

      {/* Ligne 2 : Date */}
      <Text style={styles.date} accessible={false}>{formattedDate}</Text>

      {/* Ligne 3 : Stats */}
      <Text style={styles.stats} accessible={false}>
        {`${String(record.jumps)} ${jumpLabel} \u00B7 ${formattedDuration}`}
      </Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    minHeight: 68,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeVictory: {
    backgroundColor: '#DCFCE7',
  },
  badgeAbandoned: {
    backgroundColor: '#F1F5F9',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  badgeTextVictory: {
    color: '#16A34A',
  },
  badgeTextAbandoned: {
    color: '#64748B',
  },
  // Badge défi du jour (F3-23) — ambre #D97706
  badgeDaily: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#D97706',
    marginLeft: 4,
  },
  badgeDailyText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  // Badge mode difficile (F3-35) — rouge pâle, cohérent avec GameHUD hardModePill
  diffBadge: {
    backgroundColor: '#FEE2E2',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 4,
  },
  diffBadgeText: {
    fontSize: 11,
    fontWeight: 'bold' as const,
    color: '#991B1B',
  },
  trajet: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#1E293B',
  },
  navIcon: {
    marginLeft: 8,
    fontSize: 14,
    color: '#2563EB',
  },
  date: {
    marginTop: 4,
    fontSize: 13,
    color: '#64748B',
  },
  stats: {
    marginTop: 2,
    fontSize: 13,
    color: '#64748B',
  },
});
