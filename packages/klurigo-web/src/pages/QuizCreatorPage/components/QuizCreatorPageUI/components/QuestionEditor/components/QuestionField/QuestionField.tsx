import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import type {
  QuestionMediaDto,
  QuestionMultiChoiceOptionDto,
} from '@klurigo/common'
import {
  QuestionPinTolerance,
  QuestionRangeAnswerMargin,
  QuestionType,
} from '@klurigo/common'
import type { FC, ReactNode } from 'react'

import { Select, TextField } from '../../../../../../../../components'
import IconTooltip from '../../../../../../../../components/IconTooltip'
import {
  QuestionPinToleranceLabels,
  QuestionRangeAnswerMarginLabels,
  QuestionTypeLabels,
} from '../../../../../../../../models'
import {
  classNames,
  trimToUndefined,
} from '../../../../../../../../utils/helpers'
import type { QuizQuestionValidationResult } from '../../../../../../utils/QuestionDataSource'
import { getValidationErrorMessage } from '../../../../../../validation-rules'

import MediaQuestionField from './MediaQuestionField'
import MultiChoiceOptions from './MultiChoiceOptions'
import PinQuestionField, {
  type PinQuestionFieldProps,
} from './PinQuestionField'
import PuzzleValues from './PuzzleValues'
import styles from './QuestionField.module.scss'
import TrueFalseOptions from './TrueFalseOptions'
import TypeAnswerOptions from './TypeAnswerOptions'
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
      type: typeof QuestionFieldType.MultiChoiceOptions
      values?: QuestionMultiChoiceOptionDto[]
      validation: QuizQuestionValidationResult
      onChange: (value: QuestionMultiChoiceOptionDto[]) => void
    }
  | ({
      type: typeof QuestionFieldType.Pin
      validation: QuizQuestionValidationResult
    } & PinQuestionFieldProps)
  | {
      type: typeof QuestionFieldType.PinTolerance
      value?: QuestionPinTolerance
      validation: QuizQuestionValidationResult
      onChange: (value?: QuestionPinTolerance) => void
    }
  | {
      type: typeof QuestionFieldType.PuzzleValues
      value?: string[]
      validation: QuizQuestionValidationResult
      onChange: (values?: string[]) => void
    }
  | {
      type: typeof QuestionFieldType.RangeCorrect
      value?: number
      min?: number
      max?: number
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
  | {
      type: typeof QuestionFieldType.TrueFalseOptions
      value?: boolean
      validation: QuizQuestionValidationResult
      onChange: (value?: boolean) => void
    }
  | {
      type: typeof QuestionFieldType.TypeAnswerOptions
      values?: string[]
      validation: QuizQuestionValidationResult
      onChange: (values?: string[]) => void
    }
) & { footer?: string }

const QuestionFieldWrapper: FC<{
  label?: string
  footer?: string
  layout?: 'full' | 'half'
  info?: ReactNode | ReactNode[] | string
  className?: string
  children: ReactNode
}> = ({ label, footer, layout = 'full', info, className, children }) => (
  <div
    className={classNames(
      styles.questionFieldContainer,
      {
        full: styles.layoutFull,
        half: styles.layoutHalf,
        'half-exclusive': styles.layoutHalfExclusive,
      }[layout],
    )}>
    <div className={styles.label}>
      {label && <span>{label}</span>}
      {info && <IconTooltip icon={faCircleInfo}>{info}</IconTooltip>}
    </div>
    <div className={classNames(styles.content, className)}>{children}</div>
    {footer && <div className={styles.footer}>{footer}</div>}
  </div>
)

