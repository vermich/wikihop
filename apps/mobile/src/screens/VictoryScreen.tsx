/**
 * VictoryScreen — WikiHop Mobile — Wave 4 (M-06)
 *
 * Écran de résultat affiché quand le joueur atteint l'article destination.
 *
 * Layout :
 *   [SafeAreaView top+bottom]
 *   ├── Header : "Victoire !" (vert #16A34A)
 *   ├── ScrollView (flex:1) :
 *   │   ├── Bloc stats animé (scale spring 0.8→1.0)
 *   │   │   ├── "Félicitations !"
 *   │   │   ├── Sauts + Durée (côte à côte)
 *   │   │   └── Départ → Destination
 *   │   ├── Section "Chemin parcouru"
 *   │   │   └── Liste ordonnée avec liens Wikipedia (Linking.openURL)
 *   │   └── Bouton "Lire [titre cible]"
 *   └── Zone sticky boutons :
 *       ├── [Rejouer] + [Nouvelle partie] (flex:1 chacun)
 *       └── [Retour]
 *
 * Guard d'entrée : status !== 'won' → navigation.replace('Home')
 *
 * Références :
 *   Story : docs/stories/M-06-victory-screen.md
 *   UX    : Benjamin — spécifications visuelles M-06
 *
 * Conventions :
 *   - Export nommé VictoryScreen
 *   - StyleSheet.create() en bas du fichier
 *   - Zéro any, TypeScript strict
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Article } from '@wikihop/shared';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RootStackParamList } from '../navigation/RootNavigator';
import { clearSummaryCache } from '../services/wikipedia.service';
import { useGameStore } from '../store/game.store';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type VictoryScreenProps = NativeStackScreenProps<RootStackParamList, 'Victory'>;

/** Résumé des stats affichées — calculé une seule fois depuis currentSession */
interface VictoryStats {
  jumps: number;
  elapsedSeconds: number;
  startTitle: string;
  targetTitle: string;
  path: ReadonlyArray<{ title: string; url: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fonctions pures utilitaires (exportées pour les tests)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcule le nombre de secondes écoulées entre deux dates.
 * @param startedAt - Date de début de session
 * @param completedAt - Date de fin de session
 */
export function computeElapsedSeconds(startedAt: Date, completedAt: Date): number {
  return Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000);
}

/**
 * Formate un nombre de secondes en chaîne lisible.
 * Exemples : 45 → "45 s" | 125 → "2 min 05 s"
 */
export function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0
    ? `${String(m)} min ${String(s).padStart(2, '0')} s`
    : `${String(s)} s`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal VictoryScreen
// ─────────────────────────────────────────────────────────────────────────────

export function VictoryScreen({ navigation }: VictoryScreenProps): React.JSX.Element {
  const currentSession = useGameStore((state) => state.currentSession);
  const clearSession = useGameStore((state) => state.clearSession);
  const startSession = useGameStore((state) => state.startSession);

  // ── Guard d'entrée — déclenché une seule fois au montage ──────────────────
  // Note : deps vides intentionnellement — on vérifie l'état au montage uniquement
  useEffect(() => {
    if (currentSession === null || currentSession.status !== 'won') {
      navigation.replace('Home');
    }
  // Intentionnellement vide : vérifie l'état de la session une seule fois au montage
  }, []);

  // ── Animation scale spring ───────────────────────────────────────────────
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Vérifier si reduce motion est actif — si oui, ne pas animer
    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (reduceMotion) {
        scaleAnim.setValue(1.0);
        return;
      }

      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
      }).start();
    });
  }, [scaleAnim]);

  // ── Calcul des stats via useMemo ─────────────────────────────────────────
  const stats = useMemo<VictoryStats | null>(() => {
    if (currentSession === null || currentSession.status !== 'won') {
      return null;
    }

    // Guard explicite sur completedAt — jamais de ! (non-null assertion interdite)
    if (currentSession.completedAt === undefined) {
      return null;
    }

    const elapsed = computeElapsedSeconds(currentSession.startedAt, currentSession.completedAt);

    return {
      jumps: currentSession.jumps,
      elapsedSeconds: elapsed,
      startTitle: currentSession.startArticle.title,
      targetTitle: currentSession.targetArticle.title,
      path: currentSession.path.map((article) => ({
        title: article.title,
        url: article.url,
      })),
    };
  }, [currentSession]);

  // ── Annonce accessibilité au montage ─────────────────────────────────────
  useEffect(() => {
    if (stats === null) return;

    void AccessibilityInfo.announceForAccessibility(
      `Victoire ! ${String(stats.jumps)} saut${stats.jumps <= 1 ? '' : 's'} en ${formatElapsed(stats.elapsedSeconds)}. De ${stats.startTitle} à ${stats.targetTitle}.`,
    );
  }, [stats]);

  // ── handleReplay : rejouer avec la même paire ────────────────────────────
  const handleReplay = useCallback(async (): Promise<void> => {
    if (currentSession === null) return;

    // Capture des articles avant clearSession (qui met currentSession à null)
    // Construction explicite Article — pas de spread
    const startArticle: Article = {
      id: currentSession.startArticle.id,
      title: currentSession.startArticle.title,
      url: currentSession.startArticle.url,
      language: currentSession.startArticle.language,
    };
    const targetArticle: Article = {
      id: currentSession.targetArticle.id,
      title: currentSession.targetArticle.title,
      url: currentSession.targetArticle.url,
      language: currentSession.targetArticle.language,
    };

    await clearSession();
    await startSession(startArticle, targetArticle);

    // replace (pas push ni navigate) — évite d'empiler Victory sous Game
    navigation.replace('Game', { articleTitle: startArticle.title });
  }, [currentSession, clearSession, startSession, navigation]);

  // ── handleNewGame : nouvelle partie, retour à l'accueil ─────────────────
  const handleNewGame = useCallback((): void => {
    void clearSession();
    clearSummaryCache();
    // navigate (pas replace) — Home est déjà dans le stack
    navigation.navigate('Home');
  }, [clearSession, navigation]);

  // ── handleBack : retour sans reset de session ────────────────────────────
  const handleBack = useCallback((): void => {
    // On ne clearSession pas — la session reste en mémoire (status: 'won')
    // Le dialog de session résiduelle dans HomeScreen ne se déclenche que
    // pour status 'in_progress', donc aucun dialog ne s'affichera
    navigation.navigate('Home');
  }, [navigation]);

  // ── handleReadArticle : ouvrir l'article destination dans le navigateur ──
  const handleReadArticle = useCallback((): void => {
    if (currentSession === null) return;
    void Linking.openURL(currentSession.targetArticle.url);
  }, [currentSession]);

  // ── Si guard redirige (stats null) — ne rien afficher ───────────────────
  if (stats === null) {
    return <View style={styles.screen} />;
  }

  // ── Titre tronqué pour le bouton "Lire" ──────────────────────────────────
  const truncatedTargetTitle =
    stats.targetTitle.length > 20
      ? `${stats.targetTitle.slice(0, 20)}…`
      : stats.targetTitle;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text
          style={styles.headerTitle}
          accessibilityRole="header"
        >
          {'Victoire !'}
        </Text>
      </View>
      <View style={styles.headerSeparator} />

      {/* ScrollView — contenu scrollable */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Bloc stats animé */}
        <Animated.View
          style={[styles.statsBlock, { transform: [{ scale: scaleAnim }] }]}
          accessible={true}
          accessibilityLabel={`${String(stats.jumps)} saut${stats.jumps <= 1 ? '' : 's'} effectué${stats.jumps <= 1 ? '' : 's'} en ${formatElapsed(stats.elapsedSeconds)}. De ${stats.startTitle} vers ${stats.targetTitle}.`}
        >
          {/* Sous-éléments accessibles={false} pour éviter la double lecture */}
          <View style={styles.congratsRow} accessible={false}>
            <Text style={styles.checkIcon}>{'✓'}</Text>
            <Text style={styles.congratsText}>{'Félicitations !'}</Text>
          </View>
          <View style={styles.statsRow} accessible={false}>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{String(stats.jumps)}</Text>
              <Text style={styles.statLabel}>
                {stats.jumps <= 1 ? 'saut' : 'sauts'}
              </Text>
            </View>
            <View style={styles.statSeparator} />
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{formatElapsed(stats.elapsedSeconds)}</Text>
              <Text style={styles.statLabel}>{'durée'}</Text>
            </View>
          </View>
          <Text
            style={styles.pathSummary}
            numberOfLines={1}
            ellipsizeMode="middle"
            accessible={false}
          >
            {`${stats.startTitle}  →  ${stats.targetTitle}`}
          </Text>
        </Animated.View>

        {/* Section chemin parcouru */}
        <View style={styles.pathSection}>
          <View style={styles.pathTitleRow}>
            <View style={styles.pathTitleLine} />
            <Text style={styles.pathTitleText}>{'CHEMIN PARCOURU'}</Text>
            <View style={styles.pathTitleLine} />
          </View>

          {stats.path.map((article, index) => {
            const isLast = index === stats.path.length - 1;
            const itemNumber = index + 1;
            const a11yLabel = isLast
              ? `${String(itemNumber)}. ${article.title}, article de destination. Voir sur Wikipedia`
              : `${String(itemNumber)}. ${article.title}. Voir sur Wikipedia`;

            return (
              <View key={`${article.title}-${String(index)}`}>
                <TouchableOpacity
                  style={styles.pathItem}
                  onPress={() => { void Linking.openURL(article.url); }}
                  accessibilityLabel={a11yLabel}
                  accessibilityRole="link"
                >
                  <Text style={styles.pathItemNumber}>{`${String(itemNumber)}.`}</Text>
                  <Text
                    style={[styles.pathItemTitle, isLast && styles.pathItemTitleLast]}
                    numberOfLines={1}
                  >
                    {article.title}
                  </Text>
                  <Text style={styles.pathItemIcon}>{'↗'}</Text>
                </TouchableOpacity>
                {!isLast && <View style={styles.pathItemSeparator} />}
              </View>
            );
          })}
        </View>

        {/* Séparateur */}
        <View style={styles.sectionSeparator} />

        {/* Bouton "Lire [titre cible]" */}
        <TouchableOpacity
          style={styles.readButton}
          onPress={handleReadArticle}
          accessibilityLabel={`Lire l'article ${stats.targetTitle} sur Wikipedia`}
          accessibilityRole="button"
        >
          <Text style={styles.readButtonText}>{`Lire "${truncatedTargetTitle}"`}</Text>
          <Text style={styles.readButtonIcon}>{'↗'}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Zone boutons sticky */}
      <View style={styles.stickyButtons}>
        <View style={styles.primaryButtonsRow}>
          <TouchableOpacity
            style={[styles.primaryButton, styles.replayButton]}
            onPress={() => { void handleReplay(); }}
            accessibilityLabel="Rejouer avec les mêmes articles"
            accessibilityRole="button"
          >
            <Text style={styles.replayButtonText}>{'Rejouer'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, styles.newGameButton]}
            onPress={handleNewGame}
            accessibilityLabel="Démarrer une nouvelle partie"
            accessibilityRole="button"
          >
            <Text style={styles.newGameButtonText}>{'Nouvelle partie'}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          accessibilityLabel="Retourner à l'accueil"
          accessibilityRole="button"
        >
          <Text style={styles.backButtonText}>{'Retour'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
  header: {
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#16A34A',
    textAlign: 'center',
  },
  headerSeparator: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  statsBlock: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  congratsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkIcon: {
    fontSize: 20,
    color: '#16A34A',
    marginRight: 8,
  },
  congratsText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#16A34A',
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  statSeparator: {
    width: 1,
    backgroundColor: '#E2E8F0',
  },
  pathSummary: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  pathSection: {
    marginBottom: 16,
  },
  pathTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginVertical: 16,
  },
  pathTitleLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  pathTitleText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 1,
    marginHorizontal: 8,
    textTransform: 'uppercase',
  },
  pathItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  pathItemNumber: {
    fontSize: 14,
    color: '#64748B',
    minWidth: 24,
    textAlign: 'right',
    marginRight: 12,
  },
  pathItemTitle: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
  },
  pathItemTitleLast: {
    fontWeight: 'bold',
    color: '#16A34A',
  },
  pathItemIcon: {
    fontSize: 16,
    color: '#2563EB',
    marginLeft: 8,
  },
  pathItemSeparator: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 52,
  },
  sectionSeparator: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: 16,
  },
  readButton: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  readButtonText: {
    fontSize: 16,
    color: '#2563EB',
    marginRight: 8,
  },
  readButtonIcon: {
    fontSize: 16,
    color: '#2563EB',
  },
  stickyButtons: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  primaryButtonsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  primaryButton: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  replayButton: {
    backgroundColor: '#2563EB',
    marginRight: 8,
  },
  replayButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  newGameButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2563EB',
    marginLeft: 8,
  },
  newGameButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  backButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#64748B',
  },
});
