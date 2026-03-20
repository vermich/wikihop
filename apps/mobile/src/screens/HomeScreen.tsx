/**
 * HomeScreen — WikiHop Mobile — Wave 4 (M-01) — i18n F3-26
 *
 * Écran d'accueil. Affiche une paire d'articles (départ + destination)
 * chargée depuis le backend et permet de démarrer une partie.
 *
 * Layout :
 *   [SafeAreaView top+bottom]
 *   ├── Header fixe : "WikiHop" + LanguageSelectorButton (F3-26, remplace FR/EN toggle)
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
import type { Article, Language } from '@wikihop/shared';
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
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LanguageSelectionSheet } from '../components/LanguageSelectionSheet';
import { useDailyChallenge } from '../hooks/useDailyChallenge';
import { useDailyCompletionStatus } from '../hooks/useDailyCompletionStatus';
import { useRandomPair } from '../hooks/useRandomPair';
import type { RootStackParamList } from '../navigation/RootNavigator';
import * as DifficultyStorage from '../services/difficulty-storage.service';
import { useGameStore } from '../store/game.store';
import { useLanguageStore } from '../store/language.store';

// ─────────────────────────────────────────────────────────────────────────────
// Constantes d'accessibilité (F3-26)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Labels a11y du LanguageSelectorButton dans le header.
 * Dans la langue de l'interface (spec UX F3-26 — tableau accessibilityLabel).
 * Invariants — pas traduits via i18next (labels natifs par langue).
 */
