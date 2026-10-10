import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import PlayerGameFooter from './PlayerGameFooter'

describe('PlayerGameFooter', () => {
  it('should render PlayerGameFooter with default props', () => {
    const { container } = render(
      <PlayerGameFooter
        currentQuestion={1}
        totalQuestions={20}
        nickname="FrostyBear"
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
      />,
    )

    expect(screen.getByText('2 / 10')).toBeInTheDocument()
    expect(screen.getByText('FrostyBear')).toBeInTheDocument()
    expect(screen.queryByText(/\d{4,}/)).not.toBeInTheDocument()
  })
})
