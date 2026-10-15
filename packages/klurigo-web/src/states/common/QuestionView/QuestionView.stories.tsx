import { QuestionType } from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'
import { withRouter } from 'storybook-addon-remix-react-router'

import QuestionView from './QuestionView'

const meta = {
  component: QuestionView,
  decorators: [withRouter],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof QuestionView>

export default meta
type Story = StoryObj<typeof meta>

const countdown = {
  initiatedTime: new Date().toISOString(),
  expiryTime: new Date(Date.now() + 30_000).toISOString(),
  serverTime: new Date().toISOString(),
}

export const InteractiveMultiChoice: Story = {
  args: {
    question: {
      type: QuestionType.MultiChoice,
      question: 'Which city was the capital of ancient Carthage?',
      answers: [
        { value: 'Carthage' },
        { value: 'Alexandria' },
        { value: 'Athens' },
        { value: 'Rome' },
      ],
      duration: 30,
    },
    countdown,
  },
}
