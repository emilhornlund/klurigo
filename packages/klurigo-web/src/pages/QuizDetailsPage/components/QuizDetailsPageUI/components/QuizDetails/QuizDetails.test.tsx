import {
  GameMode,
  LanguageCode,
  QuizCategory,
  type QuizResponseDto,
  QuizVisibility,
} from '@klurigo/common'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import QuizDetails from './QuizDetails'

const makeQuiz = (
  overrides: Partial<QuizResponseDto> = {},
): QuizResponseDto => ({
  id: 'quiz-1',
  title: 'Geography quiz',
  description: 'A quiz about geography',
  mode: GameMode.Classic,
  visibility: QuizVisibility.Public,
  category: QuizCategory.GeneralKnowledge,
  imageCoverURL: '',
  languageCode: LanguageCode.English,
  numberOfQuestions: 2,
  author: { id: 'author-1', name: 'Quiz author' },
  gameplaySummary: {
    count: 12,
    totalPlayerCount: 42,
    difficultyPercentage: 0.5,
    lastPlayed: new Date('2025-01-10T09:15:30.000Z'),
  },
  ratingSummary: { stars: 4.25, comments: 2, total: 2 },
  created: new Date('2025-02-14T15:31:14.000Z'),
  updated: new Date('2025-03-08T15:31:14.000Z'),
  ...overrides,
})

const renderDetails = (quiz: QuizResponseDto = makeQuiz()) =>
  render(
    <MemoryRouter>
      <QuizDetails quiz={quiz} />
    </MemoryRouter>,
  )

describe('QuizDetails', () => {
  it('renders all quiz metadata and links the author profile', () => {
    renderDetails()

    expect(screen.getByTitle('Public')).toHaveTextContent('Public')
    expect(screen.getByTitle('General Knowledge')).toHaveTextContent(
      'General Knowledge',
    )
    expect(screen.getByTitle('English')).toHaveTextContent('English')
    expect(screen.getByTitle('Classic')).toHaveTextContent('Classic')
    expect(screen.getByTitle('2 Questions')).toHaveTextContent('2 Questions')
    expect(screen.getByRole('link', { name: 'Quiz author' })).toHaveAttribute(
      'href',
      '/users/author-1/profile',
    )
    expect(screen.getByTitle('Average rating')).toHaveTextContent('4.3 / 5.0')
    expect(screen.getByTitle('Total plays')).toHaveTextContent('12 times')
    expect(screen.getByTitle('Total players')).toHaveTextContent('42')
    expect(screen.getByTitle('Estimated difficulty')).toHaveTextContent('Hard')
    expect(
      screen.getByTitle('Created 2025-02-14 15:31:14'),
    ).not.toHaveTextContent('N/A')
    expect(
      screen.getByTitle('Last played 2025-01-10 09:15:30'),
    ).not.toHaveTextContent('N/A')
  })

  it('uses the singular question label', () => {
    renderDetails(makeQuiz({ numberOfQuestions: 1 }))
    expect(screen.getByTitle('1 Question')).toHaveTextContent('1 Question')
  })

  it('uses fallback values for absent or zero activity metadata', () => {
    renderDetails(
      makeQuiz({
        author: { id: 'author-2', name: '' },
        gameplaySummary: {
          count: 0,
          totalPlayerCount: 0,
          difficultyPercentage: Number.NaN,
        },
        ratingSummary: { stars: 0, comments: 0, total: 0 },
      }),
    )

    expect(screen.getByTitle('N/A')).toHaveTextContent('N/A')
    expect(screen.getByRole('link', { name: 'N/A' })).toHaveAttribute(
      'href',
      '/users/author-2/profile',
    )
    expect(screen.getByTitle('Average rating')).toHaveTextContent('N/A')
    expect(screen.getByTitle('Total plays')).toHaveTextContent('N/A')
    expect(screen.getByTitle('Total players')).toHaveTextContent('N/A')
    expect(screen.getByTitle('Estimated difficulty')).toHaveTextContent('N/A')
    expect(screen.getByTitle('Never played')).toHaveTextContent('N/A')
  })

  it('displays player count and difficulty fallback when values are missing', () => {
    const quiz = makeQuiz({
      gameplaySummary: {
        count: 1,
        totalPlayerCount: undefined,
        difficultyPercentage: undefined,
      } as unknown as QuizResponseDto['gameplaySummary'],
    })
    renderDetails(quiz)

    expect(screen.getByTitle('Total players')).toHaveTextContent('N/A')
    expect(screen.getByTitle('Estimated difficulty')).toHaveTextContent('N/A')
    expect(screen.getByTitle('Never played')).toHaveTextContent('N/A')
  })
})
