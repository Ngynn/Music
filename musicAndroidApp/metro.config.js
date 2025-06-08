// // Learn more https://docs.expo.io/guides/customizing-metro
// const { getDefaultConfig } = require('expo/metro-config');

// /** @type {import('expo/metro-config').MetroConfig} */
// const config = getDefaultConfig(__dirname);

// module.exports = config;
const { getDefaultConfig } = require("expo/metro-config");

const defaultConfig = getDefaultConfig(__dirname);

// ✅ Cho phép xử lý file .cjs từ Firebase
defaultConfig.resolver.sourceExts.push("cjs");

// ✅ Tắt package exports (tạm thời chưa hỗ trợ tốt)
defaultConfig.resolver.unstable_enablePackageExports = false;

module.exports = defaultConfig;
