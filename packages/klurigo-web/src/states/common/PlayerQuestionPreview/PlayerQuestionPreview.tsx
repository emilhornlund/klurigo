import type { CountdownEvent, GameMode, QuestionType } from '@klurigo/common'
import type { FC } from 'react'

import { ProgressBar } from '../../../components'
import GamePage from '../GamePage'
import PlayerGameFooter from '../PlayerGameFooter'
import QuestionTextPreview from '../QuestionTextPreview'
import QuestionTypePointsBar from '../QuestionTypePointsBar'

export interface PlayerQuestionPreviewProps {
  mode: GameMode
  questionType: QuestionType
  question: string
  questionPoints?: number
  countdown: CountdownEvent
  currentQuestion: number
  totalQuestions: number
  nickname: string
  totalScore: number
}

const PlayerQuestionPreview: FC<PlayerQuestionPreviewProps> = ({
  mode,
  questionType,
  question,
  questionPoints,
  countdown,
  currentQuestion,
  totalQuestions,
  nickname,
  totalScore,
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
    <QuestionTypePointsBar
      mode={mode}
      questionType={questionType}
      questionPoints={questionPoints}
    />

    <QuestionTextPreview text={question} />

    <ProgressBar countdown={countdown} disableStyling={true} />
  </GamePage>
)

export default PlayerQuestionPreview
