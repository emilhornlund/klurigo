import type { GameQuestionPreviewPlayerEvent } from '@klurigo/common'
import type { FC } from 'react'

import { ProgressBar } from '../../components'
import { GamePage, PlayerGameFooter } from '../common'

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
  <GamePage
    layout="fill"
    align="space-between"
    scrollable={false}
    footer={
      <PlayerGameFooter
        currentQuestion={currentQuestion}
        totalQuestions={totalQuestions}
        nickname={nickname}
        totalScore={totalScore}
      />
    }>
    <PlayerQuestionPreviewView
      mode={mode}
      questionType={questionType}
      question={question}
      questionPoints={questionPoints}
    />

    <ProgressBar countdown={countdown} disableStyling={true} />
  </GamePage>
)

export default PlayerQuestionPreviewState
