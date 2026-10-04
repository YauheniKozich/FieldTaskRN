const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = [
  { ignores: ['android/**', 'ios/**', 'dist/**', '.expo/**', 'src/assets/leafletInline.ts'] },
  ...expoConfig,
  {
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    rules: { 'no-console': 'error', 'no-debugger': 'error' },
  },
  { files: ['tests/**/*.{ts,tsx}'], languageOptions: { globals: globals.jest } },
  {
    files: ['plugins/**/*.js', 'scripts/**/*.{js,cjs}'],
    languageOptions: { globals: globals.node },
  },
];
