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

const variants = ['extraLargeTitle', 'title', 'title2', 'body', 'link'] as const

export const AllVariants: Story = {
  args: {
    variant: 'body',
    children: 'Preview',
  },
  render: () => {
    return (
      <div
        style={{
          minHeight: '100vh',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          maxWidth: 1000,
          margin: '0 auto',
          overflowY: 'auto',
        }}>
        {variants.map((variant) => (
          <div
            key={variant}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Typography variant="title2" width="full">
              Variant: {variant}
            </Typography>

            <Typography variant={variant}>
              The quick brown fox jumps over the lazy dog.
            </Typography>

            <div style={{ height: 1, opacity: 0.2, background: 'white' }} />
          </div>
        ))}
      </div>
    )
  },
}
