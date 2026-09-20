import type { Meta, StoryObj } from '@storybook/react'

import Select from './Select'

const values = [
  { key: 'option-1', value: 'option-1', valueLabel: 'Option 1' },
  { key: 'option-2', value: 'option-2', valueLabel: 'Option 2' },
  { key: 'option-3', value: 'option-3', valueLabel: 'Option 3' },
]

const meta = {
  title: 'Inputs/Select',
  component: Select,
  tags: ['autodocs'],
  args: {
    id: 'my-select',
    values,
  },
} satisfies Meta<typeof Select>

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

export const LightSurfaceSmall = {
  args: {
    surface: 'light',
    size: 'small',
  },
} satisfies Story

export const Disabled = {
  args: {
    disabled: true,
  },
} satisfies Story

export const Error = {
  args: {
    required: true,
    value: '',
    forceValidate: true,
  },
} satisfies Story

export const CustomError = {
  args: {
    customErrorMessage: 'Custom error',
    forceValidate: true,
  },
} satisfies Story
