// C:\Projetos\APP\frontend\metro.config.js

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Adiciona as extensões de assets que o Metro deve resolver
// Estas são as extensões padrão, você pode adicionar mais se precisar de outros tipos de arquivos
config.resolver.assetExts.push('png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ttf', 'mp4', 'mov', 'avi', 'mkv', 'mp3', 'wav', 'ogg', 'aac', 'json', 'xml', 'txt', 'pdf');
config.resolver.sourceExts.push('js', 'jsx', 'ts', 'tsx', 'json', 'mjs', 'cjs');

module.exports = config;
