import type { QuestionDto } from '@klurigo/common'
import {
  GameMode,
  MediaType,
  QuestionRangeAnswerMargin,
  QuestionType,
} from '@klurigo/common'
import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ValidationError } from '../../../../../../validation'
import { buildValidationResult } from '../../../../../../validation'
import type {
  QuizQuestionModel,
  QuizQuestionValidationResult,
} from '../../../../utils/QuestionDataSource'

import AdvancedQuestionEditor from './AdvancedQuestionEditor'
import { parseQuestionsJson } from './utils'

type TextareaProps = {
  id: string
  type: string
  placeholder?: string
  value: string
  onChange: (text: string) => void
  onAdditionalValidation?: () => string | boolean
  forceValidate?: boolean
}

let lastTextareaProps: TextareaProps | undefined

vi.mock('../../../../../../components/Textarea', () => ({
  default: (props: TextareaProps) => {
    lastTextareaProps = props
    return (
      <textarea
        data-testid="mock-textarea"
        value={props.value}
        onChange={(e) =>
          props.onChange((e.target as HTMLTextAreaElement).value)
        }
      />
    )
  },
}))

vi.mock('./utils', () => ({
  parseQuestionsJson: vi.fn(),
}))

function makeClassicQuestions(): QuizQuestionModel[] {
  return [
    {
      type: QuestionType.MultiChoice,
      question: 'Who painted The Starry Night?',
      media: {
        type: MediaType.Image,
        url: 'https://i.pinimg.com/originals/a6/60/72/a66072b0e88258f2898a76c3f3c01041.jpg',
      },
      options: [
        { value: 'Vincent van Gogh', correct: true },
        { value: 'Pablo Picasso', correct: false },
        { value: 'Leonardo da Vinci', correct: false },
        { value: 'Claude Monet', correct: false },
        { value: 'Michelangelo', correct: false },
        { value: 'Rembrandt', correct: false },
      ],
      points: 1000,
      duration: 30,
    },
    {
      type: QuestionType.Range,
      question: "What percentage of the earth's surface is covered by water?",
      media: {
        type: MediaType.Image,
        url: 'https://editalconcursosbrasil.com.br/wp-content/uploads/2022/12/planeta-terra-scaled.jpg',
      },
      min: 0,
      max: 100,
      margin: QuestionRangeAnswerMargin.Medium,
      correct: 71,
      points: 1000,
      duration: 30,
    },
  ]
}

/**
 * Build a ValidationError with the minimum fields your runtime validation uses.
 *
 * If your ValidationError has additional required properties, add them here
 * (e.g. `code`, `value`, etc.). Keep it centralized so tests remain consistent.
 */
function ve(path: string, message: string, code = 'invalid'): ValidationError {
  return {
    path,
    message,
    code,
  } as ValidationError
}

function validQuestionValidation(): QuizQuestionValidationResult {
  return buildValidationResult<QuestionDto>([]) as QuizQuestionValidationResult
}

function invalidQuestionValidation(
  errors: ValidationError[],
): QuizQuestionValidationResult {
  return buildValidationResult<QuestionDto>(
    errors,
  ) as QuizQuestionValidationResult
}

