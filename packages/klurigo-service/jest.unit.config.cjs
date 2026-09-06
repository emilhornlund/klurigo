// eslint-disable-next-line no-undef
module.exports = {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, no-undef
  ...require('./jest.config.cjs'),
  // Unit tests must not include e2e specs, even though both use the `spec.ts`
  // suffix.
  testRegex: '^(?!.*\\.e2e-spec\\.ts$).*\\.spec\\.ts$',
  coverageDirectory: '<rootDir>/coverage/unit',
}
