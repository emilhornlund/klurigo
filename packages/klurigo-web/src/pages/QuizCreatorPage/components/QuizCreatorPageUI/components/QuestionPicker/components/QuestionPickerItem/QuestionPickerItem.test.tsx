import { QuestionType } from '@klurigo/common'
import { fireEvent, render } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'

import QuestionPickerItem from './QuestionPickerItem'

const renderQuestionPickerItem = (
  overrides: Partial<ComponentProps<typeof QuestionPickerItem>> = {},
) =>
  render(
    <QuestionPickerItem
      index={0}
      text="What is the capital of Sweden?"
      type={QuestionType.MultiChoice}
      active
      valid
      onClick={vi.fn()}
      onDrop={vi.fn()}
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

  it('does not select the question when it is duplicated', () => {
    const onClick = vi.fn()
    const onDuplicate = vi.fn()
    const { getByRole } = renderQuestionPickerItem({ onClick, onDuplicate })

    fireEvent.click(getByRole('button', { name: 'Duplicate question' }))

    expect(onDuplicate).toHaveBeenCalledTimes(1)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('forwards valid drops and ignores malformed item IDs', () => {
    const onDrop = vi.fn()
    const { container, rerender } = renderQuestionPickerItem({ onDrop })
    const wrapper = container.querySelector('.questionPickerItemWrapper')

    expect(wrapper).toBeTruthy()
    fireEvent.dragOver(wrapper!)
    fireEvent.drop(wrapper!)
    expect(onDrop).toHaveBeenCalledWith(0)

    rerender(
      <QuestionPickerItem
        index={0}
        text="Question"
        type={QuestionType.MultiChoice}
        active
        valid
        onDrop={onDrop}
      />,
    )
    const malformedWrapper = container.querySelector(
      '.questionPickerItemWrapper',
    )
    Object.defineProperty(malformedWrapper, 'id', {
      configurable: true,
      value: 'not-a-question-picker-item',
    })
    fireEvent.drop(malformedWrapper!)
    expect(onDrop).toHaveBeenCalledTimes(1)
  })

  it('provides accessible names for active actions and displays the item details', () => {
    const { container, getByRole, getByText } = renderQuestionPickerItem({
      index: 2,
      text: 'Question text',
      active: true,
      valid: false,
    })

    expect(getByText('Question text')).toBeInTheDocument()
    expect(getByText('Multi Choice')).toBeInTheDocument()
    expect(getByText('3')).toBeInTheDocument()
    expect(getByRole('button', { name: 'Duplicate question' })).toBeVisible()
    expect(
      container.querySelector('svg[data-icon="trash"]'),
    ).not.toBeInTheDocument()
    expect(container.querySelector('#question-picker-item-2')).toHaveAttribute(
      'draggable',
      'true',
    )
  })
})
