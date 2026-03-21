// Mock react-i18next pour les tests — retourne la clé directement
// Cela permet de tester les composants sans initialiser i18next

const useMock = (k: string) => k;
useMock.t = (k: string) => k;

export const useTranslation = () => ({
  t: (key: string, options?: Record<string, unknown>) => {
    if (options !== undefined) {
      // Substitution basique des interpolations pour les tests
      let result = key;
      for (const [placeholder, value] of Object.entries(options)) {
        result = result.replace(`{{${placeholder}}}`, String(value));
      }
      return result;
    }
    return key;
  },
  i18n: {
    changeLanguage: jest.fn(),
    language: 'fr',
  },
});

export const Trans = ({ i18nKey }: { i18nKey: string }) => i18nKey;

export const initReactI18next = {
  type: '3rdParty' as const,
  init: jest.fn(),
};
