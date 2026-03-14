/**
 * ArticleScreen — WikiHop Mobile — Fix retour arrière WebView (F3-27)
 *
 * Écran principal du jeu. Charge directement m.wikipedia.org dans la WebView.
 *
 * Architecture (F3-27 — single-screen WebView avec goBack interne) :
 *   - Il n'y a qu'une seule instance de ArticleScreen dans le stack natif.
 *   - Toute la navigation Wikipedia se passe à l'intérieur de la WebView via
 *     onNavigationStateChange (pas de navigation.push entre articles).
 *   - Le retour arrière utilise webViewRef.current?.goBack() (API native WebView),
 *     distingué d'un saut forward via le flag isBackNavigation.
 *   - BackHandler Android : goBack() si webViewCanGoBack, sinon handleAbandon.
 *   - Le bouton "← Retour" dans le header est conditionné sur webViewCanGoBack.
 *
 * Layout :
 *   [Header fixe — 52pt — SafeAreaView]
 *   [GameHUD — 40pt]
 *   [WikipediaWebView — flex:1 — charge m.wikipedia.org directement]
 *
 * Références :
 *   Story : docs/stories/M-03-article-content-display.md
 *   Story : docs/stories/M-04-article-navigation.md
 *   Story : docs/stories/F3-27-fix-back-navigation-webview.md
 *
 * Conventions :
 *   - Export nommé
 *   - headerShown: false obligatoire sur la route Game
 *   - SafeAreaView avec edges={['top']} pour le header
 *   - StyleSheet.create() en bas du fichier
 */

import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  BackHandler,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { WebView } from 'react-native-webview';

