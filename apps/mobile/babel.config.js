/**
 * Babel Configuration — WikiHop Mobile
 * Utilise babel-preset-expo pour la compatibilité Expo SDK 52.
 */

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
