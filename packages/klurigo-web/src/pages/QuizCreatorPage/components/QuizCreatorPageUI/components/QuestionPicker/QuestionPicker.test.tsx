import { QuestionType } from '@klurigo/common'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import QuestionPicker from './QuestionPicker'

type QuestionPickerItemProps = {
  index: number
  onClick?: () => void
  onDrop?: (index: number) => void
  onDuplicate?: () => void
}

const questionPickerItemMock =
  vi.fn<(props: QuestionPickerItemProps) => ReactElement>()

vi.mock('./components', () => ({
  QuestionPickerItem: (props: QuestionPickerItemProps) => {
    questionPickerItemMock(props)
    return (
      <>
        <button type="button" onClick={props.onClick}>
          select-{props.index}
        </button>
        <button type="button" onClick={props.onDuplicate}>
          duplicate-{props.index}
        </button>
      </>
    )
  },
}))

describe('QuestionPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    })
  })

  it('passes question selection and duplication to each item', () => {
    const onSelectQuestion = vi.fn()
    const onDuplicateQuestion = vi.fn()
    render(
      <QuestionPicker
        questions={[
          { type: QuestionType.MultiChoice, text: 'Question 1', valid: true },
          { type: QuestionType.TrueFalse, text: 'Question 2', valid: false },
        ]}
        selectedQuestionIndex={0}
        onAddQuestion={vi.fn()}
        onSelectQuestion={onSelectQuestion}
        onDropQuestion={vi.fn()}
        onDuplicateQuestion={onDuplicateQuestion}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'select-1' }))
    fireEvent.click(screen.getByRole('button', { name: 'duplicate-0' }))

    expect(questionPickerItemMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ index: 1, valid: false }),
    )
    expect(onSelectQuestion).toHaveBeenCalledWith(1)
    expect(onDuplicateQuestion).toHaveBeenCalledWith(0)
    expect(
      screen.queryByRole('button', { name: 'Delete question' }),
    ).not.toBeInTheDocument()
  })

  it('keeps add and drop actions in the navigator', () => {
    const onAddQuestion = vi.fn()
    const onDropQuestion = vi.fn()
    render(
      <QuestionPicker
        questions={[{ type: QuestionType.MultiChoice, valid: true }]}
        selectedQuestionIndex={0}
        onAddQuestion={onAddQuestion}
        onSelectQuestion={vi.fn()}
        onDropQuestion={onDropQuestion}
        onDuplicateQuestion={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add question' }))
    questionPickerItemMock.mock.calls[0][0].onDrop?.(0)

    expect(onAddQuestion).toHaveBeenCalledOnce()
    expect(onDropQuestion).toHaveBeenCalledWith(0)
  })
})
