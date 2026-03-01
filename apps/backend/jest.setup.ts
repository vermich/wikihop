/**
 * jest.setup.ts — Configuration globale des tests backend
 *
 * Ce fichier est chargé avant chaque suite de tests.
 * Il injecte les variables d'environnement minimales requises pour que
 * src/env.ts valide sans erreur en contexte de test.
 */

// Variables d'environnement minimales pour les tests unitaires
// (sans connexion PostgreSQL réelle)
process.env['NODE_ENV'] = 'test';
process.env['PORT'] = '0'; // Port 0 = port aléatoire (évite les conflits)
process.env['HOST'] = '127.0.0.1';
process.env['LOG_LEVEL'] = 'silent';

// DATABASE_URL est requis par env.ts — on fournit une URL valide pour le parsing.
// Le test de connexion réel (db.test.ts) nécessite une BDD PostgreSQL accessible.
// Si DATABASE_URL est déjà définie (CI), on la conserve.
if (!process.env['DATABASE_URL']) {
  process.env['DATABASE_URL'] =
    'postgresql://wikihop:wikihop@localhost:5432/wikihop_test';
}
