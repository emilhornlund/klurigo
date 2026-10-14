import type {
  CountdownEvent,
  GameEventQuestion,
  GameQuestionPlayerAnswerEvent,
  SubmitQuestionAnswerRequestDto,
} from '@klurigo/common'
import { QuestionType } from '@klurigo/common'
import type { FC } from 'react'

import { classNames } from '../../../../utils/helpers'
import {
  QuestionAnswerPicker,
  QuestionHeading,
  QuestionMedia,
} from '../../../common'

import styles from './PlayerQuestionView.module.scss'

export interface PlayerQuestionViewProps {
  question: GameEventQuestion
  submittedAnswer?: GameQuestionPlayerAnswerEvent
  countdown: CountdownEvent
  loading?: boolean
  onChange?: (request: SubmitQuestionAnswerRequestDto) => void
}

const PlayerQuestionView: FC<PlayerQuestionViewProps> = ({
  question,
  submittedAnswer,
  countdown,
  loading = false,
  onChange,
}) => (
  <div
    className={classNames(
      styles.fullHeight,
      question.type === QuestionType.Pin ? styles.pinQuestion : undefined,
      question.type === QuestionType.Puzzle ? styles.puzzleQuestion : undefined,
      question.type !== QuestionType.Pin && question.media?.url
        ? styles.hasMedia
        : undefined,
    )}>
    <QuestionHeading text={question.question} />

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
      loading={loading}
      onChange={onChange}
    />
  </div>
)

export default PlayerQuestionView
