module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
    node: true
  },
  extends: ['eslint:recommended', 'prettier'],
  parserOptions: {
    ecmaVersion: 12
  },
  rules: {},
  overrides: [
    {
      files: ['server.js'],
      rules: {
        'no-undef': 'off'
      }
    }
  ]
};
