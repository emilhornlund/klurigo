import type {
  CountdownEvent,
  GameEventQuestion,
  GameQuestionPlayerAnswerEvent,
  SubmitQuestionAnswerRequestDto,
} from '@klurigo/common'
import { QuestionType } from '@klurigo/common'
import type { FC, ReactNode } from 'react'

import { ProgressBar, Typography } from '../../../../components'
import GamePage from '../../../common/GamePage'
import PlayerGameFooter from '../../../common/PlayerGameFooter'
import QuestionAnswerPicker from '../../../common/QuestionAnswerPicker'
import QuestionMedia from '../../../common/QuestionMedia'

import styles from './PlayerQuestionView.module.scss'

export interface PlayerQuestionViewProps {
  question: GameEventQuestion
  submittedAnswer?: GameQuestionPlayerAnswerEvent
  countdown: CountdownEvent
  currentQuestion: number
  totalQuestions: number
  nickname: string
  totalScore: number
  loading?: boolean
  onChange?: (request: SubmitQuestionAnswerRequestDto) => void
  header?: ReactNode
}

const PlayerQuestionView: FC<PlayerQuestionViewProps> = ({
  question,
  submittedAnswer,
  countdown,
  currentQuestion,
  totalQuestions,
  nickname,
  totalScore,
  loading = false,
  onChange,
  header,
}) => (
  <GamePage
    layout="fill"
    align="space-between"
    header={header}
    footer={
      <PlayerGameFooter
        currentQuestion={currentQuestion}
        totalQuestions={totalQuestions}
        nickname={nickname}
        totalScore={totalScore}
      />
    }>
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

    <ProgressBar countdown={countdown} />
  </GamePage>
)

export default PlayerQuestionView
