/**
 * HomeScreen — WikiHop Mobile — Wave 4 (M-01)
 *
 * Écran d'accueil. Affiche une paire d'articles (départ + destination)
 * chargée depuis le backend et permet de démarrer une partie.
 *
 * Layout :
 *   [SafeAreaView top+bottom]
 *   ├── Header fixe : "WikiHop" + sélecteur FR/EN
 *   ├── Zone centrale (flex:1) :
 *   │   ├── [loading]  Skeleton animé pour les 2 cartes
 *   │   ├── [error]    Message d'erreur + bouton "Réessayer"
 *   │   └── [success]  Carte départ + flèche + carte destination + boutons
 *   └── (boutons dans la zone centrale)
 *
 * Gestion session résiduelle :
 *   Si isHydrated && currentSession?.status === 'in_progress' au montage,
 *   un Alert propose de "Reprendre" ou de démarrer une "Nouvelle partie".
 *   Déclenché une seule fois (deps: [isHydrated]).
 *
 * Références :
 *   Story : docs/stories/M-01-home-screen.md
 *   UX    : Benjamin — spécifications visuelles M-01
 *
 * Conventions :
 *   - Export nommé HomeScreen
 *   - StyleSheet.create() en bas du fichier
 *   - Zéro any, TypeScript strict
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Article } from '@wikihop/shared';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRandomPair } from '../hooks/useRandomPair';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useGameStore } from '../store/game.store';
import { useLanguageStore } from '../store/language.store';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

// ─────────────────────────────────────────────────────────────────────────────
// Composant ArticleCard
// ─────────────────────────────────────────────────────────────────────────────

interface ArticleCardProps {
  variant: 'start' | 'target';
  title: string;
  extract: string;
  thumbnailUrl?: string;
}

function ArticleCard({ variant, title, extract, thumbnailUrl }: ArticleCardProps): React.JSX.Element {
  const label = variant === 'start' ? 'DÉPART' : 'DESTINATION';
  const labelStyle = variant === 'start' ? cardStyles.labelStart : cardStyles.labelTarget;
  const accessibilityPrefix = variant === 'start' ? 'Article de départ' : 'Article destination';
  const accessibilityText = `${accessibilityPrefix} : ${title}. ${extract.slice(0, 100)}`;
  const [imageError, setImageError] = useState(false);

  const showImage = thumbnailUrl !== undefined && !imageError;

  return (
    <View
      style={cardStyles.card}
      accessible={true}
      accessibilityRole="none"
      accessibilityLabel={accessibilityText}
    >
      <Text style={[cardStyles.label, labelStyle]}>{label}</Text>
      <View style={cardStyles.separator} />
      <View style={cardStyles.row}>
        {showImage ? (
          <Image
            source={{ uri: thumbnailUrl, headers: { 'User-Agent': 'WikiHop/1.0 (contact@wikihop.app)' } }}
            style={cardStyles.thumbnail}
            contentFit="cover"
            accessible={false}
            onError={() => { setImageError(true); }}
          />
        ) : (
          <View style={[cardStyles.thumbnail, cardStyles.thumbnailPlaceholder]} accessible={false}>
            <Text style={cardStyles.thumbnailPlaceholderIcon}>{'📄'}</Text>
          </View>
        )}
        <View style={cardStyles.textBlock}>
          <Text style={cardStyles.title} numberOfLines={2} ellipsizeMode="tail">
            {title}
          </Text>
          <Text style={cardStyles.extract} numberOfLines={3} ellipsizeMode="tail">
            {extract}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant SkeletonCard
// ─────────────────────────────────────────────────────────────────────────────

interface SkeletonCardProps {
  shimmerAnim: Animated.Value;
}

function SkeletonCard({ shimmerAnim }: SkeletonCardProps): React.JSX.Element {
  return (
    <View style={cardStyles.card} accessibilityElementsHidden={true}>
      <Animated.View style={[skeletonStyles.label, { opacity: shimmerAnim }]} />
      <View style={cardStyles.separator} />
      <View style={cardStyles.row}>
        <Animated.View style={[skeletonStyles.thumbnail, { opacity: shimmerAnim }]} />
        <View style={skeletonStyles.textBlock}>
          <Animated.View style={[skeletonStyles.line, skeletonStyles.lineFull, { opacity: shimmerAnim }]} />
          <Animated.View style={[skeletonStyles.line, skeletonStyles.line80, { opacity: shimmerAnim }]} />
          <Animated.View style={[skeletonStyles.line, skeletonStyles.line60, { opacity: shimmerAnim }]} />
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal HomeScreen
// ─────────────────────────────────────────────────────────────────────────────

export function HomeScreen({ navigation }: HomeScreenProps): React.JSX.Element {
  const { state, refresh } = useRandomPair();

  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const isLanguageHydrated = useLanguageStore((state) => state.isLanguageHydrated);

  const startSession = useGameStore((s) => s.startSession);
  const clearSession = useGameStore((s) => s.clearSession);
  const currentSession = useGameStore((s) => s.currentSession);
  const isHydrated = useGameStore((s) => s.isHydrated);

  // Animation shimmer pour le skeleton
  const shimmerAnim = useRef(new Animated.Value(0.4)).current;
  // Animation rotation pour l'icône refresh
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // ── Animation shimmer skeleton ───────────────────────────────────────────
  useEffect(() => {
    if (state.status !== 'loading') {
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1.0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0.4,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [state.status, shimmerAnim]);

  // ── Animation rotation icône refresh ────────────────────────────────────
  useEffect(() => {
    if (state.status !== 'loading') {
      rotateAnim.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [state.status, rotateAnim]);

  // ── Annonces accessibilité ────────────────────────────────────────────────
  useEffect(() => {
    if (state.status === 'success') {
      void AccessibilityInfo.announceForAccessibility(
        `Articles chargés. Départ : ${state.start.title}. Destination : ${state.target.title}.`,
      );
    } else if (state.status === 'error') {
      void AccessibilityInfo.announceForAccessibility(
        `Erreur de chargement. ${state.message}.`,
      );
    }
  }, [state]);

  // ── Session résiduelle — déclenchée une seule fois après hydratation ────
  // Note : les deps sont limitées à [isHydrated] intentionnellement,
  // pour ne déclencher le dialog qu'une seule fois au montage.
  useEffect(() => {
    if (!isHydrated) return;
    if (currentSession?.status !== 'in_progress') return;

    // noUncheckedIndexedAccess : accès défensif au dernier élément du path
    const lastTitle =
      currentSession.path[currentSession.path.length - 1]?.title
      ?? currentSession.startArticle.title;

    Alert.alert(
      'Partie en cours',
      `Tu as une partie en cours vers "${currentSession.targetArticle.title}". Veux-tu la reprendre ?`,
      [
        {
          text: 'Reprendre',
          onPress: () => { navigation.navigate('Game', { articleTitle: lastTitle }); },
        },
        {
          text: 'Nouvelle partie',
          style: 'destructive',
          onPress: () => { void clearSession(); },
        },
      ],
    );
  // Intentionnellement limité à [isHydrated] pour ne déclencher le dialog qu'une seule fois au montage
  }, [isHydrated]);

  // ── handlePlay : démarre la partie ──────────────────────────────────────
  const handlePlay = useCallback(async (): Promise<void> => {
    if (state.status !== 'success') return;

    // Effacer toute session résiduelle avant de démarrer
    await clearSession();

    // Conversion ArticleSummary → Article : construction explicite sans spread
    // (extract et thumbnailUrl ne font pas partie du type Article)
    const startArticle: Article = {
      id: state.start.id,
      title: state.start.title,
      url: state.start.url,
      language: state.start.language,
    };
    const targetArticle: Article = {
      id: state.target.id,
      title: state.target.title,
      url: state.target.url,
      language: state.target.language,
    };

    await startSession(startArticle, targetArticle);

    // Home est la racine du stack — navigate (pas push)
    navigation.navigate('Game', { articleTitle: startArticle.title });
  }, [state, clearSession, startSession, navigation]);

  // ── Calcul de la rotation ────────────────────────────────────────────────
  const rotateInterpolated = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const isLoading = state.status === 'loading';

  // ── Rendu de la zone de contenu ──────────────────────────────────────────
  function renderContent(): React.JSX.Element {
    if (state.status === 'loading') {
      return (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <SkeletonCard shimmerAnim={shimmerAnim} />
          <View style={styles.arrowContainer} accessible={false}>
            <Text style={styles.arrowText}>{'↓'}</Text>
          </View>
          <SkeletonCard shimmerAnim={shimmerAnim} />
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.playButton, styles.playButtonDisabled]}
              disabled={true}
              accessibilityLabel="Jouer"
              accessibilityRole="button"
              accessibilityState={{ disabled: true }}
            >
              <Text style={[styles.playButtonText, styles.playButtonTextDisabled]}>{'Jouer'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.refreshButton}
              disabled={true}
              onPress={refresh}
              accessibilityLabel="Tirer de nouveaux articles"
              accessibilityRole="button"
            >
              <Animated.View style={[styles.refreshButtonInner, styles.refreshButtonDisabled]}>
                <Text style={styles.refreshButtonText}>{'Nouveaux articles'}</Text>
                <Animated.Text
                  style={[styles.refreshIcon, { transform: [{ rotate: rotateInterpolated }] }]}
                >
                  {'↺'}
                </Animated.Text>
              </Animated.View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }

    if (state.status === 'error') {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>{'Impossible de charger les articles.'}</Text>
          <Text style={styles.errorSubtext}>{'Vérifiez votre connexion internet.'}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={refresh}
            accessibilityLabel="Réessayer de charger les articles"
            accessibilityRole="button"
          >
            <Text style={styles.retryButtonText}>{'Réessayer'}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // state.status === 'success'
    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ArticleCard
          variant="start"
          title={state.start.title}
          extract={state.start.extract}
          {...(state.start.thumbnailUrl !== undefined ? { thumbnailUrl: state.start.thumbnailUrl } : {})}
        />
        <View style={styles.arrowContainer} accessible={false}>
          <Text style={styles.arrowText}>{'↓'}</Text>
        </View>
        <ArticleCard
          variant="target"
          title={state.target.title}
          extract={state.target.extract}
          {...(state.target.thumbnailUrl !== undefined ? { thumbnailUrl: state.target.thumbnailUrl } : {})}
        />
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.playButton}
            onPress={() => { void handlePlay(); }}
            accessibilityLabel="Jouer"
            accessibilityRole="button"
            accessibilityState={{ disabled: false }}
          >
            <Text style={styles.playButtonText}>{'Jouer'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={refresh}
            accessibilityLabel="Tirer de nouveaux articles"
            accessibilityRole="button"
          >
            <View style={styles.refreshButtonInner}>
              <Text style={styles.refreshButtonText}>{'Nouveaux articles'}</Text>
              <Text style={styles.refreshIcon}>{'↺'}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text
          style={styles.headerTitle}
          accessibilityRole="header"
          accessibilityLabel="WikiHop, écran d'accueil"
        >
          {'WikiHop'}
        </Text>
        {isLanguageHydrated && (
          <View style={styles.languageSelector}>
            <TouchableOpacity
              style={styles.languageOption}
              onPress={() => { void setLanguage('fr'); }}
              accessibilityLabel={language === 'fr' ? 'Langue française, sélectionnée' : 'Langue française'}
              accessibilityState={{ selected: language === 'fr' }}
            >
              <Text style={[styles.languageText, language === 'fr' && styles.languageTextActive]}>
                {'FR'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.languageSeparator}>{'|'}</Text>
            <TouchableOpacity
              style={styles.languageOption}
              onPress={() => { void setLanguage('en'); }}
              accessibilityLabel={language === 'en' ? 'Langue anglaise, sélectionnée' : 'Langue anglaise'}
              accessibilityState={{ selected: language === 'en' }}
            >
              <Text style={[styles.languageText, language === 'en' && styles.languageTextActive]}>
                {'EN'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <View style={styles.headerSeparator} />

      {/* Zone centrale */}
      <View style={[styles.content, isLoading || state.status === 'error' ? styles.contentCentered : null]}>
        {renderContent()}
      </View>
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
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
  },
  headerSeparator: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  languageSelector: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageOption: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  languageText: {
    fontSize: 13,
    color: '#64748B',
  },
  languageTextActive: {
    fontWeight: 'bold',
    color: '#2563EB',
  },
  languageSeparator: {
    fontSize: 13,
    color: '#E2E8F0',
  },
  content: {
    flex: 1,
  },
  contentCentered: {
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  arrowContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  arrowText: {
    fontSize: 20,
    color: '#2563EB',
  },
  buttonsContainer: {
    marginTop: 24,
  },
  playButton: {
    height: 52,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonDisabled: {
    backgroundColor: '#E2E8F0',
  },
  playButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  playButtonTextDisabled: {
    color: '#94A3B8',
  },
  refreshButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  refreshButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButtonDisabled: {
    opacity: 0.4,
  },
  refreshButtonText: {
    fontSize: 16,
    color: '#2563EB',
    marginRight: 4,
  },
  refreshIcon: {
    fontSize: 16,
    color: '#2563EB',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 16,
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    height: 48,
    width: '80%',
    backgroundColor: '#2563EB',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  labelStart: {
    color: '#64748B',
  },
  labelTarget: {
    color: '#2563EB',
  },
  separator: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  thumbnailPlaceholder: {
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailPlaceholderIcon: {
    fontSize: 24,
    color: '#CBD5E1',
  },
  textBlock: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 4,
    marginBottom: 6,
  },
  extract: {
    fontSize: 14,
    color: '#64748B',
  },
});

const skeletonStyles = StyleSheet.create({
  label: {
    height: 12,
    width: 60,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginBottom: 4,
  },
  thumbnail: {
    width: 80,
    height: 80,
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
  },
  textBlock: {
    flex: 1,
    marginLeft: 12,
  },
  line: {
    height: 14,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginBottom: 8,
  },
  lineFull: {
    width: '100%',
  },
  line80: {
    width: '80%',
  },
  line60: {
    width: '60%',
  },
});
