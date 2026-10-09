import type {
  CountdownEvent,
  GameEventQuestion,
  GameQuestionPlayerAnswerEvent,
  SubmitQuestionAnswerRequestDto,
} from '@klurigo/common'
import { QuestionType } from '@klurigo/common'
import type { FC } from 'react'

import { Typography } from '../../../../components'
import QuestionAnswerPicker from '../../../common/QuestionAnswerPicker'
import QuestionMedia from '../../../common/QuestionMedia'

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
  <div className={styles.fullHeight}>
    <Typography variant="title" align="center" color="inverse" maxLines={2}>
      {question.question}
    </Typography>

    <QuestionMedia
      type={question.type}
      media={question.type === QuestionType.Pin ? undefined : question.media}
      alt={question.question}
      countdown={countdown}
    />

    <QuestionAnswerPicker
      question={question}
      submittedAnswer={submittedAnswer}
      loading={loading}
      onChange={onChange}
    />
  </div>
)

export default PlayerQuestionView
