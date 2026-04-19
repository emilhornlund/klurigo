import type { Meta, StoryObj } from '@storybook/react'

import Typography from './Typography'

const meta = {
  title: 'Theme/Typography',
  component: Typography,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Typography>

export default meta
type Story = StoryObj<typeof meta>

const samples = [
  { variant: 'extraLargeTitle', text: 'Heading' },
  { variant: 'title', text: 'Heading' },
  { variant: 'title2', text: 'Heading' },
  { variant: 'title3', text: 'Heading' },
  { variant: 'title4', text: 'Heading' },
  { variant: 'title5', text: 'Heading' },
  {
    variant: 'body',
    text: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quos blanditiis tenetur',
  },
  {
    variant: 'body2',
    text: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quos blanditiis tenetur',
  },
  { variant: 'control', text: 'Sample text' },
  { variant: 'control2', text: 'Sample text' },
  { variant: 'link', text: 'Sample text' },
  { variant: 'link2', text: 'Sample text' },
] as const

export const AllVariants: Story = {
  args: {
    variant: 'body',
    children: 'Preview',
  },
  render: () => (
    <div
      style={{
        minHeight: '100vh',
        padding: '48px 56px',
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 16,
        boxSizing: 'border-box',
      }}>
      {samples.map(({ variant, text }) => (
        <Typography key={variant} variant={variant} color="inverse" noOpacity>
          {variant}. {text}
        </Typography>
      ))}
    </div>
  ),
}
