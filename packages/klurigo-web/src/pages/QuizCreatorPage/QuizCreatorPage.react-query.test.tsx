import {
  GameMode,
  LanguageCode,
  QuestionType,
  QuizCategory,
  QuizVisibility,
} from '@klurigo/common'
import {
  focusManager,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { act, render, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { QuizCreatorPageUIProps } from './components'
import QuizCreatorPage from './QuizCreatorPage'

type QuizSummary = {
  id: string
  mode: GameMode
  title: string
  description?: string
  imageCoverURL: string
  visibility: QuizVisibility
  category: QuizCategory
  languageCode: LanguageCode
}

type EditorQuestion = {
  id: string
  type: QuestionType.MultiChoice
  question: string
  options: Array<{ value: string; correct: boolean }>
  points: number
  duration: number
}

const getQuizMock = vi.fn<() => Promise<QuizSummary>>()
const getQuizQuestionsMock = vi.fn<() => Promise<EditorQuestion[]>>()

let serverQuiz: QuizSummary
let serverQuestions: EditorQuestion[]
let latestUIProps: QuizCreatorPageUIProps | undefined

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ quizId: 'quiz-123' }),
    useBlocker: () => ({
      state: 'unblocked',
      proceed: vi.fn(),
      reset: vi.fn(),
    }),
  }
})

vi.mock('../../api', () => ({
  useKlurigoServiceClient: () => ({
    createQuiz: vi.fn(),
    updateQuiz: vi.fn(),
    getQuiz: getQuizMock,
    getQuizQuestions: getQuizQuestionsMock,
  }),
}))

vi.mock('../../utils/notification', () => ({
  notifyError: vi.fn(),
}))

vi.mock('../../components', () => ({
  LoadingSpinner: () => null,
  Page: ({ children }: { children?: ReactNode }) => <>{children}</>,
}))

vi.mock('./components', () => ({
  QuizCreatorPageUI: (props: QuizCreatorPageUIProps) => {
    latestUIProps = props
    return <div data-testid="quiz-creator-ui" />
  },
  UnsavedChangesExitModal: () => null,
}))

const makeQuiz = (overrides: Partial<QuizSummary> = {}): QuizSummary => ({
  id: 'quiz-123',
  mode: GameMode.Classic,
  title: 'Original title',
  description: 'Original description',
  imageCoverURL: 'https://example.com/original.png',
  visibility: QuizVisibility.Public,
  category: QuizCategory.Other,
  languageCode: LanguageCode.English,
  ...overrides,
})

const makeQuestion = (id: string, question: string): EditorQuestion => ({
  id,
  type: QuestionType.MultiChoice,
  question,
  options: [
    { value: 'Correct answer', correct: true },
    { value: 'Incorrect answer', correct: false },
  ],
  points: 1000,
  duration: 30,
})

describe('QuizCreatorPage with React Query', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    latestUIProps = undefined
    serverQuiz = makeQuiz()
    serverQuestions = [makeQuestion('q-1', 'Original question')]
    getQuizMock.mockImplementation(async () => serverQuiz)
    getQuizQuestionsMock.mockImplementation(async () => serverQuestions)
  })

  it('preserves the draft when focus refetches return changed server data', async () => {
    serverQuiz = makeQuiz({ description: undefined })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const { unmount } = render(
      <QueryClientProvider client={queryClient}>
        <QuizCreatorPage />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(latestUIProps?.questions).toEqual([
        makeQuestion('q-1', 'Original question'),
      ])
    })
    expect(latestUIProps?.canSaveQuiz).toBe(false)

    const localQuestion = makeQuestion('q-1', 'Local question edit')
    act(() => {
      if (!latestUIProps) {
        throw new Error('Quiz creator UI did not render')
      }
      latestUIProps.onSetQuestions([localQuestion])
      latestUIProps.onQuizSettingsValueChange('title', 'Local title edit')
    })

    serverQuiz = makeQuiz({ title: 'Server title update' })
    serverQuestions = [makeQuestion('q-2', 'Server question update')]

    await act(async () => {
      focusManager.setFocused(false)
      focusManager.setFocused(true)
      await waitFor(() => {
        expect(getQuizMock).toHaveBeenCalledTimes(2)
        expect(getQuizQuestionsMock).toHaveBeenCalledTimes(2)
      })
    })

    expect(latestUIProps?.questions).toEqual([localQuestion])
    expect(latestUIProps?.quizSettings.title).toBe('Local title edit')
    expect(latestUIProps?.canSaveQuiz).toBe(true)

    unmount()
    queryClient.clear()
  })
})
