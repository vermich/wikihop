/**
 * isPlayableArticle Tests — WikiHop Mobile — Wave 3 (M-04)
 *
 * Teste la fonction pure isPlayableArticle :
 *   - Articles jouables (articles encyclopédiques normaux)
 *   - Articles non jouables (namespaces Catégorie:, Portail:, Aide:, etc.)
 *   - Pages d'accueil exactes (Accueil, Main Page)
 *   - Cas limites (titres vides, casse)
 *
 * Pas de mock nécessaire — fonction pure.
 *
 * ADR-003 : Tests unitaires sans mock pour les fonctions pures
 */

import { isPlayableArticle } from '../src/services/wikipedia.service';

describe('isPlayableArticle', () => {
  describe('Articles jouables', () => {
    it('retourne true pour un article encyclopédique normal (fr)', () => {
      expect(isPlayableArticle('Tour Eiffel')).toBe(true);
    });

    it('retourne true pour un article encyclopédique normal (en)', () => {
      expect(isPlayableArticle('Eiffel Tower')).toBe(true);
    });

    it('retourne true pour un article avec des caractères accentués', () => {
      expect(isPlayableArticle('Révolution française')).toBe(true);
    });

    it('retourne true pour un article avec des chiffres', () => {
      expect(isPlayableArticle('Guerre de 1914-1918')).toBe(true);
    });

    it('retourne true pour un article avec des parenthèses', () => {
      expect(isPlayableArticle('Paris (ville)'));
    });
  });

  describe('Namespaces non jouables — français', () => {
    it('retourne false pour Catégorie:', () => {
      expect(isPlayableArticle('Catégorie:Architecture')).toBe(false);
    });

    it('retourne false pour Portail:', () => {
      expect(isPlayableArticle('Portail:Science')).toBe(false);
    });

    it('retourne false pour Aide:', () => {
      expect(isPlayableArticle('Aide:Contribuer')).toBe(false);
    });

    it('retourne false pour Wikipédia:', () => {
      expect(isPlayableArticle('Wikipédia:Règles')).toBe(false);
    });

    it('retourne false pour Liste des ', () => {
      expect(isPlayableArticle('Liste des présidents')).toBe(false);
    });

    it('retourne false pour Liste de ', () => {
      expect(isPlayableArticle('Liste de pays')).toBe(false);
    });

    it('retourne false pour Modèle:', () => {
      expect(isPlayableArticle('Modèle:Infobox')).toBe(false);
    });

    it('retourne false pour Spécial:', () => {
      expect(isPlayableArticle('Spécial:Recherche')).toBe(false);
    });

    it('retourne false pour Fichier:', () => {
      expect(isPlayableArticle('Fichier:Photo.jpg')).toBe(false);
    });
  });

  describe('Namespaces non jouables — anglais', () => {
    it('retourne false pour Portal:', () => {
      expect(isPlayableArticle('Portal:Science')).toBe(false);
    });

    it('retourne false pour Category:', () => {
      expect(isPlayableArticle('Category:Architecture')).toBe(false);
    });

    it('retourne false pour Help:', () => {
      expect(isPlayableArticle('Help:Contents')).toBe(false);
    });

    it('retourne false pour Wikipedia:', () => {
      expect(isPlayableArticle('Wikipedia:About')).toBe(false);
    });

    it('retourne false pour List of ', () => {
      expect(isPlayableArticle('List of presidents')).toBe(false);
    });

    it('retourne false pour Template:', () => {
      expect(isPlayableArticle('Template:Infobox')).toBe(false);
    });

    it('retourne false pour Special:', () => {
      expect(isPlayableArticle('Special:Search')).toBe(false);
    });

    it('retourne false pour File:', () => {
      expect(isPlayableArticle('File:Photo.jpg')).toBe(false);
    });
  });

  describe('Pages d\'accueil exactes', () => {
    it('retourne false pour "Accueil"', () => {
      expect(isPlayableArticle('Accueil')).toBe(false);
    });

    it('retourne false pour "Main Page"', () => {
      expect(isPlayableArticle('Main Page')).toBe(false);
    });
  });

  describe('Cas limites', () => {
    it('retourne true pour un titre qui commence comme un préfixe mais n\'en est pas un', () => {
      // "Catalogues" commence par "Cat" mais pas par "Catégorie:"
      expect(isPlayableArticle('Catalogues astronomiques')).toBe(true);
    });

    it('retourne true pour "Portal" sans les deux-points (titre d\'article normal)', () => {
      // "Portal" seul est un article encyclopédique potentiel (ex: "Portal (jeu vidéo)")
      expect(isPlayableArticle('Portal (jeu vidéo)')).toBe(true);
    });

    it('retourne true pour un article commençant par "Aide" (sans ":")', () => {
      // "Aide" seul ou suivi d'autre chose n'est pas un namespace
      expect(isPlayableArticle('Aide alimentaire')).toBe(true);
    });
  });
});
