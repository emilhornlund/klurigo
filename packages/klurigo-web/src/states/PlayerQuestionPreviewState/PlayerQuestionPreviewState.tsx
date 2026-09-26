import type { GameQuestionPreviewPlayerEvent } from '@klurigo/common'
import type { FC } from 'react'

import { ProgressBar } from '../../components'
import {
  GamePage,
  PlayerGameFooter,
  QuestionTextPreview,
  QuestionTypePointsBar,
} from '../common'

export interface PlayerQuestionPreviewStateProps {
  event: GameQuestionPreviewPlayerEvent
}

const PlayerQuestionPreviewState: FC<PlayerQuestionPreviewStateProps> = ({
  event: {
    game: { mode },
    player: { nickname: playerNickname, score: playerTotalScore },
    question: {
      type: questionType,
      question: questionValue,
      points: questionPoints,
    },
    countdown,
    pagination: { current: currentQuestion, total: totalQuestions },
  },
}) => (
  <GamePage
    layout="fill"
    align="space-between"
    footer={
      <PlayerGameFooter
        currentQuestion={currentQuestion}
        totalQuestions={totalQuestions}
        nickname={playerNickname}
        totalScore={playerTotalScore}
      />
    }>
    <QuestionTypePointsBar
      mode={mode}
      questionType={questionType}
      questionPoints={questionPoints}
    />

    <QuestionTextPreview text={questionValue} />

    <ProgressBar countdown={countdown} disableStyling={true} />
  </GamePage>
)

export default PlayerQuestionPreviewState
