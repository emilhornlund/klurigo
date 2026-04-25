// jest.config.cjs
// eslint-disable-next-line no-undef
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  roots: ['<rootDir>/src'],
  testRegex: '.*\\.(e2e-)?spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleNameMapper: {
    '^klurigo/common(.*)$': '<rootDir>/../common/src$1',
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
  transformIgnorePatterns: ['/node_modules/(?!(klurigo/common|uuid)/)'],
  detectOpenHandles: true,
  forceExit: true,
  maxWorkers: 1,
  setupFilesAfterEnv: ['jest-extended/all'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
}
