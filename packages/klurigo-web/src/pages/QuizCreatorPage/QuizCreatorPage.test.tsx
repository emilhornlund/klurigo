import type { QuizRequestDto } from '@klurigo/common'
import {
  GameMode,
  LanguageCode,
  QuestionType,
  QuizCategory,
  QuizVisibility,
} from '@klurigo/common'
import { act, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { BlockerFunction } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import QuizCreatorPage from './QuizCreatorPage'

type QuizSummary = {
  mode: GameMode
  title: string
  description?: string
  imageCoverURL?: string
  visibility: QuizVisibility
  category: QuizCategory
  languageCode: LanguageCode
}

type UseQueryResult<T> = {
  data?: T
  isLoading: boolean
  isError: boolean
  isFetchedAfterMount?: boolean
}

type QuizSettings = {
  title?: string
  description?: string
  imageCoverURL?: string
  visibility?: QuizVisibility
  category?: QuizCategory
  languageCode?: LanguageCode
}

type QuizCreatorPageUIProps = {
  gameMode?: GameMode
  quizSettings: QuizSettings
  questions: unknown[]
  selectedQuestionIndex: number
  canSaveQuiz: boolean
  isSavingQuiz?: boolean
  onSelectGameMode: (mode: GameMode) => void
  onQuizSettingsValueChange: (
    key: keyof QuizSettings,
    value?: QuizSettings[keyof QuizSettings],
  ) => void
  onSetQuestions: (questions: unknown[]) => void
  onAddQuestion: () => void
  onSaveQuiz: () => void
  onExit: () => void
}

type UnsavedChangesExitModalProps = {
  onReset: () => void
  onConfirm: () => void
}

type MockBlocker = {
  state: 'blocked' | 'proceeding' | 'unblocked'
  proceed: () => void
  reset: () => void
}

let latestUIProps: QuizCreatorPageUIProps | undefined
let latestShouldBlock: BlockerFunction | undefined

let mockQuizId: string | undefined
let mockBlocker: MockBlocker

const navigateMock = vi.fn<(path: string | number) => void>()
const notifyErrorMock = vi.fn<(message: string) => void>()
const invalidateQueriesMock = vi.fn<
  (args: { queryKey: readonly string[] }) => Promise<void>
>(() => Promise.resolve())

const createQuizMock = vi.fn<
  (request: QuizRequestDto) => Promise<{ id: string }>
>(() => Promise.resolve({ id: 'new-quiz-id' }))
const updateQuizMock = vi.fn<
  (quizId: string, request: QuizRequestDto) => Promise<void>
>(() => Promise.resolve())
const getQuizMock = vi.fn<(quizId: string) => Promise<QuizSummary>>()
const getQuizQuestionsMock = vi.fn<(quizId: string) => Promise<unknown[]>>()

const setGameModeMock = vi.fn<(mode: GameMode) => void>()
const setGameModeWithoutResetMock = vi.fn<(mode: GameMode) => void>()
const moveSelectedQuestionToMock = vi.fn<(index: number) => void>()
const addQuestionMock = vi.fn<(type: QuestionType) => void>()
const duplicateQuestionMock = vi.fn<(index: number) => void>()
const deleteQuestionMock = vi.fn<(index: number) => void>()
const replaceQuestionMock = vi.fn<(type: QuestionType) => void>()

const setQuizSettingsMock = vi.fn<(next: QuizSettings) => void>()
const updateSettingsFieldMock =
  vi.fn<
    (key: keyof QuizSettings, value?: QuizSettings[keyof QuizSettings]) => void
  >()

let mockQuizSettings: QuizSettings
let mockQuizSettingsValidation: { errors?: unknown[] }
let mockAllQuizSettingsValid: boolean

let mockGameMode: GameMode | undefined
let mockQuestions: unknown[]
let mockQuestionValidations: Array<{ valid: boolean }>
let mockAllQuestionsValid: boolean
let mockSelectedQuestionIndex: number

let mockQuizQueryState: UseQueryResult<QuizSummary>
let mockQuestionsQueryState: UseQueryResult<unknown[]>

const isClassicMultiChoiceQuestionMock =
  vi.fn<(mode: GameMode, question: unknown) => boolean>()
const isClassicRangeQuestionMock =
  vi.fn<(mode: GameMode, question: unknown) => boolean>()
const isClassicTrueFalseQuestionMock =
  vi.fn<(mode: GameMode, question: unknown) => boolean>()
const isClassicTypeAnswerQuestionMock =
  vi.fn<(mode: GameMode, question: unknown) => boolean>()
const isClassicPinQuestionMock =
  vi.fn<(mode: GameMode, question: unknown) => boolean>()
const isClassicPuzzleQuestionMock =
  vi.fn<(mode: GameMode, question: unknown) => boolean>()
const isZeroToOneHundredRangeQuestionMock =
  vi.fn<(mode: GameMode, question: unknown) => boolean>()

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ quizId: mockQuizId }),
    useBlocker: (shouldBlock: BlockerFunction) => {
      latestShouldBlock = shouldBlock
      return mockBlocker
    },
  }
})

