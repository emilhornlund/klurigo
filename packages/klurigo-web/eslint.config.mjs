import pluginReact from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

import {
  browserConfig,
  nodeConfigFor,
  sharedConfig,
} from '../../eslint.config.mjs'

const reactFiles = ['src/**/*.{js,mjs,cjs,ts,jsx,tsx}']

export default [
  ...sharedConfig,
  browserConfig,
  nodeConfigFor(['*.config.{js,mjs,cjs,ts}', 'playwright*.{js,mjs,cjs,ts}']),
  {
    ...pluginReact.configs.flat.recommended,
    files: reactFiles,
  },
  {
    files: reactFiles,
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Preserve the frontend's existing React 19 and app-state exceptions.
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
    },
  },
]
