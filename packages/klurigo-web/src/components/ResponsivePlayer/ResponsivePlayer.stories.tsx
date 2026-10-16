import { MediaType } from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { expect, within } from 'storybook/test'

import ResponsivePlayer from './ResponsivePlayer'

const meta = {
  component: ResponsivePlayer,
} satisfies Meta<typeof ResponsivePlayer>

export default meta
type Story = StoryObj<typeof meta>

export const Video = {
  args: {
    url: 'https://www.youtube.com/watch?v=LXb3EKWsInQ',
  },
} satisfies Story

export const Audio = {
  args: {
    url: 'https://onlinetestcase.com/wp-content/uploads/2023/06/500-KB-MP3.mp3',
  },
} satisfies Story

export const UnavailableVideo = {
  args: {
    url: '/__e2e__/unavailable.mp4',
    type: MediaType.Video,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByRole('status')).toHaveTextContent(
      'Video unavailable',
    )
  },
} satisfies Story

export const RecoverFromUnavailableVideo = {
  args: {
    url: '/__e2e__/unavailable.mp4',
    type: MediaType.Video,
  },
  render: function RecoveryStory() {
    const [url, setURL] = useState('/__e2e__/unavailable.mp4')

    return (
      <>
        <button type="button" onClick={() => setURL('')}>
          Replace media
        </button>
        <ResponsivePlayer url={url} type={MediaType.Video} playing={false} />
      </>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByRole('status')).toHaveTextContent(
      'Video unavailable',
    )
    await canvas.getByRole('button', { name: 'Replace media' }).click()
    await expect(canvas.queryByRole('status')).not.toBeInTheDocument()
  },
} satisfies Story
