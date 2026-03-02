/**
 * GameHUD — WikiHop Mobile — Wave 3 (M-05)
 *
 * Bandeau fixe affiché pendant la partie.
 * Affiche le compteur de sauts, le timer en temps réel, et le titre cible.
 *
 * Conception :
 *   - Composant de présentation pur : reçoit jumps et targetTitle en props
 *   - Lit useGameTimer() en interne pour le temps (hook timer = responsabilité du HUD)
 *   - React.memo : évite les re-rendus inutiles dus au setInterval du timer (M-05)
 *   - Pas de LiveRegion sur le timer (causerait des annonces VoiceOver toutes les secondes)
 *
 * Accessibilité :
 *   - accessibilityLabel sur le conteneur : lecture complète en une annonce VoiceOver
 *   - Sous-éléments accessible={false} (le conteneur porte l'annonce complète)
 *
 * Références :
 *   Story : docs/stories/M-05-jumps-timer.md
 *   UX    : Benjamin — spécifications visuelles M-05
 *
 * Conventions :
 *   - Export nommé, React.memo
 *   - StyleSheet.create() en bas du fichier
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useGameTimer } from '../../hooks/useGameTimer';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface GameHUDProps {
  /** Nombre de sauts à afficher. Passé en prop depuis ArticleScreen. */
  jumps: number;
  /** Titre de l'article cible — affiché pour rappel pendant la partie. */
  targetTitle: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bandeau fixe affiché pendant la partie.
 * Affiche le compteur de sauts et le timer en temps réel.
 *
 * React.memo : sans mémoïsation, le setInterval du timer déclenche
 * un re-rendu de ArticleScreen toutes les secondes (M-05 spec).
 */
export const GameHUD = React.memo(function GameHUD({
  jumps,
  targetTitle,
}: GameHUDProps): React.JSX.Element {
  const { formattedTime, elapsedSeconds } = useGameTimer();

  // Pluriel saut/sauts
  const jumpsLabel = `${jumps} ${jumps <= 1 ? 'saut' : 'sauts'}`;

  // Label accessibilité calculé depuis elapsedSeconds (pas depuis la chaîne formatée)
  const minutes = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;
  const timeAccessibilityLabel =
    minutes > 0
      ? `${minutes} minute${minutes > 1 ? 's' : ''} ${secs} seconde${secs !== 1 ? 's' : ''}`
      : `${secs} seconde${secs !== 1 ? 's' : ''}`;

  const containerAccessibilityLabel = `Progression : ${jumpsLabel}, ${timeAccessibilityLabel} écoulé${elapsedSeconds !== 1 ? 's' : ''}, cible ${targetTitle}`;

  return (
    <View
      style={styles.container}
      accessibilityLabel={containerAccessibilityLabel}
      accessibilityRole="text"
    >
      {/* Compteur sauts */}
      <View style={styles.block} accessible={false}>
        <Text style={styles.icon} accessible={false}>
          {'↗'}
        </Text>
        <Text style={styles.boldText} accessible={false}>
          {jumpsLabel}
        </Text>
      </View>

      {/* Séparateur */}
      <View style={styles.separator} accessible={false} />

      {/* Timer */}
      <View style={styles.block} accessible={false}>
        <Text style={styles.icon} accessible={false}>
          {'⏱'}
        </Text>
        <Text style={styles.boldText} accessible={false}>
          {formattedTime}
        </Text>
      </View>

      {/* Séparateur */}
      <View style={styles.separator} accessible={false} />

      {/* Cible */}
      <View style={styles.targetBlock} accessible={false}>
        <Text style={styles.targetIcon} accessible={false}>
          {'→'}
        </Text>
        <Text style={styles.targetLabel} accessible={false}>
          {'Cible :'}
        </Text>
        <Text style={styles.targetTitle} numberOfLines={1} accessible={false}>
          {targetTitle}
        </Text>
      </View>
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  block: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  icon: {
    fontSize: 14,
    color: '#64748B',
    marginRight: 4,
  },
  boldText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  separator: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  targetBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  targetIcon: {
    fontSize: 13,
    color: '#2563EB',
    marginRight: 4,
  },
  targetLabel: {
    fontSize: 11,
    color: '#64748B',
    marginRight: 4,
  },
  targetTitle: {
    flex: 1,
    fontSize: 12,
    color: '#1E293B',
  },
});
