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
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDailyChallenge } from '../hooks/useDailyChallenge';
import { useDailyCompletionStatus } from '../hooks/useDailyCompletionStatus';
import { useRandomPair } from '../hooks/useRandomPair';
import type { RootStackParamList } from '../navigation/RootNavigator';
import * as DifficultyStorage from '../services/difficulty-storage.service';
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
  // ── État mode difficile (F3-05) — état local, non persisté dans le store ──
  const [isDifficultyHard, setIsDifficultyHard] = useState(false);

  // ── Lecture préférence difficulté au montage ──────────────────────────────
  // Intentionnellement limité à [] — lecture unique au montage
  useEffect(() => {
    void DifficultyStorage.getDifficultyPreference().then((pref) => {
      setIsDifficultyHard(pref === 'hard');
    });
  // Lecture unique au montage — pas de dep nécessaire
  }, []);

  const { state, refresh } = useRandomPair(isDifficultyHard ? 'hard' : 'normal');

  // ── Défi quotidien (F3-01) ───────────────────────────────────────────────
  const { state: dailyChallengeState } = useDailyChallenge();

  // ── Indicateur de complétion du défi quotidien (F3-16) ──────────────────
  const dailyChallengeDate =
    dailyChallengeState.status === 'success' ? dailyChallengeState.data.date : undefined;
  const isDailyCompleted = useDailyCompletionStatus(dailyChallengeDate);

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

  // ── handleDifficultyToggle : bascule mode difficile et persiste ─────────
  const handleDifficultyToggle = useCallback((value: boolean): void => {
    setIsDifficultyHard(value);
    void DifficultyStorage.setDifficultyPreference(value ? 'hard' : 'normal');
    // refresh() appelé après setIsDifficultyHard — React batche les setState
    // donc useRandomPair reçoit la nouvelle valeur au prochain render
    refresh();
  }, [refresh]);

  // ── handlePlayDaily : démarre le défi quotidien ──────────────────────────
  const handlePlayDaily = useCallback(async (): Promise<void> => {
    if (dailyChallengeState.status !== 'success') return;
    const { data } = dailyChallengeState;

    try {
      await clearSession();

      // Construction explicite Article depuis ArticleSummary
      // (extract et thumbnailUrl ne font pas partie du type Article)
      const startArticle = {
        id: data.start.id,
        title: data.start.title,
        url: data.start.url,
        language: data.start.language,
      };
      const targetArticle = {
        id: data.target.id,
        title: data.target.title,
        url: data.target.url,
        language: data.target.language,
      };

      await startSession(startArticle, targetArticle, {
        isDailyChallenge: true,
        dailyChallengeDate: data.date,
      });

      navigation.navigate('Game', { articleTitle: startArticle.title });
    } catch (e: unknown) {
      // eslint-disable-next-line no-console
      console.error('[HomeScreen] handlePlayDaily — erreur inattendue :', e);
      Alert.alert('Indisponible', 'Le défi du jour est momentanément indisponible.');
    }
  }, [dailyChallengeState, clearSession, startSession, navigation]);

  // ── handlePlay : démarre la partie ──────────────────────────────────────
  const handlePlay = useCallback(async (): Promise<void> => {
    if (state.status !== 'success') return;

    try {
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

      await startSession(startArticle, targetArticle, {
        difficulty: isDifficultyHard ? 'hard' : 'normal',
      });

      // Home est la racine du stack — navigate (pas push)
      navigation.navigate('Game', { articleTitle: startArticle.title });
    } catch (e: unknown) {
      // eslint-disable-next-line no-console
      console.error('[HomeScreen] handlePlay — erreur inattendue :', e);
      Alert.alert(
        'Erreur',
        'Impossible de démarrer la partie. Réessayez.',
      );
    }
  }, [state, clearSession, startSession, navigation, isDifficultyHard]);

  // ── Calcul de la rotation ────────────────────────────────────────────────
  const rotateInterpolated = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const isLoading = state.status === 'loading';

  // ── Helpers visuels pour le bouton Défi du jour (F3-16 / F3-17 / F3-19) ──
  // Centralisés ici pour éviter la duplication entre les blocs loading et success
  const isDailyButtonCompleted = isDailyCompleted && dailyChallengeState.status === 'success';

  // F3-17 : le bouton est désactivé si complété ou si le défi n'est pas encore chargé
  const isDailyButtonDisabled = isDailyButtonCompleted || dailyChallengeState.status !== 'success';

  // F3-19 : badge NEW visible uniquement si le défi est chargé ET non complété aujourd'hui
  const showDailyBadge = dailyChallengeState.status === 'success' && !isDailyCompleted;

  const dailyButtonStyle =
    isDailyButtonCompleted
      ? styles.dailyButtonCompleted
      : dailyChallengeState.status !== 'success'
        ? styles.dailyButtonDisabled
        : styles.dailyButton;

  const dailyButtonLabel =
    showDailyBadge
      ? 'Nouveau défi du jour disponible — jouer le défi quotidien'
      : isDailyButtonCompleted
        ? 'Défi du jour déjà complété aujourd\'hui'
        : dailyChallengeState.status !== 'success'
          ? 'Défi du jour — chargement en cours'
          : 'Jouer le défi du jour';

  // F3-21 : opacité réduite quand le bouton est désactivé
  // TouchableOpacity ne gère pas automatiquement l'opacity sur disabled=true
  const dailyButtonOpacity = isDailyButtonDisabled ? 0.5 : 1;

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
            {/* Bouton Jouer (CTA principal) — paire affichée sur l'écran */}
            <TouchableOpacity
              style={[styles.playButton, styles.playButtonDisabled]}
              disabled={true}
              accessibilityLabel="Jouer"
              accessibilityRole="button"
              accessibilityState={{ disabled: true }}
            >
              <Text style={[styles.playButtonText, styles.playButtonTextDisabled]}>{'Jouer'}</Text>
            </TouchableOpacity>
            {/* Bouton Défi du jour (F3-01 / F3-16 / F3-17 / F3-19) — en dessous du bouton Jouer */}
            {/* F3-21 : opacity et activeOpacity gérés explicitement (disabled ne gère pas opacity) */}
            <TouchableOpacity
              style={[dailyButtonStyle, { opacity: dailyButtonOpacity }]}
              disabled={true}
              activeOpacity={1}
              accessibilityLabel={dailyButtonLabel}
              accessibilityRole="button"
              accessibilityState={{ disabled: true }}
              testID="daily-completed-indicator"
            >
              {showDailyBadge && (
                <View style={styles.dailyBadge} accessible={false}>
                  <Text style={styles.dailyBadgeText} accessible={false}>{'NEW'}</Text>
                </View>
              )}
              {isDailyButtonCompleted ? (
                <>
                  <Text style={styles.dailyButtonCheckIcon} accessible={false}>{'✓'}</Text>
                  <Text style={styles.dailyButtonTextCompleted}>{'Défi du jour complété'}</Text>
                </>
              ) : (
                <Text style={[styles.dailyButtonText, styles.dailyButtonTextDisabled]}>
                  {'Défi du jour'}
                </Text>
              )}
            </TouchableOpacity>
            {/* Bouton Multijoueur (F3-12) */}
            <TouchableOpacity
              style={styles.multiplayerButton}
              onPress={() => { navigation.navigate('MultiplayerSetup'); }}
              accessibilityLabel="Multijoueur — jouer à plusieurs sur cet appareil"
              accessibilityRole="button"
            >
              <Text style={styles.multiplayerButtonText}>{'Multijoueur'}</Text>
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
            {/* Toggle Mode difficile (F3-05) — visible même en loading */}
            <View style={styles.difficultyToggleRow}>
              <Text style={styles.difficultyToggleLabel}>{'Mode difficile'}</Text>
              <Switch
                value={isDifficultyHard}
                onValueChange={handleDifficultyToggle}
                accessibilityLabel={isDifficultyHard ? 'Mode difficile activé' : 'Mode difficile désactivé'}
                accessibilityState={{ checked: isDifficultyHard }}
                trackColor={{ false: '#E2E8F0', true: '#FECACA' }}
                thumbColor={isDifficultyHard ? '#EF4444' : '#FFFFFF'}
              />
            </View>
            <TouchableOpacity
              style={styles.secondaryTextButton}
              onPress={() => { navigation.navigate('History'); }}
              accessibilityLabel="Voir mon historique de parties"
              accessibilityRole="button"
            >
              <Text style={styles.secondaryTextButtonText}>{'Historique'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryTextButton}
              onPress={() => { navigation.navigate('Donation'); }}
              accessibilityLabel="Soutenir Wikipedia — faire un don à Wikimedia"
              accessibilityRole="button"
            >
              <Text style={styles.secondaryTextButtonText}>{'Soutenir Wikipedia'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryTextButton}
              onPress={() => { navigation.navigate('About'); }}
              accessibilityLabel="À propos de WikiHop"
              accessibilityRole="button"
            >
              <Text style={styles.secondaryTextButtonText}>{'À propos'}</Text>
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
          {/* Bouton Jouer (CTA principal) — paire affichée sur l'écran */}
          <TouchableOpacity
            style={styles.playButton}
            onPress={() => { void handlePlay(); }}
            accessibilityLabel="Jouer"
            accessibilityRole="button"
            accessibilityState={{ disabled: false }}
          >
            <Text style={styles.playButtonText}>{'Jouer'}</Text>
          </TouchableOpacity>
          {/* Bouton Défi du jour (F3-01 / F3-16 / F3-17 / F3-19) — en dessous du bouton Jouer */}
          {/* F3-21 : opacity et activeOpacity gérés explicitement (disabled ne gère pas opacity) */}
          <TouchableOpacity
            style={[dailyButtonStyle, { opacity: dailyButtonOpacity }]}
            onPress={() => { void handlePlayDaily(); }}
            disabled={isDailyButtonDisabled}
            activeOpacity={isDailyButtonDisabled ? 1 : 0.8}
            accessibilityLabel={dailyButtonLabel}
            accessibilityRole="button"
            accessibilityState={{ disabled: isDailyButtonDisabled }}
            testID="daily-completed-indicator"
          >
            {showDailyBadge && (
              <View style={styles.dailyBadge} accessible={false}>
                <Text style={styles.dailyBadgeText} accessible={false}>{'NEW'}</Text>
              </View>
            )}
            {isDailyButtonCompleted ? (
              <>
                <Text style={styles.dailyButtonCheckIcon} accessible={false}>{'✓'}</Text>
                <Text style={styles.dailyButtonTextCompleted}>{'Défi du jour complété'}</Text>
              </>
            ) : (
              <Text style={styles.dailyButtonText}>{'Défi du jour'}</Text>
            )}
          </TouchableOpacity>
          {/* Bouton Multijoueur (F3-12) */}
          <TouchableOpacity
            style={styles.multiplayerButton}
            onPress={() => { navigation.navigate('MultiplayerSetup'); }}
            accessibilityLabel="Multijoueur — jouer à plusieurs sur cet appareil"
            accessibilityRole="button"
          >
            <Text style={styles.multiplayerButtonText}>{'Multijoueur'}</Text>
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
          {/* Toggle Mode difficile (F3-05) — visible en loading et en success */}
          <View style={styles.difficultyToggleRow}>
            <Text style={styles.difficultyToggleLabel}>{'Mode difficile'}</Text>
            <Switch
              value={isDifficultyHard}
              onValueChange={handleDifficultyToggle}
              accessibilityLabel={isDifficultyHard ? 'Mode difficile activé' : 'Mode difficile désactivé'}
              accessibilityState={{ checked: isDifficultyHard }}
              trackColor={{ false: '#E2E8F0', true: '#FECACA' }}
              thumbColor={isDifficultyHard ? '#EF4444' : '#FFFFFF'}
            />
          </View>
          <TouchableOpacity
            style={styles.secondaryTextButton}
            onPress={() => { navigation.navigate('History'); }}
            accessibilityLabel="Voir mon historique de parties"
            accessibilityRole="button"
          >
            <Text style={styles.secondaryTextButtonText}>{'Historique'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryTextButton}
            onPress={() => { navigation.navigate('Donation'); }}
            accessibilityLabel="Soutenir Wikipedia — faire un don à Wikimedia"
            accessibilityRole="button"
          >
            <Text style={styles.secondaryTextButtonText}>{'Soutenir Wikipedia'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryTextButton}
            onPress={() => { navigation.navigate('About'); }}
            accessibilityLabel="À propos de WikiHop"
            accessibilityRole="button"
          >
            <Text style={styles.secondaryTextButtonText}>{'À propos'}</Text>
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
  // Bouton Défi du jour (F3-01) — fond ambre #D97706, en dessous du bouton Jouer
  dailyButton: {
    height: 52,
    backgroundColor: '#D97706',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  dailyButtonDisabled: {
    backgroundColor: '#E2E8F0',
  },
  // État complété du défi (F3-16) — fond brun foncé #92400E, flexDirection row pour icône + texte
  dailyButtonCompleted: {
    height: 52,
    backgroundColor: '#92400E',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    flexDirection: 'row',
  },
  dailyButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  dailyButtonTextDisabled: {
    color: '#94A3B8',
  },
  // Texte du bouton défi en état complété (F3-16) — 16px pour accommoder icône + texte plus long
  dailyButtonTextCompleted: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  // Icône checkmark décorative (F3-16) — accessible={false} sur le Text
  dailyButtonCheckIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 8,
  },
  // Toggle Mode difficile (F3-05)
  difficultyToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  difficultyToggleLabel: {
    fontSize: 16,
    color: '#1E293B',
  },
  playButton: {
    height: 52,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
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
  secondaryTextButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  secondaryTextButtonText: {
    fontSize: 16,
    color: '#64748B',
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
  // Badge NEW (F3-19) — positionné en absolu sur le coin supérieur droit du bouton Défi du jour
  dailyBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    zIndex: 1,
  },
  dailyBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  // Bouton Multijoueur (F3-12) — outline bleu, fond blanc
  multiplayerButton: {
    height: 52,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  multiplayerButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563EB',
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
