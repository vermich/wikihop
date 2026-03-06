/**
 * ArticleScreen — WikiHop Mobile — Réécriture WebView native
 *
 * Écran principal du jeu. Charge directement m.wikipedia.org dans la WebView.
 *
 * Nouvelle architecture (réécriture WebView native) :
 *   - Plus de fetch HTML custom : la WebView charge l'URL Wikipedia mobile directement
 *   - Plus de postMessage : la navigation est détectée via onNavigationStateChange
 *   - Chaque changement de page (aller ET retour) = +1 saut via addJump
 *   - La victoire est vérifiée dans handlePageChange via titlesMatch
 *   - BackHandler Android : webViewRef.current.goBack() → déclenche onNavigationStateChange
 *     → compte comme saut. Si webView ne peut pas reculer → Alert abandon → HomeScreen
 *
 * Layout :
 *   [Header fixe — 52pt — SafeAreaView]
 *   [GameHUD — 40pt]
 *   [WikipediaWebView — flex:1 — charge m.wikipedia.org directement]
 *
 * Références :
 *   Story : docs/stories/M-03-article-content-display.md
 *   Story : docs/stories/M-04-article-navigation.md
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

  const jumps = currentSession?.jumps ?? 0;
  const targetTitle = currentSession?.targetArticle.title ?? '';
  const targetArticle = currentSession?.targetArticle ?? null;

  // Titre de l'article actuellement affiché dans la WebView
  // (peut diverger de articleTitle si l'utilisateur navigue en avant/arrière)
  const [currentTitle, setCurrentTitle] = useState(articleTitle);

  // Ref WebView pour le BackHandler Android
  const webViewRef = useRef<WebView | null>(null);

  // canGoBack WebView pour le BackHandler Android
  const [webViewCanGoBack, setWebViewCanGoBack] = useState(false);

  // Erreur WebView
  const [webViewError, setWebViewError] = useState<string | null>(null);

  const isFocused = useIsFocused();

  // ── Gestion des sauts et de la victoire ─────────────────────────────────────
  //
  // Appelé par WikipediaWebView quand l'utilisateur change de page.
  // Chaque changement de page = +1 saut (aller ET retour).
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

  // ── Wrapper non-async pour onPageChange (prop de WikipediaWebView) ───────────
  const handlePageChangeSync = useCallback(
    (newTitle: string): void => {
      void handlePageChange(newTitle);
    },
    [handlePageChange],
  );

  // ── onNavigationStateChange pour suivre canGoBack ────────────────────────────
  const handleNavigationStateChange = useCallback(
    (navState: { canGoBack: boolean; url: string }): void => {
      setWebViewCanGoBack(navState.canGoBack);
    },
    [],
  );

  // ── BackHandler Android ──────────────────────────────────────────────────────
  //
  // Avec la nouvelle approche (URL directe), le BackHandler navigue dans l'historique
  // WebView. La navigation arrière déclenche onNavigationStateChange → onPageChange
  // → +1 saut. Si la WebView ne peut pas reculer, on propose d'abandonner.
  useEffect(() => {
    if (!isFocused) {
      return;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (webViewCanGoBack && webViewRef.current !== null) {
          webViewRef.current.goBack();
          return true;
        }
        // WebView ne peut pas reculer → proposer abandon ou laisser RN gérer
        if (navigation.canGoBack()) {
          return false;
        }
        // Premier écran du stack → proposer abandon de la partie
        Alert.alert(
          'Quitter la partie ?',
          'Votre progression sera perdue.',
          [
            { text: 'Continuer à jouer', style: 'cancel' },
            {
              text: 'Quitter',
              style: 'destructive',
              onPress: () => { navigation.navigate('Home'); },
            },
          ],
        );
        return true;
      },
    );

    return () => {
      subscription.remove();
    };
  }, [isFocused, webViewCanGoBack, navigation]);

  // ── Rendu ────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.screen}>
      {/* Header fixe avec SafeAreaView edges top */}
      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        <View style={styles.header}>
          {webViewCanGoBack ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                if (webViewRef.current !== null) {
                  webViewRef.current.goBack();
                }
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
          {/* Espace à droite pour équilibrer le bouton retour */}
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>

      {/* HUD fixe */}
      <GameHUD jumps={jumps} targetTitle={targetTitle} />

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
            webViewRef={webViewRef}
            onError={(error) => { setWebViewError(error); }}
            onNavigationStateChange={handleNavigationStateChange}
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
  headerRight: {
    width: 44,
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
