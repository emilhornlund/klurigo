import type { Meta, StoryObj } from '@storybook/react'
import { type FC, useState } from 'react'

import StarRating, { type StarRatingProps } from './StarRating'

const InteractiveStarRating: FC<StarRatingProps> = (props) => {
  const [value, setValue] = useState<number | undefined>(props.value)
  return <StarRating {...props} value={value} onChange={setValue} />
}

const meta = {
  title: 'Components/StarRating',
  component: StarRating,
  tags: ['autodocs'],
} satisfies Meta<typeof StarRating>

export default meta
type Story = StoryObj<typeof meta>

export const ReadOnly = {
  name: 'Read-only',
  args: {
    value: 4,
    size: 'large',
  },
} satisfies Story

export const ReadOnlyDecimal = {
  name: 'Read-only (decimal)',
  args: {
    value: 3.7,
    size: 'large',
  },
} satisfies Story

export const SmallSize = {
  name: 'Small (read-only)',
  args: {
    value: 3,
    size: 'small',
  },
} satisfies Story

export const Interactive = {
  name: 'Interactive',
  render: (props) => <InteractiveStarRating {...props} />,
  args: {
    size: 'large',
  },
} satisfies Story

export const Disabled = {
  name: 'Disabled',
  render: (props) => <InteractiveStarRating {...props} />,
  args: {
    size: 'large',
    disabled: true,
  },
} satisfies Story