vi.mock('@tanstack/react-query', () => ({
  useQuery: (args: { queryKey: readonly unknown[] }) => {
    const key = String(args.queryKey[0])
    if (key === 'quiz') return mockQuizQueryState
    if (key === 'quiz_questions') return mockQuestionsQueryState
    throw new Error(`Unexpected queryKey: ${key}`)
  },
  useQueryClient: () => ({
    invalidateQueries: invalidateQueriesMock,
  }),
}))

vi.mock('../../api', () => ({
  useKlurigoServiceClient: () => ({
    createQuiz: createQuizMock,
    updateQuiz: updateQuizMock,
    getQuiz: getQuizMock,
    getQuizQuestions: getQuizQuestionsMock,
  }),
}))

vi.mock('../../utils/notification', () => ({
  notifyError: (message: string) => notifyErrorMock(message),
}))

vi.mock('./utils/QuizSettingsDataSource', async () => {
  const React = await vi.importActual<typeof import('react')>('react')

  return {
    useQuizSettingsDataSource: () => {
      const [settings, setSettings] = React.useState(mockQuizSettings)
      const setSettingsWrapped = React.useCallback((next: QuizSettings) => {
        mockQuizSettings = next
        setQuizSettingsMock(next)
        setSettings(next)
      }, [])
      const updateSettingsFieldWrapped = React.useCallback(
        (key: keyof QuizSettings, value?: QuizSettings[keyof QuizSettings]) => {
          updateSettingsFieldMock(key, value)
          const next = { ...mockQuizSettings, [key]: value }
          mockQuizSettings = next
          setSettings(next)
        },
        [],
      )

      return {
        settings,
        setSettings: setSettingsWrapped,
        settingsValidation: mockQuizSettingsValidation,
        allSettingsValid: mockAllQuizSettingsValid,
        updateSettingsField: updateSettingsFieldWrapped,
      }
    },
  }
})

