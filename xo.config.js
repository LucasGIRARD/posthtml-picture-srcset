/**
 * @see https://github.com/xojs/xo
 * @type {import('xo').FlatXoConfig}
 */
const xoConfig = {
  ignores: [
    './node_modules/**',
  ],
  space: 2,
  semicolon: true,
  prettier: false,
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    globals: {
      window: 'readonly',
      document: 'readonly',
      navigator: 'readonly',
      console: 'readonly',
    },
  },
  rules: {
    '@stylistic/object-curly-spacing': ['warn', 'always'],
    // '@stylistic/quotes': 'off',
    // '@typescript-eslint/naming-convention': 'off',
    // '@typescript-eslint/no-empty-function': 'off',
    // camelcase: 'off',
    // 'import/no-cycle': 'off',
    // 'no-alert': 'off',
    // 'max-depth': ['warn', 6],
    // 'max-params': ['warn', 5],
  },
};

export default xoConfig;
