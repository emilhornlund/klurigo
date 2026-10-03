import {
  calculateRangeBounds,
  calculateRangeStep,
  QuestionRangeAnswerMargin,
  type QuestionRangeDto,
} from '@klurigo/common'
import type { FC } from 'react'
import { useMemo } from 'react'

import { Stack, Typography } from '../../../../../../../../../components'
import { isValidNumber } from '../../../../../../../../../utils/helpers'
import type { QuizQuestionValidationResult } from '../../../../../../../utils/QuestionDataSource'
import QuestionField, { QuestionFieldType } from '../../QuestionField'

import styles from './RangeAnswerEditor.module.scss'

export interface RangeAnswerEditorProps {
  question: Partial<QuestionRangeDto>
  validation: QuizQuestionValidationResult
  validationRevealed?: boolean
  onMinChange: (value: number) => void
  onMaxChange: (value: number) => void
  onCorrectChange: (value: number) => void
  onMarginChange: (value: QuestionRangeAnswerMargin) => void
}

const RangeAnswerEditor: FC<RangeAnswerEditorProps> = ({
  question,
  validation,
  validationRevealed,
  onMinChange,
  onMaxChange,
  onCorrectChange,
  onMarginChange,
}) => {
  const rangePreview = useMemo(() => {
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
      max <= min ||
      !isValidNumber(correct, min, max)
    ) {
      return undefined
    }

    const range = max - min
    const correctPosition = ((correct - min) / range) * 100

    if (margin === QuestionRangeAnswerMargin.None) {
      return {
        min,
        max,
        correct,
        correctPosition,
        acceptedStart: correctPosition,
        acceptedWidth: 0,
        description: `Only ${correct} will be accepted.`,
      }
    }

    if (margin === QuestionRangeAnswerMargin.Maximum) {
      return {
        min,
        max,
        correct,
        correctPosition,
        acceptedStart: 0,
        acceptedWidth: 100,
        description: `Any answer from ${min} to ${max} will be accepted.`,
      }
    }

    const { lower, upper } = calculateRangeBounds(
      margin,
      correct,
      min,
      max,
      calculateRangeStep(min, max),
    )

    return {
      min,
      max,
      correct,
      correctPosition,
      acceptedStart: ((lower - min) / range) * 100,
      acceptedWidth: ((upper - lower) / range) * 100,
      description: `Answers from ${lower} to ${upper} will be accepted.`,
    }
  }, [question])

  return (
    <Stack width="full" spacing="stack">
      <Stack width="full" spacing="compact">
        <Typography variant="control" bold noOpacity>
          Accepted range
        </Typography>

        <Typography variant="control2" color="muted" noOpacity>
          Set the available range, target answer and accepted margin.
        </Typography>
      </Stack>

      {rangePreview && (
        <div className={styles.preview} aria-label="Accepted range preview">
          <div className={styles.previewValues}>
            <Typography variant="control2" color="subtle" noOpacity>
              {rangePreview.min}
            </Typography>

            <Typography
              variant="control2"
              color="subtle"
              align="right"
              noOpacity>
              {rangePreview.max}
            </Typography>
          </div>

          <div className={styles.trackContainer}>
            <div className={styles.track}>
              {rangePreview.acceptedWidth > 0 && (
                <div
                  data-testid="accepted-range"
                  className={styles.acceptedRange}
                  style={{
                    left: `${rangePreview.acceptedStart}%`,
                    width: `${rangePreview.acceptedWidth}%`,
                  }}
                />
              )}

              <div
                data-testid="correct-marker"
                className={styles.correctMarker}
                style={{
                  left: `${rangePreview.correctPosition}%`,
                }}>
                <div className={styles.correctValue}>
                  <Typography variant="control2" bold noOpacity>
                    {rangePreview.correct}
                  </Typography>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={styles.controls}>
        <QuestionField
          type={QuestionFieldType.RangeMin}
          value={question.min}
          max={question.max}
          validation={validation}
          validationRevealed={validationRevealed}
          onChange={onMinChange}
        />

        <QuestionField
          type={QuestionFieldType.RangeMax}
          value={question.max}
          min={question.min}
          validation={validation}
          validationRevealed={validationRevealed}
          onChange={onMaxChange}
        />

        <QuestionField
          type={QuestionFieldType.RangeCorrect}
          value={question.correct}
          min={question.min}
          max={question.max}
          validation={validation}
          validationRevealed={validationRevealed}
          onChange={onCorrectChange}
        />

        <QuestionField
          type={QuestionFieldType.RangeMargin}
          value={question.margin}
          validation={validation}
          validationRevealed={validationRevealed}
          onChange={onMarginChange}
        />
      </div>

      {rangePreview && (
        <Typography variant="control2" color="muted" noOpacity>
          {rangePreview.description}
        </Typography>
      )}
    </Stack>
  )
}

export default RangeAnswerEditor
