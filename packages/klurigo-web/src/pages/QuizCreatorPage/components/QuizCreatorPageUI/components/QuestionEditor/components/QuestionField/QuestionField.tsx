import type { QuestionMediaDto } from '@klurigo/common'
import { QuestionRangeAnswerMargin, QuestionType } from '@klurigo/common'
import type { FC } from 'react'

import { Select, Textarea, TextField } from '../../../../../../../../components'
import {
  QuestionRangeAnswerMarginLabels,
  QuestionTypeLabels,
} from '../../../../../../../../models'
import { trimToUndefined } from '../../../../../../../../utils/helpers'
import type { QuizQuestionValidationResult } from '../../../../../../utils/QuestionDataSource'
import { getValidationErrorMessage } from '../../../../../../validation-rules'
import { FieldWrapper } from '../shared'

import MediaQuestionField from './MediaQuestionField'
import styles from './QuestionField.module.scss'
import { QuestionFieldType } from './types'

export type QuestionFieldProps = (
  | {
      type: typeof QuestionFieldType.CommonDuration
      value?: number
      validation: QuizQuestionValidationResult
      onChange: (value: number) => void
    }
  | {
      type: typeof QuestionFieldType.CommonInfo
      value?: string
      validation: QuizQuestionValidationResult
      onChange: (value?: string) => void
    }
  | {
      type: typeof QuestionFieldType.CommonMedia
      value?: QuestionMediaDto
      duration?: number
      validation: QuizQuestionValidationResult
      onChange: (value?: QuestionMediaDto) => void
    }
  | {
      type: typeof QuestionFieldType.CommonPoints
      value?: number
      validation: QuizQuestionValidationResult
      onChange: (value: number) => void
    }
  | {
      type: typeof QuestionFieldType.CommonQuestion
      value?: string
      validation: QuizQuestionValidationResult
      onChange: (value: string) => void
    }
  | {
      type: typeof QuestionFieldType.CommonType
      value?: QuestionType
      validation: QuizQuestionValidationResult
      onChange: (value: QuestionType) => void
    }
  | {
      type: typeof QuestionFieldType.RangeCorrect
      value?: number
      min?: number
      max?: number
      label?: string
      layout?: 'full' | 'half'
      validation: QuizQuestionValidationResult
      onChange: (value: number) => void
    }
  | {
      type: typeof QuestionFieldType.RangeMargin
      value?: QuestionRangeAnswerMargin
      validation: QuizQuestionValidationResult
      onChange: (value: QuestionRangeAnswerMargin) => void
    }
  | {
      type: typeof QuestionFieldType.RangeMax
      value?: number
      min?: number
      validation: QuizQuestionValidationResult
      onChange: (value: number) => void
    }
  | {
      type: typeof QuestionFieldType.RangeMin
      value?: number
      max?: number
      validation: QuizQuestionValidationResult
      onChange: (value: number) => void
    }
) & { footer?: string; validationRevealed?: boolean }

