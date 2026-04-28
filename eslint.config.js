const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-plugin-prettier');

module.exports = [
  ...expoConfig,
  {
    plugins: { prettier },
    rules: { 'prettier/prettier': 'warn' },
    ignores: ['node_modules/**', '.expo/**', 'dist/**', 'web-build/**'],
  },
];
