/**
 * AboutScreen — WikiHop Mobile — Phase 3 (F3-06)
 *
 * Écran "À propos" et crédits. Composant stateless pur — zéro state,
 * zéro effect, zéro ref. Lecture de la version depuis Constants.expoConfig.
 *
 * Layout :
 *   [SafeAreaView top+bottom]
 *   ├── Header 52pt : bouton "← Retour" (44×44pt) + titre centré "À propos"
 *   ├── Séparateur
 *   └── ScrollView :
 *       ├── Nom app "WikiHop" + version
 *       ├── Séparateur
 *       ├── Description DPO-validée
 *       ├── Séparateur
 *       ├── Section "Sources" : texte + lien API MediaWiki
 *       ├── Séparateur
 *       ├── Section "Légal" : lien politique de confidentialité
 *       ├── Séparateur
 *       └── Section "Code source" : lien GitHub
 *
 * Textes validés DPO — Maïté — 2026-03-08
 * Référence story : docs/stories/phase-3/F3-06-about-screen.md
 *
 * Conventions :
 *   - Export nommé AboutScreen
 *   - StyleSheet.create() en bas du fichier
 *   - Zéro any, TypeScript strict
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
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

type AboutScreenProps = NativeStackScreenProps<RootStackParamList, 'About'>;

// ─────────────────────────────────────────────────────────────────────────────
// Composant interne — SectionHeader
// ─────────────────────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
}

function SectionHeader({ title }: SectionHeaderProps): React.JSX.Element {
  return (
    <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant interne — LinkRow
// ─────────────────────────────────────────────────────────────────────────────

interface LinkRowProps {
  label: string;
  url: string;
  accessibilityLabel: string;
}

function LinkRow({ label, url, accessibilityLabel }: LinkRowProps): React.JSX.Element {
  const handlePress = (): void => {
    void Linking.openURL(url);
  };

  return (
    <TouchableOpacity
      style={styles.linkRow}
      onPress={handlePress}
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel}
    >
      <Text style={styles.linkText}>{label}</Text>
      <Text style={styles.linkIcon} accessible={false}>{'↗'}</Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal AboutScreen
// ─────────────────────────────────────────────────────────────────────────────

export function AboutScreen({ navigation }: AboutScreenProps): React.JSX.Element {
  const version = Constants.expoConfig?.version ?? '—';

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
          <Text style={styles.backButtonText}>{'← Retour'}</Text>
        </TouchableOpacity>
        <Text
          style={styles.headerTitle}
          accessibilityRole="header"
        >
          {'À propos'}
        </Text>
        {/* Placeholder pour équilibrer le header (flex layout centré) */}
        <View style={styles.headerRight} />
      </View>
      <View style={styles.headerSeparator} />

      {/* Contenu scrollable */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section app — nom + version */}
        <Text style={styles.appName}>{'WikiHop'}</Text>
        <Text style={styles.appVersion}>{`Version ${version}`}</Text>

        <View style={styles.separator} />

        {/* Description — texte validé DPO Maïté 2026-03-08 */}
        <Text style={styles.description}>
          {'WikiHop est un jeu de navigation\u00a0: partez d\'un article Wikipedia et rejoignez l\'article destination en cliquant uniquement sur les liens internes. Combien de sauts vous faudra-t-il\u00a0?'}
        </Text>

        <View style={styles.separator} />

        {/* Section Sources */}
        <SectionHeader title="Sources" />
        <Text style={styles.sectionText}>
          {'Ce jeu utilise l\'API Wikipedia (contenu sous licence CC\u00a0BY-SA\u00a04.0). WikiHop n\'est pas affilié à la Wikimedia Foundation.'}
        </Text>
        <LinkRow
          label="Conditions d'utilisation de l'API MediaWiki"
          url="https://www.mediawiki.org/wiki/API:Main_page"
          accessibilityLabel="Voir les conditions d'utilisation de l'API MediaWiki"
        />

        <View style={styles.separator} />

        {/* Section Légal */}
        <SectionHeader title="Légal" />
        <LinkRow
          label="Politique de confidentialité"
          url="https://wikihop.app/privacy"
          accessibilityLabel="Consulter la politique de confidentialité de WikiHop"
        />

        <View style={styles.separator} />

        {/* Section Code source */}
        <SectionHeader title="Code source" />
        <LinkRow
          label="Code source sur GitHub"
          url="https://github.com/wikihop/wikihop"
          accessibilityLabel="Voir le code source de WikiHop sur GitHub"
        />
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
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#2563EB',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
  },
  headerRight: {
    minWidth: 44,
  },
  headerSeparator: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 20,
  },
  description: {
    fontSize: 15,
    color: '#1E293B',
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 12,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingVertical: 4,
  },
  linkText: {
    fontSize: 15,
    color: '#2563EB',
    flex: 1,
  },
  linkIcon: {
    fontSize: 16,
    color: '#2563EB',
    marginLeft: 8,
  },
});