describe('AdvancedQuestionEditor', () => {
  beforeEach(() => {
    lastTextareaProps = undefined
    vi.clearAllMocks()
  })

  it('renders initial JSON from questions and has no error initially', () => {
    const questions = makeClassicQuestions()
    const questionValidations: QuizQuestionValidationResult[] = [
      validQuestionValidation(),
      validQuestionValidation(),
    ]

    render(
      <AdvancedQuestionEditor
        gameMode={GameMode.Classic}
        questions={questions}
        questionValidations={questionValidations}
        onChange={vi.fn()}
      />,
    )

    expect(lastTextareaProps).toBeDefined()
    expect(lastTextareaProps?.id).toBe('json-textarea')
    expect(lastTextareaProps?.type).toBe('code')
    expect(lastTextareaProps?.forceValidate).toBe(true)
    expect(lastTextareaProps?.value).toBe(JSON.stringify(questions, null, 2))

    expect(lastTextareaProps?.onAdditionalValidation?.()).toBe(true)
    expect(parseQuestionsJson).not.toHaveBeenCalled()
  })

  it('handleChange: valid JSON parses and forwards parsedQuestionsData to onChange, clears jsonError', () => {
    const onChange = vi.fn()
    const questions = makeClassicQuestions()
    const questionValidations: QuizQuestionValidationResult[] = [
      validQuestionValidation(),
      validQuestionValidation(),
    ]

    const parsedQuestionsData = makeClassicQuestions()
    vi.mocked(parseQuestionsJson).mockReturnValue(parsedQuestionsData)

    render(
      <AdvancedQuestionEditor
        gameMode={GameMode.Classic}
        questions={questions}
        questionValidations={questionValidations}
        onChange={onChange}
      />,
    )

    const inputText = JSON.stringify(makeClassicQuestions(), null, 2)

    act(() => {
      lastTextareaProps!.onChange(inputText)
    })

    expect(parseQuestionsJson).toHaveBeenCalledTimes(1)
    expect(parseQuestionsJson).toHaveBeenCalledWith(
      JSON.parse(inputText),
      GameMode.Classic,
    )
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(parsedQuestionsData)
    expect(lastTextareaProps?.onAdditionalValidation?.()).toBe(true)
  })

  it('handleChange: invalid JSON sets jsonError and does not call parseQuestionsJson nor onChange', () => {
    const onChange = vi.fn()
    const questions = makeClassicQuestions()
    const questionValidations: QuizQuestionValidationResult[] = [
      validQuestionValidation(),
      validQuestionValidation(),
    ]

    render(
      <AdvancedQuestionEditor
        gameMode={GameMode.Classic}
        questions={questions}
        questionValidations={questionValidations}
        onChange={onChange}
      />,
    )

    act(() => {
      lastTextareaProps!.onChange('{ invalid json')
    })

    expect(parseQuestionsJson).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()

    const additional = lastTextareaProps?.onAdditionalValidation?.()
    expect(typeof additional).toBe('string')
    expect((additional as string).length).toBeGreaterThan(0)
  })

  it('handleChange: parseQuestionsJson throwing sets jsonError and does not call onChange', () => {
    const onChange = vi.fn()
    const questions = makeClassicQuestions()
    const questionValidations: QuizQuestionValidationResult[] = [
      validQuestionValidation(),
      validQuestionValidation(),
    ]

    vi.mocked(parseQuestionsJson).mockImplementation(() => {
      throw new Error('Bad questions payload')
    })

    render(
      <AdvancedQuestionEditor
        gameMode={GameMode.Classic}
        questions={questions}
        questionValidations={questionValidations}
        onChange={onChange}
      />,
    )

    act(() => {
      lastTextareaProps!.onChange(
        JSON.stringify(makeClassicQuestions(), null, 2),
      )
    })

    expect(parseQuestionsJson).toHaveBeenCalledTimes(1)
    expect(onChange).not.toHaveBeenCalled()
    expect(lastTextareaProps?.onAdditionalValidation?.()).toBe(
      'Bad questions payload',
    )
  })

  it('prop change: when questions JSON changes, syncs jsonText and clears jsonError if validations are all valid', () => {
    const onChange = vi.fn()

    const initialQuestions = makeClassicQuestions()
    const initialValidations: QuizQuestionValidationResult[] = [
      validQuestionValidation(),
      validQuestionValidation(),
    ]

    vi.mocked(parseQuestionsJson).mockReturnValue(initialQuestions)

    const view = render(
      <AdvancedQuestionEditor
        gameMode={GameMode.Classic}
        questions={initialQuestions}
        questionValidations={initialValidations}
        onChange={onChange}
      />,
    )

    const nextQuestions = makeClassicQuestions().map((q) =>
      q.type === QuestionType.MultiChoice ? { ...q, points: 2000 } : q,
    )
    const nextValidations: QuizQuestionValidationResult[] = [
      validQuestionValidation(),
      validQuestionValidation(),
    ]

    act(() => {
      view.rerender(
        <AdvancedQuestionEditor
          gameMode={GameMode.Classic}
          questions={nextQuestions}
          questionValidations={nextValidations}
          onChange={onChange}
        />,
      )
    })

    expect(lastTextareaProps?.value).toBe(
      JSON.stringify(nextQuestions, null, 2),
    )
    expect(parseQuestionsJson).toHaveBeenCalledTimes(1)
    expect(parseQuestionsJson).toHaveBeenCalledWith(
      nextQuestions,
      GameMode.Classic,
    )
    expect(lastTextareaProps?.onAdditionalValidation?.()).toBe(true)
  })

  it('prop change: shows first invalid validation error (index, path, message)', () => {
    const onChange = vi.fn()

    const initialQuestions = makeClassicQuestions()
    const initialValidations: QuizQuestionValidationResult[] = [
      validQuestionValidation(),
      validQuestionValidation(),
    ]

    vi.mocked(parseQuestionsJson).mockReturnValue(initialQuestions)

    const view = render(
      <AdvancedQuestionEditor
        gameMode={GameMode.Classic}
        questions={initialQuestions}
        questionValidations={initialValidations}
        onChange={onChange}
      />,
    )

    const nextQuestions = makeClassicQuestions().map((q) =>
      q.type === QuestionType.Range ? { ...q, correct: 999 } : q,
    )

    const nextValidations: QuizQuestionValidationResult[] = [
      validQuestionValidation(),
      invalidQuestionValidation([ve('correct', 'must be within min/max')]),
    ]

    act(() => {
      view.rerender(
        <AdvancedQuestionEditor
          gameMode={GameMode.Classic}
          questions={nextQuestions}
          questionValidations={nextValidations}
          onChange={onChange}
        />,
      )
    })

    expect(parseQuestionsJson).toHaveBeenCalledTimes(1)
    expect(parseQuestionsJson).toHaveBeenCalledWith(
      nextQuestions,
      GameMode.Classic,
    )
    expect(lastTextareaProps?.onAdditionalValidation?.()).toBe(
      'questions[1].correct: must be within min/max',
    )
  })

  it('prop change: invalid question without path/message clears jsonError', () => {
    const onChange = vi.fn()

    const initialQuestions = makeClassicQuestions()
    const initialValidations: QuizQuestionValidationResult[] = [
      validQuestionValidation(),
      validQuestionValidation(),
    ]

    vi.mocked(parseQuestionsJson).mockReturnValue(initialQuestions)

    const view = render(
      <AdvancedQuestionEditor
        gameMode={GameMode.Classic}
        questions={initialQuestions}
        questionValidations={initialValidations}
        onChange={onChange}
      />,
    )

    const nextQuestions = makeClassicQuestions().map((q) =>
      q.type === QuestionType.MultiChoice ? { ...q, options: [] } : q,
    )

    // Invalid but errors[0] has no path/message -> component should clear jsonError
    const nextValidations: QuizQuestionValidationResult[] = [
      invalidQuestionValidation([]),
      validQuestionValidation(),
    ]

    act(() => {
      view.rerender(
        <AdvancedQuestionEditor
          gameMode={GameMode.Classic}
          questions={nextQuestions}
          questionValidations={nextValidations}
          onChange={onChange}
        />,
      )
    })

    expect(lastTextareaProps?.onAdditionalValidation?.()).toBe(true)
  })

  it('prop change: parseQuestionsJson throwing sets jsonError from thrown error (takes precedence)', () => {
    const onChange = vi.fn()

    const initialQuestions = makeClassicQuestions()
    const initialValidations: QuizQuestionValidationResult[] = [
      validQuestionValidation(),
      validQuestionValidation(),
    ]

    const view = render(
      <AdvancedQuestionEditor
        gameMode={GameMode.Classic}
        questions={initialQuestions}
        questionValidations={initialValidations}
        onChange={onChange}
      />,
    )

    vi.mocked(parseQuestionsJson).mockImplementation(() => {
      throw new Error('Props questions invalid')
    })

    const nextQuestions = makeClassicQuestions().map((q) =>
      q.type === QuestionType.Range ? { ...q, min: 200 } : q,
    )

    const nextValidations: QuizQuestionValidationResult[] = [
      validQuestionValidation(),
      invalidQuestionValidation([ve('min', 'min must be <= max')]),
    ]

    act(() => {
      view.rerender(
        <AdvancedQuestionEditor
          gameMode={GameMode.Classic}
          questions={nextQuestions}
          questionValidations={nextValidations}
          onChange={onChange}
        />,
      )
    })

    expect(lastTextareaProps?.onAdditionalValidation?.()).toBe(
      'Props questions invalid',
    )
  })

  it('does not run sync effect body when questions JSON is unchanged (no parseQuestionsJson call)', () => {
    const onChange = vi.fn()

    const questions = makeClassicQuestions()
    const validations: QuizQuestionValidationResult[] = [
      validQuestionValidation(),
      validQuestionValidation(),
    ]

    vi.mocked(parseQuestionsJson).mockReturnValue(questions)

    const view = render(
      <AdvancedQuestionEditor
        gameMode={GameMode.Classic}
        questions={questions}
        questionValidations={validations}
        onChange={onChange}
      />,
    )

    vi.clearAllMocks()

    act(() => {
      view.rerender(
        <AdvancedQuestionEditor
          gameMode={GameMode.Classic}
          questions={questions}
          questionValidations={validations}
          onChange={onChange}
        />,
      )
    })

    expect(parseQuestionsJson).not.toHaveBeenCalled()
  })

  it('updates jsonError when validations change without changing questions JSON', () => {
    const onChange = vi.fn()

    const questions = makeClassicQuestions()
    const validationsAllValid: QuizQuestionValidationResult[] = [
      validQuestionValidation(),
      validQuestionValidation(),
    ]

    vi.mocked(parseQuestionsJson).mockReturnValue(questions)

    const view = render(
      <AdvancedQuestionEditor
        gameMode={GameMode.Classic}
        questions={questions}
        questionValidations={validationsAllValid}
        onChange={onChange}
      />,
    )

    expect(lastTextareaProps?.onAdditionalValidation?.()).toBe(true)

    vi.clearAllMocks()

    const validationsNowInvalid: QuizQuestionValidationResult[] = [
      validQuestionValidation(),
      invalidQuestionValidation([ve('question', 'Required')]),
    ]

    act(() => {
      view.rerender(
        <AdvancedQuestionEditor
          gameMode={GameMode.Classic}
          questions={questions}
          questionValidations={validationsNowInvalid}
          onChange={onChange}
        />,
      )
    })

    expect(parseQuestionsJson).not.toHaveBeenCalled()
    expect(lastTextareaProps?.onAdditionalValidation?.()).toBe(
      'questions[1].question: Required',
    )
  })
})
