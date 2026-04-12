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
      canDelete
      onClick={vi.fn()}
      onDrop={vi.fn()}
      onDuplicate={vi.fn()}
      onDelete={vi.fn()}
      {...overrides}
    />,
  )

describe('QuestionPickerItem', () => {
  it('disables delete when canDelete is false', () => {
    const { container } = renderQuestionPickerItem({ canDelete: false })

    const deleteButton = container
      .querySelector('svg[data-icon="trash"]')
      ?.closest('button')

    expect(deleteButton).toBeTruthy()
    expect(deleteButton as HTMLButtonElement).toBeDisabled()
  })

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
})
