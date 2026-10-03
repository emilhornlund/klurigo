// jest.config.cjs
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  roots: ['<rootDir>/src', '<rootDir>/scripts'],
  testRegex: '.*\\.(e2e-)?spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
    '^.+\\.js$': '<rootDir>/scripts/jest-javascript-transformer.cjs',
  },
  moduleNameMapper: {
    '^@klurigo/common(.*)$': '<rootDir>/../common/src$1',
    '^@nestjs/terminus$': '<rootDir>/scripts/jest-terminus-shim.cjs',
  },
  collectCoverageFrom: [
    '**/*.{ts,js}',
    '!**/*.module.ts',
    '!**/*.(e2e-)?spec.{ts,js}',
    '!**/index.ts',
    '!**/main.ts',
    '!**/instrument.ts',
  ],
  coverageDirectory: '<rootDir>/coverage',
  testEnvironment: 'node',
  transformIgnorePatterns: [],
  detectOpenHandles: true,
  setupFilesAfterEnv: ['jest-extended/all'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
}
