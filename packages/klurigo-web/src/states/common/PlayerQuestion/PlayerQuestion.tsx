import type {
  CountdownEvent,
  GameEventQuestion,
  GameQuestionPlayerAnswerEvent,
  SubmitQuestionAnswerRequestDto,
} from '@klurigo/common'
import { QuestionType } from '@klurigo/common'
import type { FC } from 'react'

import { ProgressBar, Typography } from '../../../components'
import GamePage from '../GamePage'
import PlayerGameFooter from '../PlayerGameFooter'
import QuestionAnswerPicker from '../QuestionAnswerPicker'
import QuestionMedia from '../QuestionMedia'

import styles from './PlayerQuestion.module.scss'

export interface PlayerQuestionProps {
  question: GameEventQuestion
  submittedAnswer?: GameQuestionPlayerAnswerEvent
  countdown: CountdownEvent
  currentQuestion: number
  totalQuestions: number
  nickname: string
  totalScore: number
  loading?: boolean
  onChange?: (request: SubmitQuestionAnswerRequestDto) => void
}

const PlayerQuestion: FC<PlayerQuestionProps> = ({
  question,
  submittedAnswer,
  countdown,
  currentQuestion,
  totalQuestions,
  nickname,
  totalScore,
  loading = false,
  onChange,
}) => (
  <GamePage
    layout="fill"
    align="space-between"
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

export default PlayerQuestion