vi.mock('./utils/QuestionDataSource', async () => {
  const React = await vi.importActual<typeof import('react')>('react')

  return {
    useQuestionDataSource: () => {
      const [gameMode, setGameMode] = React.useState(mockGameMode)
      const [questions, setQuestions] = React.useState(mockQuestions)
      const [selectedQuestionIndex, setSelectedQuestionIndex] = React.useState(
        mockSelectedQuestionIndex,
      )
      const setGameModeWrapped = React.useCallback((mode: GameMode) => {
        mockGameMode = mode
        setGameModeMock(mode)
        setGameMode(mode)
      }, [])
      const setGameModeWithoutResetWrapped = React.useCallback(
        (mode: GameMode) => {
          mockGameMode = mode
          setGameModeWithoutResetMock(mode)
          setGameMode(mode)
        },
        [],
      )
      const setQuestionsWrapped = React.useCallback((next: unknown[]) => {
        mockQuestions = next
        setQuestions(next)
      }, [])
      const setQuestionsAndSelectWrapped = React.useCallback(
        (next: unknown[]) => {
          mockQuestions = next
          mockSelectedQuestionIndex = next.length > 0 ? 0 : -1
          setQuestions(next)
          setSelectedQuestionIndex(next.length > 0 ? 0 : -1)
        },
        [],
      )
      const selectQuestionWrapped = React.useCallback((index: number) => {
        mockSelectedQuestionIndex = index
        setSelectedQuestionIndex(index)
      }, [])

      return {
        gameMode,
        setGameMode: setGameModeWrapped,
        setGameModeWithoutReset: setGameModeWithoutResetWrapped,
        questions,
        setQuestions: setQuestionsWrapped,
        setQuestionsAndSelect: setQuestionsAndSelectWrapped,
        questionValidations: mockQuestionValidations,
        allQuestionsValid: mockAllQuestionsValid,
        selectedQuestion: questions[selectedQuestionIndex],
        selectedQuestionIndex,
        selectQuestion: selectQuestionWrapped,
        addQuestion: addQuestionMock,
        updateSelectedQuestionField: vi.fn(),
        moveSelectedQuestionTo: moveSelectedQuestionToMock,
        duplicateQuestion: duplicateQuestionMock,
        deleteQuestion: deleteQuestionMock,
        replaceQuestion: replaceQuestionMock,
      }
    },
  }
})

vi.mock('../../components', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner" />,
  Page: ({ children }: { children?: ReactNode }) => (
    <div data-testid="page">{children}</div>
  ),
}))

vi.mock('./components', () => ({
  QuizCreatorPageUI: (props: QuizCreatorPageUIProps) => {
    latestUIProps = props
    return <div data-testid="quiz-creator-ui" />
  },
  UnsavedChangesExitModal: ({
    onReset,
    onConfirm,
  }: UnsavedChangesExitModalProps) => (
    <div data-testid="unsaved-changes-exit-modal">
      <button type="button" onClick={onReset}>
        Stay
      </button>
      <button type="button" onClick={onConfirm}>
        Leave
      </button>
    </div>
  ),
}))

vi.mock('../../utils/questions', () => ({
  isClassicMultiChoiceQuestion: (mode: GameMode, question: unknown) =>
    isClassicMultiChoiceQuestionMock(mode, question),
  isClassicRangeQuestion: (mode: GameMode, question: unknown) =>
    isClassicRangeQuestionMock(mode, question),
  isClassicTrueFalseQuestion: (mode: GameMode, question: unknown) =>
    isClassicTrueFalseQuestionMock(mode, question),
  isClassicTypeAnswerQuestion: (mode: GameMode, question: unknown) =>
    isClassicTypeAnswerQuestionMock(mode, question),
  isClassicPinQuestion: (mode: GameMode, question: unknown) =>
    isClassicPinQuestionMock(mode, question),
  isClassicPuzzleQuestion: (mode: GameMode, question: unknown) =>
    isClassicPuzzleQuestionMock(mode, question),
  isZeroToOneHundredRangeQuestion: (mode: GameMode, question: unknown) =>
    isZeroToOneHundredRangeQuestionMock(mode, question),
}))

const flushPromises = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve()
  })
}

const makeQuizSummary = (
  overrides: Partial<QuizSummary> = {},
): QuizSummary => ({
  mode: GameMode.Classic,
  title: 'Existing quiz',
  description: 'Existing description',
  imageCoverURL: 'https://example.com/cover.png',
  visibility: QuizVisibility.Public,
  category: QuizCategory.Other,
  languageCode: LanguageCode.English,
  ...overrides,
})

const makeQuizQuestion = (id: string) => ({
  id,
  type: QuestionType.MultiChoice,
  question: `Question ${id}`,
})

