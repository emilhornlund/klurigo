import type { Preview } from '@storybook/react-vite'

import '../src/styles/fonts.scss'
import '../src/styles/index.css'
import './storybook.styles.css'

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: '#4148f0',
      options: {
        default: { name: 'Default', value: '#4148f0' },
      },
    },
    options: {
      storySort: {
        order: ['Theme', 'Components'],
      },
    },
  },
  initialGlobals: {
    backgrounds: { value: 'default' },
  },
}

export default preview
