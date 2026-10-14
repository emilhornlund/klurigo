import type {
  GameQuestionPlayerEvent,
  SubmitQuestionAnswerRequestDto,
} from '@klurigo/common'
import type { FC } from 'react'
import { useState } from 'react'

import { ProgressBar } from '../../components'
import { useGameContext } from '../../context/game'
import { GamePage } from '../common'

import { PlayerQuestionView } from './components'

export interface PlayerQuestionStateProps {
  event: GameQuestionPlayerEvent
}

const PlayerQuestionState: FC<PlayerQuestionStateProps> = ({
  event: { question, answer, countdown },
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
    <GamePage layout="fill" align="space-between" scrollable={false}>
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
