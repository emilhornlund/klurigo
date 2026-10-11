import type {
  GameQuestionPlayerEvent,
  SubmitQuestionAnswerRequestDto,
} from '@klurigo/common'
import type { FC } from 'react'
import { useState } from 'react'

import { ProgressBar } from '../../components'
import { useGameContext } from '../../context/game'
import { GamePage, PlayerGameFooter } from '../common'

import { PlayerQuestionView } from './components'

export interface PlayerQuestionStateProps {
  event: GameQuestionPlayerEvent
}

const PlayerQuestionState: FC<PlayerQuestionStateProps> = ({
  event: {
    player: {
      nickname,
      score: { total: totalScore },
    },
    question,
    answer,
    countdown,
    pagination: { current: currentQuestion, total: totalQuestions },
  },
}) => {
  const [isSubmittingQuestionAnswer, setIsSubmittingQuestionAnswer] =
    useState<boolean>(false)

  const { submitQuestionAnswer } = useGameContext()

  const handleSubmitQuestionAnswer = (
    request: SubmitQuestionAnswerRequestDto,
  ) => {
    setIsSubmittingQuestionAnswer(true)
    submitQuestionAnswer?.(request).finally(() =>
      setIsSubmittingQuestionAnswer(false),
    )
  }

  return (
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
      <PlayerQuestionView
        question={question}
        submittedAnswer={answer}
        countdown={countdown}
        loading={isSubmittingQuestionAnswer}
        onChange={handleSubmitQuestionAnswer}
      />

      <ProgressBar countdown={countdown} />
    </GamePage>
  )
}

export default PlayerQuestionState