const LANGUAGE_BUTTON_A11Y_LABELS: Record<Language, string> = {
  fr: 'Langue active : Français — ouvrir le sélecteur de langue',
  en: 'Active language: English — open language selector',
  es: 'Idioma activo: Español — abrir el selector de idioma',
  de: 'Aktive Sprache: Deutsch — Sprachauswahl öffnen',
  pt: 'Idioma ativo: Português — abrir o seletor de idioma',
  it: 'Lingua attiva: Italiano — apri il selettore di lingua',
  nl: 'Actieve taal: Nederlands — taalkiezer openen',
  pl: 'Aktywny język: Polski — otwórz wybór języka',
};

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
  const { t } = useTranslation();
  const label = variant === 'start' ? t('home.card_label_start') : t('home.card_label_target');
  const labelStyle = variant === 'start' ? cardStyles.labelStart : cardStyles.labelTarget;
  const accessibilityPrefix = variant === 'start'
    ? t('home.accessibility_start_prefix')
    : t('home.accessibility_target_prefix');
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
  const { t } = useTranslation();

  // ── État mode difficile (F3-05) — état local, non persisté dans le store ──
  const [isDifficultyHard, setIsDifficultyHard] = useState(false);

  // ── État sélecteur de langue (F3-26) ─────────────────────────────────────
  const [isLanguageSheetOpen, setIsLanguageSheetOpen] = useState(false);

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

  // isLanguageLocked : sélecteur calculé (ADR-007) — session in_progress bloque le changement de langue
  const isLanguageLocked = useGameStore((s) => s.currentSession?.status === 'in_progress');

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
        t('home.accessibility_loaded', { start: state.start.title, target: state.target.title }),
      );
    } else if (state.status === 'error') {
      void AccessibilityInfo.announceForAccessibility(
        t('home.accessibility_error', { message: state.message }),
      );
    }
  }, [state, t]);

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
      t('home.session_resume_title'),
      t('home.session_resume_message', { target: currentSession.targetArticle.title }),
      [
        {
          text: t('home.session_resume_action'),
          onPress: () => { navigation.navigate('Game', { articleTitle: lastTitle }); },
        },
        {
          text: t('home.session_new_game_action'),
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
      Alert.alert(t('home.daily_error_title'), t('home.daily_error_message'));
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
      Alert.alert(t('home.error_start_title'), t('home.error_start_message'));
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
      ? t('home.daily_button_new_a11y')
      : isDailyButtonCompleted
        ? t('home.daily_button_completed_a11y')
        : dailyChallengeState.status !== 'success'
          ? t('home.daily_button_loading_a11y')
          : t('home.daily_button_default_a11y');

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
              accessibilityLabel={t('home.play_button')}
              accessibilityRole="button"
              accessibilityState={{ disabled: true }}
            >
              <Text style={[styles.playButtonText, styles.playButtonTextDisabled]}>{t('home.play_button')}</Text>
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
                  <Text style={styles.dailyBadgeText} accessible={false}>{t('home.daily_badge_new')}</Text>
                </View>
              )}
              {isDailyButtonCompleted ? (
                <>
                  <Text style={styles.dailyButtonCheckIcon} accessible={false}>{'✓'}</Text>
                  <Text style={styles.dailyButtonTextCompleted}>{t('home.daily_challenge_completed')}</Text>
                </>
              ) : (
                <Text style={[styles.dailyButtonText, styles.dailyButtonTextDisabled]}>
                  {t('home.daily_challenge_button')}
                </Text>
              )}
            </TouchableOpacity>
            {/* Bouton Multijoueur (F3-12) */}
            <TouchableOpacity
              style={styles.multiplayerButton}
              onPress={() => { navigation.navigate('MultiplayerSetup'); }}
              accessibilityLabel={t('home.multiplayer_a11y')}
              accessibilityRole="button"
            >
              <Text style={styles.multiplayerButtonText}>{t('home.multiplayer_button')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.refreshButton}
              disabled={true}
              onPress={refresh}
              accessibilityLabel={t('home.refresh_a11y')}
              accessibilityRole="button"
            >
              <Animated.View style={[styles.refreshButtonInner, styles.refreshButtonDisabled]}>
                <Text style={styles.refreshButtonText}>{t('home.new_articles_button')}</Text>
                <Animated.Text
                  style={[styles.refreshIcon, { transform: [{ rotate: rotateInterpolated }] }]}
                >
                  {'↺'}
                </Animated.Text>
              </Animated.View>
            </TouchableOpacity>
            {/* F3-25 critère 8 : séparateur + liens secondaires juste après Refresh */}
            <View style={styles.secondaryLinksSeparator} />
            <TouchableOpacity
              style={styles.secondaryTextButton}
              onPress={() => { navigation.navigate('History'); }}
              accessibilityLabel={t('home.history_a11y')}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryTextButtonText}>{t('home.history_link')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryTextButton}
              onPress={() => { navigation.navigate('Donation'); }}
              accessibilityLabel={t('home.donation_a11y')}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryTextButtonText}>{t('home.support_wikipedia_link')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryTextButton}
              onPress={() => { navigation.navigate('About'); }}
              accessibilityLabel={t('home.about_a11y')}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryTextButtonText}>{t('home.about_link')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }

    if (state.status === 'error') {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>{t('home.error_load_title')}</Text>
          <Text style={styles.errorSubtext}>{t('home.error_load_subtitle')}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={refresh}
            accessibilityLabel={t('home.retry_button')}
            accessibilityRole="button"
          >
            <Text style={styles.retryButtonText}>{t('home.retry_button')}</Text>
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
            accessibilityLabel={t('home.play_button')}
            accessibilityRole="button"
            accessibilityState={{ disabled: false }}
          >
            <Text style={styles.playButtonText}>{t('home.play_button')}</Text>
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
                <Text style={styles.dailyBadgeText} accessible={false}>{t('home.daily_badge_new')}</Text>
              </View>
            )}
            {isDailyButtonCompleted ? (
              <>
                <Text style={styles.dailyButtonCheckIcon} accessible={false}>{'✓'}</Text>
                <Text style={styles.dailyButtonTextCompleted}>{t('home.daily_challenge_completed')}</Text>
              </>
            ) : (
              <Text style={styles.dailyButtonText}>{t('home.daily_challenge_button')}</Text>
            )}
          </TouchableOpacity>
          {/* Bouton Multijoueur (F3-12) */}
          <TouchableOpacity
            style={styles.multiplayerButton}
            onPress={() => { navigation.navigate('MultiplayerSetup'); }}
            accessibilityLabel={t('home.multiplayer_a11y')}
            accessibilityRole="button"
          >
            <Text style={styles.multiplayerButtonText}>{t('home.multiplayer_button')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={refresh}
            accessibilityLabel={t('home.refresh_a11y')}
            accessibilityRole="button"
          >
            <View style={styles.refreshButtonInner}>
              <Text style={styles.refreshButtonText}>{t('home.new_articles_button')}</Text>
              <Text style={styles.refreshIcon}>{'↺'}</Text>
            </View>
          </TouchableOpacity>
          {/* F3-25 critère 8 : séparateur + liens secondaires juste après Refresh */}
          <View style={styles.secondaryLinksSeparator} />
          <TouchableOpacity
            style={styles.secondaryTextButton}
            onPress={() => { navigation.navigate('History'); }}
            accessibilityLabel={t('home.history_a11y')}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryTextButtonText}>{t('home.history_link')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryTextButton}
            onPress={() => { navigation.navigate('Donation'); }}
            accessibilityLabel={t('home.donation_a11y')}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryTextButtonText}>{t('home.support_wikipedia_link')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryTextButton}
            onPress={() => { navigation.navigate('About'); }}
            accessibilityLabel={t('home.about_a11y')}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryTextButtonText}>{t('home.about_link')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        {/* F3-25 critère 2 : Toggle mode difficile dans le header, position absolute left:16 */}
        {/* Ordre JSX : Switch en premier pour VoiceOver (lu avant le titre "WikiHop") */}
        <View style={styles.difficultyHeaderToggle}>
          <Switch
            value={isDifficultyHard}
            onValueChange={handleDifficultyToggle}
            trackColor={{ false: '#E2E8F0', true: '#FECACA' }}
            thumbColor={isDifficultyHard ? '#EF4444' : '#FFFFFF'}
            accessibilityLabel={isDifficultyHard ? t('home.difficulty_toggle_on_a11y') : t('home.difficulty_toggle_off_a11y')}
            accessibilityState={{ checked: isDifficultyHard }}
          />
          <Text
            style={[
              styles.difficultyLabel,
              isDifficultyHard && styles.difficultyLabelActive,
            ]}
            accessible={false}
          >
            {t('home.hard_mode_label')}
          </Text>
        </View>
        <Text
          style={styles.headerTitle}
          accessibilityRole="header"
          accessibilityLabel="WikiHop, écran d'accueil"
        >
          {'WikiHop'}
        </Text>
        {/* F3-26 : LanguageSelectorButton remplace le toggle FR/EN */}
        {isLanguageHydrated && (
          <TouchableOpacity
            style={[
              styles.languageSelectorButton,
              isLanguageLocked === true && styles.languageSelectorDisabled,
            ]}
            onPress={() => { setIsLanguageSheetOpen(true); }}
            disabled={isLanguageLocked === true}
            accessibilityLabel={LANGUAGE_BUTTON_A11Y_LABELS[language]}
            accessibilityRole="button"
            accessibilityState={{ disabled: isLanguageLocked === true }}
          >
            <Text style={styles.languageCode}>{language.toUpperCase()}</Text>
            <Text style={styles.languageChevron} accessible={false}>{'⌄'}</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.headerSeparator} />

      {/* Zone centrale */}
      <View style={[styles.content, isLoading || state.status === 'error' ? styles.contentCentered : null]}>
        {renderContent()}
      </View>

      {/* F3-26 : LanguageSelectionSheet — modal de sélection de langue */}
      <LanguageSelectionSheet
        visible={isLanguageSheetOpen}
        currentLanguage={language}
        onSelect={(lang) => { void setLanguage(lang); setIsLanguageSheetOpen(false); }}
        onClose={() => { setIsLanguageSheetOpen(false); }}
      />
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
  // F3-26 : LanguageSelectorButton — remplace le toggle FR/EN
  languageSelectorButton: {
    position: 'absolute',
    right: 16,
    minWidth: 44,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 3,
  },
  languageSelectorDisabled: {
    opacity: 0.4,
  },
  languageCode: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  languageChevron: {
    fontSize: 11,
    color: '#2563EB',
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
  // F3-43 : Toggle mode difficile + libellé dans le header
  difficultyHeaderToggle: {
    position: 'absolute',
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    gap: 4,
  },
  difficultyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  difficultyLabelActive: {
    color: '#EF4444',
  },
  // F3-25 critère 8 : séparateur visuel avant les liens secondaires
  secondaryLinksSeparator: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 16,
    marginBottom: 4,
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
