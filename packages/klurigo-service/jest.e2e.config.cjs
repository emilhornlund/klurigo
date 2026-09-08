module.exports = {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ...require('./jest.config.cjs'),
  testRegex: '.*\\.e2e-spec\\.ts$',
  coverageDirectory: '<rootDir>/coverage/e2e',
  // E2e specs reset shared MongoDB and Redis state during their lifecycle.
  maxWorkers: 1,
}
