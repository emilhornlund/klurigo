import type { Decorator } from '@storybook/react'
import type { Preview } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'

import '../src/styles/fonts.scss'
import '../src/styles/index.css'
import './storybook.styles.css'

const withAppRouter: Decorator = (Story) => (
  <MemoryRouter initialEntries={['/']}>
    <Story />
  </MemoryRouter>
)

const preview: Preview = {
  decorators: [withAppRouter],
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
