import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, expect, it, vi } from 'vitest'

import QuestionNavigation from './QuestionNavigation'

describe('QuestionNavigation', () => {
  it('shows the selected position and selects adjacent questions', () => {
    const onSelectedQuestionIndex = vi.fn()
    render(
      <QuestionNavigation
        selectedQuestionIndex={1}
        totalQuestions={3}
        onSelectedQuestionIndex={onSelectedQuestionIndex}
      />,
    )

    expect(
      screen.getByRole('navigation', { name: 'Question navigation' }),
    ).toHaveTextContent('Question 2 of 3')
    const previousButton = screen.getByRole('button', {
      name: 'Previous question',
    })
    const nextButton = screen.getByRole('button', { name: 'Next question' })
    expect(previousButton).toHaveAttribute('aria-label', 'Previous question')
    expect(nextButton).toHaveAttribute('aria-label', 'Next question')
    fireEvent.click(previousButton)
    fireEvent.click(nextButton)
    expect(onSelectedQuestionIndex).toHaveBeenNthCalledWith(1, 0)
    expect(onSelectedQuestionIndex).toHaveBeenNthCalledWith(2, 2)
  })

  it('disables previous on the first question and next on the last', () => {
    const onSelectedQuestionIndex = vi.fn()
    const { rerender } = render(
      <QuestionNavigation
        selectedQuestionIndex={0}
        totalQuestions={2}
        onSelectedQuestionIndex={onSelectedQuestionIndex}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Previous question' }),
    ).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next question' })).toBeEnabled()

    rerender(
      <QuestionNavigation
        selectedQuestionIndex={1}
        totalQuestions={2}
        onSelectedQuestionIndex={onSelectedQuestionIndex}
      />,
    )

    expect(
      screen.getByRole('navigation', { name: 'Question navigation' }),
    ).toHaveTextContent('Question 2 of 2')
    expect(
      screen.getByRole('button', { name: 'Previous question' }),
    ).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Next question' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Next question' }))
    expect(onSelectedQuestionIndex).not.toHaveBeenCalled()
  })
})
