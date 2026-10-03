import {
  MediaType,
  QuestionImageRevealEffectType,
  QuestionRangeAnswerMargin,
  QuestionType,
} from '@klurigo/common'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, expect, it, vi } from 'vitest'

import type { ValidationResult } from '../../../../../../../../validation'

import QuestionField from './QuestionField'
import styles from './QuestionField.module.scss'
import { QuestionFieldType } from './types'

vi.mock('react-player', () => ({
  default: () => <div data-testid="mock-player">Mock Player</div>,
}))

type AnyValidation = ValidationResult<Record<string, unknown>>

function makeValidation(
  errors: Array<{ path: string; message: string }> = [],
): AnyValidation {
  return {
    valid: errors.length === 0,
    errors: errors.map((e) => ({ path: e.path, message: e.message })),
  } as unknown as AnyValidation
}

describe('QuestionField', () => {
  it('keeps an invalid pristine textarea quiet, reveals it on blur, and tracks subsequent validity', () => {
    const validation = makeValidation([
      { path: 'question', message: 'Enter a question.' },
    ])
    const { rerender } = render(
      <QuestionField
        type={QuestionFieldType.CommonQuestion}
        value=""
        validation={validation}
        onChange={() => undefined}
        validationRevealed={false}
      />,
    )
    const field = screen.getByTestId('test-question-text-textarea-textarea')

    expect(screen.queryByText('Enter a question.')).not.toBeInTheDocument()
    fireEvent.focus(field)
    fireEvent.blur(field)
    expect(screen.getByText('Enter a question.')).toBeInTheDocument()

    rerender(
      <QuestionField
        type={QuestionFieldType.CommonQuestion}
        value="A valid question"
        validation={makeValidation()}
        onChange={() => undefined}
        validationRevealed={false}
      />,
    )
    expect(screen.queryByText('Enter a question.')).not.toBeInTheDocument()

    rerender(
      <QuestionField
        type={QuestionFieldType.CommonQuestion}
        value=""
        validation={validation}
        onChange={() => undefined}
        validationRevealed={false}
      />,
    )
    expect(screen.getByText('Enter a question.')).toBeInTheDocument()
  })

  it('shows an untouched invalid textarea when the question is revealed', () => {
    render(
      <QuestionField
        type={QuestionFieldType.CommonQuestion}
        value=""
        validation={makeValidation([
          { path: 'question', message: 'Enter a question.' },
        ])}
        onChange={() => undefined}
        validationRevealed
      />,
    )

    expect(screen.getByText('Enter a question.')).toBeInTheDocument()
  })

  it('uses the reveal signal for ordinary text and select controls', () => {
    const invalidMin = makeValidation([
      { path: 'min', message: 'Minimum is invalid.' },
    ])
    const invalidType = makeValidation([
      { path: 'type', message: 'Question type is invalid.' },
    ])
    const { rerender } = render(
      <QuestionField
        type={QuestionFieldType.RangeMin}
        value={-1}
        validation={invalidMin}
        onChange={() => undefined}
        validationRevealed={false}
      />,
    )

    expect(screen.queryByText('Minimum is invalid.')).not.toBeInTheDocument()
    rerender(
      <QuestionField
        type={QuestionFieldType.RangeMin}
        value={-1}
        validation={invalidMin}
        onChange={() => undefined}
        validationRevealed
      />,
    )
    expect(screen.getByText('Minimum is invalid.')).toBeInTheDocument()

    rerender(
      <QuestionField
        type={QuestionFieldType.CommonType}
        value={QuestionType.MultiChoice}
        validation={invalidType}
        onChange={() => undefined}
        validationRevealed
      />,
    )
    expect(screen.getByText('Question type is invalid.')).toBeInTheDocument()
  })

  it('preserves focus and blur validation for TextField and Select controls', () => {
    const { rerender } = render(
      <QuestionField
        type={QuestionFieldType.RangeMin}
        value={-1}
        validation={makeValidation([
          { path: 'min', message: 'Minimum is invalid.' },
        ])}
        onChange={() => undefined}
        validationRevealed={false}
      />,
    )
    const textField = screen.getByTestId('test-range-min-textfield-textfield')

    expect(screen.queryByText('Minimum is invalid.')).not.toBeInTheDocument()
    fireEvent.focus(textField)
    fireEvent.blur(textField)
    expect(screen.getByText('Minimum is invalid.')).toBeInTheDocument()

    rerender(
      <QuestionField
        type={QuestionFieldType.CommonType}
        value={QuestionType.MultiChoice}
        validation={makeValidation([
          { path: 'type', message: 'Question type is invalid.' },
        ])}
        onChange={() => undefined}
        validationRevealed={false}
      />,
    )
    const select = screen.getByTestId('test-question-type-select-select')

    expect(
      screen.queryByText('Question type is invalid.'),
    ).not.toBeInTheDocument()
    fireEvent.focus(select)
    fireEvent.blur(select)
    expect(screen.getByText('Question type is invalid.')).toBeInTheDocument()
  })

  it('renders a duration question field', () => {
    const { container } = render(
      <QuestionField
        type={QuestionFieldType.CommonDuration}
        value={30}
        validation={makeValidation()}
        onChange={() => undefined}
      />,
    )

    expect(container).toMatchSnapshot()
  })

  it('renders a image media question field', () => {
    const { container } = render(
      <QuestionField
        type={QuestionFieldType.CommonMedia}
        value={{ type: MediaType.Image, url: 'https://example.com/image.png' }}
        validation={makeValidation()}
        onChange={() => undefined}
      />,
    )

    expect(container).toMatchSnapshot()
  })

  it('renders a video media question field', () => {
    const { container } = render(
      <QuestionField
        type={QuestionFieldType.CommonMedia}
        value={{ type: MediaType.Video, url: 'https://example.com/video.mp4' }}
        validation={makeValidation()}
        onChange={() => undefined}
      />,
    )

    expect(container).toMatchSnapshot()
  })

  it('renders a audio media question field', () => {
    const { container } = render(
      <QuestionField
        type={QuestionFieldType.CommonMedia}
        value={{ type: MediaType.Audio, url: 'https://example.com/music.mp3' }}
        validation={makeValidation()}
        onChange={() => undefined}
      />,
    )

    expect(container).toMatchSnapshot()
  })

  it('renders a points question field', () => {
    const { container } = render(
      <QuestionField
        type={QuestionFieldType.CommonPoints}
        value={1000}
        validation={makeValidation()}
        onChange={() => undefined}
      />,
    )

    expect(container).toMatchSnapshot()
  })

  it('renders a question text question field', () => {
    const onChange = vi.fn()
    const { container } = render(
      <QuestionField
        type={QuestionFieldType.CommonQuestion}
        value="Who painted The Starry Night?"
        validation={makeValidation()}
        onChange={onChange}
      />,
    )
    const questionInput = screen.getByTestId(
      'test-question-text-textarea-textarea',
    )

    expect(
      container.querySelector(`.${styles.questionTextContent}`),
    ).toBeTruthy()
    expect(questionInput).toHaveValue('Who painted The Starry Night?')
    fireEvent.change(questionInput, { target: { value: 'New question text' } })

    expect(onChange).toHaveBeenCalledWith('New question text')
  })

  it('renders a multiple choice type question field', () => {
    const { container } = render(
      <QuestionField
        type={QuestionFieldType.CommonType}
        value={QuestionType.MultiChoice}
        validation={makeValidation()}
        onChange={() => undefined}
      />,
    )

    expect(container).toMatchSnapshot()
  })

  it('renders a range type question field', () => {
    const { container } = render(
      <QuestionField
        type={QuestionFieldType.CommonType}
        value={QuestionType.Range}
        validation={makeValidation()}
        onChange={() => undefined}
      />,
    )

    expect(container).toMatchSnapshot()
  })

  it('renders a true or false question field', () => {
    const { container } = render(
      <QuestionField
        type={QuestionFieldType.CommonType}
        value={QuestionType.TrueFalse}
        validation={makeValidation()}
        onChange={() => undefined}
      />,
    )

    expect(container).toMatchSnapshot()
  })

  it('renders a type answer question field', () => {
    const { container } = render(
      <QuestionField
        type={QuestionFieldType.CommonType}
        value={QuestionType.TypeAnswer}
        validation={makeValidation()}
        onChange={() => undefined}
      />,
    )

    expect(container).toMatchSnapshot()
  })

  it('renders a range correct question field', () => {
    const { container } = render(
      <QuestionField
        type={QuestionFieldType.RangeCorrect}
        value={50}
        min={0}
        max={100}
        validation={makeValidation()}
        onChange={() => undefined}
      />,
    )

    expect(container).toMatchSnapshot()
  })

  it('renders a range margin question field', () => {
    const { container } = render(
      <QuestionField
        type={QuestionFieldType.RangeMargin}
        value={QuestionRangeAnswerMargin.Medium}
        validation={makeValidation()}
        onChange={() => undefined}
      />,
    )

    expect(container).toMatchSnapshot()
  })

  it('renders a range max question field', () => {
    const { container } = render(
      <QuestionField
        type={QuestionFieldType.RangeMax}
        value={100}
        validation={makeValidation()}
        onChange={() => undefined}
      />,
    )

    expect(container).toMatchSnapshot()
  })

  it('renders a range min question field', () => {
    const { container } = render(
      <QuestionField
        type={QuestionFieldType.RangeMin}
        value={0}
        validation={makeValidation()}
        onChange={() => undefined}
      />,
    )

    expect(container).toMatchSnapshot()
  })

  it('renders an image media question field with blur effect', () => {
    const { container } = render(
      <QuestionField
        type={QuestionFieldType.CommonMedia}
        value={{
          type: MediaType.Image,
          url: 'https://example.com/image.png',
          effect: QuestionImageRevealEffectType.Blur,
        }}
        validation={makeValidation()}
        onChange={() => undefined}
      />,
    )
    expect(container).toMatchSnapshot()
  })

  it('renders an image media question field with square effect', () => {
    const { container } = render(
      <QuestionField
        type={QuestionFieldType.CommonMedia}
        value={{
          type: MediaType.Image,
          url: 'https://example.com/image.png',
          effect: QuestionImageRevealEffectType.Square3x3,
        }}
        validation={makeValidation()}
        onChange={() => undefined}
      />,
    )
    expect(container).toMatchSnapshot()
  })
})
