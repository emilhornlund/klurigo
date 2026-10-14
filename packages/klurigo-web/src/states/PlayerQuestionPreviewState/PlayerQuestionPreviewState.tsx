import type { GameQuestionPreviewPlayerEvent } from '@klurigo/common'
import type { FC } from 'react'

import { ProgressBar } from '../../components'
import { GamePage } from '../common'

import { PlayerQuestionPreviewView } from './components'

export interface PlayerQuestionPreviewStateProps {
  event: GameQuestionPreviewPlayerEvent
}

const PlayerQuestionPreviewState: FC<PlayerQuestionPreviewStateProps> = ({
  event: {
    game: { mode },
    question: { type: questionType, question, points: questionPoints },
    countdown,
  },
}) => (
  <GamePage layout="fill" align="space-between" scrollable={false}>
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
