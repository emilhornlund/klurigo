import type { Meta, StoryObj } from '@storybook/react'

import Textarea from './Textarea'

const meta = {
  title: 'Inputs/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  args: {
    id: 'my-textarea',
    placeholder: 'Placeholder',
  },
} satisfies Meta<typeof Textarea>

export default meta
type Story = StoryObj<typeof meta>

const storyStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2rem',
} as const

const brandSurfaceStyle = {
  minHeight: '12rem',
  padding: '2rem',
} as const

const lightSurfaceStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #dfe4ea',
  borderRadius: '0.75rem',
  minHeight: '12rem',
  padding: '2rem',
} as const

export const Playground = {
  args: {},
} satisfies Story

export const BrandSurface = {
  render: () => (
    <div style={brandSurfaceStyle}>
      <Textarea id="brand-textarea" surface="brand" placeholder="Placeholder" />
    </div>
  ),
} satisfies Story

export const LightSurface = {
  render: () => (
    <div style={lightSurfaceStyle}>
      <Textarea id="light-textarea" surface="light" placeholder="Placeholder" />
    </div>
  ),
} satisfies Story

export const Types = {
  render: () => (
    <div style={storyStyle}>
      <Textarea id="text-textarea" type="text" placeholder="Text" />

      <Textarea id="code-textarea" type="code" placeholder="Code" />
    </div>
  ),
} satisfies Story

export const Disabled = {
  args: {
    value: 'Disabled value',
    disabled: true,
  },
} satisfies Story

export const Error = {
  args: {
    required: true,
    forceValidate: true,
  },
} satisfies Story

export const CustomError = {
  args: {
    customErrorMessage: 'Custom error',
    forceValidate: true,
  },
} satisfies Story
