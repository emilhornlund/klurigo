import { nodeConfig, sharedConfig } from '../../eslint.config.mjs'

export default [
  ...sharedConfig,
  nodeConfig,
  {
    // Service unit fixtures intentionally allow explicit any values.
    files: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]
