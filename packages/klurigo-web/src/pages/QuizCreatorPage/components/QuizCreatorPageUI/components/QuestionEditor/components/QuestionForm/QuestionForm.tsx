import type {
  QuestionDto,
  QuestionMultiChoiceDto,
  QuestionPinDto,
  QuestionPuzzleDto,
  QuestionRangeDto,
  QuestionTrueFalseDto,
  QuestionTypeAnswerDto,
  QuestionZeroToOneHundredRangeDto,
} from '@klurigo/common'
import {
  calculateRangeBounds,
  calculateRangeStep,
  QuestionRangeAnswerMargin,
} from '@klurigo/common'
import type { FC } from 'react'
import { useMemo } from 'react'

import { isValidNumber } from '../../../../../../../../utils/helpers'
import type {
  QuizQuestionModelFieldChangeFunction,
  QuizQuestionValidationResult,
} from '../../../../../../utils/QuestionDataSource'
import styles from '../../QuestionEditor.module.scss'
import QuestionField, { QuestionFieldType } from '../QuestionField'

export interface QuestionFormProps<T extends QuestionDto> {
  question: Partial<T>
  questionValidation: QuizQuestionValidationResult
  onChange: QuizQuestionModelFieldChangeFunction<T>
}

export const ClassicMultiChoiceOptionQuestionForm: FC<
  QuestionFormProps<QuestionMultiChoiceDto>
> = ({ question, questionValidation, onChange }) => {
  return (
    <>
      <div className={styles.section}>
        <QuestionField
          type={QuestionFieldType.CommonQuestion}
          value={question.question}
          validation={questionValidation}
          onChange={(newValue) => onChange('question', newValue)}
        />
      </div>
      <div className={styles.section}>
        <QuestionField
          type={QuestionFieldType.CommonMedia}
          value={question.media}
          duration={question.duration}
          validation={questionValidation}
          onChange={(newValue) => onChange('media', newValue)}
        />
      </div>
      <div className={styles.section}>
        <QuestionField
          type={QuestionFieldType.MultiChoiceOptions}
          values={question.options}
          validation={questionValidation}
          onChange={(newValue) => onChange('options', newValue)}
        />
      </div>
      <div className={styles.section}>
        <QuestionField
          type={QuestionFieldType.CommonPoints}
          value={question.points}
          validation={questionValidation}
          onChange={(newValue) => onChange('points', newValue)}
        />
      </div>
      <div className={styles.section}>
        <QuestionField
          type={QuestionFieldType.CommonInfo}
          value={question.info}
          validation={questionValidation}
          onChange={(newValue) => onChange('info', newValue)}
        />
      </div>
    </>
  )
}

export const ClassicRangeQuestionForm: FC<
  QuestionFormProps<QuestionRangeDto>
> = ({ question, questionValidation, onChange }) => {
  const correctRangeMarginFooter = useMemo<string | undefined>(() => {
    const {
      correct,
      margin = QuestionRangeAnswerMargin.Medium,
      min,
      max,
    } = question

    if (
      correct === undefined ||
      min === undefined ||
      max === undefined ||
      !isValidNumber(correct, min, max)
    ) {
      return undefined
    }

    if (margin === QuestionRangeAnswerMargin.None) {
      return `The correct answer must be exactly ${correct}.`
    }

    if (margin === QuestionRangeAnswerMargin.Maximum) {
      return `All answers within the range ${min}–${max} will be accepted as correct.`
    }

    const { lower: lowerBound, upper: upperBound } = calculateRangeBounds(
      margin,
      correct,
      min,
      max,
      calculateRangeStep(min, max),
    )

    return `Answers between ${lowerBound} and ${upperBound} will be considered correct.`
  }, [question])

  return (
    <>
      <div className={styles.section}>
        <QuestionField
          type={QuestionFieldType.CommonQuestion}
          value={question.question}
          validation={questionValidation}
          onChange={(newValue) => onChange('question', newValue)}
        />
      </div>
      <div className={styles.section}>
        <QuestionField
          type={QuestionFieldType.CommonMedia}
          value={question.media}
          duration={question.duration}
          validation={questionValidation}
          onChange={(newValue) => onChange('media', newValue)}
        />
      </div>
      <div className={styles.section}>
        <QuestionField
          type={QuestionFieldType.RangeMin}
          value={question.min}
          max={question.max}
          validation={questionValidation}
          onChange={(newValue) => onChange('min', newValue)}
        />
        <QuestionField
          type={QuestionFieldType.RangeMax}
          value={question.max}
          min={question.min}
          validation={questionValidation}
          onChange={(newValue) => onChange('max', newValue)}
        />
        <QuestionField
          type={QuestionFieldType.RangeCorrect}
          value={question.correct}
          min={question.min}
          max={question.max}
          validation={questionValidation}
          onChange={(newValue) => onChange('correct', newValue)}
        />
        <QuestionField
          type={QuestionFieldType.RangeMargin}
          value={question.margin}
          footer={correctRangeMarginFooter}
          validation={questionValidation}
          onChange={(newValue) => onChange('margin', newValue)}
        />
      </div>
      <div className={styles.section}>
        <QuestionField
          type={QuestionFieldType.CommonPoints}
          value={question.points}
          validation={questionValidation}
          onChange={(newValue) => onChange('points', newValue)}
        />
      </div>
      <div className={styles.section}>
        <QuestionField
          type={QuestionFieldType.CommonInfo}
          value={question.info}
          validation={questionValidation}
          onChange={(newValue) => onChange('info', newValue)}
        />
      </div>
    </>
  )
}

