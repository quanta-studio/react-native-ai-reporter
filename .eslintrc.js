module.exports = {
  root: true,
  extends: '@react-native',
  ignorePatterns: [
    'lib/',
    'example/',
    'node_modules/',
    '.worktrees/',
    '.bundle-check/',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
  },
};