describe('QuizCreatorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    latestUIProps = undefined
    latestShouldBlock = undefined

    mockQuizId = undefined
    mockBlocker = {
      state: 'unblocked',
      proceed: vi.fn(),
      reset: vi.fn(),
    }

    mockQuizSettings = {
      title: '',
      description: '',
      imageCoverURL: undefined,
      visibility: QuizVisibility.Public,
      category: QuizCategory.Other,
      languageCode: LanguageCode.English,
    }
    mockQuizSettingsValidation = { errors: [] }
    mockAllQuizSettingsValid = true

    mockGameMode = undefined
    mockQuestions = []
    mockQuestionValidations = []
    mockAllQuestionsValid = true
    mockSelectedQuestionIndex = 0

    mockQuizQueryState = { data: undefined, isLoading: false, isError: false }
    mockQuestionsQueryState = {
      data: undefined,
      isLoading: false,
      isError: false,
      isFetchedAfterMount: true,
    }

    createQuizMock.mockResolvedValue({ id: 'new-quiz-id' })
    updateQuizMock.mockResolvedValue(undefined)
    invalidateQueriesMock.mockResolvedValue(undefined)

    isClassicMultiChoiceQuestionMock.mockReturnValue(false)
    isClassicRangeQuestionMock.mockReturnValue(false)
    isClassicTrueFalseQuestionMock.mockReturnValue(false)
    isClassicTypeAnswerQuestionMock.mockReturnValue(false)
    isClassicPinQuestionMock.mockReturnValue(false)
    isClassicPuzzleQuestionMock.mockReturnValue(false)
    isZeroToOneHundredRangeQuestionMock.mockReturnValue(false)
  })

  it('renders a loading page while an existing quiz is still loading', () => {
    mockQuizId = 'quiz-123'
    mockQuizQueryState = { data: undefined, isLoading: true, isError: false }

    render(<QuizCreatorPage />)

    expect(screen.getByTestId('page')).toBeInTheDocument()
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    expect(screen.queryByTestId('quiz-creator-ui')).not.toBeInTheDocument()
  })

  it('does not mark a new quiz as dirty before any changes are made', () => {
    render(<QuizCreatorPage />)

    expect(latestUIProps?.canSaveQuiz).toBe(false)
    expect(latestShouldBlock?.({} as never)).toBe(false)
  })

  it('marks a new quiz as dirty after the user makes changes', async () => {
    render(<QuizCreatorPage />)

    act(() => {
      latestUIProps?.onSelectGameMode(GameMode.Classic)
    })

    await flushPromises()

    expect(latestUIProps?.canSaveQuiz).toBe(true)
    expect(latestShouldBlock?.({} as never)).toBe(true)
  })

  it('tracks unsaved changes for an existing quiz only after editing away from the saved snapshot', async () => {
    const question = makeQuizQuestion('q-1')

    mockQuizId = 'quiz-123'
    mockQuizQueryState = {
      data: makeQuizSummary(),
      isLoading: false,
      isError: false,
    }
    mockQuestionsQueryState = {
      data: [question],
      isLoading: false,
      isError: false,
      isFetchedAfterMount: true,
    }

    render(<QuizCreatorPage />)
    await flushPromises()

    expect(latestUIProps?.canSaveQuiz).toBe(false)
    expect(latestShouldBlock?.({} as never)).toBe(false)
    expect(setGameModeWithoutResetMock).toHaveBeenCalledWith(GameMode.Classic)
    expect(setGameModeMock).not.toHaveBeenCalled()
    expect(latestUIProps?.questions).toEqual([question])

    act(() => {
      latestUIProps?.onQuizSettingsValueChange('title', 'Updated quiz title')
    })

    await flushPromises()

    expect(latestUIProps?.canSaveQuiz).toBe(true)
    expect(latestShouldBlock?.({} as never)).toBe(true)
  })

  it('does not rehydrate a dirty draft when either quiz query receives new data', async () => {
    const initialQuestion = makeQuizQuestion('q-1')
    const localQuestion = {
      ...initialQuestion,
      question: 'Local question edit',
    }
    const serverQuestion = makeQuizQuestion('q-2')

    mockQuizId = 'quiz-123'
    mockQuizQueryState = {
      data: makeQuizSummary(),
      isLoading: false,
      isError: false,
    }
    mockQuestionsQueryState = {
      data: [initialQuestion],
      isLoading: false,
      isError: false,
      isFetchedAfterMount: true,
    }

    const { rerender } = render(<QuizCreatorPage />)
    await flushPromises()

    act(() => {
      latestUIProps?.onSetQuestions([localQuestion])
      latestUIProps?.onQuizSettingsValueChange('title', 'Local title edit')
      latestUIProps?.onQuizSettingsValueChange(
        'description',
        'Local description edit',
      )
      latestUIProps?.onQuizSettingsValueChange(
        'imageCoverURL',
        'https://example.com/local-cover.png',
      )
      latestUIProps?.onQuizSettingsValueChange(
        'visibility',
        QuizVisibility.Private,
      )
      latestUIProps?.onQuizSettingsValueChange('category', QuizCategory.Science)
      latestUIProps?.onQuizSettingsValueChange(
        'languageCode',
        LanguageCode.Swedish,
      )
    })
    await flushPromises()

    mockQuizQueryState = {
      data: makeQuizSummary({
        title: 'Server title update',
        description: 'Server description update',
      }),
      isLoading: false,
      isError: false,
    }
    mockQuestionsQueryState = {
      data: [serverQuestion],
      isLoading: false,
      isError: false,
      isFetchedAfterMount: true,
    }

    rerender(<QuizCreatorPage />)
    await flushPromises()

    expect(latestUIProps?.questions).toEqual([localQuestion])
    expect(latestUIProps?.quizSettings).toMatchObject({
      title: 'Local title edit',
      description: 'Local description edit',
      imageCoverURL: 'https://example.com/local-cover.png',
      visibility: QuizVisibility.Private,
      category: QuizCategory.Science,
      languageCode: LanguageCode.Swedish,
    })
    expect(setGameModeWithoutResetMock).toHaveBeenCalledTimes(1)
    expect(setGameModeMock).not.toHaveBeenCalled()
    expect(latestUIProps?.canSaveQuiz).toBe(true)
  })

  it('keeps the original saved snapshot when server metadata changes', async () => {
    const question = makeQuizQuestion('q-1')

    mockQuizId = 'quiz-123'
    mockQuizQueryState = {
      data: makeQuizSummary(),
      isLoading: false,
      isError: false,
    }
    mockQuestionsQueryState = {
      data: [question],
      isLoading: false,
      isError: false,
      isFetchedAfterMount: true,
    }

    const { rerender } = render(<QuizCreatorPage />)
    await flushPromises()

    act(() => {
      latestUIProps?.onQuizSettingsValueChange('title', 'Local title edit')
    })
    await flushPromises()

    mockQuizQueryState = {
      data: makeQuizSummary({ title: 'Server title update' }),
      isLoading: false,
      isError: false,
    }

    rerender(<QuizCreatorPage />)
    await flushPromises()

    expect(latestUIProps?.quizSettings.title).toBe('Local title edit')

    act(() => {
      latestUIProps?.onQuizSettingsValueChange('title', 'Server title update')
    })
    await flushPromises()

    expect(latestUIProps?.canSaveQuiz).toBe(true)
  })

  it('anchors the saved snapshot to metadata used before question hydration', async () => {
    const question = makeQuizQuestion('q-1')

    mockQuizId = 'quiz-123'
    mockQuizQueryState = {
      data: makeQuizSummary(),
      isLoading: false,
      isError: false,
    }
    mockQuestionsQueryState = {
      data: undefined,
      isLoading: true,
      isError: false,
      isFetchedAfterMount: false,
    }

    const { rerender } = render(<QuizCreatorPage />)
    await flushPromises()

    mockQuizQueryState = {
      data: makeQuizSummary({ title: 'Refreshed server title' }),
      isLoading: false,
      isError: false,
    }
    mockQuestionsQueryState = {
      data: [question],
      isLoading: false,
      isError: false,
      isFetchedAfterMount: true,
    }

    rerender(<QuizCreatorPage />)
    await flushPromises()

    expect(latestUIProps?.quizSettings.title).toBe('Existing quiz')
    expect(latestUIProps?.canSaveQuiz).toBe(false)
  })

  it('hydrates a different quiz when quizId changes', async () => {
    const firstQuestion = makeQuizQuestion('q-1')
    const secondQuestion = makeQuizQuestion('q-2')

    mockQuizId = 'quiz-123'
    mockQuizQueryState = {
      data: makeQuizSummary({ title: 'First quiz' }),
      isLoading: false,
      isError: false,
    }
    mockQuestionsQueryState = {
      data: [firstQuestion],
      isLoading: false,
      isError: false,
      isFetchedAfterMount: true,
    }

    const { rerender } = render(<QuizCreatorPage />)
    await flushPromises()

    mockQuizId = 'quiz-456'
    mockQuizQueryState = {
      data: makeQuizSummary({
        title: 'Second quiz',
        mode: GameMode.ZeroToOneHundred,
      }),
      isLoading: false,
      isError: false,
    }
    mockQuestionsQueryState = {
      data: [secondQuestion],
      isLoading: false,
      isError: false,
      isFetchedAfterMount: true,
    }

    rerender(<QuizCreatorPage />)
    await flushPromises()

    expect(latestUIProps?.gameMode).toBe(GameMode.ZeroToOneHundred)
    expect(latestUIProps?.quizSettings.title).toBe('Second quiz')
    expect(latestUIProps?.questions).toEqual([secondQuestion])
    expect(setGameModeWithoutResetMock).toHaveBeenCalledTimes(2)
  })

  it('shows the exit modal when navigation is blocked and staying resets the blocker', async () => {
    const { rerender } = render(<QuizCreatorPage />)

    act(() => {
      latestUIProps?.onSelectGameMode(GameMode.Classic)
    })

    await flushPromises()

    mockBlocker.reset = vi.fn(() => {
      mockBlocker.state = 'unblocked'
    })
    mockBlocker.state = 'blocked'

    rerender(<QuizCreatorPage />)

    expect(screen.getByTestId('unsaved-changes-exit-modal')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Stay' }))

    rerender(<QuizCreatorPage />)

    expect(mockBlocker.reset).toHaveBeenCalledTimes(1)
    expect(
      screen.queryByTestId('unsaved-changes-exit-modal'),
    ).not.toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('proceeds with blocked navigation when leaving from the exit modal', async () => {
    const { rerender } = render(<QuizCreatorPage />)

    act(() => {
      latestUIProps?.onSelectGameMode(GameMode.Classic)
    })

    await flushPromises()

    mockBlocker.proceed = vi.fn()
    mockBlocker.state = 'blocked'

    rerender(<QuizCreatorPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Leave' }))

    expect(mockBlocker.proceed).toHaveBeenCalledTimes(1)
  })

  it('keeps save disabled when there are no unsaved changes', async () => {
    const question = makeQuizQuestion('q-1')

    mockQuizId = 'quiz-123'
    mockQuizQueryState = {
      data: makeQuizSummary(),
      isLoading: false,
      isError: false,
    }
    mockQuestionsQueryState = {
      data: [question],
      isLoading: false,
      isError: false,
      isFetchedAfterMount: true,
    }

    render(<QuizCreatorPage />)
    await flushPromises()

    act(() => {
      latestUIProps?.onSaveQuiz()
    })

    expect(latestUIProps?.canSaveQuiz).toBe(false)
    expect(updateQuizMock).not.toHaveBeenCalled()
    expect(createQuizMock).not.toHaveBeenCalled()
  })

  it('only enables saving when the quiz is valid and has unsaved changes', async () => {
    mockAllQuizSettingsValid = false

    const { rerender } = render(<QuizCreatorPage />)

    act(() => {
      latestUIProps?.onSelectGameMode(GameMode.Classic)
    })

    await flushPromises()

    expect(latestUIProps?.canSaveQuiz).toBe(false)

    mockAllQuizSettingsValid = true

    rerender(<QuizCreatorPage />)

    await flushPromises()

    expect(latestUIProps?.canSaveQuiz).toBe(true)
  })

  it('updates the saved snapshot after saving an existing quiz', async () => {
    const question = makeQuizQuestion('q-1')

    mockQuizId = 'quiz-123'
    mockQuizQueryState = {
      data: makeQuizSummary(),
      isLoading: false,
      isError: false,
    }
    mockQuestionsQueryState = {
      data: [question],
      isLoading: false,
      isError: false,
      isFetchedAfterMount: true,
    }
    isClassicMultiChoiceQuestionMock.mockReturnValue(true)

    render(<QuizCreatorPage />)
    await flushPromises()

    act(() => {
      latestUIProps?.onQuizSettingsValueChange('title', 'Updated quiz title')
    })

    await flushPromises()

    expect(latestUIProps?.canSaveQuiz).toBe(true)

    act(() => {
      latestUIProps?.onSaveQuiz()
    })

    await flushPromises()

    expect(updateQuizMock).toHaveBeenCalledWith(
      'quiz-123',
      expect.objectContaining({
        title: 'Updated quiz title',
        mode: GameMode.Classic,
      }),
    )
    expect(latestUIProps?.canSaveQuiz).toBe(false)
    expect(latestShouldBlock?.({} as never)).toBe(false)
  })

  it('navigates to the edit route after creating a new quiz', async () => {
    const question = makeQuizQuestion('q-1')

    mockGameMode = GameMode.Classic
    mockQuizSettings = {
      ...mockQuizSettings,
      title: 'New quiz',
      description: 'Description',
    }
    mockQuestions = [question]
    mockQuestionValidations = [{ valid: true }]
    isClassicMultiChoiceQuestionMock.mockReturnValue(true)

    render(<QuizCreatorPage />)

    act(() => {
      latestUIProps?.onSaveQuiz()
    })

    await flushPromises()

    expect(createQuizMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New quiz',
        description: 'Description',
        mode: GameMode.Classic,
        questions: [question],
      }),
    )
    expect(navigateMock).toHaveBeenCalledWith('/quiz/details/new-quiz-id/edit')
  })

  it('invalidates myProfileQuizzes and exits to the quiz details page for an existing quiz', async () => {
    mockQuizId = 'quiz-123'
    mockQuizQueryState = {
      data: makeQuizSummary(),
      isLoading: false,
      isError: false,
    }
    mockQuestionsQueryState = {
      data: [],
      isLoading: false,
      isError: false,
      isFetchedAfterMount: true,
    }

    render(<QuizCreatorPage />)
    await flushPromises()

    act(() => {
      latestUIProps?.onExit()
    })

    await flushPromises()

    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['myProfileQuizzes'],
    })
    expect(navigateMock).toHaveBeenCalledWith('/quiz/details/quiz-123')
  })

  it('exits to profile quizzes for a new quiz', () => {
    render(<QuizCreatorPage />)

    act(() => {
      latestUIProps?.onExit()
    })

    expect(invalidateQueriesMock).not.toHaveBeenCalled()
    expect(navigateMock).toHaveBeenCalledWith('/profile/quizzes')
  })

  it('shows a validation error instead of saving when dirty data is invalid', async () => {
    mockAllQuestionsValid = false

    render(<QuizCreatorPage />)

    act(() => {
      latestUIProps?.onSelectGameMode(GameMode.Classic)
    })

    await flushPromises()

    act(() => {
      latestUIProps?.onSaveQuiz()
    })

    expect(notifyErrorMock).toHaveBeenCalledWith(
      'Please fix the highlighted fields before saving',
    )
    expect(createQuizMock).not.toHaveBeenCalled()
    expect(updateQuizMock).not.toHaveBeenCalled()
  })
})
