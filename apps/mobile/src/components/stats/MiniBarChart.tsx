/**
 * MiniBarChart — Graphique en barres des 7 dernières parties (F3-08)
 *
 * Affiche les sauts de chaque partie sous forme de barres colorées.
 * Couleur : #16A34A pour une victoire, #94A3B8 pour un abandon.
 *
 * Props :
 *   data      : tableau de ChartDataPoint (max 7, trié ancien → récent)
 *   maxHeight : hauteur max de la zone graphique (défaut 140px selon UX Benjamin)
 *
 * Conventions :
 *   - Export nommé MiniBarChart
 *   - StyleSheet.create() en bas du fichier
 *   - Zéro any, TypeScript strict
 *   - noUncheckedIndexedAccess satisfait
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import type { ChartDataPoint } from '../../utils/stats.utils';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface MiniBarChartProps {
  data: ReadonlyArray<ChartDataPoint>;
  /** Hauteur max de la zone graphique (défaut : 140 selon UX Benjamin) */
  maxHeight?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const LABEL_HEIGHT_TOP = 18; // hauteur réservée au label de sauts au-dessus
const LABEL_HEIGHT_BOTTOM = 16; // hauteur réservée au label de date dessous
const BAR_MIN_HEIGHT = 4;
const CHART_PADDING_HORIZONTAL = 64; // 32px de chaque côté dans StatsScreen
const MAX_BAR_WIDTH = 36;

// ─────────────────────────────────────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────────────────────────────────────

export function MiniBarChart({ data, maxHeight = 140 }: MiniBarChartProps): React.JSX.Element {
  const { width: screenWidth } = useWindowDimensions();

  // Largeur dynamique de chaque barre selon la largeur d'écran
  const barWidth = data.length > 0
    ? Math.min(MAX_BAR_WIDTH, Math.floor((screenWidth - CHART_PADDING_HORIZONTAL) / data.length))
    : MAX_BAR_WIDTH;

  // ── État vide ─────────────────────────────────────────────────────────────
  if (data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{'Aucune partie à afficher'}</Text>
      </View>
    );
  }

  // ── Calcul de la hauteur max des barres ───────────────────────────────────
  const maxJumps = Math.max(...data.map((d) => d.jumps));
  const availableBarHeight = maxHeight - LABEL_HEIGHT_TOP - LABEL_HEIGHT_BOTTOM;

  function getBarHeight(jumps: number): number {
    if (maxJumps === 0) {
      return BAR_MIN_HEIGHT;
    }
    return Math.max(BAR_MIN_HEIGHT, Math.round((jumps / maxJumps) * availableBarHeight));
  }

  // ── Label d'accessibilité synthétisant toutes les barres ──────────────────
  const a11yLabel = data
    .map((d) => {
      const statusLabel = d.status === 'won' ? 'Victoire' : 'Abandonné';
      const jumpLabel = d.jumps <= 1 ? 'saut' : 'sauts';
      return `${d.label} : ${statusLabel}, ${String(d.jumps)} ${jumpLabel}`;
    })
    .join('. ');

  return (
    <View>
      {/* Zone graphique */}
      <View
        style={[styles.graphContainer, { height: maxHeight }]}
        accessible={true}
        accessibilityLabel={`Graphique des 7 dernières parties. ${a11yLabel}`}
      >
        {data.map((point, index) => {
          const barHeight = getBarHeight(point.jumps);
          const barColor = point.status === 'won' ? '#16A34A' : '#94A3B8';

          return (
            <View key={`${point.label}-${String(index)}`} style={[styles.barItem, { width: barWidth + 4 }]}>
              {/* Label sauts au-dessus */}
              <Text style={styles.labelSauts} accessible={false}>
                {String(point.jumps)}
              </Text>
              {/* Barre */}
              <View
                style={[
                  styles.bar,
                  {
                    width: barWidth,
                    height: barHeight,
                    backgroundColor: barColor,
                  },
                ]}
              />
              {/* Label date dessous */}
              <Text style={styles.labelDate} accessible={false}>
                {point.label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Légende */}
      <View style={styles.legendeContainer}>
        <View style={styles.legendeItem}>
          <View style={[styles.legendeCarre, { backgroundColor: '#16A34A' }]} />
          <Text style={styles.legendeText}>{'Victoire'}</Text>
        </View>
        <View style={styles.legendeItem}>
          <View style={[styles.legendeCarre, { backgroundColor: '#94A3B8' }]} />
          <Text style={styles.legendeText}>{'Abandonné'}</Text>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  graphContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  barItem: {
    flexDirection: 'column',
    alignItems: 'center',
    width: 28,
  },
  labelSauts: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  bar: {
    borderRadius: 3,
    minHeight: BAR_MIN_HEIGHT,
  },
  labelDate: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
  },
  legendeContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    justifyContent: 'center',
  },
  legendeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendeCarre: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendeText: {
    fontSize: 12,
    color: '#64748B',
  },
});
