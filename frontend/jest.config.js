const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Path to Next.js app
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
    '!src/app/layout.tsx',
  ],
  coverageThreshold: {
    global: {
      lines: 60,
      branches: 50,
    },
  },
  testTimeout: 10000,
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/tests/e2e/'],
};

module.exports = createJestConfig(customJestConfig);
