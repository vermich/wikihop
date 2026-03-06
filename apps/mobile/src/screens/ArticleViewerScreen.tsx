/**
 * ArticleViewerScreen — WikiHop Mobile
 *
 * Écran de lecture d'article Wikipedia en mode hors-jeu.
 * Utilisé depuis VictoryScreen pour lire l'article cible sans quitter l'app.
 *
 * Layout :
 *   [Header : titre + bouton "Accueil"]
 *   [WebView — flex:1]
 *
 * Conventions :
 *   - Export nommé
 *   - headerShown: false (header custom)
 *   - StyleSheet.create() en bas du fichier
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { CSS_INJECTION_SCRIPT } from '../components/game/WikipediaWebView';
import type { RootStackParamList } from '../navigation/RootNavigator';

type ArticleViewerScreenProps = NativeStackScreenProps<RootStackParamList, 'ArticleViewer'>;

export function ArticleViewerScreen({ route, navigation }: ArticleViewerScreenProps): React.JSX.Element {
  const { url, title } = route.params;
  const [isLoading, setIsLoading] = useState(true);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => { navigation.goBack(); }}
            accessibilityLabel="Retour"
            accessibilityRole="button"
          >
            <Text style={styles.homeButtonText}>{'← Retour'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <WebView
        source={{ uri: url }}
        javaScriptEnabled={true}
        injectedJavaScript={CSS_INJECTION_SCRIPT}
        onLoadStart={() => { setIsLoading(true); }}
        onLoadEnd={() => { setIsLoading(false); }}
      />
      {isLoading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      )}
    </View>
  );
}

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
    paddingHorizontal: 16,
    gap: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  homeButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  homeButtonText: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '600',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
