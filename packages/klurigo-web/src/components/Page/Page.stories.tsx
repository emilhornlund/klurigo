import type { Meta, StoryObj } from '@storybook/react'
import { withRouter } from 'storybook-addon-remix-react-router'

import { withMockAuth } from '../../../.storybook/mockAuthContext'
import Button from '../Button'
import Typography from '../Typography'

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

export const Contained = {
  args: {
    layout: 'contained',
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

export const Compact = {
  args: {
    layout: 'compact',
    children: <Typography align="center">Compact content</Typography>,
  },
} satisfies Story

export const Fill = {
  args: {
    layout: 'fill',
    children: <Typography align="center">Fill content</Typography>,
  },
} satisfies Story

export const CompactFill = {
  args: {
    layout: 'compactFill',
    children: <Typography align="center">Compact fill content</Typography>,
  },
} satisfies Story

export const FullBleed = {
  name: 'Full Bleed',
  decorators: [withMockAuth],
  args: {
    layout: 'fill',
    fullBleed: true,
    header: (
      <Button
        id="secondary-button"
        type="button"
        size="small"
        variant="primary"
        intent="accent">
        Action
      </Button>
    ),
    footer: <Typography align="center">Footer</Typography>,
    profile: true,
    children: <Typography align="center">Content</Typography>,
  },
} satisfies Story
