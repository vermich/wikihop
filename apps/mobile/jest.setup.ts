/**
 * Jest Setup — WikiHop Mobile
 *
 * Mocks globaux pour l'environnement de test React Native.
 * Ce fichier est chargé avant chaque suite de tests (setupFiles).
 */

// Mock global de react-i18next pour les tests (F3-26)
// La fonction t() résout les clés depuis les fichiers de traduction fr.json.
// Toute la logique est inline dans la factory jest.mock() — contrainte Jest
// (les factories ne peuvent pas référencer des variables out-of-scope).
jest.mock('react-i18next', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
  const translations = require('./src/i18n/locales/fr.json');

  function resolve(obj: Record<string, unknown>, key: string): string | undefined {
    const parts = key.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cur: any = obj;
    for (const part of parts) {
      if (cur === null || cur === undefined || typeof cur !== 'object') return undefined;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      cur = cur[part];
    }
    return typeof cur === 'string' ? cur : undefined;
  }

  function interpolate(tpl: string, ctx: Record<string, unknown>): string {
    return tpl.replace(/\{\{(\w+)\}\}/g, (_: string, k: string) => {
      const v = ctx[k];
      return v !== undefined ? String(v) : `{{${k}}}`;
    });
  }

  function t(key: string, ctx?: Record<string, unknown>): string {
    const context = ctx ?? {};
    if ('count' in context) {
      const count = context['count'] as number;
      // count <= 1 → _one (couvre le cas 0 pour les textes UI françaises)
      // count >= 2 → _other
      const suffix = count <= 1 ? '_one' : '_other';
      const pluralVal = resolve(translations as Record<string, unknown>, `${key}${suffix}`);
      if (pluralVal !== undefined) return interpolate(pluralVal, context);
    }
    const val = resolve(translations as Record<string, unknown>, key);
    return val !== undefined ? interpolate(val, context) : key;
  }

  return {
    useTranslation: () => ({
      t,
      i18n: { language: 'fr', changeLanguage: jest.fn() },
    }),
    initReactI18next: { type: '3rdParty', init: jest.fn() },
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    Trans: ({ children }: { children: unknown }) => children,
  };
});

// Mock de @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Mock de react-native-screens (évite les erreurs natives en test)
jest.mock('react-native-screens', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RealComponent = jest.requireActual<typeof import('react-native-screens')>('react-native-screens');
  return {
    ...RealComponent,
    enableScreens: jest.fn(),
  };
});
