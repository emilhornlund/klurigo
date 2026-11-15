import { DEFAULT_CRITTERS_AVATAR_V1, GameEventType } from '@klurigo/common'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import PlayerGameBeginState from './PlayerGameBeginState'

describe('PlayerGameBeginState', () => {
  it('should render PlayerGameBeginState', async () => {
    const { container } = render(
      <MemoryRouter>
        <PlayerGameBeginState
          event={{
            type: GameEventType.GameBeginPlayer,
            player: {
              nickname: 'FrostyBear',
              avatar: DEFAULT_CRITTERS_AVATAR_V1,
            },
          }}
        />
      </MemoryRouter>,
    )

    expect(container).toMatchSnapshot()
  })
})
