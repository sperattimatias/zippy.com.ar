module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true,
    jest: true,
  },

  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },

  plugins: ['@typescript-eslint'],

  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],

  ignorePatterns: ['**/dist/**', '**/node_modules/**'],

  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/consistent-type-imports': 'warn',

    // Permite args no usados si empiezan con _
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
  },

  overrides: [
    // Permitir require en scripts JS (Node runtime)
    {
      files: ['scripts/**/*.js', 'services/**/prisma/**/*.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },

    // Permitir require en specs si aparecen mocks dinámicos
    {
      files: ['**/*.spec.ts'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },

    // Permitir loops tipo polling en smoke-test
    {
      files: ['scripts/smoke-test.js'],
      rules: {
        'no-constant-condition': 'off',
      },
    },
  ],
};