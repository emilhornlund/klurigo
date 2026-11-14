import {
  type CrittersAvatarConfigurationV1,
  DEFAULT_CRITTERS_AVATAR_V1,
} from '@klurigo/common'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { getCrittersAvatarV1DataUri } from '../../utils/avatar/critters-v1'

import PlayerAvatar from './PlayerAvatar'

describe('PlayerAvatar display', () => {
  it.each([undefined, { ...DEFAULT_CRITTERS_AVATAR_V1, version: 2 }])(
    'renders the default Critter for missing or unsupported metadata without changing the input',
    (avatar) => {
      const before = JSON.stringify(avatar)
      render(
        <PlayerAvatar
          avatar={avatar as CrittersAvatarConfigurationV1 | undefined}
          alt="Player"
          size={32}
        />,
      )
      expect(screen.getByRole('img', { name: 'Player' })).toHaveAttribute(
        'src',
        getCrittersAvatarV1DataUri(DEFAULT_CRITTERS_AVATAR_V1),
      )
      expect(JSON.stringify(avatar)).toBe(before)
      const svg = decodeURIComponent(
        screen
          .getByRole('img', { name: 'Player' })
          .getAttribute('src')!
          .split(',')[1],
      )
      expect(svg).toContain('<dc:title>Critters</dc:title>')
      expect(svg).toContain('body-round-')
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
