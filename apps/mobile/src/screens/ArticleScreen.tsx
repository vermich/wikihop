/**
 * ArticleScreen — WikiHop Mobile — Réécriture WebView native
 *
 * Écran principal du jeu. Charge directement m.wikipedia.org dans la WebView.
 *
 * Architecture (F3-22 — retour arrière via navigation.goBack) :
 *   - La navigation inter-articles utilise navigation.push('Game', ...) empilant
 *     des instances successives de ArticleScreen dans le stack natif.
 *   - Le retour arrière utilise navigation.goBack() (React Navigation native-stack),
 *     ce qui dépile l'écran précédent sans compter de saut supplémentaire.
 *   - BackHandler Android : navigation.goBack() si canGoBack, sinon handleAbandon.
 *   - Le bouton "← Retour" dans le header est conditionné sur navigation.canGoBack().
 *
 * Layout :
 *   [Header fixe — 52pt — SafeAreaView]
 *   [GameHUD — 40pt]
 *   [WikipediaWebView — flex:1 — charge m.wikipedia.org directement]
 *
 * Références :
 *   Story : docs/stories/M-03-article-content-display.md
 *   Story : docs/stories/M-04-article-navigation.md
 *   Story : docs/stories/F3-22-fix-back-navigation.md
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

  const isFocused = useIsFocused();

  // ── Gestion des sauts et de la victoire ─────────────────────────────────────
  //
  // Appelé par WikipediaWebView quand l'utilisateur change de page (saut avant).
  // navigation.push empile une nouvelle instance de Game — le retour arrière
  // via navigation.goBack() dépile sans appeler handlePageChange (pas de saut).
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
  // F3-22 : utilise navigation.goBack() (React Navigation native-stack).
  // Le retour arrière dépile l'écran précédent sans compter de saut.
  // Si pas d'écran précédent dans le stack → proposer abandon.
  useEffect(() => {
    if (!isFocused) {
      return;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (navigation.canGoBack()) {
          navigation.goBack();
          return true;
        }
        // Premier écran du stack → proposer abandon de la partie
        handleAbandon();
        return true;
      },
    );

    return () => {
      subscription.remove();
    };
  }, [isFocused, navigation, handleAbandon]);

  // ── Rendu ────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.screen}>
      {/* Header fixe avec SafeAreaView edges top */}
      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        <View style={styles.header}>
          {/* F3-22 : bouton retour conditionné sur navigation.canGoBack() */}
          {navigation.canGoBack() ? (
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
