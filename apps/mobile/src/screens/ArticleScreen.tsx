/**
 * ArticleScreen — WikiHop Mobile — Hotfix boucle de sauts (F3-34)
 *
 * Écran principal du jeu. Charge directement m.wikipedia.org dans la WebView.
 *
 * Architecture (F3-34 — single-screen WebView avec stack applicatif) :
 *   - Il n'y a qu'une seule instance de ArticleScreen dans le stack natif.
 *   - Toute la navigation Wikipedia se passe à l'intérieur de la WebView via
 *     onPageChange (callback WikipediaWebView).
 *   - Deux états distincts pour éviter la boucle de rechargement :
 *       webViewSource : pilote la source de WikipediaWebView — change UNIQUEMENT
 *         lors d'un retour arrière (handleGoBack). La WebView navigue elle-même
 *         en interne pour les sauts forward (tap de liens) → pas de rechargement.
 *       currentTitle : titre affiché dans le header — mis à jour à chaque article.
 *         Ne pilote PAS la source WebView → aucun rechargement sur forward nav.
 *   - isBackNavigation flag distingue le rechargement depuis le stack d'un saut forward.
 *   - BackHandler Android : handleGoBack() si stackSize > 1, sinon handleAbandon.
 *   - Le bouton "← Retour" dans le header est conditionné sur stackSize > 1.
 *
 * Pourquoi deux états ?
 *   Avant ce fix, un seul état `currentTitle` pilotait à la fois le header ET la source
 *   WebView. Lors d'un saut forward : setStackSize() (sync) + setCurrentTitle() (async
 *   via handlePageChange) produisaient un render intermédiaire avec stackSize=2 mais
 *   currentTitle=ancienArticle → WebView rechargeait l'ancien article → boucle de sauts.
 *
 * Layout :
 *   [Header fixe — 52pt — SafeAreaView]
 *   [GameHUD — 40pt]
 *   [WikipediaWebView — flex:1 — charge m.wikipedia.org directement]
 *
 * Références :
 *   Story : docs/stories/M-03-article-content-display.md
 *   Story : docs/stories/M-04-article-navigation.md
 *   Story : docs/stories/F3-34-fix-back-navigation-webview.md
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

  /**
   * Source de la WebView — ne change QUE pour le retour arrière (handleGoBack).
   * La WebView navigue elle-même en interne pour les sauts forward (tap de liens).
   * Changer cette valeur déclenche un rechargement complet de la page.
   */
  const [webViewSource, setWebViewSource] = useState(articleTitle);

  /**
   * Titre affiché dans le header — mis à jour à chaque article visité.
   * NE pilote PAS la source WebView → pas de rechargement sur forward nav.
   */
  const [currentTitle, setCurrentTitle] = useState(articleTitle);

  // Erreur WebView
  const [webViewError, setWebViewError] = useState<string | null>(null);

  // Stack applicatif des titres visités — bypass de l'historique interne WebView
  // articleTitle (param route) est toujours le titre initial → stack jamais vide
  const articleStack = useRef<string[]>([articleTitle]);

  // stackSize déclenche les re-renders quand le stack change
  // (articleStack est une ref, pas un state — pas de re-render automatique)
  const [stackSize, setStackSize] = useState(1);

  // Flag interne : distingue un retour arrière (pop stack) d'un saut forward
  // true pendant le cycle : handleGoBack() appelé → handlePageChangeSync reçu
  const isBackNavigation = useRef(false);

  const isFocused = useIsFocused();

  // ── Gestion des sauts et de la victoire ─────────────────────────────────────
  // setCurrentTitle est géré dans handlePageChangeSync (call synchrone)
  // pour éviter le render intermédiaire qui causait la boucle de rechargement.
  const handlePageChange = useCallback(
    async (newTitle: string): Promise<void> => {
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
  // F3-34 hotfix : intercepte les retours arrière et batch les mises à jour d'état.
  //
  // Forward nav : setCurrentTitle + push stack + setStackSize dans le MÊME call
  // synchrone → React les batch en un seul render → plus de render intermédiaire
  // avec stackSize=N mais webViewSource=ancienArticle → plus de boucle de rechargement.
  //
  // Back nav : isBackNavigation=true → reset flag + setCurrentTitle (header) uniquement.
  // webViewSource a déjà été mis à jour par handleGoBack → pas de double rechargement.
  const handlePageChangeSync = useCallback(
    (newTitle: string): void => {
      if (isBackNavigation.current) {
        // Retour arrière : mettre à jour le titre affiché seulement
        // Ne PAS compter de saut, ne PAS appeler addJump
        // webViewSource déjà mis à jour par handleGoBack
        isBackNavigation.current = false;
        setCurrentTitle(newTitle);
        return;
      }
      // Forward navigation :
      // setCurrentTitle, push stack et setStackSize dans le même call synchrone
      // → React les batch → un seul render → webViewSource inchangé → pas de rechargement
      setCurrentTitle(newTitle);
      articleStack.current.push(newTitle);
      setStackSize(articleStack.current.length);
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

  // ── handleGoBack — retour vers l'article précédent via le stack applicatif ────
  const handleGoBack = useCallback((): void => {
    if (articleStack.current.length <= 1) {
      handleAbandon();
      return;
    }
    // Pop le titre courant
    articleStack.current.pop();
    const prevTitle = articleStack.current[articleStack.current.length - 1];
    if (prevTitle === undefined) {
      // Cas défensif (ne devrait pas arriver — le stack a toujours articleTitle)
      handleAbandon();
      return;
    }
    // Signaler que le prochain onPageChange est un retour arrière (pas un saut)
    isBackNavigation.current = true;
    // setWebViewSource : déclenche le rechargement WebView vers l'article précédent
    // setCurrentTitle : met à jour le header immédiatement (même render)
    // setStackSize : met à jour le compteur de stack (même render)
    // Les trois setState dans le même call synchrone → un seul render
    setWebViewSource(prevTitle);
    setCurrentTitle(prevTitle);
    setStackSize(articleStack.current.length);
  }, [handleAbandon]);

  // ── BackHandler Android ──────────────────────────────────────────────────────
  //
  // F3-34 : utilise le stack applicatif (stackSize) au lieu de webViewCanGoBack.
  // handleGoBack() si stackSize > 1, sinon propose l'abandon.
  useEffect(() => {
    if (!isFocused) {
      return;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (stackSize > 1) {
          handleGoBack();
          return true;
        }
        // Stack vide (article initial) → proposer abandon de la partie
        handleAbandon();
        return true;
      },
    );

    return () => {
      subscription.remove();
    };
  }, [isFocused, stackSize, handleGoBack, handleAbandon]);

  // ── Rendu ────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.screen}>
      {/* Header fixe avec SafeAreaView edges top */}
      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        <View style={styles.header}>
          {/* F3-34 : bouton retour conditionné sur stackSize > 1 */}
          {stackSize > 1 ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleGoBack}
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
            testID="abandon-button"
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
                setWebViewSource(articleTitle);
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
            currentTitle={webViewSource}
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