import { GameHUD } from '../components/game/GameHUD';
import {
  WikipediaWebView,
  titlesMatch,
} from '../components/game/WikipediaWebView';
import type { RootStackParamList } from '../navigation/RootNavigator';
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
  const abandonSession = useGameStore((state) => state.abandonSession);

  const jumps = currentSession?.jumps ?? 0;
  const targetTitle = currentSession?.targetArticle.title ?? '';
  const targetArticle = currentSession?.targetArticle ?? null;

  // Titre de l'article actuellement affiché dans la WebView
  // (peut diverger de articleTitle si l'utilisateur navigue via des redirections)
  const [currentTitle, setCurrentTitle] = useState(articleTitle);

  // Erreur WebView
  const [webViewError, setWebViewError] = useState<string | null>(null);

  // Ref vers la WebView native — permet goBack() depuis le BackHandler et le bouton header
  const webViewRef = useRef<WebView>(null);

  // Suit canGoBack de la WebView (remplace navigation.canGoBack() pour le retour intra-partie)
  const [webViewCanGoBack, setWebViewCanGoBack] = useState(false);

  // Flag interne : distingue un retour arrière (goBack) d'un saut forward
  // true pendant le cycle : goBack() appelé → handlePageChangeSync reçu
  const isBackNavigation = useRef(false);

  const isFocused = useIsFocused();

  // ── Callback onNavigationStateChange pour la WebView ─────────────────────
  const handleNavStateChange = useCallback(
    (navState: { canGoBack: boolean; url: string }): void => {
      setWebViewCanGoBack(navState.canGoBack);
    },
    [],
  );

  // ── Gestion des sauts et de la victoire ─────────────────────────────────────
  const handlePageChange = useCallback(
    async (newTitle: string): Promise<void> => {
      // Mise à jour du titre courant
      setCurrentTitle(newTitle);

      // Trouver l'article dans le path existant ou construire un Article minimal
      // addJump accepte un Article complet — on construit un objet minimal conforme au type
      const article = {
        id: newTitle,
        title: newTitle,
        url: `https://${lang}.m.wikipedia.org/wiki/${encodeURIComponent(newTitle)}`,
        language: lang,
      };

      await addJump(article);

      // Vérification de la victoire
      if (
        targetArticle !== null &&
        titlesMatch(newTitle, targetArticle.title)
      ) {
        await completeSession();
        navigation.navigate('Victory');
      }
    },
    [lang, addJump, completeSession, targetArticle, navigation],
  );

  // ── Wrapper non-async pour onPageChange ─────────────────────────────────────
  // F3-27 : intercepte les retours arrière pour ne pas comptabiliser de saut
  const handlePageChangeSync = useCallback(
    (newTitle: string): void => {
      // Si c'est un retour arrière, on met seulement à jour le titre affiché
      // et on reset le flag — on NE compte PAS de saut, on N'appelle PAS addJump
      if (isBackNavigation.current) {
        isBackNavigation.current = false;
        setCurrentTitle(newTitle);
        return;
      }
      // Forward navigation : comportement inchangé
      void handlePageChange(newTitle);
    },
    [handlePageChange],
  );

  // ── handleAbandon : confirmation abandon + navigate Home ─────────────────────
  const handleAbandon = useCallback((): void => {
    Alert.alert(
      'Abandonner la partie ?',
      'Votre progression sera perdue.',
      [
        { text: 'Reprendre', style: 'cancel' },
        {
          text: 'Confirmer',
          style: 'destructive',
          onPress: () => {
            void abandonSession().then(() => { navigation.navigate('Home'); });
          },
        },
      ],
    );
  }, [abandonSession, navigation]);

  // ── BackHandler Android ──────────────────────────────────────────────────────
  //
  // F3-27 : utilise webViewRef.current?.goBack() si la WebView peut reculer,
  // sinon propose l'abandon. Le flag isBackNavigation distingue le retour
  // arrière d'un saut forward dans handlePageChangeSync.
  useEffect(() => {
    if (!isFocused) {
      return;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (webViewCanGoBack) {
          isBackNavigation.current = true;
          webViewRef.current?.goBack();
          return true;
        }
        // WebView ne peut plus reculer → proposer abandon de la partie
        handleAbandon();
        return true;
      },
    );

    return () => {
      subscription.remove();
    };
  }, [isFocused, webViewCanGoBack, handleAbandon]);

  // ── Rendu ────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.screen}>
      {/* Header fixe avec SafeAreaView edges top */}
      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        <View style={styles.header}>
          {/* F3-27 : bouton retour conditionné sur webViewCanGoBack */}
          {webViewCanGoBack ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                isBackNavigation.current = true;
                webViewRef.current?.goBack();
              }}
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
            {currentTitle}
          </Text>
          <TouchableOpacity
            style={styles.homeButton}
            onPress={handleAbandon}
            accessibilityLabel="Abandonner la partie"
            accessibilityRole="button"
          >
            <Text style={styles.homeButtonText}>{'Abandonner'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* HUD fixe */}
      <GameHUD
        jumps={jumps}
        targetTitle={targetTitle}
        isHardMode={currentSession?.difficulty === 'hard'}
      />

      {/* Contenu WebView */}
      <View style={styles.contentArea}>
        {webViewError !== null ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>
              {'Impossible de charger cet article.'}
            </Text>
            <Text style={styles.errorSubtext}>
              {'Vérifiez votre connexion internet.'}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setWebViewError(null);
                setCurrentTitle(articleTitle);
              }}
              accessibilityLabel="Réessayer de charger l'article"
              accessibilityRole="button"
            >
              <Text style={styles.retryButtonText}>{'Réessayer'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <WikipediaWebView
            currentTitle={currentTitle}
            lang={lang}
            onPageChange={handlePageChangeSync}
            onError={(error) => { setWebViewError(error); }}
            webViewRef={webViewRef}
            onNavigationStateChange={handleNavStateChange}
          />
        )}
      </View>
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
  homeButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  homeButtonText: {
    fontSize: 16,
    color: '#2563EB',
  },
  contentArea: {
    flex: 1,
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
