import {
  GameMode,
  LanguageCode,
  QuizCategory,
  QuizVisibility,
} from '@klurigo/common'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import ProfileQuizCard from './ProfileQuizCard'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockQuiz = {
  id: 'quiz-1',
  title: 'Geography Quiz',
  description: 'A quiz about geography',
  mode: GameMode.Classic,
  visibility: QuizVisibility.Public,
  category: QuizCategory.Geography,
  imageCoverURL: 'https://example.com/cover.jpg',
  languageCode: LanguageCode.English,
  numberOfQuestions: 15,
  author: { id: 'author-1', name: 'John Doe' },
  gameplaySummary: {
    count: 100,
    totalPlayerCount: 500,
    difficultyPercentage: 0.5,
    lastPlayed: new Date(),
  },
  ratingSummary: { stars: 4.5, comments: 10, total: 15 },
  created: new Date(),
  updated: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
}

describe('ProfileQuizCard', () => {
  it('renders quiz information correctly', () => {
    render(
      <MemoryRouter>
        <ProfileQuizCard quiz={mockQuiz} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Geography Quiz')).toBeInTheDocument()
    expect(screen.getByText('Public')).toBeInTheDocument()
    expect(screen.getByText('2 days ago')).toBeInTheDocument()
  })

  it('navigates to quiz details on click', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <ProfileQuizCard quiz={mockQuiz} />
      </MemoryRouter>,
    )

    const card = screen.getByTestId('profile-quiz-card')
    await user.click(card)

    expect(mockNavigate).toHaveBeenCalledWith('/quiz/details/quiz-1')
  })

  it('navigates on Enter key press', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <ProfileQuizCard quiz={mockQuiz} />
      </MemoryRouter>,
    )

    const card = screen.getByTestId('profile-quiz-card')
    card.focus()
    await user.keyboard('{Enter}')

    expect(mockNavigate).toHaveBeenCalledWith('/quiz/details/quiz-1')
  })

  it('navigates on Space key press', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <ProfileQuizCard quiz={mockQuiz} />
      </MemoryRouter>,
    )

    const card = screen.getByTestId('profile-quiz-card')
    card.focus()
    await user.keyboard(' ')

    expect(mockNavigate).toHaveBeenCalledWith('/quiz/details/quiz-1')
  })

  it('displays fallback icon when no cover image', () => {
    const quizWithoutImage = { ...mockQuiz, imageCoverURL: undefined }

    render(
      <MemoryRouter>
        <ProfileQuizCard quiz={quizWithoutImage} />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('cover-fallback')).toBeInTheDocument()
  })

  it('does not display fallback icon when cover image is provided', () => {
    render(
      <MemoryRouter>
        <ProfileQuizCard quiz={mockQuiz} />
      </MemoryRouter>,
    )

    expect(screen.queryByTestId('cover-fallback')).not.toBeInTheDocument()
  })

  it('displays correct visibility label for private quiz', () => {
    const privateQuiz = { ...mockQuiz, visibility: QuizVisibility.Private }

    render(
      <MemoryRouter>
        <ProfileQuizCard quiz={privateQuiz} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Private')).toBeInTheDocument()
  })

  it('displays "Just now" for recently updated quiz', () => {
    const recentQuiz = { ...mockQuiz, updated: new Date(Date.now() - 30000) }

    render(
      <MemoryRouter>
        <ProfileQuizCard quiz={recentQuiz} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Just now')).toBeInTheDocument()
  })
})