export const ClassicTrueFalseQuestionForm: FC<
  QuestionFormProps<QuestionTrueFalseDto>
> = ({ question, questionValidation, onChange }) => {
  return (
    <>
      <div className={styles.section}>
        <QuestionField
          type={QuestionFieldType.CommonQuestion}
          value={question.question}
          validation={questionValidation}
          onChange={(newValue) => onChange('question', newValue)}
        />
      </div>
      <div className={styles.section}>
        <QuestionField
          type={QuestionFieldType.CommonMedia}
          value={question.media}
          duration={question.duration}
          validation={questionValidation}
          onChange={(newValue) => onChange('media', newValue)}
        />
      </div>
      <div className={styles.section}>
        <QuestionField
          type={QuestionFieldType.TrueFalseOptions}
          value={question.correct}
          validation={questionValidation}
          onChange={(newValue) => onChange('correct', newValue)}
        />
      </div>
      <div className={styles.section}>
        <QuestionField
          type={QuestionFieldType.CommonPoints}
          value={question.points}
          validation={questionValidation}
          onChange={(newValue) => onChange('points', newValue)}
        />
      </div>
      <div className={styles.section}>
        <QuestionField
          type={QuestionFieldType.CommonInfo}
          value={question.info}
          validation={questionValidation}
          onChange={(newValue) => onChange('info', newValue)}
        />
      </div>
    </>
  )
}

export const ClassicTypeAnswerQuestionForm: FC<
  QuestionFormProps<QuestionTypeAnswerDto>
> = ({ question, questionValidation, onChange }) => {
  return (
    <>
      <div className={styles.section}>
        <QuestionField
          type={QuestionFieldType.CommonQuestion}
          value={question.question}
          validation={questionValidation}
          onChange={(newValue) => onChange('question', newValue)}
        />
      </div>
      <div className={styles.section}>
        <QuestionField
          type={QuestionFieldType.CommonMedia}
          value={question.media}
          duration={question.duration}
          validation={questionValidation}
          onChange={(newValue) => onChange('media', newValue)}
        />
      </div>
      <div className={styles.section}>
        <QuestionField
          type={QuestionFieldType.TypeAnswerOptions}
          values={question.options}
          validation={questionValidation}
          onChange={(newValue) => onChange('options', newValue)}
        />
      </div>
      <div className={styles.section}>
        <QuestionField
          type={QuestionFieldType.CommonPoints}
          value={question.points}
          validation={questionValidation}
          onChange={(newValue) => onChange('points', newValue)}
        />
      </div>
      <div className={styles.section}>
        <QuestionField
          type={QuestionFieldType.CommonInfo}
          value={question.info}
          validation={questionValidation}
          onChange={(newValue) => onChange('info', newValue)}
        />
      </div>
    </>
  )
}

