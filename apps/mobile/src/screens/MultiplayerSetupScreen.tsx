/**
 * MultiplayerSetupScreen — WikiHop Mobile — Multijoueur local (F3-12)
 *
 * Écran de configuration d'une session multijoueur hot-seat.
 * Permet de saisir les noms de 2 à 6 joueurs et de charger la paire d'articles.
 *
 * Layout :
 *   [SafeAreaView top+bottom]
 *   ├── Header 64pt : bouton "←" gauche + titre "Multijoueur" centré
 *   ├── KeyboardAvoidingView
 *   │   └── ScrollView
 *   │       ├── Label "JOUEURS"
 *   │       ├── Liste PlayerRows
 *   │       ├── Bouton "+ Ajouter un joueur" (disabled si 6 joueurs)
 *   │       └── Bloc paire (départ / destination) avec skeleton
 *   └── Zone bouton fixe bas : "Commencer" (disabled si config invalide)
 *
 * Validation via validatePlayerNames avant navigation.
 * Paire chargée via useRandomPair('normal').
 *
 * Conventions :
 *   - Export nommé MultiplayerSetupScreen
 *   - StyleSheet.create() en bas du fichier
 *   - Zéro any, TypeScript strict
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, {
  useCallback,
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

import type { RootStackParamList } from '../navigation/RootNavigator';
import { useRandomPair } from '../hooks/useRandomPair';
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
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

export function MultiplayerSetupScreen({ navigation }: MultiplayerSetupScreenProps): React.JSX.Element {
  const [players, setPlayers] = useState<PlayerEntry[]>([
    { id: '1', name: '' },
    { id: '2', name: '' },
  ]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const { state: pairState } = useRandomPair('normal');

  const setupSession = useMultiplayerStore((s) => s.setupSession);
  const clearSession = useGameStore((s) => s.clearSession);
  const startSession = useGameStore((s) => s.startSession);

  // Refs pour le focus clavier entre inputs
  const inputRefs = useRef<Array<React.RefObject<TextInput | null>>>(
    Array.from({ length: 6 }, () => React.createRef<TextInput | null>()),
  );

  const handleBack = useCallback((): void => {
    navigation.goBack();
  }, [navigation]);

  const handleChangeName = useCallback((index: number, value: string): void => {
    setPlayers((prev) => {
      const updated = [...prev];
      const player = updated[index];
      if (player === undefined) return prev;
      updated[index] = { ...player, name: value };
      return updated;
    });
    // Effacer les erreurs de validation dès que l'utilisateur modifie un champ
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

  const handleStart = useCallback(async (): Promise<void> => {
    const names = players.map((p) => p.name);
    const errors = validatePlayerNames(names);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    if (pairState.status !== 'success') return;

    const startArticle = {
      id: pairState.start.id,
      title: pairState.start.title,
      url: pairState.start.url,
      language: pairState.start.language,
    };
    const targetArticle = {
      id: pairState.target.id,
      title: pairState.target.title,
      url: pairState.target.url,
      language: pairState.target.language,
    };

    // Initialiser le store multijoueur
    setupSession(names, startArticle, targetArticle);

    // Effacer toute session de jeu résiduelle et démarrer pour le joueur 1
    await clearSession();
    await startSession(startArticle, targetArticle);

    const firstPlayerName = players[0]?.name ?? '';
    navigation.navigate('PassPhone', { playerName: firstPlayerName });
  }, [players, pairState, setupSession, clearSession, startSession, navigation]);

  // Désactivation du bouton Commencer : noms vides, ou paire non chargée, ou < 2 joueurs
  const hasEmptyName = players.some((p) => p.name.trim().length === 0);
  const isStartDisabled = hasEmptyName || players.length < 2 || pairState.status !== 'success';

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
          {players.map((player, index) => (
            <PlayerRow
              key={player.id}
              index={index}
              name={player.name}
              onChangeName={handleChangeName}
              onRemove={handleRemovePlayer}
              canRemove={players.length > 2}
              inputRef={inputRefs.current[index]}
              nextInputRef={index < players.length - 1 ? inputRefs.current[index + 1] : undefined}
            />
          ))}

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

          {/* Erreurs de validation */}
          {validationErrors.length > 0 && (
            <View style={styles.errorsContainer}>
              {validationErrors.map((error, i) => (
                <Text key={String(i)} style={styles.errorText}>{error}</Text>
              ))}
            </View>
          )}

          {/* Bloc paire d'articles */}
          <View style={styles.pairBlock}>
            <Text style={styles.pairLabel}>{'Paire d\'articles'}</Text>
            {pairState.status === 'loading' && (
              <>
                <View style={styles.pairSkeletonLine} />
                <View style={[styles.pairSkeletonLine, styles.pairSkeletonLineShort]} />
              </>
            )}
            {pairState.status === 'error' && (
              <Text style={styles.pairError}>
                {'Impossible de charger la paire. Vérifiez votre connexion.'}
              </Text>
            )}
            {pairState.status === 'success' && (
              <>
                <Text style={styles.pairArticleLabel}>{'De :'}</Text>
                <Text style={styles.pairArticleTitle} numberOfLines={2}>
                  {pairState.start.title}
                </Text>
                <Text style={styles.pairArticleLabel}>{'Vers :'}</Text>
                <Text style={styles.pairArticleTitle} numberOfLines={2}>
                  {pairState.target.title}
                </Text>
              </>
            )}
          </View>
        </ScrollView>

        {/* Zone bouton fixe bas */}
        <View style={styles.bottomZone}>
          <TouchableOpacity
            style={[styles.startButton, isStartDisabled && styles.startButtonDisabled]}
            onPress={() => { void handleStart(); }}
            disabled={isStartDisabled}
            accessibilityLabel="Commencer la partie multijoueur"
            accessibilityRole="button"
            accessibilityState={{ disabled: isStartDisabled }}
          >
            <Text style={[styles.startButtonText, isStartDisabled && styles.startButtonTextDisabled]}>
              {'Commencer'}
            </Text>
          </TouchableOpacity>
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
    paddingBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    // Bordure tiretée simulée via borderStyle (non supporté inline sur RN — utiliser dashed si supporté)
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
  errorsContainer: {
    marginTop: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#E11D48',
    marginBottom: 2,
  },
  pairBlock: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  pairLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pairSkeletonLine: {
    height: 14,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginBottom: 8,
    width: '100%',
  },
  pairSkeletonLineShort: {
    width: '70%',
  },
  pairError: {
    fontSize: 13,
    color: '#E11D48',
  },
  pairArticleLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  pairArticleTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
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
});
