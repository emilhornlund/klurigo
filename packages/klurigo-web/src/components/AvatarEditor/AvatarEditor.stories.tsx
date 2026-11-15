import {
  DEFAULT_CRITTERS_AVATAR_V1,
  randomizeCrittersAvatar,
} from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { expect, fn, userEvent, within } from 'storybook/test'

import AvatarEditor from './AvatarEditor'

const meta = {
  title: 'Inputs/AvatarEditor',
  component: AvatarEditor,
  parameters: { layout: 'fullscreen' },
  args: {
    value: DEFAULT_CRITTERS_AVATAR_V1,
    onChange: fn(),
    onRandomize: fn(),
  },
  render: function ControlledEditor(args) {
    const [value, setValue] = useState(args.value)
    return (
      <div
        style={{
          width: 'min(100vw, 960px)',
          height: '100dvh',
          overflow: 'auto',
          padding: '1rem',
          background: args.presentation === 'dialog' ? 'white' : undefined,
        }}>
        <AvatarEditor
          {...args}
          value={value}
          onChange={(next) => {
            setValue(next)
            args.onChange(next)
          }}
          onRandomize={() => {
            const next = randomizeCrittersAvatar()
            setValue(next)
            args.onChange(next)
            args.onRandomize?.()
          }}
        />
      </div>
    )
  },
} satisfies Meta<typeof AvatarEditor>

export default meta
type Story = StoryObj<typeof meta>

export const Customize = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const preview = canvas.getByRole('img', { name: 'Your avatar preview' })
    const originalSource = preview.getAttribute('src')
    await userEvent.click(canvas.getByRole('radio', { name: 'Body: Block' }))
    await expect(args.onChange).toHaveBeenLastCalledWith({
      ...DEFAULT_CRITTERS_AVATAR_V1,
      body: 'block',
    })
    await expect(preview).not.toHaveAttribute('src', originalSource)
    await userEvent.selectOptions(canvas.getByLabelText('Customize'), 'Head')
    await userEvent.click(
      canvas.getByRole('radio', { name: 'Head decoration: None' }),
    )
    await expect(args.onChange).toHaveBeenLastCalledWith({
      ...DEFAULT_CRITTERS_AVATAR_V1,
      body: 'block',
      top: null,
    })
  },
} satisfies Story

export const Colors = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.selectOptions(canvas.getByLabelText('Customize'), 'Colors')
    await expect(
      canvas.getByRole('radio', {
        name: 'Body color: Gold (matches other color)',
      }),
    ).toBeDisabled()
    await userEvent.click(
      canvas.getByRole('radio', { name: 'Body color: Sky' }),
    )
    await expect(args.onChange).toHaveBeenLastCalledWith({
      ...DEFAULT_CRITTERS_AVATAR_V1,
      bodyColor: '#7dd3fc',
    })
    await expect(
      canvas.getByRole('radio', {
        name: 'Accent color: Sky (matches other color)',
      }),
    ).toBeDisabled()
  },
} satisfies Story

export const Randomize = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Randomize' }))
    await expect(args.onRandomize).toHaveBeenCalledOnce()
    await expect(args.onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        version: 1,
        style: 'critters',
        artworkVersion: 'v1',
      }),
    )
  },
} satisfies Story

export const Dialog = {
  args: { presentation: 'dialog' },
} satisfies Story

export const NoDecorations = {
  args: {
    value: {
      ...DEFAULT_CRITTERS_AVATAR_V1,
      top: null,
      pattern: null,
      cheeks: null,
    },
  },
} satisfies Story

export const Saving = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByLabelText('Customize')).toBeDisabled()
    await expect(
      canvas.getByRole('button', { name: 'Randomize' }),
    ).toBeDisabled()
    for (const choice of canvas.getAllByRole('radio')) {
      await expect(choice).toBeDisabled()
    }
  },
} satisfies Story
