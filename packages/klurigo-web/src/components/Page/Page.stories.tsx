import type { Meta, StoryObj } from '@storybook/react'
import { withRouter } from 'storybook-addon-remix-react-router'

import Page from './Page'

const meta = {
  title: 'Components/Page',
  component: Page,
  decorators: [withRouter],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Page>

export default meta
type Story = StoryObj<typeof meta>

export const Default = {
  args: {
    header: (
      <>
        <a>About</a>
        <a>GitHub</a>
      </>
    ),
    footer: (
      <>
        <a>Some link</a>
      </>
    ),
    profile: true,
    children: <div>Content</div>,
  },
} satisfies Story

export const FullBleed = {
  name: 'Full Bleed',
  args: {
    layout: 'fullBleed',
    height: 'full',
    width: 'full',
    header: (
      <>
        <a>About</a>
        <a>GitHub</a>
      </>
    ),
    footer: (
      <>
        <a>Some link</a>
      </>
    ),
    profile: true,
    children: <div>Content</div>,
  },
} satisfies Story
