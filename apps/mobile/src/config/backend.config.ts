/**
 * backend.config.ts — URL de base du backend WikiHop
 *
 * En développement local : défaut sur l'IP réseau de la machine de dev.
 * En production (EAS Build) : EXPO_PUBLIC_BACKEND_URL doit être défini.
 *
 * Variable Expo : doit avoir le préfixe EXPO_PUBLIC_ pour être accessible dans le bundle.
 *
 * Pour le dev local, créer apps/mobile/.env (non commité) :
 *   EXPO_PUBLIC_BACKEND_URL=http://192.168.1.30:3000
 *
 * Pour la production, définir dans les variables EAS Build :
 *   EXPO_PUBLIC_BACKEND_URL=https://api.wikihop.app
 */

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://192.168.1.30:3000';

export const BACKEND_BASE_URL = BACKEND_URL;
