import type { Meta, StoryObj } from '@storybook/react'
import type { FC } from 'react'
import { useState } from 'react'

import SegmentedControl, {
  type SegmentedControlProps,
} from './SegmentedControl'

const values = [
  { key: 'first', value: 'first', valueLabel: 'First' },
  { key: 'second', value: 'second', valueLabel: 'Second' },
  { key: 'third', value: 'third', valueLabel: 'Third' },
]

const SegmentedControlStoryComponent: FC<SegmentedControlProps> = (props) => {
  const [value, setValue] = useState<string>()

  return <SegmentedControl {...props} value={value} onChange={setValue} />
}

const meta = {
  title: 'Inputs/SegmentedControl',
  component: SegmentedControl,
  tags: ['autodocs'],
  render: (props) => <SegmentedControlStoryComponent {...props} />,
  args: {
    id: 'my-segmented-control',
    values,
  },
} satisfies Meta<typeof SegmentedControl>

export default meta
type Story = StoryObj<typeof meta>

export const Playground = {
  args: {},
} satisfies Story

export const BrandSurface = {
  args: {
    surface: 'brand',
  },
} satisfies Story

export const LightSurface = {
  args: {
    surface: 'light',
  },
} satisfies Story

export const Small = {
  args: {
    size: 'small',
  },
} satisfies Story

export const BrandSurfaceSmall = {
  args: {
    surface: 'brand',
    size: 'small',
  },
} satisfies Story

export const LightSurfaceSmall = {
  args: {
    surface: 'light',
    size: 'small',
  },
} satisfies Story
