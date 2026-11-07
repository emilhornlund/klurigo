import { faCircleCheck } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type {
  GameQuestionPlayerEvent,
  SubmitQuestionAnswerRequestDto,
} from '@klurigo/common'
import type { FC } from 'react'
import { useRef, useState } from 'react'

import { ProgressBar, Typography } from '../../components'
import { useGameContext } from '../../context/game'
import { GamePage, QuestionView } from '../common'

import styles from './PlayerQuestionState.module.scss'

export interface PlayerQuestionStateProps {
  event: GameQuestionPlayerEvent
}

const PlayerQuestionState: FC<PlayerQuestionStateProps> = ({
  event: { question, answer, countdown, pagination },
}) => {
  const questionNumber = pagination.current
  const [submission, setSubmission] = useState<{
    questionNumber: number
    status: 'submitting' | 'submitted'
  }>()
  const submissionRef = useRef(submission)
  const currentQuestionNumberRef = useRef(questionNumber)
  currentQuestionNumberRef.current = questionNumber
  const currentSubmission =
    submission?.questionNumber === questionNumber
      ? submission.status
      : undefined
  const isAnswerLocked = Boolean(answer) || currentSubmission === 'submitted'
  const isSubmittingQuestionAnswer = currentSubmission === 'submitting'

  const { submitQuestionAnswer } = useGameContext()

  const updateSubmission = (nextSubmission: typeof submission) => {
    submissionRef.current = nextSubmission
    setSubmission(nextSubmission)
  }

  const handleSubmitQuestionAnswer = (
    request: SubmitQuestionAnswerRequestDto,
  ) => {
    const activeSubmission = submissionRef.current
    if (
      answer ||
      (activeSubmission?.questionNumber === questionNumber &&
        (activeSubmission.status === 'submitting' ||
          activeSubmission.status === 'submitted'))
    ) {
      return
    }

    updateSubmission({ questionNumber, status: 'submitting' })
    const submission = submitQuestionAnswer?.(request)

    if (!submission) {
      updateSubmission(undefined)
      return
    }

    void submission.then(
      () => {
        if (
          currentQuestionNumberRef.current === questionNumber &&
          submissionRef.current?.questionNumber === questionNumber
        ) {
          updateSubmission({ questionNumber, status: 'submitted' })
        }
      },
      () => {
        if (
          currentQuestionNumberRef.current === questionNumber &&
          submissionRef.current?.questionNumber === questionNumber
        ) {
          updateSubmission(undefined)
        }
      },
    )
  }

  return (
    <GamePage layout="fill" align="space-between" scrollable={false}>
      <QuestionView
        question={question}
        mediaPresentation="player"
        submittedAnswer={answer}
        countdown={countdown}
        loading={isAnswerLocked || isSubmittingQuestionAnswer}
        onChange={handleSubmitQuestionAnswer}
      />

      {isSubmittingQuestionAnswer && !answer && !isAnswerLocked && (
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
