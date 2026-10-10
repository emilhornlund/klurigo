import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import QuizDetailsPage from './QuizDetailsPage'

type QuizResponse = {
  id: string
  author: {
    id: string
  }
}

type UseQueryResult<T> = {
  data?: T
  isLoading: boolean
  isError: boolean
}

type QuizDetailsPageUIProps = {
  onHostGame: () => void
  onEditQuiz: () => void
  onDeleteQuiz: () => void
}

let latestUIProps: QuizDetailsPageUIProps | undefined
let mockQuizId = 'quiz-123'

const navigateMock = vi.fn<(path: string | number) => void>()
const invalidateQueriesMock = vi.fn<
  (args: { queryKey: readonly string[] }) => Promise<void>
>(() => Promise.resolve())
const deleteQuizMock = vi.fn<(quizId: string) => Promise<void>>(() =>
  Promise.resolve(),
)
const createGameMock = vi.fn<(quizId: string) => Promise<{ id: string }>>(() =>
  Promise.resolve({ id: 'game-123' }),
)
const authenticateGameMock = vi.fn<(args: { gameId: string }) => Promise<void>>(
  () => Promise.resolve(),
)

let mockQuizQueryState: UseQueryResult<QuizResponse>
let mockRatingsQueryState: UseQueryResult<{ results: [] }>

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ quizId: mockQuizId }),
  }
})

vi.mock('@tanstack/react-query', () => ({
  useQuery: (args: { queryKey: readonly unknown[] }) => {
    const key = String(args.queryKey[0])
    if (key === 'quiz') return mockQuizQueryState
    if (key === 'quiz-ratings') return mockRatingsQueryState
    throw new Error(`Unexpected queryKey: ${key}`)
  },
  useQueryClient: () => ({
    invalidateQueries: invalidateQueriesMock,
  }),
}))

vi.mock('../../context/auth', () => ({
  useAuthContext: () => ({
    user: {
      ACCESS: {
        sub: 'user-1',
      },
    },
  }),
}))

vi.mock('../../api', () => ({
  useKlurigoServiceClient: () => ({
    getQuiz: vi.fn(),
    getQuizRatings: vi.fn(),
    deleteQuiz: deleteQuizMock,
    createGame: createGameMock,
    authenticateGame: authenticateGameMock,
  }),
}))

vi.mock('./components', () => ({
  QuizDetailsPageUI: (props: QuizDetailsPageUIProps) => {
    latestUIProps = props
    return <div data-testid="quiz-details-page-ui" />
  },
}))

const flushPromises = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve()
  })
}

describe('QuizDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    latestUIProps = undefined
    mockQuizId = 'quiz-123'
    mockQuizQueryState = {
      data: {
        id: 'quiz-123',
        author: {
          id: 'user-1',
        },
      },
      isLoading: false,
      isError: false,
    }
    mockRatingsQueryState = {
      data: {
        results: [],
      },
      isLoading: false,
      isError: false,
    }
  })

  it('invalidates myProfileQuizzes and navigates back to profile quizzes after deleting a quiz', async () => {
    render(<QuizDetailsPage />)

    act(() => {
      latestUIProps?.onDeleteQuiz()
    })

    await flushPromises()

    expect(deleteQuizMock).toHaveBeenCalledWith('quiz-123')
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['myProfileQuizzes'],
    })
    expect(navigateMock).toHaveBeenCalledWith('/profile/quizzes')
  })

  it('navigates to the quiz edit route when editing', () => {
    render(<QuizDetailsPage />)

    act(() => {
      latestUIProps?.onEditQuiz()
    })

    expect(navigateMock).toHaveBeenCalledWith('/quiz/details/quiz-123/edit')
  })

  it('creates and authenticates a game before navigating to the game page', async () => {
    render(<QuizDetailsPage />)

    act(() => {
      latestUIProps?.onHostGame()
    })
    await flushPromises()

    expect(createGameMock).toHaveBeenCalledWith('quiz-123')
    expect(authenticateGameMock).toHaveBeenCalledWith({ gameId: 'game-123' })
    expect(navigateMock).toHaveBeenCalledWith('/game')
  })
})
