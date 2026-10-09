import { GameMode, QuestionType } from '@klurigo/common'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import PlayerQuestionPreviewView from './PlayerQuestionPreviewView'

describe('PlayerQuestionPreviewView', () => {
  it('renders the player preview presentation without a game event', () => {
    render(
      <MemoryRouter>
        <PlayerQuestionPreviewView
          mode={GameMode.Classic}
          questionType={QuestionType.MultiChoice}
          question="Who painted The Starry Night?"
          questionPoints={1000}
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByText('Who painted The Starry Night?'),
    ).toBeInTheDocument()
    expect(screen.getByText('Standard Points')).toBeInTheDocument()
    expect(screen.queryByText('2 / 20')).not.toBeInTheDocument()
    expect(screen.queryByText('FrostyBear')).not.toBeInTheDocument()
  })
})
