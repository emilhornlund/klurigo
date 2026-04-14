import {
  GameEventType,
  MediaType,
  QuestionPinTolerance,
  QuestionType,
} from '@klurigo/common'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  completeTask: vi.fn().mockResolvedValue(undefined),
  addCorrectAnswer: vi.fn().mockResolvedValue(undefined),
  deleteCorrectAnswer: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../context/game', () => ({
  useGameContext: () => ({
    completeTask: h.completeTask,
    addCorrectAnswer: h.addCorrectAnswer,
    deleteCorrectAnswer: h.deleteCorrectAnswer,
  }),
}))

import HostResultState from './HostResultState'

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function findActionButtonForAnswer(answerText: string, actionWords: RegExp) {
  const byAria = screen.queryByRole('button', {
    name: new RegExp(`${actionWords.source}.*${escapeRe(answerText)}`, 'i'),
  })
  if (byAria) return byAria
  const node = screen.getByText(new RegExp(escapeRe(answerText), 'i'))
  const row =
    node.closest('[role="row"]') ??
    node.closest('li') ??
    node.closest('tr') ??
    node.closest('div') ??
    node.parentElement
  if (!row) return null
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const buttons = within(row).queryAllByRole('button')
  return buttons[0] ?? null
}

describe('HostResultState', () => {
  beforeEach(() => {
    h.completeTask.mockReset()
    h.completeTask.mockResolvedValue(undefined)

    h.addCorrectAnswer.mockReset()
    h.addCorrectAnswer.mockResolvedValue(undefined)

    h.deleteCorrectAnswer.mockReset()
    h.deleteCorrectAnswer.mockResolvedValue(undefined)
  })

  it('should render HostResultState with question type multi-choice and two answers', () => {
    const { container } = render(
      <MemoryRouter>
        <HostResultState
          event={{
            type: GameEventType.GameResultHost,
            game: { pin: '123456' },
            question: {
              type: QuestionType.MultiChoice,
              question: 'Who painted The Starry Night?',
              info: 'This is an info text displayed along the question result.',
            },
            results: {
              type: QuestionType.MultiChoice,
              distribution: [
                {
                  value: 'Vincent van Gogh',
                  count: 3,
                  correct: true,
                  index: 0,
                },
                { value: 'Pablo Picasso', count: 7, correct: false, index: 0 },
              ],
            },
            pagination: { current: 1, total: 20 },
          }}
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByText('Who painted The Starry Night?'),
    ).toBeInTheDocument()
    expect(container).toMatchSnapshot()
  })

  it('should render HostResultState with question type multi-choice and four answers', () => {
    const { container } = render(
      <MemoryRouter>
        <HostResultState
          event={{
            type: GameEventType.GameResultHost,
            game: { pin: '123456' },
            question: {
              type: QuestionType.MultiChoice,
              question: 'Who painted The Starry Night?',
              info: 'This is an info text displayed along the question result.',
            },
            results: {
              type: QuestionType.MultiChoice,
              distribution: [
                {
                  value: 'Vincent van Gogh',
                  count: 3,
                  correct: true,
                  index: 0,
                },
                { value: 'Pablo Picasso', count: 2, correct: false, index: 0 },
                {
                  value: 'Leonardo da Vinci',
                  count: 0,
                  correct: false,
                  index: 0,
                },
                { value: 'Claude Monet', count: 5, correct: false, index: 0 },
              ],
            },
            pagination: { current: 1, total: 20 },
          }}
        />
      </MemoryRouter>,
    )

    expect(container).toMatchSnapshot()
  })

  it('should render HostResultState with question type multi-choice and six answers', () => {
    const { container } = render(
      <MemoryRouter>
        <HostResultState
          event={{
            type: GameEventType.GameResultHost,
            game: { pin: '123456' },
            question: {
              type: QuestionType.MultiChoice,
              question: 'Who painted The Starry Night?',
              info: 'This is an info text displayed along the question result.',
            },
            results: {
              type: QuestionType.MultiChoice,
              distribution: [
                {
                  value: 'Vincent van Gogh',
                  count: 1,
                  correct: true,
                  index: 0,
                },
                { value: 'Pablo Picasso', count: 2, correct: false, index: 0 },
                {
                  value: 'Leonardo da Vinci',
                  count: 4,
                  correct: false,
                  index: 0,
                },
                { value: 'Claude Monet', count: 0, correct: false, index: 0 },
                { value: 'Michelangelo', count: 0, correct: false, index: 0 },
                { value: 'Rembrandt', count: 3, correct: false, index: 0 },
              ],
            },
            pagination: { current: 1, total: 20 },
          }}
        />
      </MemoryRouter>,
    )

    expect(container).toMatchSnapshot()
  })

  it('should render HostResultState with question type range', () => {
    const { container } = render(
      <MemoryRouter>
        <HostResultState
          event={{
            type: GameEventType.GameResultHost,
            game: { pin: '123456' },
            question: {
              type: QuestionType.Range,
              question:
                "What percentage of the earth's surface is covered by water?",
              info: 'This is an info text displayed along the question result.',
            },
            results: {
              type: QuestionType.Range,
              distribution: [
                { value: 59, count: 1, correct: false },
                { value: 61, count: 1, correct: false },
                { value: 64, count: 1, correct: false },
                { value: 65, count: 1, correct: false },
                { value: 71, count: 2, correct: true },
                { value: 72, count: 1, correct: false },
                { value: 73, count: 1, correct: false },
                { value: 79, count: 1, correct: false },
                { value: 83, count: 1, correct: false },
              ],
            },
            pagination: { current: 1, total: 20 },
          }}
        />
      </MemoryRouter>,
    )

    expect(container).toMatchSnapshot()
  })

  it('should render HostResultState with question type true false', () => {
    const { container } = render(
      <MemoryRouter>
        <HostResultState
          event={{
            type: GameEventType.GameResultHost,
            game: { pin: '123456' },
            question: {
              type: QuestionType.TrueFalse,
              question: "Rabbits can't vomit?",
              info: 'This is an info text displayed along the question result.',
            },
            results: {
              type: QuestionType.TrueFalse,
              distribution: [
                { value: true, count: 4, correct: true },
                { value: false, count: 6, correct: false },
              ],
            },
            pagination: { current: 1, total: 20 },
          }}
        />
      </MemoryRouter>,
    )

    expect(container).toMatchSnapshot()
  })

  it('should render HostResultState with question type type answer', () => {
    const { container } = render(
      <MemoryRouter>
        <HostResultState
          event={{
            type: GameEventType.GameResultHost,
            game: { pin: '123456' },
            question: {
              type: QuestionType.TypeAnswer,
              question: 'Who painted the Mono Lisa?',
              info: 'This is an info text displayed along the question result.',
            },
            results: {
              type: QuestionType.TypeAnswer,
              distribution: [
                { value: 'leonardo da vinci', count: 2, correct: true },
                { value: 'leonardo', count: 4, correct: false },
                { value: 'picasso', count: 3, correct: false },
                { value: 'rembrandt', count: 1, correct: false },
              ],
            },
            pagination: { current: 1, total: 20 },
          }}
        />
      </MemoryRouter>,
    )

    expect(container).toMatchSnapshot()
  })

  it('should render HostResultState with question type pin', () => {
    const { container } = render(
      <MemoryRouter>
        <HostResultState
          event={{
            type: GameEventType.GameResultHost,
            game: { pin: '123456' },
            question: {
              type: QuestionType.Pin,
              question:
                'Where is the capital Stockholm located? Pin the answer on a map of Europe',
              info: 'This is an info text displayed along the question result.',
            },
            results: {
              type: QuestionType.Pin,
              imageURL:
                'https://upload.wikimedia.org/wikipedia/commons/7/7c/Europe_EU_laea_location_map_%28configurable%29.svg',
              positionX: 0.45838,
              positionY: 0.35438,
              tolerance: QuestionPinTolerance.Medium,
              distribution: [
                { value: '0.42838,0.39438', count: 1, correct: true },
                { value: '0.68271,0.79206', count: 1, correct: false },
                { value: '0.59385,0.21256', count: 1, correct: false },
                { value: '0.60786,0.97867', count: 1, correct: false },
              ],
            },
            pagination: { current: 1, total: 20 },
          }}
        />
      </MemoryRouter>,
    )

    expect(container).toMatchSnapshot()
  })

  it('should render HostResultState with question type puzzle', () => {
    const { container } = render(
      <MemoryRouter>
        <HostResultState
          event={{
            type: GameEventType.GameResultHost,
            game: { pin: '123456' },
            question: {
              type: QuestionType.Puzzle,
              question:
                'Sort these planets from closest to farthest from the Sun',
              info: 'This is an info text displayed along the question result.',
            },
            results: {
              type: QuestionType.Puzzle,
              values: ['Athens', 'Argos', 'Plovdiv', 'Lisbon'],
              distribution: [
                {
                  value: ['Athens', 'Argos', 'Plovdiv', 'Lisbon'],
                  count: 1,
                  correct: true,
                },
                {
                  value: ['Athens', 'Plovdiv', 'Argos', 'Lisbon'],
                  count: 2,
                  correct: false,
                },
                {
                  value: ['Athens', 'Lisbon', 'Argos', 'Plovdiv'],
                  count: 1,
                  correct: false,
                },
              ],
            },
            pagination: { current: 1, total: 20 },
          }}
        />
      </MemoryRouter>,
    )

    expect(container).toMatchSnapshot()
  })

  it('clicks Next to initiate leaderboard task', async () => {
    let resolve!: () => void
    h.completeTask.mockImplementation(
      () => new Promise<void>((r) => (resolve = r)),
    )

    const { container } = render(
      <MemoryRouter>
        <HostResultState
          event={{
            type: GameEventType.GameResultHost,
            game: { pin: '999999' },
            question: { type: QuestionType.TrueFalse, question: 'Proceed?' },
            results: {
              type: QuestionType.TrueFalse,
              distribution: [
                { value: true, count: 1, correct: true },
                { value: false, count: 0, correct: false },
              ],
            },
            pagination: { current: 3, total: 5 },
          }}
        />
      </MemoryRouter>,
    )

    const next = container.querySelector('#next-button') as HTMLButtonElement

    act(() => {
      fireEvent.click(next)
    })

    expect(h.completeTask).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolve()
      await Promise.resolve()
    })

    expect(container).toMatchSnapshot()
  })

  it('marks an incorrect option as correct via QuestionResults UI', async () => {
    let resolve!: () => void
    h.addCorrectAnswer.mockImplementation(
      () => new Promise<void>((r) => (resolve = r)),
    )

    render(
      <MemoryRouter>
        <HostResultState
          event={{
            type: GameEventType.GameResultHost,
            game: { pin: '123456' },
            question: { type: QuestionType.MultiChoice, question: 'Q?' },
            results: {
              type: QuestionType.MultiChoice,
              distribution: [
                {
                  value: 'Vincent van Gogh',
                  count: 3,
                  correct: true,
                  index: 0,
                },
                { value: 'Pablo Picasso', count: 2, correct: false, index: 1 },
              ],
            },
            pagination: { current: 1, total: 2 },
          }}
        />
      </MemoryRouter>,
    )

    const btn = findActionButtonForAnswer(
      'Pablo Picasso',
      /(add|mark|set|correct)/i,
    )
    expect(btn).toBeTruthy()

    act(() => {
      fireEvent.click(btn as HTMLButtonElement)
    })

    expect(h.addCorrectAnswer).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolve()
      await Promise.resolve()
    })

    const arg = h.addCorrectAnswer.mock.calls[0][0]
    expect(arg).toBeTruthy()
  })

  it('removes an already-correct option via QuestionResults UI', async () => {
    let resolve!: () => void
    h.deleteCorrectAnswer.mockImplementation(
      () => new Promise<void>((r) => (resolve = r)),
    )

    render(
      <MemoryRouter>
        <HostResultState
          event={{
            type: GameEventType.GameResultHost,
            game: { pin: '123456' },
            question: { type: QuestionType.MultiChoice, question: 'Q?' },
            results: {
              type: QuestionType.MultiChoice,
              distribution: [
                {
                  value: 'Vincent van Gogh',
                  count: 3,
                  correct: true,
                  index: 0,
                },
                { value: 'Pablo Picasso', count: 2, correct: false, index: 1 },
              ],
            },
            pagination: { current: 1, total: 2 },
          }}
        />
      </MemoryRouter>,
    )

    const btn = findActionButtonForAnswer(
      'Vincent van Gogh',
      /(remove|unset|unmark|delete)/i,
    )
    expect(btn).toBeTruthy()

    act(() => {
      fireEvent.click(btn as HTMLButtonElement)
    })

    expect(h.deleteCorrectAnswer).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolve()
      await Promise.resolve()
    })

    const arg = h.deleteCorrectAnswer.mock.calls[0][0]
    expect(arg).toBeTruthy()
  })

  it('for non-Pin question: default shows results; clicking toggles to media, then back', () => {
    render(
      <MemoryRouter>
        <HostResultState
          event={{
            type: GameEventType.GameResultHost,
            game: { pin: '111111' },
            question: {
              type: QuestionType.MultiChoice,
              question: 'Q with media',
              media: { type: MediaType.Image, url: 'https://img/a.jpg' },
            },
            results: {
              type: QuestionType.MultiChoice,
              distribution: [
                { value: 'A', count: 1, correct: true, index: 0 },
                { value: 'B', count: 2, correct: false, index: 1 },
              ],
            },
            pagination: { current: 1, total: 10 },
          }}
        />
      </MemoryRouter>,
    )

    // Initially: results visible, media hidden
    expect(screen.getByTestId('question-results')).toBeInTheDocument()
    expect(screen.queryByTestId('question-media')).toBeNull()

    // Toggle button present with "Show media" and faPhotoFilm icon
    const toggle = screen.getByTestId(`test-toggle-media-button-button`)
    expect(toggle).toHaveTextContent('Show media')

    // Click → media visible, results hidden; label changes to "Show results" with chart icon
    fireEvent.click(toggle)
    expect(screen.queryByTestId('question-results')).toBeNull()
    expect(screen.getByTestId('question-media')).toBeInTheDocument()
    expect(toggle).toHaveTextContent('Show results')

    // Click again → back to results
    fireEvent.click(toggle)
    expect(screen.getByTestId('question-results')).toBeInTheDocument()
    expect(screen.queryByTestId('question-media')).toBeNull()
    expect(toggle).toHaveTextContent('Show media')
  })

  it('for Pin question: toggle button exists but media never renders; results stay visible', () => {
    render(
      <MemoryRouter>
        <HostResultState
          event={{
            type: GameEventType.GameResultHost,
            game: { pin: '222222' },
            question: {
              type: QuestionType.Pin,
              question: 'Pin Q with image',
              media: { type: MediaType.Image, url: 'https://img/pin.jpg' },
            },
            results: {
              type: QuestionType.Pin,
              imageURL: 'https://img/pin.jpg',
              positionX: 0.5,
              positionY: 0.5,
              tolerance: QuestionPinTolerance.Medium,
              distribution: [],
            },
            pagination: { current: 2, total: 10 },
          }}
        />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('pin-question-results')).toBeInTheDocument()
    expect(screen.queryByTestId('test-toggle-media-button-button')).toBeNull()
    expect(screen.queryByTestId('question-media')).toBeNull()
  })

  it('renders toggle button only when media exists', () => {
    render(
      <MemoryRouter>
        <HostResultState
          event={{
            type: GameEventType.GameResultHost,
            game: { pin: '333333' },
            question: {
              type: QuestionType.TrueFalse,
              question: 'No media here',
              // media: undefined
            },
            results: {
              type: QuestionType.TrueFalse,
              distribution: [
                { value: true, count: 1, correct: true },
                { value: false, count: 0, correct: false },
              ],
            },
            pagination: { current: 1, total: 2 },
          }}
        />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('question-results')).toBeInTheDocument()
    expect(screen.queryByTestId('test-toggle-media-button-button')).toBeNull()
    expect(screen.queryByTestId('question-media')).toBeNull()
  })
})
