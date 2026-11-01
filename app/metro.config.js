const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, '../assets'), path.resolve(__dirname, '../content')];
config.transformer.unstable_allowRequireContext = true;

module.exports = config;
