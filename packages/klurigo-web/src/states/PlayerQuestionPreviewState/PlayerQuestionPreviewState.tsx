import type { GameQuestionPreviewPlayerEvent } from '@klurigo/common'
import type { FC } from 'react'

import { PlayerQuestionPreviewView } from './components'

export interface PlayerQuestionPreviewStateProps {
  event: GameQuestionPreviewPlayerEvent
}

const PlayerQuestionPreviewState: FC<PlayerQuestionPreviewStateProps> = ({
  event: {
    game: { mode },
    player: { nickname, score: totalScore },
    question: { type: questionType, question, points: questionPoints },
    countdown,
    pagination: { current: currentQuestion, total: totalQuestions },
  },
}) => (
  <PlayerQuestionPreviewView
    mode={mode}
    questionType={questionType}
    question={question}
    questionPoints={questionPoints}
    countdown={countdown}
    currentQuestion={currentQuestion}
    totalQuestions={totalQuestions}
    nickname={nickname}
    totalScore={totalScore}
  />
)

export default PlayerQuestionPreviewState
