/**
 * LanguageSelectionSheet — WikiHop Mobile — F3-26
 *
 * Bottom sheet modale permettant la sélection parmi les 8 langues supportées.
 *
 * Layout :
 *   Modal (transparent, animationType slide)
 *   ├── Backdrop (TouchableOpacity plein écran #0F172A 40%) → ferme la sheet
 *   └── SheetContainer (blanc, borderRadius top:16)
 *       ├── DragHandle (décoratif)
 *       ├── SheetTitle ("Langue de l'interface")
 *       ├── SheetSeparator
 *       └── 8 × LanguageItem (fr, en, es, de, pt, it, nl, pl)
 *
 * Conventions :
 *   - Export nommé LanguageSelectionSheet
 *   - StyleSheet.create() en bas du fichier
 *   - Zéro any, TypeScript strict
 *   - LANGUAGE_NAMES invariant (noms natifs, jamais traduits)
 *   - CodeText inactif : #64748B (contraste 4.6:1 conforme WCAG AA — recommandation Benjamin)
 *
 * Story : F3-26
 * Spec UX : docs/ux/F3-26-language-selector.md
 */

import type { Language } from '@wikihop/shared';
import { SUPPORTED_LANGUAGES } from '@wikihop/shared';
import React, { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

/** Noms natifs des langues — invariants, jamais traduits (spec UX F3-26). */
const LANGUAGE_NAMES: Record<Language, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
  pt: 'Português',
  it: 'Italiano',
  nl: 'Nederlands',
  pl: 'Polski',
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface LanguageSelectionSheetProps {
  visible: boolean;
  currentLanguage: Language;
  onSelect: (lang: Language) => void;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant LanguageItem (interne)
// ─────────────────────────────────────────────────────────────────────────────

interface LanguageItemProps {
  lang: Language;
  isActive: boolean;
  onPress: () => void;
}

function LanguageItem({ lang, isActive, onPress }: LanguageItemProps): React.JSX.Element {
  const name = LANGUAGE_NAMES[lang];
  const code = lang.toUpperCase();
  const a11yLabel = isActive
    ? `${name}, sélectionné`
    : `Passer en ${name}`;

  return (
    <TouchableOpacity
      style={styles.languageItem}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ selected: isActive }}
    >
      <Text
        style={[
          styles.languageItemName,
          isActive && styles.languageItemNameActive,
        ]}
      >
        {name}
      </Text>
      <View style={styles.languageItemRight}>
        <Text
          style={[
            styles.languageItemCode,
            isActive && styles.languageItemCodeActive,
          ]}
        >
          {code}
        </Text>
        {isActive && (
          <Text style={styles.languageItemCheck} accessible={false}>
            {'✓'}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

export function LanguageSelectionSheet({
  visible,
  currentLanguage,
  onSelect,
  onClose,
}: LanguageSelectionSheetProps): React.JSX.Element {
  const insets = useSafeAreaInsets();

  // reduceMotion — conditionne l'animationType de la Modal (spec UX F3-26)
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType={reduceMotion ? 'none' : 'slide'}
      onRequestClose={onClose}
      accessibilityViewIsModal={true}
    >
      {/* Backdrop — ferme la sheet au tap */}
      <TouchableOpacity
        style={styles.backdrop}
        onPress={onClose}
        activeOpacity={1}
        accessibilityLabel="Fermer le sélecteur de langue"
        accessibilityRole="button"
      />

      {/* Sheet container */}
      <View style={[styles.sheetContainer, { paddingBottom: insets.bottom }]}>
        {/* Drag handle — décoratif */}
        <View style={styles.dragHandle} accessible={false} />

        {/* Titre */}
        <Text style={styles.sheetTitle} accessibilityRole="header">
          {"Langue de l'interface"}
        </Text>

        {/* Séparateur */}
        <View style={styles.sheetSeparator} accessible={false} />

        {/* Liste des langues avec maxHeight de sécurité pour petits écrans */}
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          style={styles.languageList}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <LanguageItem
              key={lang}
              lang={lang}
              isActive={lang === currentLanguage}
              onPress={() => { onSelect(lang); }}
            />
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Backdrop semi-transparent plein écran
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  // Sheet blanche positionnée en bas
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
  },
  // Drag handle décoratif
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  // Titre de la sheet
  sheetTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  // Séparateur
  sheetSeparator: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  // ScrollView de sécurité pour petits écrans
  languageList: {
    flexGrow: 0,
  },
  // Item de langue
  languageItem: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  languageItemName: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
  },
  languageItemNameActive: {
    fontWeight: 'bold',
  },
  // Section droite : code ISO + check
  languageItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  languageItemCode: {
    fontSize: 13,
    fontWeight: 'bold',
    // #64748B (contraste 4.6:1 sur #FFFFFF) — recommandation Benjamin pour conformité WCAG AA
    color: '#64748B',
  },
  languageItemCodeActive: {
    color: '#2563EB',
  },
  languageItemCheck: {
    fontSize: 16,
    color: '#2563EB',
  },
});
