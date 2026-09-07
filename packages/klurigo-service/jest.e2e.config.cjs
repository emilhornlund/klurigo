// eslint-disable-next-line no-undef
module.exports = {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, no-undef
  ...require('./jest.config.cjs'),
  testRegex: '.*\\.e2e-spec\\.ts$',
  coverageDirectory: '<rootDir>/coverage/e2e',
}
