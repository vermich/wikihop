/**
 * MultiplayerSetupScreen — WikiHop Mobile — Multijoueur local (F3-12, mod. F3-32)
 *
 * Écran de configuration d'une session multijoueur hot-seat.
 * F3-32 : remplace le bloc paire unique par N slots PairSlot indépendants —
 * un par manche configurée. Toutes les paires sont préchargées avant de commencer.
 *
 * Layout :
 *   [SafeAreaView top+bottom]
 *   ├── Header 64pt : bouton "←" gauche + titre "Multijoueur" centré
 *   ├── KeyboardAvoidingView
 *   │   └── ScrollView
 *   │       ├── Label "JOUEURS"
 *   │       ├── Liste PlayerRows
 *   │       ├── Bouton "+ Ajouter un joueur" (disabled si 6 joueurs)
 *   │       ├── Label "MANCHES" + stepper
 *   │       ├── Label "PAIRES" + N PairSlots (un par manche)
 *   │       └── Message chargement (si paires en loading)
 *   └── Zone bouton fixe bas : "Commencer" (disabled si config invalide)
 *
 * isStartDisabled si : noms vides OU < 2 joueurs OU au moins une paire non ready.
 *
 * Conventions :
 *   - Export nommé MultiplayerSetupScreen
 *   - StyleSheet.create() en bas du fichier
 *   - Zéro any, TypeScript strict
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ArticleSummary } from '@wikihop/shared';

import { useRefreshablePair } from '../hooks/useRefreshablePair';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useGameStore } from '../store/game.store';
import { useMultiplayerStore } from '../store/multiplayer.store';
import { validatePlayerNames } from '../utils/multiplayer.utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type MultiplayerSetupScreenProps = NativeStackScreenProps<RootStackParamList, 'MultiplayerSetup'>;

interface PlayerEntry {
  id: string;
  name: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant PlayerRow (interne)
// ─────────────────────────────────────────────────────────────────────────────

interface PlayerRowProps {
  index: number;
  name: string;
  onChangeName: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
  inputRef?: React.RefObject<TextInput | null>;
  nextInputRef?: React.RefObject<TextInput | null>;
}

function PlayerRow({
  index,
  name,
  onChangeName,
  onRemove,
  canRemove,
  inputRef,
  nextInputRef,
}: PlayerRowProps): React.JSX.Element {
  const number = index + 1;
  return (
    <View style={styles.playerRow}>
      <Text style={styles.playerRowIcon} accessible={false}>{'👤'}</Text>
      <TextInput
        ref={inputRef}
        style={styles.playerInput}
        value={name}
        onChangeText={(value) => { onChangeName(index, value); }}
        placeholder="Prénom du joueur"
        placeholderTextColor="#94A3B8"
        maxLength={20}
        returnKeyType={nextInputRef !== undefined ? 'next' : 'done'}
        onSubmitEditing={() => { nextInputRef?.current?.focus(); }}
        accessibilityLabel={`Nom du joueur ${String(number)}`}
      />
      <TouchableOpacity
        style={[styles.removeButton, !canRemove && styles.removeButtonDisabled]}
        onPress={() => { onRemove(index); }}
        disabled={!canRemove}
        accessibilityLabel={`Supprimer le joueur ${String(number)}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canRemove }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={[styles.removeButtonText, !canRemove && styles.removeButtonTextDisabled]}>
          {'✕'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant PairSlot (interne) — F3-32
// ─────────────────────────────────────────────────────────────────────────────

interface PairSlotProps {
  /** Numéro de manche affiché (1-indexed) */
  roundNumber: number;
  /** Index dans le tableau de paires (0-indexed) */
  roundIndex: number;
  /** Callback appelé quand la paire se charge avec succès */
  onPairReady: (roundIndex: number, start: ArticleSummary, target: ArticleSummary) => void;
  /** Callback appelé quand la paire passe en loading ou error */
  onPairNotReady: (roundIndex: number) => void;
}

