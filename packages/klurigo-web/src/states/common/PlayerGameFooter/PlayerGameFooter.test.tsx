import { DEFAULT_CRITTERS_AVATAR_V1 } from '@klurigo/common'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { getCrittersAvatarV1DataUri } from '../../../utils/avatar/critters-v1'

import PlayerGameFooter from './PlayerGameFooter'

describe('PlayerGameFooter', () => {
  it('retains a complete game-time design when scores change', () => {
    const avatar = { ...DEFAULT_CRITTERS_AVATAR_V1, top: null, cheeks: null }
    const view = render(
      <PlayerGameFooter
        currentQuestion={1}
        totalQuestions={20}
        nickname="Account"
        avatar={avatar}
        totalScore={123}
      />,
    )
    expect(view.container.querySelector('img')).toHaveAttribute(
      'src',
      getCrittersAvatarV1DataUri(avatar),
    )
    view.rerender(
      <PlayerGameFooter
        currentQuestion={2}
        totalQuestions={20}
        nickname="Account"
        avatar={avatar}
        totalScore={456}
      />,
    )
    expect(view.container.querySelector('img')).toHaveAttribute(
      'src',
      getCrittersAvatarV1DataUri(avatar),
    )
    expect(screen.getByText('456')).toBeInTheDocument()
  })

  it('should render PlayerGameFooter with default props', () => {
    const { container } = render(
      <PlayerGameFooter
        currentQuestion={1}
        totalQuestions={20}
        nickname="FrostyBear"
        avatar={DEFAULT_CRITTERS_AVATAR_V1}
        totalScore={10361}
      />,
    )

    expect(container).toMatchSnapshot()
  })

  it('omits the score when no total score is provided', () => {
    render(
      <PlayerGameFooter
        currentQuestion={2}
        totalQuestions={10}
        nickname="FrostyBear"
        avatar={DEFAULT_CRITTERS_AVATAR_V1}
      />,
    )

    expect(screen.getByText('2 / 10')).toBeInTheDocument()
    expect(screen.getByText('FrostyBear')).toBeInTheDocument()
    expect(screen.queryByText(/\d{4,}/)).not.toBeInTheDocument()
  })
})