export const ClassicPinQuestionForm: FC<QuestionFormProps<QuestionPinDto>> = ({
  question,
  questionValidation,
  onChange,
}) => (
  <>
    <div className={styles.section}>
      <QuestionField
        type={QuestionFieldType.CommonQuestion}
        value={question.question}
        validation={questionValidation}
        onChange={(newValue) => onChange('question', newValue)}
      />
    </div>
    <div className={styles.section}>
      <QuestionField
        type={QuestionFieldType.Pin}
        imageURL={question.imageURL}
        position={{
          x: question?.positionX,
          y: question?.positionY,
        }}
        tolerance={question.tolerance}
        validation={questionValidation}
        onImageUrlChange={(newValue) => onChange('imageURL', newValue)}
        onPositionChange={(pos) => {
          onChange('positionX', pos?.x)
          onChange('positionY', pos?.y)
        }}
      />
    </div>
    <div className={styles.section}>
      <QuestionField
        type={QuestionFieldType.PinTolerance}
        value={question.tolerance}
        validation={questionValidation}
        onChange={(newValue) => onChange('tolerance', newValue)}
      />
    </div>
    <div className={styles.section}>
      <QuestionField
        type={QuestionFieldType.CommonPoints}
        value={question.points}
        validation={questionValidation}
        onChange={(newValue) => onChange('points', newValue)}
      />
    </div>
    <div className={styles.section}>
      <QuestionField
        type={QuestionFieldType.CommonInfo}
        value={question.info}
        validation={questionValidation}
        onChange={(newValue) => onChange('info', newValue)}
      />
    </div>
  </>
)

export const ClassicPuzzleQuestionForm: FC<
  QuestionFormProps<QuestionPuzzleDto>
> = ({ question, questionValidation, onChange }) => (
  <>
    <div className={styles.section}>
      <QuestionField
        type={QuestionFieldType.CommonQuestion}
        value={question.question}
        validation={questionValidation}
        onChange={(newValue) => onChange('question', newValue)}
      />
    </div>
    <div className={styles.section}>
      <QuestionField
        type={QuestionFieldType.CommonMedia}
        value={question.media}
        duration={question.duration}
        validation={questionValidation}
        onChange={(newValue) => onChange('media', newValue)}
      />
    </div>
    <div className={styles.section}>
      <QuestionField
        type={QuestionFieldType.PuzzleValues}
        value={question.values}
        validation={questionValidation}
        onChange={(newValue) => onChange('values', newValue)}
      />
    </div>
    <div className={styles.section}>
      <QuestionField
        type={QuestionFieldType.CommonPoints}
        value={question.points}
        validation={questionValidation}
        onChange={(newValue) => onChange('points', newValue)}
      />
    </div>
    <div className={styles.section}>
      <QuestionField
        type={QuestionFieldType.CommonInfo}
        value={question.info}
        validation={questionValidation}
        onChange={(newValue) => onChange('info', newValue)}
      />
    </div>
  </>
)

export const ZeroToOneHundredRangeQuestionForm: FC<
  QuestionFormProps<QuestionZeroToOneHundredRangeDto>
> = ({ question, questionValidation, onChange }) => {
  return (
    <>
      <div className={styles.section}>
        <QuestionField
          type={QuestionFieldType.CommonQuestion}
          value={question.question}
          validation={questionValidation}
          onChange={(newValue) => onChange('question', newValue)}
        />
      </div>
      <div className={styles.section}>
        <QuestionField
          type={QuestionFieldType.CommonMedia}
          value={question.media}
          duration={question.duration}
          validation={questionValidation}
          onChange={(newValue) => onChange('media', newValue)}
        />
      </div>
      <div className={styles.section}>
        <QuestionField
          type={QuestionFieldType.RangeCorrect}
          value={question.correct}
          min={0}
          max={100}
          validation={questionValidation}
          onChange={(newValue) => onChange('correct', newValue)}
        />
      </div>
      <div className={styles.section}>
        <QuestionField
          type={QuestionFieldType.CommonInfo}
          value={question.info}
          validation={questionValidation}
          onChange={(newValue) => onChange('info', newValue)}
        />
      </div>
    </>
  )
}
