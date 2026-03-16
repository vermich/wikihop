/**
 * Tests TDD — isSupportedLanguage (F3-26)
 *
 * Écrits AVANT l'implémentation selon la règle TDD strict.
 * Fonctions pures → TDD obligatoire.
 */

// isSupportedLanguage sera implémentée dans src/utils/language.utils.ts
// Import intentionnellement prêt AVANT l'implémentation pour faire échouer les tests.
import { isSupportedLanguage } from '../../src/utils/language.utils';

describe('isSupportedLanguage', () => {
  // ── Cas nominaux : les 8 langues supportées doivent retourner true ──

  it("retourne true pour 'fr'", () => {
    expect(isSupportedLanguage('fr')).toBe(true);
  });

  it("retourne true pour 'en'", () => {
    expect(isSupportedLanguage('en')).toBe(true);
  });

  it("retourne true pour 'es'", () => {
    expect(isSupportedLanguage('es')).toBe(true);
  });

  it("retourne true pour 'de'", () => {
    expect(isSupportedLanguage('de')).toBe(true);
  });

  it("retourne true pour 'pt'", () => {
    expect(isSupportedLanguage('pt')).toBe(true);
  });

  it("retourne true pour 'it'", () => {
    expect(isSupportedLanguage('it')).toBe(true);
  });

  it("retourne true pour 'nl'", () => {
    expect(isSupportedLanguage('nl')).toBe(true);
  });

  it("retourne true pour 'pl'", () => {
    expect(isSupportedLanguage('pl')).toBe(true);
  });

  // ── Cas d'erreur : valeurs non supportées ──

  it("retourne false pour 'zh' (langue non supportée)", () => {
    expect(isSupportedLanguage('zh')).toBe(false);
  });

  it("retourne false pour '' (chaîne vide)", () => {
    expect(isSupportedLanguage('')).toBe(false);
  });

  it('retourne false pour null', () => {
    expect(isSupportedLanguage(null)).toBe(false);
  });

  it('retourne false pour undefined', () => {
    expect(isSupportedLanguage(undefined)).toBe(false);
  });

  it('retourne false pour 42 (nombre)', () => {
    expect(isSupportedLanguage(42)).toBe(false);
  });

  it("retourne false pour { lang: 'fr' } (objet)", () => {
    expect(isSupportedLanguage({ lang: 'fr' })).toBe(false);
  });
});
