const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-plugin-prettier');

module.exports = [
  {
    // Design-reference package (browser-global JSX, not part of the app build).
    ignores: ['node_modules/**', '.expo/**', 'dist/**', 'web-build/**', '.design-pkg/**'],
  },
  ...expoConfig,
  {
    plugins: { prettier },
    rules: { 'prettier/prettier': 'warn' },
  },
];