const QuestionField: FC<QuestionFieldProps> = (props) => {
  switch (props.type) {
    case QuestionFieldType.CommonDuration:
      return (
        <QuestionFieldWrapper
          label="Time Limit"
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
            forceValidate
          />
        </QuestionFieldWrapper>
      )
    case QuestionFieldType.CommonInfo:
      return (
        <QuestionFieldWrapper
          label="Info"
          layout="full"
          info="Text displayed with the question results — use it to explain the answer, share context, or add a fun fact."
          footer={props.footer}>
          <TextField
            id="question-info-textfield"
            type="text"
            placeholder="Info"
            value={props.value}
            customErrorMessage={getValidationErrorMessage(
              props.validation,
              'info',
            )}
            onChange={(value) =>
              props.onChange(trimToUndefined(value as string))
            }
            forceValidate
          />
        </QuestionFieldWrapper>
      )
    case QuestionFieldType.CommonMedia:
      return (
        <QuestionFieldWrapper layout="full" footer={props.footer}>
          <MediaQuestionField
            value={props.value}
            duration={props.duration}
            validation={props.validation}
            onChange={props.onChange}
          />
        </QuestionFieldWrapper>
      )
    case QuestionFieldType.CommonPoints:
      return (
        <QuestionFieldWrapper
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
            forceValidate
          />
        </QuestionFieldWrapper>
      )
    case QuestionFieldType.CommonQuestion:
      return (
        <QuestionFieldWrapper
          label="Question"
          layout="full"
          footer={props.footer}>
          <TextField
            id="question-text-textfield"
            type="text"
            placeholder="Question"
            value={props.value}
            customErrorMessage={getValidationErrorMessage(
              props.validation,
              'question',
            )}
            onChange={(value) => props.onChange(value as string)}
            forceValidate
          />
        </QuestionFieldWrapper>
      )
    case QuestionFieldType.CommonType:
      return (
        <QuestionFieldWrapper label="Type" layout="full" footer={props.footer}>
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
          />
        </QuestionFieldWrapper>
      )
    case QuestionFieldType.MultiChoiceOptions:
      return (
        <QuestionFieldWrapper
          label="Options"
          layout="full"
          info="The list of possible answers for a question."
          footer={props.footer}>
          <MultiChoiceOptions {...props} />
        </QuestionFieldWrapper>
      )

    case QuestionFieldType.Pin:
      return (
        <QuestionFieldWrapper layout="full" footer={props.footer}>
          <PinQuestionField {...props} />
        </QuestionFieldWrapper>
      )
    case QuestionFieldType.PinTolerance:
      return (
        <QuestionFieldWrapper
          label="Tolerance"
          layout="half"
          info={
            <>
              Each level sets the maximum distance from the correct location
              that still counts as correct. Within this distance, points are
              awarded on a sliding scale: closer pins earn more points.
              <ul>
                <li>
                  Low: Smallest margin of error — strictest, only near-exact
                  placements score.
                </li>
                <li>Medium: Moderate margin of error — balanced strictness</li>
                <li>
                  High: Wide margin of error — forgiving, but still excludes
                  extreme outliers.
                </li>
                <li>
                  Maximum: Largest margin of error — all placements score, but
                  closer pins earn more points.
                </li>
              </ul>
            </>
          }
          footer={props.footer}>
          <Select
            id="pin-tolerance-select"
            value={props.value}
            values={Object.values(QuestionPinTolerance).map((type) => ({
              key: type,
              value: type,
              valueLabel: QuestionPinToleranceLabels[type],
            }))}
            customErrorMessage={getValidationErrorMessage(
              props.validation,
              'tolerance',
            )}
            onChange={(value) => props.onChange(value as QuestionPinTolerance)}
          />
        </QuestionFieldWrapper>
      )
    case QuestionFieldType.PuzzleValues:
      return (
        <QuestionFieldWrapper
          label="Values"
          layout="full"
          info={
            <>
              Add at least 3 answers in the correct order. They will be
              automatically randomized during the game.
            </>
          }
          footer={props.footer}>
          <PuzzleValues {...props} />
        </QuestionFieldWrapper>
      )
    case QuestionFieldType.RangeCorrect:
      return (
        <QuestionFieldWrapper
          label="Correct"
          layout="half"
          info="The correct value for the range question, which must be within the range of min and max."
          footer={props.footer}>
          <TextField
            id="range-correct-textfield"
            type="number"
            placeholder=""
            value={props.value}
            customErrorMessage={getValidationErrorMessage(
              props.validation,
              'correct',
            )}
            onChange={(value) => props.onChange(value as number)}
          />
        </QuestionFieldWrapper>
      )
    case QuestionFieldType.RangeMargin:
      return (
        <QuestionFieldWrapper
          label="Margin"
          layout="half"
          info={
            <>
              Specifies the margin of error allowed for a range question.
              Determines how close a player’s answer must be to the correct
              value to be considered correct or partially correct. The margin
              can be one of the following:
              <ul>
                <li>None: Only the exact correct answer is accepted.</li>
                <li>Low: Accepts answers within ±5% of the correct value. </li>
                <li>Medium: Accepts answers within ±10%.</li>
                <li>High: Accepts answers within ±20%. </li>
                <li>Maximum: Any answer is considered correct.</li>
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
            forceValidate
          />
        </QuestionFieldWrapper>
      )
    case QuestionFieldType.RangeMax:
      return (
        <QuestionFieldWrapper
          label="Max"
          layout="half"
          info="The maximum possible value for the range question."
          footer={props.footer}>
          <TextField
            id="range-max-textfield"
            type="number"
            placeholder="Max"
            value={props.value}
            customErrorMessage={getValidationErrorMessage(
              props.validation,
              'max',
            )}
            onChange={(value) => props.onChange(value as number)}
          />
        </QuestionFieldWrapper>
      )
    case QuestionFieldType.RangeMin:
      return (
        <QuestionFieldWrapper
          label="Min"
          layout="half"
          info="The minimum possible value for the range question."
          footer={props.footer}>
          <TextField
            id="range-min-textfield"
            type="number"
            placeholder="Min"
            value={props.value}
            customErrorMessage={getValidationErrorMessage(
              props.validation,
              'min',
            )}
            onChange={(value) => props.onChange(value as number)}
            forceValidate
          />
        </QuestionFieldWrapper>
      )
    case QuestionFieldType.TrueFalseOptions:
      return (
        <QuestionFieldWrapper
          label="Options"
          layout="full"
          footer={props.footer}>
          <TrueFalseOptions {...props} />
        </QuestionFieldWrapper>
      )
    case QuestionFieldType.TypeAnswerOptions:
      return (
        <QuestionFieldWrapper
          label="Options"
          layout="full"
          info="The list of allowed typed answers for a question."
          footer={props.footer}>
          <TypeAnswerOptions {...props} />
        </QuestionFieldWrapper>
      )
  }
}

export default QuestionField
