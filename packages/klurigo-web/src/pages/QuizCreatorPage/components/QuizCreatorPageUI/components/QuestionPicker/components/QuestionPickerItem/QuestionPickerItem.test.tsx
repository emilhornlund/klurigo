import { QuestionType } from '@klurigo/common'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'

import QuestionPickerItem from './QuestionPickerItem'

vi.mock('@dnd-kit/sortable', () => ({
  useSortable: ({ id }: { id: string }) => ({
    attributes: {
      role: 'button',
      tabIndex: 0,
      'aria-roledescription': 'sortable',
    },
    listeners: { onKeyDown: vi.fn() },
    setActivatorNodeRef: vi.fn(),
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
    sortableId: id,
  }),
}))

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: vi.fn() } },
}))

const renderQuestionPickerItem = (
  overrides: Partial<ComponentProps<typeof QuestionPickerItem>> = {},
) =>
  render(
    <QuestionPickerItem
      id="question-0"
      index={0}
      text="What is the capital of Sweden?"
      type={QuestionType.MultiChoice}
      active
      valid
      canDelete
      onClick={vi.fn()}
      onDuplicate={vi.fn()}
      {...overrides}
    />,
  )

describe('QuestionPickerItem', () => {
  it('shows the validation error indicator when the question is invalid', () => {
    const { container } = renderQuestionPickerItem({ valid: false })

    expect(
      container.querySelector('svg[data-icon="circle-exclamation"]'),
    ).toBeInTheDocument()
  })

  it('keeps duplicate working for the active question', () => {
    const onDuplicate = vi.fn()
    const { container } = renderQuestionPickerItem({ onDuplicate })

    const duplicateButton = container
      .querySelector('svg[data-icon="copy"]')
      ?.closest('button')

    expect(duplicateButton).toBeTruthy()

    fireEvent.click(duplicateButton as HTMLButtonElement)

    expect(onDuplicate).toHaveBeenCalledTimes(1)
  })

  it('deletes only when enabled and does not also select the active item', () => {
    const onClick = vi.fn()
    const onDelete = vi.fn()
    const { getByRole, rerender } = renderQuestionPickerItem({
      onClick,
      onDelete,
      canDelete: false,
    })

    const deleteButton = getByRole('button', { name: 'Delete question' })
    expect(deleteButton).toBeDisabled()
    fireEvent.click(deleteButton)
    expect(onDelete).not.toHaveBeenCalled()

    rerender(
      <QuestionPickerItem
        id="question-0"
        index={0}
        text="What is the capital of Sweden?"
        type={QuestionType.MultiChoice}
        active
        valid
        canDelete
        onClick={onClick}
        onDelete={onDelete}
      />,
    )
    fireEvent.click(getByRole('button', { name: 'Delete question' }))
    expect(onDelete).toHaveBeenCalledOnce()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('does not select the question when it is duplicated', () => {
    const onClick = vi.fn()
    const onDuplicate = vi.fn()
    const { getByRole } = renderQuestionPickerItem({ onClick, onDuplicate })

    fireEvent.click(getByRole('button', { name: 'Duplicate question' }))

    expect(onDuplicate).toHaveBeenCalledTimes(1)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('keeps question selection on a keyboard-operable button and exposes a sortable grip', () => {
    const onClick = vi.fn()
    renderQuestionPickerItem({ onClick })

    fireEvent.click(
      screen.getByRole('button', { name: /what is the capital/i }),
    )

    expect(onClick).toHaveBeenCalledOnce()
    expect(
      screen.getByRole('button', { name: 'Reorder question 1' }),
    ).toHaveAttribute('aria-roledescription', 'sortable')
  })

  it('does not select a question when its reorder handle is clicked', () => {
    const onClick = vi.fn()
    renderQuestionPickerItem({ onClick })

    fireEvent.click(screen.getByRole('button', { name: 'Reorder question 1' }))

    expect(onClick).not.toHaveBeenCalled()
  })

  it('provides accessible names for active actions and displays the item details', () => {
    const { container, getByRole, getByText } = renderQuestionPickerItem({
      index: 2,
      text: 'Question text',
      active: true,
      valid: false,
    })

    expect(getByText('Question text')).toBeInTheDocument()
    expect(getByText('Multiple choice')).toBeInTheDocument()
    expect(getByText('3')).toBeInTheDocument()
    expect(getByRole('button', { name: 'Duplicate question' })).toBeVisible()
    expect(getByRole('button', { name: /question text/i })).toHaveAttribute(
      'aria-current',
      'step',
    )
    expect(
      getByRole('img', { name: 'Question 3 has validation errors' }),
    ).toBeInTheDocument()
    expect(getByRole('button', { name: 'Delete question' })).toBeEnabled()
    expect(
      container.querySelector('#question-picker-item-2'),
    ).not.toBeInTheDocument()
  })
})
