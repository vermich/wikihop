/**
 * Metro Configuration — WikiHop Mobile
 *
 * Configuration critique pour la résolution du monorepo.
 * Sans watchFolders et nodeModulesPaths, Metro ne peut pas
 * résoudre @wikihop/shared depuis packages/shared.
 *
 * ADR-001 : Architecture monorepo npm workspaces
 */

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Permettre à Metro de remonter dans le monorepo
config.watchFolders = [workspaceRoot];

// Résolution des packages du workspace
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
