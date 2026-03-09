/**
 * DonationScreen — Page donation Wikipedia (F3-04)
 *
 * Composant STATELESS PUR — zéro useState, useEffect, useRef.
 *
 * Informe le joueur du lien entre WikiHop et Wikipedia,
 * et permet d'ouvrir la page de don Wikimedia dans le navigateur externe.
 *
 * Texte approuvé par le DPO (Maïté) le 2026-03-07 — conforme RGPD.
 *
 * Contraintes importantes :
 *   - Linking importé depuis 'react-native' (pas expo-linking)
 *   - DONATION_URL dans une constante nommée (pas inline dans JSX)
 *   - Le don s'ouvre dans le navigateur externe (pas WebView) — requis RGPD
 *   - void handleDonate() sur onPress (convention projet)
 *
 * Conventions :
 *   - Export nommé DonationScreen
 *   - StyleSheet.create() en bas du fichier
 *   - Zéro any, TypeScript strict
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RootStackParamList } from '../navigation/RootNavigator';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type DonationScreenProps = NativeStackScreenProps<RootStackParamList, 'Donation'>;

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

/** URL de la page de don Wikimedia — ouverte dans le navigateur externe */
const DONATION_URL = 'https://donate.wikimedia.org';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ouvre la page de don dans le navigateur externe.
 * Vérifie d'abord que l'URL peut être ouverte (canOpenURL).
 * Note : https est toujours autorisé par défaut sur iOS — pas de config Info.plist requise.
 */
async function handleDonate(): Promise<void> {
  const canOpen = await Linking.canOpenURL(DONATION_URL);
  if (canOpen) {
    await Linking.openURL(DONATION_URL);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

export function DonationScreen({ navigation }: DonationScreenProps): React.JSX.Element {
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
          {'Soutenir Wikipedia'}
        </Text>
      </View>
      <View style={styles.headerSeparator} />

      {/* Corps scrollable */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Illustration décorative */}
        <View style={styles.illustrationRow} accessible={false}>
          <Text style={styles.illustrationText}>{'❤'}</Text>
          <Text style={[styles.illustrationText, styles.illustrationW]}>{'W'}</Text>
        </View>

        {/* Titre de section */}
        <Text style={styles.sectionTitle}>{'WikiHop et Wikipedia'}</Text>

        {/* Paragraphe 1 — texte approuvé DPO */}
        <Text style={styles.bodyText}>
          {
            "WikiHop est un jeu de navigation qui utilise l'API publique et gratuite " +
            "de Wikipedia pour afficher les articles. WikiHop n'est pas affilié à " +
            "la Fondation Wikimedia et n'agit pas en son nom."
          }
        </Text>

        {/* Paragraphe 2 — texte approuvé DPO */}
        <Text style={[styles.bodyText, styles.bodyTextMargin]}>
          {
            "Wikipedia existe grâce aux dons de millions de personnes dans le monde. " +
            "Si vous appréciez Wikipedia, vous pouvez soutenir la Fondation Wikimedia " +
            "directement depuis votre navigateur."
          }
        </Text>

        {/* Bloc mention légale — fond distinct pour différencier du corps */}
        <View style={styles.legalBlock}>
          <Text style={styles.legalText}>
            {
              "Votre don est géré exclusivement par la Fondation Wikimedia, sous leur " +
              "propre politique de confidentialité. WikiHop n'intervient pas dans ce " +
              "processus, ne collecte aucune information sur votre don et ne perçoit " +
              "aucune commission."
            }
          </Text>
        </View>

        {/* Bouton CTA */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => { void handleDonate(); }}
          accessibilityLabel="Faire un don à Wikimedia. Ouvre le navigateur."
          accessibilityRole="button"
        >
          <Text style={styles.ctaButtonText}>{'Faire un don à Wikipedia'}</Text>
        </TouchableOpacity>

        {/* URL de référence — décorative, non cliquable */}
        <Text style={styles.urlCaption} accessible={false}>
          {'donate.wikimedia.org'}
        </Text>
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
    // 18px (pas 24px) — le titre est long et déborderait sur petits écrans (iPhone SE)
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
  },
  headerSeparator: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 32,
  },
  illustrationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
  },
  illustrationText: {
    fontSize: 48,
    color: '#2563EB',
  },
  illustrationW: {
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 12,
  },
  bodyText: {
    fontSize: 16,
    color: '#1E293B',
    lineHeight: 24,
  },
  bodyTextMargin: {
    marginTop: 16,
  },
  legalBlock: {
    marginTop: 16,
    marginBottom: 32,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
  },
  legalText: {
    // #475569 (~6.1:1 sur #F8FAFC) au lieu de #64748B (4.5:1 limite) — conformité WCAG AA garantie
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },
  ctaButton: {
    height: 52,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  urlCaption: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
  },
});
