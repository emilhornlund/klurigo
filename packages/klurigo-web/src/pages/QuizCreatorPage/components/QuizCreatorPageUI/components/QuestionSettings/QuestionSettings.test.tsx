import { GameMode, QuestionType } from '@klurigo/common'
import { fireEvent, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, expect, it, vi } from 'vitest'

import type { QuizQuestionValidationResult } from '../../../../utils/QuestionDataSource'

import QuestionSettings from './QuestionSettings'

const validation = {
  valid: true,
  errors: [],
} as unknown as QuizQuestionValidationResult

describe('QuestionSettings duration', () => {
  it.each([
    [GameMode.Classic, QuestionType.MultiChoice],
    [GameMode.Classic, QuestionType.Range],
    [GameMode.Classic, QuestionType.TrueFalse],
    [GameMode.Classic, QuestionType.TypeAnswer],
    [GameMode.Classic, QuestionType.Pin],
    [GameMode.Classic, QuestionType.Puzzle],
    [GameMode.ZeroToOneHundred, QuestionType.Range],
  ])('edits the duration for %s / %s', (mode, type) => {
    const onQuestionValueChange = vi.fn()
    render(
      <QuestionSettings
        mode={mode}
        question={{ type, duration: 45 }}
        questionValidation={validation}
        onQuestionValueChange={onQuestionValueChange}
        onReplaceQuestion={vi.fn()}
      />,
    )

    const select = screen.getByTestId('test-duration-select-select')
    expect(select).toHaveValue('45')
    fireEvent.change(select, { target: { value: '60' } })
    expect(onQuestionValueChange).toHaveBeenCalledExactlyOnceWith(
      'duration',
      60,
    )
  })

  it('retains the default duration and its validation message', () => {
    render(
      <QuestionSettings
        mode={GameMode.ZeroToOneHundred}
        question={{ type: QuestionType.Range }}
        questionValidation={
          {
            ...validation,
            valid: false,
            errors: [{ path: 'duration', message: 'Invalid duration' }],
          } as QuizQuestionValidationResult
        }
        onQuestionValueChange={vi.fn()}
        onReplaceQuestion={vi.fn()}
      />,
    )

    const settings = screen.getByRole('complementary', {
      name: 'Question settings',
    })
    expect(
      within(settings).getByTestId('test-duration-select-select'),
    ).toHaveValue('30')
    expect(within(settings).getByText('Invalid duration')).toBeInTheDocument()
  })
})
