import type {
  CountdownEvent,
  GameEventQuestion,
  GameQuestionPlayerAnswerEvent,
  SubmitQuestionAnswerRequestDto,
} from '@klurigo/common'
import { QuestionType } from '@klurigo/common'
import type { FC, ReactNode } from 'react'

import { Stack } from '../../../components'
import { classNames } from '../../../utils/helpers'
import QuestionAnswerPicker from '../QuestionAnswerPicker'
import QuestionHeading from '../QuestionHeading'
import QuestionMedia from '../QuestionMedia'

import styles from './QuestionView.module.scss'

export interface QuestionViewProps {
  question: GameEventQuestion
  countdown?: CountdownEvent
  submittedAnswer?: GameQuestionPlayerAnswerEvent
  interactive?: boolean
  loading?: boolean
  onChange?: (request: SubmitQuestionAnswerRequestDto) => void
  children?: ReactNode
}

const QuestionView: FC<QuestionViewProps> = ({
  question,
  countdown,
  submittedAnswer,
  interactive = true,
  loading = false,
  onChange,
  children,
}) => (
  <Stack
    className={classNames(
      styles.questionView,
      question.type === QuestionType.Pin ? styles.pinQuestion : undefined,
      question.type === QuestionType.Puzzle ? styles.puzzleQuestion : undefined,
      question.type !== QuestionType.Pin && question.media?.url
        ? styles.hasMedia
        : undefined,
    )}>
    <QuestionHeading text={question.question} />
    {children}
    <QuestionMedia
      className={styles.mediaArea}
      type={question.type}
      media={question.type === QuestionType.Pin ? undefined : question.media}
      alt={question.question}
      countdown={countdown}
    />
    <QuestionAnswerPicker
      className={styles.answerArea}
      question={question}
      submittedAnswer={submittedAnswer}
      interactive={interactive}
      loading={loading}
      onChange={onChange}
    />
  </Stack>
)

export default QuestionView
