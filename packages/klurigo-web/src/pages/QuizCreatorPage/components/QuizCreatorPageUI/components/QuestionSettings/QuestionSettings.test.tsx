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

describe('QuestionSettings points', () => {
  it.each([
    QuestionType.MultiChoice,
    QuestionType.Range,
    QuestionType.TrueFalse,
    QuestionType.TypeAnswer,
    QuestionType.Pin,
    QuestionType.Puzzle,
  ])('edits existing points for Classic %s questions', (type) => {
    const onQuestionValueChange = vi.fn()
    render(
      <QuestionSettings
        mode={GameMode.Classic}
        question={{ type, points: 0 }}
        questionValidation={validation}
        onQuestionValueChange={onQuestionValueChange}
        onReplaceQuestion={vi.fn()}
      />,
    )

    const select = screen.getByTestId('test-points-select-select')
    expect(select).toHaveValue('0')
    fireEvent.change(select, { target: { value: '2000' } })
    expect(onQuestionValueChange).toHaveBeenCalledExactlyOnceWith(
      'points',
      2000,
    )
  })

  it('preserves the default points value and validation message', () => {
    render(
      <QuestionSettings
        mode={GameMode.Classic}
        question={{ type: QuestionType.MultiChoice }}
        questionValidation={
          {
            ...validation,
            valid: false,
            errors: [{ path: 'points', message: 'Invalid points' }],
          } as QuizQuestionValidationResult
        }
        onQuestionValueChange={vi.fn()}
        onReplaceQuestion={vi.fn()}
      />,
    )

    expect(screen.getByTestId('test-points-select-select')).toHaveValue('1000')
    expect(screen.getByText('Invalid points')).toBeInTheDocument()
  })

  it('does not offer points in Zero-to-One-Hundred mode', () => {
    render(
      <QuestionSettings
        mode={GameMode.ZeroToOneHundred}
        question={{ type: QuestionType.Range, duration: 30 }}
        questionValidation={validation}
        onQuestionValueChange={vi.fn()}
        onReplaceQuestion={vi.fn()}
      />,
    )

    expect(
      screen.queryByTestId('test-points-select-select'),
    ).not.toBeInTheDocument()
    expect(
      screen.getByTestId('test-duration-select-select'),
    ).toBeInTheDocument()
  })
})

describe('QuestionSettings info', () => {
  it.each([
    [GameMode.Classic, QuestionType.MultiChoice],
    [GameMode.Classic, QuestionType.Range],
    [GameMode.Classic, QuestionType.TrueFalse],
    [GameMode.Classic, QuestionType.TypeAnswer],
    [GameMode.Classic, QuestionType.Pin],
    [GameMode.Classic, QuestionType.Puzzle],
    [GameMode.ZeroToOneHundred, QuestionType.Range],
  ])('edits additional content for %s / %s', (mode, type) => {
    const onQuestionValueChange = vi.fn()
    render(
      <QuestionSettings
        mode={mode}
        question={{ type, info: 'Existing context' }}
        questionValidation={validation}
        onQuestionValueChange={onQuestionValueChange}
        onReplaceQuestion={vi.fn()}
      />,
    )

    const heading = screen.getByRole('heading', { name: 'Additional content' })
    const info = within(heading.closest('section')!).getByTestId(
      'test-question-info-textfield-textfield',
    )
    expect(info).toHaveValue('Existing context')
    fireEvent.change(info, { target: { value: 'Updated context' } })
    expect(onQuestionValueChange).toHaveBeenCalledExactlyOnceWith(
      'info',
      'Updated context',
    )
  })

  it('preserves info validation and clearing behavior', () => {
    const onQuestionValueChange = vi.fn()
    render(
      <QuestionSettings
        mode={GameMode.Classic}
        question={{ type: QuestionType.MultiChoice, info: 'Existing context' }}
        questionValidation={
          {
            ...validation,
            valid: false,
            errors: [{ path: 'info', message: 'Invalid info' }],
          } as QuizQuestionValidationResult
        }
        onQuestionValueChange={onQuestionValueChange}
        onReplaceQuestion={vi.fn()}
      />,
    )

    expect(screen.getByText('Invalid info')).toBeInTheDocument()
    fireEvent.change(
      screen.getByTestId('test-question-info-textfield-textfield'),
      {
        target: { value: '   ' },
      },
    )
    expect(onQuestionValueChange).toHaveBeenCalledExactlyOnceWith(
      'info',
      undefined,
    )
  })
})
