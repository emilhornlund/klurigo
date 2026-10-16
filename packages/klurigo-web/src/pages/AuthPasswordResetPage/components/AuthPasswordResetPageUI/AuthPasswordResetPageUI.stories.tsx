import type { Meta, StoryObj } from '@storybook/react'
import { withRouter } from 'storybook-addon-remix-react-router'

import AuthPasswordResetPageUI from './AuthPasswordResetPageUI'

const meta = {
  title: 'Pages/AuthPasswordResetPage',
  component: AuthPasswordResetPageUI,
  decorators: [withRouter],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof AuthPasswordResetPageUI>

export default meta
type Story = StoryObj<typeof meta>

export const Default = {
  args: {
    loading: false,
    error: false,
    submissionError: false,
    onSubmit: () => undefined,
  },
} satisfies Story

export const Loading = {
  args: {
    loading: true,
    error: false,
    submissionError: false,
    onSubmit: () => undefined,
  },
} satisfies Story

export const Error = {
  args: {
    loading: false,
    error: true,
    submissionError: false,
    onSubmit: () => undefined,
  },
} satisfies Story
