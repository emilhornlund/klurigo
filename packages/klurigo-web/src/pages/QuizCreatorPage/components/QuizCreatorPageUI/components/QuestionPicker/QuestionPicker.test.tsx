import { QuestionType } from '@klurigo/common'
import { fireEvent, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import QuestionPicker from './QuestionPicker'

const dndMocks = vi.hoisted(() => ({ onDragEnd: undefined as unknown }))

vi.mock('@dnd-kit/core', () => ({
  closestCenter: vi.fn(),
  DndContext: ({
    children,
    onDragEnd,
  }: {
    children: ReactElement
    onDragEnd: unknown
  }) => {
    dndMocks.onDragEnd = onDragEnd
    return <>{children}</>
  },
  KeyboardSensor: vi.fn(),
  MouseSensor: vi.fn(),
  TouchSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(),
}))

vi.mock('@dnd-kit/sortable', () => ({
  horizontalListSortingStrategy: 'horizontal',
  verticalListSortingStrategy: 'vertical',
  SortableContext: ({ children }: { children: ReactElement }) => (
    <>{children}</>
  ),
  sortableKeyboardCoordinates: vi.fn(),
}))

type QuestionPickerItemProps = {
  id: string
  index: number
  onClick?: () => void
  onDuplicate?: () => void
  onDelete?: () => void
}

const questionPickerItemMock =
  vi.fn<(props: QuestionPickerItemProps) => ReactElement>()

vi.mock('./components', () => ({
  QuestionPickerItem: (props: QuestionPickerItemProps) => {
    questionPickerItemMock(props)
    return (
      <div data-testid={`question-picker-item-${props.index}`}>
        <button type="button" onClick={props.onClick}>
          select-{props.index}
        </button>
        <button type="button" onClick={props.onDuplicate}>
          duplicate-{props.index}
        </button>
        <button type="button" onClick={props.onDelete}>
          delete-{props.index}
        </button>
      </div>
    )
  },
}))

describe('QuestionPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1200,
    })
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    })
  })

  it('passes question selection and duplication to each item', () => {
    const onSelectQuestion = vi.fn()
    const onDuplicateQuestion = vi.fn()
    const onDeleteQuestion = vi.fn()
    render(
      <QuestionPicker
        questions={[
          {
            id: 'question-1',
            type: QuestionType.MultiChoice,
            text: 'Question 1',
            valid: true,
          },
          {
            id: 'question-2',
            type: QuestionType.TrueFalse,
            text: 'Question 2',
            valid: false,
          },
        ]}
        selectedQuestionIndex={0}
        onAddQuestion={vi.fn()}
        onSelectQuestion={onSelectQuestion}
        onMoveQuestion={vi.fn()}
        onDuplicateQuestion={onDuplicateQuestion}
        onDeleteQuestion={onDeleteQuestion}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'select-1' }))
    fireEvent.click(screen.getByRole('button', { name: 'duplicate-0' }))
    fireEvent.click(screen.getByRole('button', { name: 'delete-0' }))
    fireEvent.click(
      within(
        screen.getByRole('dialog', { name: 'Delete quiz question' }),
      ).getByRole('button', { name: 'Delete' }),
    )

    expect(questionPickerItemMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ index: 1, valid: false }),
    )
    expect(onSelectQuestion).toHaveBeenCalledWith(1)
    expect(onDuplicateQuestion).toHaveBeenCalledWith(0)
    expect(onDeleteQuestion).toHaveBeenCalledWith(0)
    expect(onDeleteQuestion).toHaveBeenCalledWith(0)
  })

  it('keeps add and reorder actions in the navigator and resolves sortable IDs', () => {
    const onAddQuestion = vi.fn()
    const onMoveQuestion = vi.fn()
    render(
      <QuestionPicker
        questions={[
          { id: 'question-a', type: QuestionType.MultiChoice, valid: true },
          { id: 'question-b', type: QuestionType.TrueFalse, valid: true },
        ]}
        selectedQuestionIndex={0}
        onAddQuestion={onAddQuestion}
        onSelectQuestion={vi.fn()}
        onMoveQuestion={onMoveQuestion}
        onDuplicateQuestion={vi.fn()}
        onDeleteQuestion={vi.fn()}
      />,
    )

    const addQuestionButton = screen.getByRole('button', {
      name: 'Add question',
    })
    expect(addQuestionButton).toHaveTextContent('Add question')
    fireEvent.click(addQuestionButton)
    const onDragEnd = dndMocks.onDragEnd as (event: unknown) => void
    onDragEnd({ active: { id: 'question-b' }, over: { id: 'question-a' } })

    expect(onAddQuestion).toHaveBeenCalledOnce()
    expect(onMoveQuestion).toHaveBeenCalledWith(1, 0)
  })

  it('ignores incomplete and unchanged drag events', () => {
    const onMoveQuestion = vi.fn()
    render(
      <QuestionPicker
        questions={[
          { id: 'question-a', type: QuestionType.MultiChoice, valid: true },
          { id: 'question-b', type: QuestionType.TrueFalse, valid: true },
        ]}
        selectedQuestionIndex={0}
        onAddQuestion={vi.fn()}
        onSelectQuestion={vi.fn()}
        onMoveQuestion={onMoveQuestion}
        onDuplicateQuestion={vi.fn()}
        onDeleteQuestion={vi.fn()}
      />,
    )

    const onDragEnd = dndMocks.onDragEnd as (event: unknown) => void
    onDragEnd({ active: { id: 'question-a' }, over: null })
    onDragEnd({ active: { id: 'question-a' }, over: { id: 'question-a' } })
    onDragEnd({ active: { id: 'unknown' }, over: { id: 'question-b' } })

    expect(onMoveQuestion).not.toHaveBeenCalled()
  })

  it('renders an empty question list without attempting to scroll or delete', () => {
    const onDeleteQuestion = vi.fn()
    const { container } = render(
      <QuestionPicker
        questions={[]}
        selectedQuestionIndex={0}
        onAddQuestion={vi.fn()}
        onSelectQuestion={vi.fn()}
        onMoveQuestion={vi.fn()}
        onDuplicateQuestion={vi.fn()}
        onDeleteQuestion={onDeleteQuestion}
      />,
    )

    expect(
      container.querySelector('.questionPickerItemContainer'),
    ).toBeEmptyDOMElement()
    expect(onDeleteQuestion).not.toHaveBeenCalled()
  })

  it('does not delete the final remaining question even if confirmation is triggered', () => {
    const onDeleteQuestion = vi.fn()
    render(
      <QuestionPicker
        questions={[
          { id: 'only-question', type: QuestionType.MultiChoice, valid: true },
        ]}
        selectedQuestionIndex={0}
        onAddQuestion={vi.fn()}
        onSelectQuestion={vi.fn()}
        onMoveQuestion={vi.fn()}
        onDuplicateQuestion={vi.fn()}
        onDeleteQuestion={onDeleteQuestion}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'delete-0' }))
    fireEvent.click(
      within(
        screen.getByRole('dialog', { name: 'Delete quiz question' }),
      ).getByRole('button', { name: 'Delete' }),
    )

    expect(onDeleteQuestion).not.toHaveBeenCalled()
  })

  it('cancels a delete request without invoking the delete callback', () => {
    const onDeleteQuestion = vi.fn()
    render(
      <QuestionPicker
        questions={[
          {
            id: 'first',
            type: QuestionType.MultiChoice,
            text: 'First',
            valid: true,
          },
          {
            id: 'second',
            type: QuestionType.Range,
            text: 'Second',
            valid: true,
          },
        ]}
        selectedQuestionIndex={0}
        onAddQuestion={vi.fn()}
        onSelectQuestion={vi.fn()}
        onMoveQuestion={vi.fn()}
        onDuplicateQuestion={vi.fn()}
        onDeleteQuestion={onDeleteQuestion}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'delete-0' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete quiz question' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))

    expect(onDeleteQuestion).not.toHaveBeenCalled()
    expect(
      screen.queryByRole('dialog', { name: 'Delete quiz question' }),
    ).not.toBeInTheDocument()
  })

  it('scrolls vertically to the selected item, including questions in the middle', () => {
    const questions = [
      { id: 'one', type: QuestionType.MultiChoice, valid: true },
      { id: 'two', type: QuestionType.Range, valid: true },
      { id: 'three', type: QuestionType.TrueFalse, valid: false },
    ]
    const props = {
      questions,
      onAddQuestion: vi.fn(),
      onSelectQuestion: vi.fn(),
      onMoveQuestion: vi.fn(),
      onDuplicateQuestion: vi.fn(),
      onDeleteQuestion: vi.fn(),
    }
    const { container, rerender } = render(
      <QuestionPicker {...props} selectedQuestionIndex={0} />,
    )
    const list = container.querySelector('.questionPickerItemContainer')!
    const scrollTo = vi.mocked(list.scrollTo)
    Object.defineProperty(list.children[1], 'offsetTop', { value: 140 })
    scrollTo.mockClear()

    rerender(<QuestionPicker {...props} selectedQuestionIndex={1} />)

    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({
      top: 140,
      behavior: 'smooth',
    })
  })

  it('uses horizontal auto-scroll for the navigator on constrained viewports', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 600,
    })
    const questions = [
      { id: 'one', type: QuestionType.MultiChoice, valid: true },
      { id: 'two', type: QuestionType.Range, valid: true },
      { id: 'three', type: QuestionType.TrueFalse, valid: false },
    ]
    const props = {
      questions,
      onAddQuestion: vi.fn(),
      onSelectQuestion: vi.fn(),
      onMoveQuestion: vi.fn(),
      onDuplicateQuestion: vi.fn(),
      onDeleteQuestion: vi.fn(),
    }
    const { container, rerender } = render(
      <QuestionPicker {...props} selectedQuestionIndex={0} />,
    )
    const list = container.querySelector('.questionPickerItemContainer')!
    const scrollTo = vi.mocked(list.scrollTo)
    Object.defineProperty(list.children[1], 'offsetLeft', { value: 130 })
    scrollTo.mockClear()

    rerender(<QuestionPicker {...props} selectedQuestionIndex={1} />)

    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({
      left: 130,
      behavior: 'smooth',
    })
    expect(screen.getByRole('button', { name: 'Add question' })).toBeVisible()
  })
})
