import type { Meta, StoryObj } from '@storybook/react'

import TextField from './TextField'

const meta = {
  title: 'Inputs/TextField',
  component: TextField,
  tags: ['autodocs'],
  args: {
    id: 'my-text-field',
    type: 'text',
    placeholder: 'Placeholder',
  },
} satisfies Meta<typeof TextField>

export default meta
type Story = StoryObj<typeof meta>

const storyStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2rem',
} as const

const brandSurfaceStyle = {
  padding: '2rem',
} as const

const lightSurfaceStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #dfe4ea',
  borderRadius: '0.75rem',
  padding: '2rem',
} as const

export const Playground = {
  args: {},
} satisfies Story

export const BrandSurface = {
  render: () => (
    <div style={brandSurfaceStyle}>
      <TextField
        id="brand-text-field"
        type="text"
        surface="brand"
        placeholder="Placeholder"
      />
    </div>
  ),
} satisfies Story

export const LightSurface = {
  render: () => (
    <div style={lightSurfaceStyle}>
      <TextField
        id="light-text-field"
        type="text"
        surface="light"
        placeholder="Placeholder"
      />
    </div>
  ),
} satisfies Story

export const Types = {
  render: () => (
    <div style={storyStyle}>
      <TextField id="text-field" type="text" placeholder="Text" />

      <TextField
        id="number-field"
        type="number"
        placeholder="Number"
        min={0}
        max={100}
      />

      <TextField id="password-field" type="password" placeholder="Password" />
    </div>
  ),
} satisfies Story

export const Sizes = {
  render: () => (
    <div style={storyStyle}>
      <TextField
        id="normal-text-field"
        type="text"
        size="normal"
        placeholder="Normal"
      />

      <TextField
        id="small-text-field"
        type="text"
        size="small"
        placeholder="Small"
      />
    </div>
  ),
} satisfies Story

export const Disabled = {
  args: {
    disabled: true,
  },
} satisfies Story

export const ReadOnly = {
  args: {
    value: 'Read-only value',
    readOnly: true,
  },
} satisfies Story

export const Error = {
  args: {
    required: true,
    forceValidate: true,
  },
} satisfies Story

export const Checkbox = {
  args: {
    checked: true,
  },
} satisfies Story

export const CheckboxDisabled = {
  args: {
    checked: true,
    disabled: true,
  },
} satisfies Story

export const CheckboxSmall = {
  args: {
    checked: true,
    size: 'small',
  },
} satisfies Story
