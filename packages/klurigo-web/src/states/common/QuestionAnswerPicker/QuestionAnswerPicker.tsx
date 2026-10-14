import type {
  GameEventQuestion,
  GameQuestionPlayerAnswerEvent,
  SubmitQuestionAnswerRequestDto,
} from '@klurigo/common'
import { QuestionType } from '@klurigo/common'
import type { FC } from 'react'

import { classNames } from '../../../utils/helpers'

import {
  AnswerInput,
  AnswerPicker,
  AnswerPin,
  AnswerRange,
  AnswerSort,
} from './components'
import styles from './QuestionAnswerPicker.module.scss'

export interface QuestionAnswerPickerProps {
  question: GameEventQuestion
  submittedAnswer?: GameQuestionPlayerAnswerEvent
  interactive?: boolean
  loading?: boolean
  className?: string
  onChange?: (request: SubmitQuestionAnswerRequestDto) => void
}

const QuestionAnswerPicker: FC<QuestionAnswerPickerProps> = ({
  question,
  submittedAnswer,
  interactive = true,
  loading = false,
  className,
  onChange,
}) => (
  <div className={classNames(styles.questionAnswerPicker, className)}>
    {question.type === QuestionType.MultiChoice && (
      <AnswerPicker
        answers={question.answers.map(({ value }) => value)}
        submittedAnswer={submittedAnswer}
        interactive={interactive && !submittedAnswer}
        loading={loading}
        onClick={(optionIndex) =>
          onChange?.({
            type: QuestionType.MultiChoice,
            optionIndex,
          })
        }
      />
    )}
    {question.type === QuestionType.TrueFalse && (
      <AnswerPicker
        answers={['True', 'False']}
        submittedAnswer={submittedAnswer}
        interactive={interactive && !submittedAnswer}
        loading={loading}
        onClick={(index) =>
          onChange?.({
            type: QuestionType.TrueFalse,
            value: index === 0,
          })
        }
      />
    )}
    {question.type === QuestionType.Range && (
      <AnswerRange
        min={question.min}
        max={question.max}
        step={question.step}
        submittedAnswer={submittedAnswer}
        interactive={interactive && !submittedAnswer}
        loading={loading}
        onSubmit={(value) => onChange?.({ type: QuestionType.Range, value })}
      />
    )}
    {question.type === QuestionType.TypeAnswer && (
      <AnswerInput
        submittedAnswer={submittedAnswer}
        interactive={interactive && !submittedAnswer}
        loading={loading}
        onSubmit={(value) =>
          onChange?.({ type: QuestionType.TypeAnswer, value })
        }
      />
    )}
    {question.type === QuestionType.Pin && (
      <AnswerPin
        imageURL={question.imageURL}
        submittedAnswer={submittedAnswer}
        interactive={interactive && !submittedAnswer}
        loading={loading}
        onSubmit={({ x: positionX, y: positionY }) =>
          onChange?.({
            type: QuestionType.Pin,
            positionX,
            positionY,
          })
        }
      />
    )}
    {question.type === QuestionType.Puzzle && (
      <AnswerSort
        values={question.values}
        submittedAnswer={submittedAnswer}
        interactive={interactive && !submittedAnswer}
        loading={loading}
        onSubmit={(values) => onChange?.({ type: QuestionType.Puzzle, values })}
      />
    )}
  </div>
)

export default QuestionAnswerPicker
