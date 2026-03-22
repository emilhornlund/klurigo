import type { Meta, StoryObj } from '@storybook/react'

import HorizontalRail from './HorizontalRail'

/** Simple card used to demonstrate rail content in stories. */
const DemoCard = ({
  label,
  wide = false,
}: {
  label: string
  wide?: boolean
}) => (
  <div
    style={{
      flexShrink: 0,
      width: wide ? '300px' : '200px',
      height: '120px',
      background: 'rgba(255,255,255,0.1)',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontWeight: 600,
      scrollSnapAlign: 'start',
    }}>
    {label}
  </div>
)

const SkeletonCard = () => (
  <div
    style={{
      flexShrink: 0,
      width: '200px',
      height: '120px',
      background: 'rgba(255,255,255,0.15)',
      borderRadius: '8px',
      scrollSnapAlign: 'start',
      animation: 'pulse 1.5s ease-in-out infinite',
    }}
  />
)

const meta = {
  title: 'Components/HorizontalRail',
  component: HorizontalRail,
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'dark' },
  },
} satisfies Meta<typeof HorizontalRail>

export default meta
type Story = StoryObj<typeof meta>

export const WithManyCards: Story = {
  args: {
    children: Array.from({ length: 12 }, (_, i) => (
      <DemoCard key={i} label={`Card ${i + 1}`} />
    )),
  },
}

export const HideScrollbar: Story = {
  args: {
    hideScrollbar: true,
    children: Array.from({ length: 12 }, (_, i) => (
      <DemoCard key={i} label={`Card ${i + 1}`} />
    )),
  },
}

export const FewCards: Story = {
  args: {
    children: Array.from({ length: 3 }, (_, i) => (
      <DemoCard key={i} label={`Card ${i + 1}`} />
    )),
  },
}

export const Loading: Story = {
  args: {
    children: Array.from({ length: 8 }, (_, i) => <SkeletonCard key={i} />),
  },
}

export const WideCards: Story = {
  args: {
    children: Array.from({ length: 6 }, (_, i) => (
      <DemoCard key={i} label={`Wide Card ${i + 1}`} wide />
    )),
  },
}
