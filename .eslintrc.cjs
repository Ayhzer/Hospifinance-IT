module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  // Constante injectée au build par Vite (define) depuis package.json
  globals: { __APP_VERSION__: 'readonly' },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  // `_old` = sauvegarde legacy non utilisée, `dist` = build, `backend` linté via override Node
  ignorePatterns: ['dist', '_old', '.eslintrc.cjs'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh'],
  rules: {
    // Règle purement DX (Fast Refresh) sans impact correctness : le projet co-localise
    // volontairement les hooks de contexte avec leurs providers.
    'react-refresh/only-export-components': 'off',
    'react/prop-types': 'off',
    // UI 100 % française : apostrophes/guillemets littéraux fréquents dans le texte JSX.
    'react/no-unescaped-entities': 'off',
    // Les catch {} vides sont volontaires (storage/API indisponible = silencieux).
    'no-empty': ['error', { allowEmptyCatch: true }],
    // ignoreRestSiblings : pattern { secret, ...reste } pour omettre un champ.
    // ^_ : argument/variable volontairement inutilisé (ex. `next` d'Express).
    'no-unused-vars': ['error', { ignoreRestSiblings: true, argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      // Fichiers exécutés sous Node (process, Buffer, __dirname, …)
      files: ['vite.config.js', 'local-server.js', 'backend/**/*.js'],
      env: { node: true, browser: false },
    },
    {
      // Script shell MongoDB : `db`/`print` sont des globals injectés par mongosh
      files: ['backend/init-mongo.js'],
      globals: { db: 'writable', print: 'readonly' },
    },
  ],
};
