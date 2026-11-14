import {
  type CrittersAvatarConfigurationV1,
  DEFAULT_CRITTERS_AVATAR_V1,
} from '@klurigo/common'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import placeholder from '../../assets/images/avatar.svg'

import PlayerAvatar from './PlayerAvatar'

describe('PlayerAvatar display', () => {
  it.each([undefined, { ...DEFAULT_CRITTERS_AVATAR_V1, version: 2 }])(
    'uses the stable placeholder for missing or unsupported metadata',
    (avatar) => {
      render(
        <PlayerAvatar
          avatar={avatar as CrittersAvatarConfigurationV1 | undefined}
          alt="Player"
          size={32}
        />,
      )
      expect(screen.getByRole('img', { name: 'Player' })).toHaveAttribute(
        'src',
        placeholder,
      )
      expect(screen.getByRole('img', { name: 'Player' })).toHaveClass(
        'placeholder',
      )
    },
  )

  it('renders multiple local avatars as separate image documents', () => {
    const { container } = render(
      <>
        <PlayerAvatar
          avatar={DEFAULT_CRITTERS_AVATAR_V1}
          alt="First player"
          size={32}
        />
        <PlayerAvatar
          avatar={{ ...DEFAULT_CRITTERS_AVATAR_V1, top: null }}
          alt="Second player"
          size={128}
        />
      </>,
    )
    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(2)
    for (const image of images)
      expect(image.getAttribute('src')).toMatch(/^data:image\/svg\+xml/)
    expect(images[0].getAttribute('src')).not.toBe(
      images[1].getAttribute('src'),
    )
    expect(container.querySelector('svg')).toBeNull()
  })
})
