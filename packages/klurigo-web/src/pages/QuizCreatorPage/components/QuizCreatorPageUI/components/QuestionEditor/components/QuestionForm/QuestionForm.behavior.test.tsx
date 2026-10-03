import {
  GameMode,
  QuestionPinTolerance,
  QuestionRangeAnswerMargin,
  QuestionType,
} from '@klurigo/common'
import { fireEvent, render, screen } from '@testing-library/react'
import type { FC, ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { QuizQuestionValidationResult } from '../../../../../../utils/QuestionDataSource'
import { EditorSection } from '../shared'

import {
  ClassicMultiChoiceQuestionForm,
  ClassicPinQuestionForm,
  ClassicPuzzleQuestionForm,
  ClassicRangeQuestionForm,
  ClassicTrueFalseQuestionForm,
  ClassicTypeAnswerQuestionForm,
  ZeroToOneHundredRangeQuestionForm,
} from './index'

type MockQuestionFieldProps = {
  type: string
  mode?: GameMode
  footer?: string
  layout?: string
  children?: ReactNode
  value?: unknown
  values?: unknown
  imageURL?: string
  min?: number
  max?: number
  onChange?: (value: unknown) => void
  onImageUrlChange?: (value?: string) => void
  onPositionChange?: (value?: { x: number; y: number }) => void
  onToleranceChange?: (value?: QuestionPinTolerance) => void
  tolerance?: QuestionPinTolerance
}

vi.mock('../QuestionField', () => ({
  QuestionFieldType: {
    CommonDuration: 'DURATION',
    CommonInfo: 'INFO',
    CommonMedia: 'MEDIA',
    CommonPoints: 'POINTS',
    CommonQuestion: 'QUESTION',
    RangeCorrect: 'CORRECT',
    RangeMargin: 'MARGIN',
    RangeMax: 'MAX',
    RangeMin: 'MIN',
  },
  default: ({
    type,
    footer,
    layout,
    value,
    values,
    imageURL,
    min,
    max,
    onChange,
    onImageUrlChange,
    onPositionChange,
  }: MockQuestionFieldProps) => (
    <>
      <div
        data-testid={`field-${type}`}
        data-layout={layout}
        data-value={
          value === undefined
            ? ''
            : typeof value === 'object'
              ? JSON.stringify(value)
              : String(value)
        }
        data-values={values === undefined ? '' : JSON.stringify(values)}
        data-image-url={imageURL ?? ''}
        data-min={min}
        data-max={max}>
        {footer}
      </div>
      {onChange && (
        <button
          data-testid={`edit-${type}`}
          onClick={() =>
            onChange(
              {
                [QuestionType.MultiChoice]: [
                  { value: 'Updated answer', correct: false },
                ],
                tolerance: QuestionPinTolerance.High,
                [QuestionType.Puzzle]: ['updated', 'values'],
                [QuestionType.TrueFalse]: false,
                [QuestionType.TypeAnswer]: ['updated answer'],
                MIN: 10,
                MAX: 90,
                CORRECT: 55,
                MARGIN: QuestionRangeAnswerMargin.Low,
              }[type] ?? 'edited value',
            )
          }
        />
      )}
      {onImageUrlChange && (
        <button
          data-testid="edit-PIN-image-url"
          onClick={() => onImageUrlChange('https://example.com/updated.jpg')}
        />
      )}
      {onPositionChange && (
        <button
          data-testid="edit-PIN-position"
          onClick={() => onPositionChange({ x: 0.25, y: 0.75 })}
        />
      )}
    </>
  ),
}))

vi.mock('../AnswerEditor', async () => {
  const { default: QuestionField } = await import('../QuestionField')
  const Field = QuestionField as FC<MockQuestionFieldProps>
  const { default: RangeAnswerEditor } =
    await import('../AnswerEditor/RangeAnswerEditor')
  return {
    default: (props: MockQuestionFieldProps) => {
      if (props.type === QuestionType.Range) {
        return props.mode === GameMode.Classic ? (
          <RangeAnswerEditor
            {...(props as unknown as React.ComponentProps<
              typeof RangeAnswerEditor
            >)}
          />
        ) : (
          <Field {...props} type="CORRECT" />
        )
      }
      if (props.type === QuestionType.Pin) {
        return (
          <>
            <EditorSection>
              <Field {...props} />
            </EditorSection>
            <EditorSection>
              <Field
                type="tolerance"
                layout="full"
                value={props.tolerance}
                onChange={(value) =>
                  props.onToleranceChange?.(value as QuestionPinTolerance)
                }
              />
            </EditorSection>
          </>
        )
      }
      return <Field {...props} />
    },
  }
})

const validation = {
  valid: true,
  errors: [],
} as unknown as QuizQuestionValidationResult

describe('QuestionForm behavior', () => {
  it('maps MultiChoice question and answer edits to their existing model fields', () => {
    const onChange = vi.fn()
    render(
      <ClassicMultiChoiceQuestionForm
        question={{
          type: QuestionType.MultiChoice,
          question: 'Original question',
          options: [{ value: 'Original answer', correct: true }],
        }}
        questionValidation={validation}
        onChange={onChange}
      />,
    )

    expect(screen.getByTestId('field-QUESTION')).toHaveAttribute(
      'data-value',
      'Original question',
    )
    expect(
      screen.getByTestId(`field-${QuestionType.MultiChoice}`),
    ).toHaveAttribute(
      'data-values',
      JSON.stringify([{ value: 'Original answer', correct: true }]),
    )
    fireEvent.click(screen.getByTestId('edit-QUESTION'))
    fireEvent.click(screen.getByTestId('edit-MEDIA'))
    fireEvent.click(screen.getByTestId(`edit-${QuestionType.MultiChoice}`))

    expect(onChange).toHaveBeenNthCalledWith(1, 'question', 'edited value')
    expect(onChange).toHaveBeenNthCalledWith(2, 'media', 'edited value')
    expect(onChange).toHaveBeenNthCalledWith(3, 'options', [
      { value: 'Updated answer', correct: false },
    ])
  })

  it('maps TrueFalse and TypeAnswer edits to their distinct model fields', () => {
    const onTrueFalseChange = vi.fn()
    const { rerender } = render(
      <ClassicTrueFalseQuestionForm
        question={{
          type: QuestionType.TrueFalse,
          question: 'Original true/false question',
          correct: true,
        }}
        questionValidation={validation}
        onChange={onTrueFalseChange}
      />,
    )

    expect(
      screen.getByTestId(`field-${QuestionType.TrueFalse}`),
    ).toHaveAttribute('data-value', 'true')
    fireEvent.click(screen.getByTestId(`edit-${QuestionType.TrueFalse}`))
    fireEvent.click(screen.getByTestId('edit-QUESTION'))
    fireEvent.click(screen.getByTestId('edit-MEDIA'))
    expect(onTrueFalseChange).toHaveBeenCalledWith('correct', false)
    expect(onTrueFalseChange).toHaveBeenCalledWith('question', 'edited value')
    expect(onTrueFalseChange).toHaveBeenCalledWith('media', 'edited value')

    const onTypeAnswerChange = vi.fn()
    rerender(
      <ClassicTypeAnswerQuestionForm
        question={{
          type: QuestionType.TypeAnswer,
          question: 'Original typed question',
          options: ['accepted answer'],
        }}
        questionValidation={validation}
        onChange={onTypeAnswerChange}
      />,
    )

    expect(
      screen.getByTestId(`field-${QuestionType.TypeAnswer}`),
    ).toHaveAttribute('data-values', JSON.stringify(['accepted answer']))
    fireEvent.click(screen.getByTestId(`edit-${QuestionType.TypeAnswer}`))
    fireEvent.click(screen.getByTestId('edit-QUESTION'))
    fireEvent.click(screen.getByTestId('edit-MEDIA'))
    expect(onTypeAnswerChange).toHaveBeenCalledWith('options', [
      'updated answer',
    ])
    expect(onTypeAnswerChange).toHaveBeenCalledWith('media', 'edited value')
    expect(onTypeAnswerChange).toHaveBeenCalledWith('question', 'edited value')
  })

  it('maps Pin image, position and tolerance changes to their existing fields', () => {
    const onChange = vi.fn()
    render(
      <ClassicPinQuestionForm
        question={{
          type: QuestionType.Pin,
          question: 'Place the pin',
          imageURL: 'https://example.com/map.jpg',
          positionX: 0.5,
          positionY: 0.5,
          tolerance: QuestionPinTolerance.Medium,
        }}
        questionValidation={validation}
        onChange={onChange}
      />,
    )

    expect(screen.getByTestId('field-PIN')).toHaveAttribute(
      'data-image-url',
      'https://example.com/map.jpg',
    )
    fireEvent.click(screen.getByTestId('edit-PIN-image-url'))
    fireEvent.click(screen.getByTestId('edit-PIN-position'))
    fireEvent.click(screen.getByTestId('edit-tolerance'))
    fireEvent.click(screen.getByTestId('edit-QUESTION'))

    expect(onChange).toHaveBeenNthCalledWith(
      1,
      'imageURL',
      'https://example.com/updated.jpg',
    )
    expect(onChange).toHaveBeenNthCalledWith(2, 'positionX', 0.25)
    expect(onChange).toHaveBeenNthCalledWith(3, 'positionY', 0.75)
    expect(onChange).toHaveBeenNthCalledWith(
      4,
      'tolerance',
      QuestionPinTolerance.High,
    )
    expect(onChange).toHaveBeenCalledWith('question', 'edited value')
  })

  it('maps Puzzle and Zero-to-One-Hundred Range answers to existing fields', () => {
    const onPuzzleChange = vi.fn()
    const { rerender } = render(
      <ClassicPuzzleQuestionForm
        question={{
          type: QuestionType.Puzzle,
          question: 'Order these',
          values: ['first', 'second', 'third'],
        }}
        questionValidation={validation}
        onChange={onPuzzleChange}
      />,
    )

    expect(screen.getByTestId(`field-${QuestionType.Puzzle}`)).toHaveAttribute(
      'data-value',
      JSON.stringify(['first', 'second', 'third']),
    )
    fireEvent.click(screen.getByTestId('edit-QUESTION'))
    fireEvent.click(screen.getByTestId(`edit-${QuestionType.Puzzle}`))
    fireEvent.click(screen.getByTestId('edit-MEDIA'))
    expect(onPuzzleChange).toHaveBeenCalledWith('values', ['updated', 'values'])
    expect(onPuzzleChange).toHaveBeenCalledWith('media', 'edited value')
    expect(onPuzzleChange).toHaveBeenCalledWith('question', 'edited value')

    const onRangeChange = vi.fn()
    rerender(
      <ZeroToOneHundredRangeQuestionForm
        question={{
          type: QuestionType.Range,
          question: 'Choose a percentage',
          correct: 75,
        }}
        questionValidation={validation}
        onChange={onRangeChange}
      />,
    )

    expect(screen.getByTestId('field-CORRECT')).toHaveAttribute(
      'data-value',
      '75',
    )
    expect(screen.getByTestId('field-CORRECT')).toHaveAttribute('data-min', '0')
    expect(screen.getByTestId('field-CORRECT')).toHaveAttribute(
      'data-max',
      '100',
    )
    fireEvent.click(screen.getByTestId('edit-QUESTION'))
    fireEvent.click(screen.getByTestId('edit-CORRECT'))
    fireEvent.click(screen.getByTestId('edit-MEDIA'))
    expect(onRangeChange).toHaveBeenCalledWith('correct', 55)
    expect(onRangeChange).toHaveBeenCalledWith('media', 'edited value')
    expect(onRangeChange).toHaveBeenCalledWith('question', 'edited value')
  })

  it('maps Classic Range edits to their existing model fields', () => {
    const onChange = vi.fn()

    render(
      <ClassicRangeQuestionForm
        question={{
          type: QuestionType.Range,
          min: 0,
          max: 100,
          correct: 50,
          margin: QuestionRangeAnswerMargin.Medium,
        }}
        questionValidation={validation}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByTestId('edit-QUESTION'))
    fireEvent.click(screen.getByTestId('edit-MIN'))
    fireEvent.click(screen.getByTestId('edit-MAX'))
    fireEvent.click(screen.getByTestId('edit-CORRECT'))
    fireEvent.click(screen.getByTestId('edit-MARGIN'))
    fireEvent.click(screen.getByTestId('edit-MEDIA'))

    expect(onChange).toHaveBeenNthCalledWith(1, 'question', 'edited value')
    expect(onChange).toHaveBeenNthCalledWith(2, 'min', 10)
    expect(onChange).toHaveBeenNthCalledWith(3, 'max', 90)
    expect(onChange).toHaveBeenNthCalledWith(4, 'correct', 55)
    expect(onChange).toHaveBeenNthCalledWith(
      5,
      'margin',
      QuestionRangeAnswerMargin.Low,
    )
    expect(onChange).toHaveBeenCalledWith('media', 'edited value')
  })

  it('renders the Pin and Puzzle-specific fields', () => {
    const { rerender } = render(
      <ClassicPinQuestionForm
        question={{
          type: QuestionType.Pin,
          imageURL: 'https://example.com/map.jpg',
          positionX: 0.5,
          positionY: 0.5,
          tolerance: QuestionPinTolerance.Medium,
        }}
        questionValidation={validation}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('field-PIN')).toBeInTheDocument()
    expect(screen.getByTestId('field-tolerance')).toBeInTheDocument()
    expect(screen.getByTestId('field-tolerance')).toHaveAttribute(
      'data-layout',
      'full',
    )

    rerender(
      <ClassicPuzzleQuestionForm
        question={{
          type: QuestionType.Puzzle,
          values: ['one', 'two'],
        }}
        questionValidation={validation}
        onChange={vi.fn()}
      />,
    )

    expect(
      screen.getByTestId(`field-${QuestionType.Puzzle}`),
    ).toBeInTheDocument()
  })
})
