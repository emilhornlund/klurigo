import type { CountdownEvent, GameMode, QuestionType } from '@klurigo/common'
import type { FC, ReactNode } from 'react'

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
  header?: ReactNode
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
