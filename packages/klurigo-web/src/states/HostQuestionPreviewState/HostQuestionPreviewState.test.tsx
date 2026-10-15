import { GameEventType, GameMode, QuestionType } from '@klurigo/common'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import HostQuestionPreviewState from './HostQuestionPreviewState'

const now = Date.now()

describe('HostQuestionPreviewState', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(now))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render HostQuestionPreviewState', () => {
    const { container } = render(
      <MemoryRouter>
        <HostQuestionPreviewState
          event={{
            type: GameEventType.GameQuestionPreviewHost,
            game: {
              mode: GameMode.Classic,
              pin: '123456',
            },
            question: {
              type: QuestionType.MultiChoice,
              question: 'Who painted The Starry Night?',
              points: 1000,
            },
            countdown: {
              initiatedTime: new Date(now).toISOString(),
              expiryTime: new Date(now + 60 * 1000).toISOString(),
              serverTime: new Date(now).toISOString(),
            },
            pagination: { current: 1, total: 20 },
          }}
        />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('question-preview-view')).toBeInTheDocument()
    expect(screen.getByText('Multiple choice')).toBeInTheDocument()
    expect(screen.getByText('Standard Points')).toBeInTheDocument()
    expect(screen.getByText('123456')).toBeInTheDocument()
    expect(container).toMatchSnapshot()
  })

  it('keeps metadata hidden for game modes that do not use it', () => {
    render(
      <MemoryRouter>
        <HostQuestionPreviewState
          event={{
            type: GameEventType.GameQuestionPreviewHost,
            game: { mode: GameMode.ZeroToOneHundred, pin: '123456' },
            question: {
              type: QuestionType.Range,
              question: 'How many?',
              points: 1000,
            },
            countdown: {
              initiatedTime: new Date(now).toISOString(),
              expiryTime: new Date(now + 60 * 1000).toISOString(),
              serverTime: new Date(now).toISOString(),
            },
            pagination: { current: 1, total: 20 },
          }}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('How many?')).toBeInTheDocument()
    expect(
      screen.queryByTestId('question-preview-metadata'),
    ).not.toBeInTheDocument()
  })
})