function PairSlot({
  roundNumber,
  roundIndex,
  onPairReady,
  onPairNotReady,
}: PairSlotProps): React.JSX.Element {
  const { state, refresh } = useRefreshablePair();

  // Notifier le parent selon l'état de la paire
  useEffect(() => {
    if (state.status === 'success') {
      onPairReady(roundIndex, state.start, state.target);
      void AccessibilityInfo.announceForAccessibility(
        `Manche ${String(roundNumber)} : paire chargée. De ${state.start.title}, vers ${state.target.title}.`,
      );
    } else {
      onPairNotReady(roundIndex);
      if (state.status === 'error') {
        void AccessibilityInfo.announceForAccessibility(
          `Manche ${String(roundNumber)} : erreur de chargement.`,
        );
      }
    }
  // Dépendance sur state.status uniquement — les callbacks (onPairReady/onPairNotReady)
  // sont stables (useCallback). state.start/target ne changent que si status change.
  // eslint-plugin-react-hooks non installé dans ce projet.
  }, [state.status]);

  return (
    <View style={styles.pairSlotWrapper}>
      {/* Label MANCHE N — en dehors du ContainerBloc */}
      <Text style={styles.pairSlotLabel}>{`MANCHE ${String(roundNumber)}`}</Text>

      {/* ContainerBloc — fond différent selon état pour conformité contraste */}
      <View style={[
        styles.pairSlotContainer,
        state.status === 'error' && styles.pairSlotContainerError,
      ]}>
        {state.status === 'loading' && (
          <>
            <View
              style={[styles.skeletonLine, styles.skeletonLineWide]}
              accessibilityElementsHidden={true}
            />
            <View
              style={[styles.skeletonLine, styles.skeletonLineNarrow]}
              accessibilityElementsHidden={true}
            />
          </>
        )}

        {state.status === 'error' && (
          <>
            <Text style={styles.pairErrorText}>
              {'Impossible de charger la paire. Vérifiez votre connexion.'}
            </Text>
            <TouchableOpacity
              style={styles.renewButton}
              onPress={refresh}
              accessibilityLabel={`Réessayer de charger la paire de la manche ${String(roundNumber)}`}
              accessibilityRole="button"
              hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
            >
              <Text style={styles.renewButtonText}>{'Réessayer'}</Text>
            </TouchableOpacity>
          </>
        )}

        {state.status === 'success' && (
          <>
            <Text style={styles.pairArticleRow} numberOfLines={2}>
              <Text style={styles.pairArticleRowLabel}>{'De : '}</Text>
              <Text style={styles.pairArticleTitle}>{state.start.title}</Text>
            </Text>
            <Text style={[styles.pairArticleRow, styles.pairArticleRowVers]} numberOfLines={2}>
              <Text style={styles.pairArticleRowLabel}>{'Vers : '}</Text>
              <Text style={styles.pairArticleTitle}>{state.target.title}</Text>
            </Text>
            <TouchableOpacity
              style={styles.renewButton}
              onPress={refresh}
              accessibilityLabel={`Renouveler la paire de la manche ${String(roundNumber)}`}
              accessibilityRole="button"
              hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
            >
              <Text style={styles.renewButtonText}>{'⟳  Renouveler'}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

export function MultiplayerSetupScreen({ navigation }: MultiplayerSetupScreenProps): React.JSX.Element {
  const [players, setPlayers] = useState<PlayerEntry[]>([
    { id: '1', name: '' },
    { id: '2', name: '' },
  ]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [roundCount, setRoundCount] = useState(1);

  // Tableau de paires prêtes — index = roundIndex, valeur = paire ou null
  const [readyPairs, setReadyPairs] = useState<
    Array<{ start: ArticleSummary; target: ArticleSummary } | null>
  >([null]);

  const setupSession = useMultiplayerStore((s) => s.setupSession);
  const clearSession = useGameStore((s) => s.clearSession);
  const startSession = useGameStore((s) => s.startSession);

  // Refs pour le focus clavier entre inputs
  const inputRefs = useRef<Array<React.RefObject<TextInput | null>>>(
    Array.from({ length: 6 }, () => React.createRef<TextInput | null>()),
  );

  // ── Callbacks paires ─────────────────────────────────────────────────────────

  const handlePairReady = useCallback(
    (roundIndex: number, start: ArticleSummary, target: ArticleSummary): void => {
      setReadyPairs((prev) => {
        const updated = [...prev];
        updated[roundIndex] = { start, target };
        return updated;
      });
    },
    [],
  );

  const handlePairNotReady = useCallback((roundIndex: number): void => {
    setReadyPairs((prev) => {
      const updated = [...prev];
      updated[roundIndex] = null;
      return updated;
    });
  }, []);

  // ── Synchronisation readyPairs quand roundCount change ──────────────────────

  useEffect(() => {
    setReadyPairs((prev) => {
      if (roundCount > prev.length) {
        // Ajout de slots — nouveaux slots démarrent null
        const extra = Array.from({ length: roundCount - prev.length }, () => null);
        return [...prev, ...extra];
      }
      if (roundCount < prev.length) {
        // Suppression de slots — tronquer
        return prev.slice(0, roundCount);
      }
      return prev;
    });
  }, [roundCount]);

  // ── Navigation ───────────────────────────────────────────────────────────────

  const handleBack = useCallback((): void => {
    navigation.goBack();
  }, [navigation]);

  // ── Joueurs ──────────────────────────────────────────────────────────────────

  const handleChangeName = useCallback((index: number, value: string): void => {
    setPlayers((prev) => {
      const updated = [...prev];
      const player = updated[index];
      if (player === undefined) return prev;
      updated[index] = { ...player, name: value };
      return updated;
    });
    setValidationErrors([]);
  }, []);

  const handleAddPlayer = useCallback((): void => {
    if (players.length >= 6) return;
    const newId = String(Date.now());
    setPlayers((prev) => [...prev, { id: newId, name: '' }]);
    void AccessibilityInfo.announceForAccessibility(
      `Joueur ${String(players.length + 1)} ajouté`,
    );
  }, [players.length]);

  const handleRemovePlayer = useCallback((index: number): void => {
    if (players.length <= 2) return;
    setPlayers((prev) => prev.filter((_, i) => i !== index));
    void AccessibilityInfo.announceForAccessibility('Joueur supprimé');
  }, [players.length]);

  // ── Démarrage ────────────────────────────────────────────────────────────────

  const handleStart = useCallback(async (): Promise<void> => {
    const names = players.map((p) => p.name);
    const errors = validatePlayerNames(names);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Vérification défensive — isStartDisabled devrait déjà bloquer
    const allReady = readyPairs.every((p) => p !== null);
    if (!allReady) return;

    // Construction explicite Article — pas de spread depuis ArticleSummary
    // p! est justifié : allReady garantit l'absence de null
    const pairs = readyPairs.map((p) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const pairEntry = p!;
      return {
        start: {
          id: pairEntry.start.id,
          title: pairEntry.start.title,
          url: pairEntry.start.url,
          language: pairEntry.start.language,
        },
        target: {
          id: pairEntry.target.id,
          title: pairEntry.target.title,
          url: pairEntry.target.url,
          language: pairEntry.target.language,
        },
      };
    });

    // Initialiser le store multijoueur avec le tableau de paires
    setupSession(names, pairs, roundCount);

    // Démarrer la session pour le joueur 1 (paire de la manche 1)
    const firstPair = pairs[0];
    if (firstPair === undefined) return;

    await clearSession();
    // F3-30 : isMultiplayer: true → session non enregistrée dans l'historique solo
    await startSession(firstPair.start, firstPair.target, { isMultiplayer: true });

    const firstPlayerName = players[0]?.name ?? '';
    navigation.navigate('PassPhone', { playerName: firstPlayerName });
  }, [players, readyPairs, roundCount, setupSession, clearSession, startSession, navigation]);

  // ── Conditions bouton Commencer ──────────────────────────────────────────────

  const hasEmptyName = players.some((p) => p.name.trim().length === 0);
  const hasUnreadyPair = readyPairs.some((p) => p === null);
  const isStartDisabled = hasEmptyName || players.length < 2 || hasUnreadyPair;

  // Message chargement : visible si disabled ET au moins un slot en loading
  // (l'information sur l'état des slots est indirecte — null peut signifier loading ou error)
  // Simplifié : afficher le message si hasUnreadyPair (l'utilisateur voit les slots individuels)
  const showLoadingMessage = hasUnreadyPair;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          accessibilityLabel="Retour"
          accessibilityRole="button"
        >
          <Text style={styles.backButtonText}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} accessibilityRole="header">
          {'Multijoueur'}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Label section JOUEURS */}
          <Text style={styles.sectionLabel}>{'JOUEURS'}</Text>

          {/* Liste des joueurs */}
          {/* exactOptionalPropertyTypes : spread conditionnel pour inputRef / nextInputRef */}
          {players.map((player, index) => {
            const currentRef = inputRefs.current[index];
            const nextRef = index < players.length - 1 ? inputRefs.current[index + 1] : undefined;
            return (
              <PlayerRow
                key={player.id}
                index={index}
                name={player.name}
                onChangeName={handleChangeName}
                onRemove={handleRemovePlayer}
                canRemove={players.length > 2}
                {...(currentRef !== undefined ? { inputRef: currentRef } : {})}
                {...(nextRef !== undefined ? { nextInputRef: nextRef } : {})}
              />
            );
          })}

          {/* Bouton Ajouter un joueur */}
          <TouchableOpacity
            style={[styles.addButton, players.length >= 6 && styles.addButtonDisabled]}
            onPress={handleAddPlayer}
            disabled={players.length >= 6}
            accessibilityLabel="Ajouter un joueur"
            accessibilityRole="button"
            accessibilityState={{ disabled: players.length >= 6 }}
          >
            <Text style={[styles.addButtonText, players.length >= 6 && styles.addButtonTextDisabled]}>
              {'+ Ajouter un joueur'}
            </Text>
          </TouchableOpacity>

          {/* Séparateur */}
          <View style={styles.divider} />

          {/* Sélecteur de manches (F3-28) */}
          <Text style={styles.sectionLabel}>{'MANCHES'}</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={[styles.stepperButton, roundCount <= 1 && styles.stepperButtonDisabled]}
              onPress={() => { setRoundCount((prev) => Math.max(1, prev - 1)); }}
              disabled={roundCount <= 1}
              accessibilityLabel={`Réduire le nombre de manches — ${String(roundCount)} actuellement`}
              accessibilityRole="button"
              accessibilityState={{ disabled: roundCount <= 1 }}
            >
              <Text style={styles.stepperButtonText}>{'−'}</Text>
            </TouchableOpacity>
            <Text
              style={styles.stepperValue}
              accessibilityLabel={`${String(roundCount)} manche${roundCount > 1 ? 's' : ''}`}
            >
              {String(roundCount)}
            </Text>
            <TouchableOpacity
              style={[styles.stepperButton, roundCount >= 5 && styles.stepperButtonDisabled]}
              onPress={() => { setRoundCount((prev) => Math.min(5, prev + 1)); }}
              disabled={roundCount >= 5}
              accessibilityLabel={`Augmenter le nombre de manches — ${String(roundCount)} actuellement`}
              accessibilityRole="button"
              accessibilityState={{ disabled: roundCount >= 5 }}
            >
              <Text style={styles.stepperButtonText}>{'+'}</Text>
            </TouchableOpacity>
          </View>

          {/* Séparateur */}
          <View style={styles.divider} />

          {/* Section PAIRES — F3-32 */}
          <View accessibilityLabel="Section Paires d'articles">
            <Text style={styles.sectionLabel}>{'PAIRES'}</Text>
            {Array.from({ length: roundCount }, (_, i) => (
              <PairSlot
                key={String(i)}
                roundNumber={i + 1}
                roundIndex={i}
                onPairReady={handlePairReady}
                onPairNotReady={handlePairNotReady}
              />
            ))}
          </View>

          {/* Erreurs de validation */}
          {validationErrors.length > 0 && (
            <View style={styles.errorsContainer}>
              {validationErrors.map((error, i) => (
                <Text key={String(i)} style={styles.errorText}>{error}</Text>
              ))}
            </View>
          )}

          <View style={styles.scrollPaddingBottom} />
        </ScrollView>

        {/* Zone bouton fixe bas */}
        <View style={styles.bottomZone}>
          <TouchableOpacity
            style={[styles.startButton, isStartDisabled && styles.startButtonDisabled]}
            onPress={() => { void handleStart(); }}
            disabled={isStartDisabled}
            accessibilityLabel="Commencer la partie"
            accessibilityRole="button"
            accessibilityState={{ disabled: isStartDisabled }}
          >
            <Text style={[styles.startButtonText, isStartDisabled && styles.startButtonTextDisabled]}>
              {'Commencer'}
            </Text>
          </TouchableOpacity>
          {showLoadingMessage && (
            <Text
              style={styles.loadingMessage}
              accessibilityLiveRegion="polite"
            >
              {'Chargement des paires en cours...'}
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
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
  flex: {
    flex: 1,
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#1E293B',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingTop: 20,
    marginBottom: 8,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  playerRowIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  playerInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    paddingVertical: 8,
  },
  removeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonDisabled: {
    opacity: 0.3,
  },
  removeButtonText: {
    fontSize: 16,
    color: '#94A3B8',
  },
  removeButtonTextDisabled: {
    color: '#CBD5E1',
  },
  addButton: {
    height: 44,
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderStyle: 'dashed',
  },
  addButtonDisabled: {
    opacity: 0.4,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  addButtonTextDisabled: {
    color: '#94A3B8',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
    marginHorizontal: -16,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  stepperButton: {
    width: 44,
    height: 44,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonDisabled: {
    opacity: 0.4,
  },
  stepperButtonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  stepperValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    minWidth: 48,
    textAlign: 'center',
  },
  // ── PairSlot ──────────────────────────────────────────────────────────────────
  pairSlotWrapper: {
    marginBottom: 8,
  },
  pairSlotLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  pairSlotContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
  },
  pairSlotContainerError: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  skeletonLine: {
    height: 14,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonLineWide: {
    width: '70%',
  },
  skeletonLineNarrow: {
    width: '55%',
    marginBottom: 0,
  },
  pairErrorText: {
    fontSize: 14,
    color: '#E11D48',
    marginBottom: 8,
  },
  pairArticleRow: {
    fontSize: 14,
    marginBottom: 4,
  },
  pairArticleRowVers: {
    marginBottom: 0,
  },
  pairArticleRowLabel: {
    color: '#64748B',
  },
  pairArticleTitle: {
    fontWeight: 'bold',
    color: '#1E293B',
  },
  renewButton: {
    height: 36,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  renewButtonText: {
    fontSize: 14,
    color: '#2563EB',
  },
  // ── Zone bas ─────────────────────────────────────────────────────────────────
  errorsContainer: {
    marginTop: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#E11D48',
    marginBottom: 2,
  },
  scrollPaddingBottom: {
    height: 24,
  },
  bottomZone: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  startButton: {
    height: 52,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonDisabled: {
    backgroundColor: '#E2E8F0',
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  startButtonTextDisabled: {
    color: '#94A3B8',
  },
  loadingMessage: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
  },
});
