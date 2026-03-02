/**
 * ArticleScreen — WikiHop Mobile — Wave 3 (M-03 + M-04)
 *
 * Écran principal du jeu. Affiche un article Wikipedia et permet la navigation
 * vers d'autres articles via les liens internes.
 *
 * Layout :
 *   [Header fixe — 52pt — SafeAreaView]
 *   [GameHUD — 40pt]
 *   [WikipediaWebView — flex:1 — contenu scrollable]
 *
 * Navigation (M-04) :
 *   - navigation.push('Game', { articleTitle }) — jamais navigate
 *   - isNavigating ref : anti-double-tap
 *   - isPlayableArticle : filtre les namespaces non jouables
 *   - Victoire : completeSession() + navigation.navigate('Victory') (Wave 4)
 *
 * Références :
 *   Story : docs/stories/M-03-article-content-display.md
 *   Story : docs/stories/M-04-article-navigation.md
 *   UX    : Benjamin — spécifications visuelles M-03 / M-04
 *
 * Conventions :
 *   - Export nommé
 *   - headerShown: false obligatoire sur la route Game
 *   - SafeAreaView avec edges={['top']} pour le header
 *   - StyleSheet.create() en bas du fichier
 */

import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Article } from '@wikihop/shared';
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { WebView } from 'react-native-webview';


import { GameHUD } from '../components/game/GameHUD';
import { WikipediaWebView } from '../components/game/WikipediaWebView';
import { useArticleContent } from '../hooks/useArticleContent';
import type { RootStackParamList } from '../navigation/RootNavigator';
import {
  WikipediaNetworkError,
  WikipediaNotFoundError,
  getArticleSummary,
  isPlayableArticle,
} from '../services/wikipedia.service';
import { useGameStore } from '../store/game.store';
import { useLanguageStore } from '../store/language.store';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ArticleScreenProps = NativeStackScreenProps<RootStackParamList, 'Game'>;

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

