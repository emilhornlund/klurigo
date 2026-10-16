import { MediaType } from '@klurigo/common'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-player', () => ({
  default: ({
    src,
    playing,
    loop,
    controls,
    muted,
    width,
    height,
    onError,
  }: {
    src: string
    playing: boolean
    loop: boolean
    controls: boolean
    muted: boolean
    width?: string
    height?: string
    onError: () => void
  }) => (
    <div
      data-testid="react-player"
      data-src={src}
      data-playing={playing}
      data-loop={loop}
      data-controls={controls}
      data-muted={muted}
      data-width={width}
      data-height={height}>
      <button type="button" onClick={onError}>
        trigger-error
      </button>
    </div>
  ),
}))

import ResponsivePlayer from './ResponsivePlayer'

describe('ResponsivePlayer', () => {
  it('preserves playback settings and shows an accessible video fallback on error', () => {
    render(
      <ResponsivePlayer
        url="https://example.com/video.mp4"
        type={MediaType.Video}
      />,
    )

    const player = screen.getByTestId('react-player')
    expect(player).toHaveAttribute('data-src', 'https://example.com/video.mp4')
    expect(player).toHaveAttribute('data-playing', 'true')
    expect(player).toHaveAttribute('data-loop', 'true')
    expect(player).toHaveAttribute('data-controls', 'true')
    expect(player).toHaveAttribute('data-muted', 'false')
    expect(player).toHaveAttribute('data-width', '100%')
    expect(player).toHaveAttribute('data-height', '100%')

    fireEvent.click(screen.getByRole('button', { name: 'trigger-error' }))

    expect(screen.getByRole('status')).toHaveTextContent('Video unavailable')
    expect(screen.queryByTestId('react-player')).not.toBeInTheDocument()
  })

  it('labels audio failures and clears the error when the media URL changes', () => {
    const { rerender } = render(
      <ResponsivePlayer
        url="https://example.com/broken.mp3"
        type={MediaType.Audio}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'trigger-error' }))
    expect(screen.getByRole('status')).toHaveTextContent('Audio unavailable')

    rerender(
      <ResponsivePlayer
        url="https://example.com/recovered.mp3"
        type={MediaType.Audio}
      />,
    )

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByTestId('react-player')).toHaveAttribute(
      'data-src',
      'https://example.com/recovered.mp3',
    )
  })

  it('clears the error when media type changes', () => {
    const { rerender } = render(
      <ResponsivePlayer
        url="https://example.com/media"
        type={MediaType.Video}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'trigger-error' }))
    rerender(
      <ResponsivePlayer
        url="https://example.com/media"
        type={MediaType.Audio}
      />,
    )

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByTestId('react-player')).toBeInTheDocument()
  })
})
