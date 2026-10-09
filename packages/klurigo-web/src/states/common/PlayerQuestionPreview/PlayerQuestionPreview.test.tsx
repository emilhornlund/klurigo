import { GameMode, QuestionType } from '@klurigo/common'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../components/ProgressBar/ProgressBar', () => ({
  default: () => <div data-testid="progressbar" />,
}))

import PlayerQuestionPreview from './PlayerQuestionPreview'

describe('PlayerQuestionPreview', () => {
  it('renders the player preview presentation without a game event', () => {
    render(
      <MemoryRouter>
        <PlayerQuestionPreview
          mode={GameMode.Classic}
          questionType={QuestionType.MultiChoice}
          question="Who painted The Starry Night?"
          questionPoints={1000}
          countdown={{
            initiatedTime: '2025-10-12T11:59:59.000Z',
            expiryTime: '2025-10-12T12:00:01.000Z',
            serverTime: '2025-10-12T12:00:00.000Z',
          }}
          currentQuestion={2}
          totalQuestions={20}
          nickname="FrostyBear"
          totalScore={10458}
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByText('Who painted The Starry Night?'),
    ).toBeInTheDocument()
    expect(screen.getByText('Standard Points')).toBeInTheDocument()
    expect(screen.getByText('2 / 20')).toBeInTheDocument()
    expect(screen.getByText('FrostyBear')).toBeInTheDocument()
    expect(screen.getByTestId('progressbar')).toBeInTheDocument()
  })
})
