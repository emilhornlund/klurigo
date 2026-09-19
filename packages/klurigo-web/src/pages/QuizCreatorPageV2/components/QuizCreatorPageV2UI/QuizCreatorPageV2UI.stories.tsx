import type { Meta, StoryObj } from '@storybook/react'
import { withRouter } from 'storybook-addon-remix-react-router'

import { withMockAuth } from '../../../../../.storybook/mockAuthContext'

import QuizCreatorPageV2UI from './QuizCreatorPageV2UI'

const meta = {
  title: 'Pages/QuizCreatorPageV2',
  component: QuizCreatorPageV2UI,
  decorators: [withRouter, withMockAuth],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof QuizCreatorPageV2UI>

export default meta
type Story = StoryObj<typeof meta>

export const Default = {
  args: {},
} satisfies Story
