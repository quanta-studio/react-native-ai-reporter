module.exports = {
  preset: 'react-native',
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.{ts,tsx}'],
  modulePathIgnorePatterns: [
    '<rootDir>/example/',
    '<rootDir>/lib/',
    '<rootDir>/.worktrees/',
    '<rootDir>/.bundle-check/',
  ],
};
