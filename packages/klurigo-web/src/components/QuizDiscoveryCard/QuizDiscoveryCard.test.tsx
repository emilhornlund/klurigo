import {
  DEFAULT_CRITTERS_AVATAR_V1,
  type DiscoveryQuizCardDto,
  GameMode,
  LanguageCode,
  QuizCategory,
} from '@klurigo/common'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { getCrittersAvatarV1DataUri } from '../../utils/avatar/critters-v1'

import QuizDiscoveryCard from './QuizDiscoveryCard'

vi.mock('../ResponsiveImage', () => ({
  default: ({ imageURL, alt }: { imageURL?: string; alt?: string }) => (
    <img src={imageURL} alt={alt ?? ''} />
  ),
}))

const navigateMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

const makeQuiz = (
  overrides?: Partial<DiscoveryQuizCardDto>,
): DiscoveryQuizCardDto => ({
  id: 'quiz-1',
  title: 'Test Quiz',
  description: 'A test quiz description',
  imageCoverURL: 'https://picsum.photos/seed/geography/400/250',
  category: QuizCategory.Science,
  languageCode: LanguageCode.English,
  mode: GameMode.Classic,
  numberOfQuestions: 15,
  author: {
    id: 'author-1',
    name: 'Jane Doe',
    avatar: DEFAULT_CRITTERS_AVATAR_V1,
  },
  gameplaySummary: {
    count: 42,
    totalPlayerCount: 100,
  },
  ratingSummary: { stars: 4.5, comments: 10, total: 15 },
  created: new Date(),
  ...overrides,
})

describe('QuizDiscoveryCard', () => {
  it('uses the supplied author design in the existing identity row', () => {
    const avatar = { ...DEFAULT_CRITTERS_AVATAR_V1, top: null }
    render(
      <MemoryRouter>
        <QuizDiscoveryCard
          quiz={makeQuiz({ author: { id: 'owner', name: 'Owner', avatar } })}
        />
      </MemoryRouter>,
    )
    expect(
      screen.getByTestId('info-author').querySelector('img'),
    ).toHaveAttribute('src', getCrittersAvatarV1DataUri(avatar))
    expect(screen.getByText('Owner')).toBeVisible()
  })

  beforeEach(() => {
    navigateMock.mockReset()
  })

  it('renders the title, quiz labels, author, and statistics in order', () => {
    render(
      <MemoryRouter>
        <QuizDiscoveryCard quiz={makeQuiz()} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button')).toHaveAccessibleName(
      /Test Quiz.*Science\s· Classic\s· English.*Jane Doe.*15.*42.*4\.5/,
    )
    expect(screen.getByText('Test Quiz').nextElementSibling).toBe(
      screen.getByText('Science · Classic · English'),
    )
    expect(screen.getByText('Jane Doe')).toBeVisible()
    expect(screen.getByText('15')).toBeVisible()
    expect(screen.getByText('42')).toBeVisible()
    expect(screen.getByText('4.5')).toBeVisible()
  })

  it('uses the display labels for the supplied category, game mode, and language', () => {
    render(
      <MemoryRouter>
        <QuizDiscoveryCard
          quiz={makeQuiz({
            category: QuizCategory.GeneralKnowledge,
            mode: GameMode.ZeroToOneHundred,
            languageCode: LanguageCode.NorwegianNynorsk,
          })}
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByText('General Knowledge · 0 to 100 · Norwegian Nynorsk'),
    ).toBeVisible()
  })

  it('renders cover image when imageCoverURL is provided', () => {
    render(
      <MemoryRouter>
        <QuizDiscoveryCard quiz={makeQuiz()} />
      </MemoryRouter>,
    )

    const img = screen.getByAltText('Test Quiz')
    expect(img).toHaveAttribute(
      'src',
      'https://picsum.photos/seed/geography/400/250',
    )
  })

  it('renders fallback when imageCoverURL is missing', () => {
    render(
      <MemoryRouter>
        <QuizDiscoveryCard quiz={makeQuiz({ imageCoverURL: undefined })} />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('cover-fallback')).toBeInTheDocument()
  })

  it('does not render rating when stars is 0', () => {
    render(
      <MemoryRouter>
        <QuizDiscoveryCard
          quiz={makeQuiz({
            ratingSummary: { stars: 0, comments: 0, total: 0 },
          })}
        />
      </MemoryRouter>,
    )

    expect(screen.queryByText('0.0')).not.toBeInTheDocument()
  })

  it('navigates to quiz details on click', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <QuizDiscoveryCard quiz={makeQuiz()} />
      </MemoryRouter>,
    )

    await user.click(screen.getByTestId('quiz-discovery-card'))
    expect(navigateMock).toHaveBeenCalledWith('/quiz/details/quiz-1')
  })

  it('has one tab stop and navigates on Enter', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <QuizDiscoveryCard quiz={makeQuiz()} />
      </MemoryRouter>,
    )

    await user.tab()
    expect(screen.getByRole('button')).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(navigateMock).toHaveBeenCalledWith('/quiz/details/quiz-1')

    await user.tab()
    expect(document.body).toHaveFocus()
  })

  it('navigates on Space key press', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <QuizDiscoveryCard quiz={makeQuiz()} />
      </MemoryRouter>,
    )

    screen.getByTestId('quiz-discovery-card').focus()
    await user.keyboard(' ')
    expect(navigateMock).toHaveBeenCalledWith('/quiz/details/quiz-1')
  })
})
