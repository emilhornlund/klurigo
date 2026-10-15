import type { GameQuestionPreviewHostEvent } from '@klurigo/common'
import type { FC } from 'react'

import { ProgressBar } from '../../components'
import { GamePage, HostGameFooter, QuestionPreviewView } from '../common'

export interface HostQuestionPreviewStateProps {
  event: GameQuestionPreviewHostEvent
}

const HostQuestionPreviewState: FC<HostQuestionPreviewStateProps> = ({
  event: {
    game: { mode, pin: gamePIN },
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
    scrollable={false}
    footer={
      <HostGameFooter
        gamePIN={gamePIN}
        currentQuestion={currentQuestion}
        totalQuestions={totalQuestions}
      />
    }>
    <QuestionPreviewView
      mode={mode}
      questionType={questionType}
      question={questionValue}
      questionPoints={questionPoints}
    />

    <ProgressBar countdown={countdown} disableStyling={true} />
  </GamePage>
)

export default HostQuestionPreviewState