const QuestionField: FC<QuestionFieldProps> = (props) => {
  switch (props.type) {
    case QuestionFieldType.CommonDuration:
      return (
        <FieldWrapper
          label="Time limit"
          layout="full"
          info={
            <>
              The time limit for answering the question. The allowed values are:
              <ul>
                <li>5 seconds</li>
                <li>10 seconds</li>
                <li>20 seconds</li>
                <li>30 seconds</li>
                <li>45 seconds</li>
                <li>1 minute</li>
                <li>1 minute 30 seconds</li>
                <li>2 minutes</li>
                <li>3 minutes</li>
                <li>4 minutes</li>
              </ul>
            </>
          }
          footer={props.footer}>
          <Select
            id="duration-select"
            value={props.value !== undefined ? `${props.value}` : '30'}
            values={[
              {
                key: '5',
                value: '5',
                valueLabel: '5 seconds',
              },
              {
                key: '10',
                value: '10',
                valueLabel: '10 seconds',
              },
              {
                key: '20',
                value: '20',
                valueLabel: '20 seconds',
              },
              {
                key: '30',
                value: '30',
                valueLabel: '30 seconds',
              },
              {
                key: '45',
                value: '45',
                valueLabel: '45 seconds',
              },
              {
                key: '60',
                value: '60',
                valueLabel: '1 minute',
              },
              {
                key: '90',
                value: '90',
                valueLabel: '1 minute 30 seconds',
              },
              {
                key: '120',
                value: '120',
                valueLabel: '2 minutes',
              },
              {
                key: '180',
                value: '180',
                valueLabel: '3 minutes',
              },
              {
                key: '240',
                value: '240',
                valueLabel: '4 minutes',
              },
            ]}
            customErrorMessage={getValidationErrorMessage(
              props.validation,
              'duration',
            )}
            onChange={(value) => props.onChange(parseInt(value))}
            forceValidate={props.validationRevealed}
          />
        </FieldWrapper>
      )
    case QuestionFieldType.CommonInfo:
      return (
        <FieldWrapper
          label="Explanation"
          layout="full"
          className={styles.infoContent}
          info="Shown after the question. Use it to explain the answer, add context or share a fun fact."
          footer={props.footer}>
          <Textarea
            id="question-info-textarea"
            surface="light"
            placeholder="Explain the answer or add a fun fact..."
            value={props.value}
            customErrorMessage={getValidationErrorMessage(
              props.validation,
              'info',
            )}
            onChange={(value) => props.onChange(trimToUndefined(value))}
            forceValidate={props.validationRevealed}
          />
        </FieldWrapper>
      )
    case QuestionFieldType.CommonMedia:
      return (
        <FieldWrapper layout="full" footer={props.footer}>
          <MediaQuestionField
            value={props.value}
            duration={props.duration}
            validation={props.validation}
            onChange={props.onChange}
          />
        </FieldWrapper>
      )
    case QuestionFieldType.CommonPoints:
      return (
        <FieldWrapper
          label="Points"
          layout="full"
          info={
            <>
              The maximum number of points awarded for a correct answer. The
              allowed values are:
              <ul>
                <li>Zero Points</li>
                <li>Standard Points (1000)</li>
                <li>Double Points (2000)</li>
              </ul>
            </>
          }
          footer={props.footer}>
          <Select
            id="points-select"
            value={props.value !== undefined ? `${props.value}` : '1000'}
            values={[
              {
                key: '0',
                value: '0',
                valueLabel: 'Zero Points',
              },
              {
                key: '1000',
                value: '1000',
                valueLabel: 'Standard Points (1000)',
              },
              {
                key: '2000',
                value: '2000',
                valueLabel: 'Double Points (2000)',
              },
            ]}
            customErrorMessage={getValidationErrorMessage(
              props.validation,
              'points',
            )}
            onChange={(value) => props.onChange(parseInt(value))}
            forceValidate={props.validationRevealed}
          />
        </FieldWrapper>
      )
    case QuestionFieldType.CommonQuestion:
      return (
        <FieldWrapper
          label="Question"
          layout="full"
          className={styles.questionTextContent}
          footer={props.footer}
          required>
          <Textarea
            id="question-text-textarea"
            placeholder="Write your question here..."
            value={props.value}
            customErrorMessage={getValidationErrorMessage(
              props.validation,
              'question',
            )}
            onChange={props.onChange}
            forceValidate={props.validationRevealed}
          />
        </FieldWrapper>
      )
    case QuestionFieldType.CommonType:
      return (
        <FieldWrapper label="Question type" layout="full" footer={props.footer}>
          <Select
            id="question-type-select"
            value={props.value}
            values={Object.values(QuestionType).map((type) => ({
              key: type,
              value: type,
              valueLabel: QuestionTypeLabels[type],
            }))}
            customErrorMessage={getValidationErrorMessage(
              props.validation,
              'type',
            )}
            onChange={(value) => props.onChange(value as QuestionType)}
            forceValidate={props.validationRevealed}
          />
        </FieldWrapper>
      )

    case QuestionFieldType.RangeCorrect:
      return (
        <FieldWrapper
          label={props.label ?? 'Correct answer'}
          layout={props.layout ?? 'half'}
          info="The target answer. It must be between the minimum and maximum values."
          footer={props.footer}
          required>
          <TextField
            id="range-correct-textfield"
            type="number"
            placeholder=""
            value={props.value}
            min={props.min}
            max={props.max}
            customErrorMessage={getValidationErrorMessage(
              props.validation,
              'correct',
            )}
            onChange={(value) => props.onChange(value as number)}
            forceValidate={props.validationRevealed}
            grow
          />
        </FieldWrapper>
      )
    case QuestionFieldType.RangeMargin:
      return (
        <FieldWrapper
          label="Accepted margin"
          layout="half"
          info={
            <>
              Controls how far from the correct answer a player can be and still
              be accepted. The percentage is based on the full range between the
              minimum and maximum values.
              <ul>
                <li>None: Only the exact correct answer is accepted.</li>
                <li>Low: Accepts approximately ±5% of the full range.</li>
                <li>Medium: Accepts approximately ±10% of the full range.</li>
                <li>High: Accepts approximately ±20% of the full range.</li>
                <li>Maximum: Any answer within the range is accepted.</li>
              </ul>
            </>
          }
          footer={props.footer}>
          <Select
            id="range-margin-select"
            value={props.value}
            values={Object.values(QuestionRangeAnswerMargin).map((type) => ({
              key: type,
              value: type,
              valueLabel: QuestionRangeAnswerMarginLabels[type],
            }))}
            customErrorMessage={getValidationErrorMessage(
              props.validation,
              'margin',
            )}
            onChange={(value) =>
              props.onChange(value as QuestionRangeAnswerMargin)
            }
            forceValidate={props.validationRevealed}
            grow
          />
        </FieldWrapper>
      )
    case QuestionFieldType.RangeMax:
      return (
        <FieldWrapper
          label="Maximum value"
          layout="half"
          info="The highest value players can select."
          footer={props.footer}>
          <TextField
            id="range-max-textfield"
            type="number"
            placeholder="Maximum"
            value={props.value}
            customErrorMessage={getValidationErrorMessage(
              props.validation,
              'max',
            )}
            onChange={(value) => props.onChange(value as number)}
            forceValidate={props.validationRevealed}
            grow
          />
        </FieldWrapper>
      )
    case QuestionFieldType.RangeMin:
      return (
        <FieldWrapper
          label="Minimum value"
          layout="half"
          info="The lowest value players can select."
          footer={props.footer}>
          <TextField
            id="range-min-textfield"
            type="number"
            placeholder="Minimum"
            value={props.value}
            customErrorMessage={getValidationErrorMessage(
              props.validation,
              'min',
            )}
            onChange={(value) => props.onChange(value as number)}
            forceValidate={props.validationRevealed}
            grow
          />
        </FieldWrapper>
      )
  }
}

export default QuestionField
