// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  // 1️⃣ Tell Metro to hand *.svg files to the svg‐transformer
  config.transformer = {
    ...config.transformer,
    babelTransformerPath: require.resolve("react-native-svg-transformer"),
  };

  // 2️⃣ Remove "svg" from assetExts, add to sourceExts
  const { assetExts, sourceExts } = config.resolver;
  config.resolver.assetExts = assetExts.filter(ext => ext !== "svg");
  config.resolver.sourceExts = [...sourceExts, "svg"];

  return config;
})();
