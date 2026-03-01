/**
 * HomeScreen — WikiHop Mobile
 *
 * Écran placeholder Phase 1. Affiche le titre de l'application
 * en attendant l'implémentation complète en Phase 2 (M-01+).
 *
 * Convention : export nommé, StyleSheet.create() en bas du fichier.
 * TypeScript strict.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function HomeScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>WikiHop</Text>
      <Text style={styles.subtitle}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b6b6b',
  },
});
