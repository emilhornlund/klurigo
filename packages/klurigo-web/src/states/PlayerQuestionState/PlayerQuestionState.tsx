import { faCircleCheck } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type {
  GameQuestionPlayerEvent,
  SubmitQuestionAnswerRequestDto,
} from '@klurigo/common'
import type { FC } from 'react'
import { useState } from 'react'

import { ProgressBar, Typography } from '../../components'
import { useGameContext } from '../../context/game'
import { GamePage, QuestionView } from '../common'

import styles from './PlayerQuestionState.module.scss'

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
    const submission = submitQuestionAnswer?.(request)

    if (!submission) {
      setIsSubmittingQuestionAnswer(false)
      return
    }

    void submission.then(
      () => setIsSubmittingQuestionAnswer(false),
      () => setIsSubmittingQuestionAnswer(false),
    )
  }

  return (
    <GamePage layout="fill" align="space-between" scrollable={false}>
      <QuestionView
        question={question}
        mediaPresentation="player"
        submittedAnswer={answer}
        countdown={countdown}
        loading={isSubmittingQuestionAnswer}
        onChange={handleSubmitQuestionAnswer}
      />

      {isSubmittingQuestionAnswer && !answer && (
        <div
          className={styles.submittingAnswer}
          role="status"
          aria-live="polite"
          aria-atomic="true">
          <span className={styles.loadingIndicator} aria-hidden="true" />
          <Typography variant="title2" color="inverse" bold>
            Submitting answer...
          </Typography>
        </div>
      )}

      {answer && (
        <div
          className={styles.answerConfirmation}
          role="status"
          aria-live="polite">
          <FontAwesomeIcon icon={faCircleCheck} aria-hidden="true" />
          <Typography variant="title2" color="inverse" bold>
            Answer locked in!
          </Typography>
        </div>
      )}

      <ProgressBar countdown={countdown} />
    </GamePage>
  )
}

export default PlayerQuestionState
