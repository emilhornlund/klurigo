import { QuestionType } from '@klurigo/common'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import QuestionPicker from './QuestionPicker'

type QuestionPickerItemProps = {
  index: number
  canDelete: boolean
  onDelete?: () => void
}

const questionPickerItemMock =
  vi.fn<(props: QuestionPickerItemProps) => ReactElement>()

vi.mock('./components', () => ({
  QuestionPickerItem: (props: QuestionPickerItemProps) => {
    questionPickerItemMock(props)
    return (
      <button type="button" onClick={props.onDelete}>
        delete-{props.index}
      </button>
    )
  },
}))

vi.mock('../../../../../../components', () => ({
  ConfirmDialog: ({
    open,
    onConfirm,
    onClose,
  }: {
    open: boolean
    onConfirm: () => void
    onClose: () => void
  }) =>
    open ? (
      <div>
        <button type="button" onClick={onConfirm}>
          confirm
        </button>
        <button type="button" onClick={onClose}>
          close
        </button>
      </div>
    ) : null,
}))

describe('QuestionPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    })
  })

  it('passes canDelete=false when there is only one question', () => {
    render(
      <QuestionPicker
        questions={[
          {
            type: QuestionType.MultiChoice,
            text: 'Question 1',
            valid: true,
          },
        ]}
        selectedQuestionIndex={0}
        onAddQuestion={vi.fn()}
        onSelectQuestion={vi.fn()}
        onDropQuestion={vi.fn()}
        onDuplicateQuestion={vi.fn()}
        onDeleteQuestion={vi.fn()}
      />,
    )

    expect(questionPickerItemMock).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 0,
        canDelete: false,
      }),
    )
  })

  it('passes canDelete=true when there are multiple questions', () => {
    render(
      <QuestionPicker
        questions={[
          {
            type: QuestionType.MultiChoice,
            text: 'Question 1',
            valid: true,
          },
          {
            type: QuestionType.TrueFalse,
            text: 'Question 2',
            valid: true,
          },
        ]}
        selectedQuestionIndex={0}
        onAddQuestion={vi.fn()}
        onSelectQuestion={vi.fn()}
        onDropQuestion={vi.fn()}
        onDuplicateQuestion={vi.fn()}
        onDeleteQuestion={vi.fn()}
      />,
    )

    expect(questionPickerItemMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        index: 0,
        canDelete: true,
      }),
    )
    expect(questionPickerItemMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        index: 1,
        canDelete: true,
      }),
    )
  })

  it('deletes the selected question only when the index is still in range', () => {
    const onDeleteQuestion = vi.fn()

    render(
      <QuestionPicker
        questions={[
          {
            type: QuestionType.MultiChoice,
            text: 'Question 1',
            valid: true,
          },
          {
            type: QuestionType.TrueFalse,
            text: 'Question 2',
            valid: true,
          },
        ]}
        selectedQuestionIndex={0}
        onAddQuestion={vi.fn()}
        onSelectQuestion={vi.fn()}
        onDropQuestion={vi.fn()}
        onDuplicateQuestion={vi.fn()}
        onDeleteQuestion={onDeleteQuestion}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'delete-1' }))
    fireEvent.click(screen.getByRole('button', { name: 'confirm' }))

    expect(onDeleteQuestion).toHaveBeenCalledWith(1)
  })

  it('does not delete when the pending delete index becomes out of range', () => {
    const onDeleteQuestion = vi.fn()

    const { rerender } = render(
      <QuestionPicker
        questions={[
          {
            type: QuestionType.MultiChoice,
            text: 'Question 1',
            valid: true,
          },
          {
            type: QuestionType.TrueFalse,
            text: 'Question 2',
            valid: true,
          },
        ]}
        selectedQuestionIndex={0}
        onAddQuestion={vi.fn()}
        onSelectQuestion={vi.fn()}
        onDropQuestion={vi.fn()}
        onDuplicateQuestion={vi.fn()}
        onDeleteQuestion={onDeleteQuestion}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'delete-1' }))

    rerender(
      <QuestionPicker
        questions={[
          {
            type: QuestionType.MultiChoice,
            text: 'Question 1',
            valid: true,
          },
        ]}
        selectedQuestionIndex={0}
        onAddQuestion={vi.fn()}
        onSelectQuestion={vi.fn()}
        onDropQuestion={vi.fn()}
        onDuplicateQuestion={vi.fn()}
        onDeleteQuestion={onDeleteQuestion}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'confirm' }))

    expect(onDeleteQuestion).not.toHaveBeenCalled()
  })
})
