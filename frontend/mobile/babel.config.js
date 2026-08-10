module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    // SDK 54 / Reanimated 4 split the worklets transform out of react-native-reanimated into its
    // own package — the plugin is now `react-native-worklets/plugin`, not
    // `react-native-reanimated/plugin` (that entry point still exists on 3.x but is deprecated on
    // 4.x). Must be listed last, same rule as before.
    plugins: ['react-native-worklets/plugin'],
  }
}