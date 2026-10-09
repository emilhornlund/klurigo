import type { CountdownEvent, GameMode, QuestionType } from '@klurigo/common'
import type { FC, ReactNode } from 'react'

import { ProgressBar } from '../../../../components'
import GamePage from '../../../common/GamePage'
import PlayerGameFooter from '../../../common/PlayerGameFooter'
import QuestionTextPreview from '../../../common/QuestionTextPreview'
import QuestionTypePointsBar from '../../../common/QuestionTypePointsBar'

export interface PlayerQuestionPreviewViewProps {
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

const PlayerQuestionPreviewView: FC<PlayerQuestionPreviewViewProps> = ({
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

export default PlayerQuestionPreviewView
