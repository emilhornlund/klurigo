import type { Meta, StoryObj } from '@storybook/react'
import { withRouter } from 'storybook-addon-remix-react-router'

import { withMockAuth } from '../../../.storybook/mockAuthContext'
import Button from '../Button'
import Typography from '../Typography'

import Page from './Page'

const meta = {
  title: 'Components/Page',
  component: Page,
  decorators: [withRouter, withMockAuth],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Page>

export default meta
type Story = StoryObj<typeof meta>

const Header = () => (
  <>
    <a href="#">Link</a>
    <Button
      id="header-action"
      type="button"
      size="small"
      variant="primary"
      intent="accent">
      Action
    </Button>
  </>
)

const Footer = ({ inverse = true }: { inverse?: boolean }) => (
  <div
    style={{
      width: '100%',
      padding: '1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: `2px dashed ${inverse ? 'white' : 'black'}`,
      boxSizing: 'border-box',
    }}>
    <Typography
      align="center"
      color={inverse ? 'inverse' : undefined}
      noOpacity>
      Footer
    </Typography>
  </div>
)

const Content = ({
  label,
  inverse = true,
}: {
  label: string
  inverse?: boolean
}) => (
  <div
    style={{
      width: '100%',
      minHeight: '160px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: `2px dashed ${inverse ? 'white' : 'black'}`,
      boxSizing: 'border-box',
    }}>
    <Typography
      align="center"
      color={inverse ? 'inverse' : undefined}
      noOpacity>
      {label}
    </Typography>
  </div>
)

export const Contained = {
  args: {
    layout: 'contained',
    header: <Header />,
    footer: <Footer />,
    profile: true,
    children: <Content label="Contained" />,
  },
} satisfies Story

export const Compact = {
  args: {
    layout: 'compact',
    header: <Header />,
    footer: <Footer />,
    profile: true,
    children: <Content label="Compact" />,
  },
} satisfies Story

export const Fill = {
  args: {
    layout: 'fill',
    header: <Header />,
    footer: <Footer />,
    profile: true,
    children: <Content label="Fill" />,
  },
} satisfies Story

export const CompactFill = {
  args: {
    layout: 'compactFill',
    header: <Header />,
    footer: <Footer />,
    profile: true,
    children: <Content label="Compact Fill" />,
  },
} satisfies Story

export const FullBleed = {
  args: {
    layout: 'fullBleed',
    header: <Header />,
    footer: <Footer inverse={false} />,
    profile: true,
    children: <Content label="Full Bleed" inverse={false} />,
  },
} satisfies Story
