import type { CountdownEvent } from '@klurigo/common'
import {
  MediaType,
  QuestionImageRevealEffectType,
  QuestionType,
} from '@klurigo/common'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../components/ResponsiveImage', () => {
  const Mock: React.FC<{
    imageURL: string
    alt?: string
    revealEffect?: { type: QuestionImageRevealEffectType; countdown?: unknown }
  }> = ({ imageURL, alt, revealEffect }) => (
    <img
      data-testid="responsive-image"
      data-src={imageURL}
      alt={alt ?? ''}
      data-effect-type={revealEffect?.type ?? ''}
      data-has-countdown={revealEffect?.countdown ? 'true' : 'false'}
    />
  )
  return { default: Mock }
})

vi.mock('../../../components/ResponsivePlayer', () => {
  const Mock: React.FC<{ url: string }> = ({ url }) => (
    <div data-testid="responsive-player" data-url={url} />
  )
  return { default: Mock }
})

import QuestionMedia from './QuestionMedia'

describe('QuestionMedia', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when no media provided', () => {
    const { container } = render(
      <QuestionMedia type={QuestionType.MultiChoice} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('returns null when type is Pin even if media is provided', () => {
    const { container, rerender } = render(
      <QuestionMedia
        type={QuestionType.Pin}
        media={{ type: MediaType.Image, url: 'https://img/a.jpg' }}
      />,
    )
    expect(container.firstChild).toBeNull()

    rerender(
      <QuestionMedia
        type={QuestionType.Pin}
        media={{ type: MediaType.Audio, url: 'https://cdn/a.mp3' }}
      />,
    )
    expect(container.firstChild).toBeNull()

    rerender(
      <QuestionMedia
        type={QuestionType.Pin}
        media={{ type: MediaType.Video, url: 'https://cdn/v.mp4' }}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders ResponsiveImage for image media when type is not Pin', () => {
    const { container } = render(
      <QuestionMedia
        type={QuestionType.MultiChoice}
        media={{ type: MediaType.Image, url: 'https://img/a.jpg' }}
        alt="cute cat"
      />,
    )
    const img = screen.getByTestId('responsive-image')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('data-src', 'https://img/a.jpg')
    expect(img).toHaveAttribute('alt', 'cute cat')

    expect(screen.queryByTestId('responsive-player')).toBeNull()
    expect(container).toMatchSnapshot()
  })

  it('renders ResponsivePlayer for audio media', () => {
    const { container } = render(
      <QuestionMedia
        type={QuestionType.TrueFalse}
        media={{ type: MediaType.Audio, url: 'https://cdn/a.mp3' }}
      />,
    )
    const player = screen.getByTestId('responsive-player')
    expect(player).toBeInTheDocument()
    expect(player).toHaveAttribute('data-url', 'https://cdn/a.mp3')

    expect(screen.queryByTestId('responsive-image')).toBeNull()
    expect(container).toMatchSnapshot()
  })

  it('renders ResponsivePlayer for video media', () => {
    const { container } = render(
      <QuestionMedia
        type={QuestionType.MultiChoice}
        media={{ type: MediaType.Video, url: 'https://cdn/v.mp4' }}
      />,
    )
    const player = screen.getByTestId('responsive-player')
    expect(player).toBeInTheDocument()
    expect(player).toHaveAttribute('data-url', 'https://cdn/v.mp4')

    expect(screen.queryByTestId('responsive-image')).toBeNull()
    expect(container).toMatchSnapshot()
  })

  it.each([
    [
      MediaType.Audio,
      'Audio question',
      'Listen up!',
      'The sound is coming from the host!',
    ],
    [
      MediaType.Video,
      'Video question',
      'Eyes on the big screen!',
      'The host has the video!',
    ],
  ] as const)(
    'renders an indicator instead of ResponsivePlayer for player %s media',
    (mediaType, accessibleLabel, label, instruction) => {
      render(
        <QuestionMedia
          type={QuestionType.MultiChoice}
          media={{ type: mediaType, url: `https://cdn/${mediaType}` }}
          mediaPresentation="player"
        />,
      )

      expect(
        screen.getByRole('group', { name: accessibleLabel }),
      ).toBeInTheDocument()
      expect(screen.getByText(label)).toBeInTheDocument()
      expect(screen.getByText(instruction)).toBeInTheDocument()
      expect(screen.queryByTestId('responsive-player')).not.toBeInTheDocument()
      expect(document.querySelector('audio, video')).not.toBeInTheDocument()
      expect(screen.getByTestId('question-media')).not.toHaveTextContent(
        `https://cdn/${mediaType}`,
      )
    },
  )

  it('continues rendering ResponsiveImage in player presentation', () => {
    render(
      <QuestionMedia
        type={QuestionType.MultiChoice}
        media={{ type: MediaType.Image, url: 'https://img/a.jpg' }}
        mediaPresentation="player"
      />,
    )

    expect(screen.getByTestId('responsive-image')).toHaveAttribute(
      'data-src',
      'https://img/a.jpg',
    )
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
  })

  it('updates player presentation when media changes between audio, video, and image', () => {
    const { rerender } = render(
      <QuestionMedia
        type={QuestionType.MultiChoice}
        media={{ type: MediaType.Audio, url: 'https://cdn/a.mp3' }}
        mediaPresentation="player"
      />,
    )
    expect(
      screen.getByRole('group', { name: 'Audio question' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Listen up!')).toBeInTheDocument()

    rerender(
      <QuestionMedia
        type={QuestionType.MultiChoice}
        media={{ type: MediaType.Video, url: 'https://cdn/v.mp4' }}
        mediaPresentation="player"
      />,
    )
    expect(
      screen.getByRole('group', { name: 'Video question' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Eyes on the big screen!')).toBeInTheDocument()
    expect(
      screen.queryByRole('group', { name: 'Audio question' }),
    ).not.toBeInTheDocument()

    rerender(
      <QuestionMedia
        type={QuestionType.MultiChoice}
        media={{ type: MediaType.Image, url: 'https://img/a.jpg' }}
        mediaPresentation="player"
      />,
    )
    expect(screen.getByTestId('responsive-image')).toBeInTheDocument()
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
  })

  it('updates correctly when media changes from image to video', () => {
    const { rerender } = render(
      <QuestionMedia
        type={QuestionType.MultiChoice}
        media={{ type: MediaType.Image, url: 'https://img/a.jpg' }}
        alt="img"
      />,
    )
    expect(screen.getByTestId('responsive-image')).toBeInTheDocument()
    expect(screen.queryByTestId('responsive-player')).toBeNull()

    rerender(
      <QuestionMedia
        type={QuestionType.MultiChoice}
        media={{ type: MediaType.Video, url: 'https://cdn/v.mp4' }}
        alt="img"
      />,
    )
    expect(screen.getByTestId('responsive-player')).toBeInTheDocument()
    expect(screen.queryByTestId('responsive-image')).toBeNull()
  })

  it('renders container wrapper when image is shown', () => {
    render(
      <QuestionMedia
        type={QuestionType.MultiChoice}
        media={{ type: MediaType.Image, url: 'https://img/cat.jpg' }}
        alt="cat"
      />,
    )
    expect(screen.getByTestId('question-media')).toBeInTheDocument()
    expect(screen.getByTestId('responsive-image')).toBeInTheDocument()
    expect(screen.queryByTestId('responsive-player')).toBeNull()
  })

  it('renders container wrapper when audio is shown', () => {
    render(
      <QuestionMedia
        type={QuestionType.TrueFalse}
        media={{ type: MediaType.Audio, url: 'https://cdn/a.mp3' }}
      />,
    )
    expect(screen.getByTestId('question-media')).toBeInTheDocument()
    expect(screen.getByTestId('responsive-player')).toBeInTheDocument()
    expect(screen.queryByTestId('responsive-image')).toBeNull()
  })

  it('passes revealEffect.type and countdown to ResponsiveImage when provided', () => {
    const countdown: CountdownEvent = {
      serverTime: '2025-10-12T12:00:00.000Z',
      initiatedTime: '2025-10-12T11:59:59.000Z',
      expiryTime: '2025-10-12T12:00:01.000Z',
    }

    render(
      <QuestionMedia
        type={QuestionType.MultiChoice}
        media={{
          type: MediaType.Image,
          url: 'https://img/effect.jpg',
          effect: QuestionImageRevealEffectType.Square3x3,
        }}
        countdown={countdown}
        alt="with effect"
      />,
    )

    const img = screen.getByTestId('responsive-image')
    expect(img).toHaveAttribute('data-src', 'https://img/effect.jpg')
    expect(img).toHaveAttribute(
      'data-effect-type',
      String(QuestionImageRevealEffectType.Square3x3),
    )
    expect(img).toHaveAttribute('data-has-countdown', 'true')
  })

  it('does not pass revealEffect when effect is missing on image media', () => {
    render(
      <QuestionMedia
        type={QuestionType.MultiChoice}
        media={{ type: MediaType.Image, url: 'https://img/no-effect.jpg' }}
      />,
    )

    const img = screen.getByTestId('responsive-image')
    expect(img.getAttribute('data-effect-type')).toBe('')
    expect(img.getAttribute('data-has-countdown')).toBe('false')
  })

  it('uses empty alt string when alt prop is undefined', () => {
    render(
      <QuestionMedia
        type={QuestionType.MultiChoice}
        media={{ type: MediaType.Image, url: 'https://img/alt.jpg' }}
      />,
    )
    const img = screen.getByTestId('responsive-image')
    expect(img).toHaveAttribute('alt', '')
  })

  it('returns null when image URL is empty string', () => {
    const { container } = render(
      <QuestionMedia
        type={QuestionType.MultiChoice}
        media={{ type: MediaType.Image, url: '' }}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('unmounts content when switching to Pin after rendering media', () => {
    const { rerender, container } = render(
      <QuestionMedia
        type={QuestionType.MultiChoice}
        media={{ type: MediaType.Video, url: 'https://cdn/v.mp4' }}
      />,
    )
    expect(screen.getByTestId('responsive-player')).toBeInTheDocument()

    rerender(
      <QuestionMedia
        type={QuestionType.Pin}
        media={{ type: MediaType.Video, url: 'https://cdn/v.mp4' }}
      />,
    )

    expect(container.firstChild).toBeNull()
  })

  it('switches from audio to image (and applies effect) correctly', () => {
    const { rerender } = render(
      <QuestionMedia
        type={QuestionType.TrueFalse}
        media={{ type: MediaType.Audio, url: 'https://cdn/a.mp3' }}
      />,
    )
    expect(screen.getByTestId('responsive-player')).toBeInTheDocument()
    expect(screen.queryByTestId('responsive-image')).toBeNull()

    const countdown: CountdownEvent = {
      serverTime: '2025-10-12T12:00:00.000Z',
      initiatedTime: '2025-10-12T11:59:59.000Z',
      expiryTime: '2025-10-12T12:00:01.000Z',
    }

    rerender(
      <QuestionMedia
        type={QuestionType.TrueFalse}
        media={{
          type: MediaType.Image,
          url: 'https://img/switch.jpg',
          effect: QuestionImageRevealEffectType.Square3x3,
        }}
        countdown={countdown}
      />,
    )

    const img = screen.getByTestId('responsive-image')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('data-src', 'https://img/switch.jpg')
    expect(img.getAttribute('data-effect-type')).toBe(
      String(QuestionImageRevealEffectType.Square3x3),
    )
    expect(screen.queryByTestId('responsive-player')).toBeNull()
  })
})