export function ArticleScreen({ route, navigation }: ArticleScreenProps): React.JSX.Element {
  const { articleTitle } = route.params;
  const lang = useLanguageStore((state) => state.language);

  // Store de session
  const currentSession = useGameStore((state) => state.currentSession);
  const addJump = useGameStore((state) => state.addJump);
  const completeSession = useGameStore((state) => state.completeSession);

  const jumps = currentSession?.jumps ?? 0;
  const targetTitle = currentSession?.targetArticle.title ?? '';

  // Article courant construit depuis le résumé
  const [currentArticle, setCurrentArticle] = useState<Article | null>(null);

  // Indicateur d'échec de getArticleSummary — évite le spinner infini (B2)
  const [summaryError, setSummaryError] = useState(false);

  // Compteur de retry résumé : son incrément retrigge le useEffect résumé (B2)
  const [summaryRetryCount, setSummaryRetryCount] = useState(0);

  // Contenu HTML via le hook
  const { state: contentState, retry } = useArticleContent(articleTitle, lang);

  // Ref WebView pour le scroll-to-top au focus (M-04)
  const webViewRef = useRef<WebView | null>(null);

  // Anti-double-tap (M-04)
  const isNavigating = useRef(false);

  // Animation skeleton
  const shimmerAnim = useRef(new Animated.Value(0.4)).current;

  const isFocused = useIsFocused();

  // ── Chargement du résumé pour construire l'Article complet ──────────────────
  // summaryRetryCount dans les deps : son incrément (via retrySummary) retrigge cet effet (B2)
  useEffect(() => {
    let cancelled = false;

    // Réinitialise l'erreur au début de chaque tentative
    setSummaryError(false);

    void (async () => {
      try {
        const summary = await getArticleSummary(articleTitle, lang);
        if (!cancelled) {
          setCurrentArticle(summary);
        }
      } catch {
        // Erreur résumé : on expose summaryError pour éviter le spinner infini (B2).
        // Si contentState.status === 'success' et summaryError === true,
        // l'écran d'erreur réseau standard sera affiché avec un bouton "Réessayer".
        if (!cancelled) {
          setSummaryError(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [articleTitle, lang, summaryRetryCount]);

  // ── Scroll to top quand l'écran reprend le focus (retour arrière) ────────────
  useEffect(() => {
    if (isFocused && webViewRef.current !== null) {
      webViewRef.current.injectJavaScript('window.scrollTo(0, 0); true;');
    }
  }, [isFocused]);

  // ── Animation shimmer skeleton ───────────────────────────────────────────────
  useEffect(() => {
    if (contentState.status !== 'loading') {
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
  }, [contentState.status, shimmerAnim]);

  // ── Annonce accessibilité quand l'article est chargé ────────────────────────
  useEffect(() => {
    if (contentState.status === 'success') {
      void AccessibilityInfo.announceForAccessibility(
        `Article ${articleTitle} chargé.`,
      );
    }
  }, [contentState.status, articleTitle]);

  // ── Handler de navigation inter-articles (M-04) ──────────────────────────────
  const handleLinkPress = useCallback(
    async (title: string): Promise<void> => {
      // Filtre les namespaces non jouables
      if (!isPlayableArticle(title)) {
        return;
      }

      // Anti-double-tap
      if (isNavigating.current) {
        return;
      }
      isNavigating.current = true;

      try {
        const article = await getArticleSummary(title, lang);

        // Enregistrement du saut dans le store.
        // addJump est protégé contre les appels post-victoire : le guard dans
        // game.store.ts vérifie que status === 'in_progress' avant toute mutation.
        // Si completeSession() a déjà été appelé (status === 'won'), addJump est un no-op.
        await addJump(article);

        // Annonce accessibilité après le saut
        void AccessibilityInfo.announceForAccessibility(
          `Saut effectué. ${jumps + 1} saut${jumps + 1 <= 1 ? '' : 's'} au total.`,
        );

        // Vérification de victoire
        if (
          currentSession !== null &&
          article.title.trim() === currentSession.targetArticle.title.trim()
        ) {
          await completeSession();
          // Wave 4 : navigation vers VictoryScreen (M-06)
          navigation.navigate('Victory');
          return;
        }

        // Navigation vers le nouvel article
        // push (pas navigate) : empile toujours un nouvel écran même si déjà dans le stack
        navigation.push('Game', { articleTitle: title });
      } catch (error: unknown) {
        if (error instanceof WikipediaNotFoundError) {
          Alert.alert(
            'Article introuvable',
            `"${title}" n'existe pas sur Wikipedia.`,
          );
        } else if (error instanceof WikipediaNetworkError) {
          Alert.alert(
            'Erreur réseau',
            'Impossible de charger cet article. Vérifiez votre connexion.',
          );
        } else {
          Alert.alert(
            'Erreur',
            'Une erreur inattendue s\'est produite.',
          );
        }
      } finally {
        isNavigating.current = false;
      }
    },
    [lang, addJump, completeSession, currentSession, jumps, navigation],
  );

  // ── Retry du chargement du résumé (B2) ───────────────────────────────────────
  // Incrémenter summaryRetryCount retrigge le useEffect résumé via ses deps.
  // currentArticle est remis à null pour afficher le spinner le temps du retry.
  const retrySummary = useCallback((): void => {
    setCurrentArticle(null);
    setSummaryRetryCount((c) => c + 1);
  }, []);

  // ── Rendu de la zone de contenu ──────────────────────────────────────────────
  function renderContent(): React.JSX.Element {
    switch (contentState.status) {
      case 'loading':
        return (
          <View
            style={styles.loadingContainer}
            accessibilityElementsHidden={true}
          >
            <SkeletonLoader shimmerAnim={shimmerAnim} />
          </View>
        );

      case 'success':
        // On n'affiche la WebView que quand le résumé est aussi disponible.
        // Si le résumé a échoué (summaryError), on affiche l'erreur réseau
        // avec un bouton "Réessayer" plutôt que de bloquer sur un spinner infini (B2).
        if (currentArticle === null) {
          if (summaryError) {
            return (
              <View style={styles.errorContainer}>
                <Text style={styles.errorTitle}>
                  {'Impossible de charger cet article.'}
                </Text>
                <Text style={styles.errorSubtext}>
                  {'Vérifiez votre connexion internet.'}
                </Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={retrySummary}
                  accessibilityLabel="Réessayer de charger l'article"
                  accessibilityRole="button"
                >
                  <Text style={styles.retryButtonText}>{'Réessayer'}</Text>
                </TouchableOpacity>
              </View>
            );
          }
          return (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563EB" />
            </View>
          );
        }
        return (
          <WikipediaWebView
            webViewRef={webViewRef}
            html={contentState.html}
            article={currentArticle}
            onWikiLinkPress={(title) => {
              void handleLinkPress(title);
            }}
          />
        );

      case 'not_found':
        return (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle} accessibilityRole="header">
              {'Article introuvable'}
            </Text>
            <Text style={styles.errorMessage}>
              {`"${contentState.title}" n'existe pas sur Wikipedia.`}
            </Text>
          </View>
        );

      case 'error':
        return (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>
              {'Impossible de charger cet article.'}
            </Text>
            <Text style={styles.errorSubtext}>
              {'Vérifiez votre connexion internet.'}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={retry}
              accessibilityLabel="Réessayer de charger l'article"
              accessibilityRole="button"
            >
              <Text style={styles.retryButtonText}>{'Réessayer'}</Text>
            </TouchableOpacity>
          </View>
        );
    }
  }

  const canGoBack = navigation.canGoBack();

  return (
    <View style={styles.screen}>
      {/* Header fixe avec SafeAreaView edges top */}
      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        <View style={styles.header}>
          {canGoBack ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => { navigation.goBack(); }}
              accessibilityLabel="Retour à l'article précédent"
              accessibilityRole="button"
            >
              <Text style={styles.backButtonText}>{'← Retour'}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backButtonPlaceholder} />
          )}
          <Text
            style={styles.headerTitle}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {articleTitle}
          </Text>
          {/* Espace à droite pour équilibrer le bouton retour */}
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>

      {/* HUD fixe */}
      <GameHUD jumps={jumps} targetTitle={targetTitle} />

      {/* Contenu WebView / loader / erreur */}
      <View style={styles.contentArea}>
        {renderContent()}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant skeleton interne
// ─────────────────────────────────────────────────────────────────────────────

interface SkeletonLoaderProps {
  shimmerAnim: Animated.Value;
}

function SkeletonLoader({ shimmerAnim }: SkeletonLoaderProps): React.JSX.Element {
  return (
    <View style={skeletonStyles.container}>
      <Animated.View style={[skeletonStyles.line, skeletonStyles.lineFullWidth, { opacity: shimmerAnim }]} />
      <Animated.View style={[skeletonStyles.line, skeletonStyles.line80, { opacity: shimmerAnim }]} />
      <Animated.View style={[skeletonStyles.line, skeletonStyles.line60, { opacity: shimmerAnim }]} />
      <View style={skeletonStyles.spacer} />
      <Animated.View style={[skeletonStyles.imageBlock, { opacity: shimmerAnim }]} />
      <Animated.View style={[skeletonStyles.line, skeletonStyles.lineFullWidth, { opacity: shimmerAnim }]} />
      <Animated.View style={[skeletonStyles.line, skeletonStyles.line80, { opacity: shimmerAnim }]} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerSafeArea: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2563EB',
  },
  backButtonPlaceholder: {
    width: 44,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'left',
    marginHorizontal: 8,
  },
  headerRight: {
    width: 44,
  },
  contentArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    padding: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorSubtext: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
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

const skeletonStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 16,
  },
  line: {
    height: 16,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginBottom: 10,
  },
  lineFullWidth: {
    width: '100%',
  },
  line80: {
    width: '80%',
  },
  line60: {
    width: '60%',
  },
  spacer: {
    height: 16,
  },
  imageBlock: {
    width: '100%',
    height: 120,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginBottom: 16,
  },
});
