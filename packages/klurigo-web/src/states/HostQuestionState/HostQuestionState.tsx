import { faUserGroup } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { GameQuestionHostEvent } from '@klurigo/common'
import type { FC } from 'react'
import { useState } from 'react'

import {
  ConfirmDialog,
  IconButtonArrowRight,
  ProgressBar,
  Surface,
} from '../../components'
import { useGameContext } from '../../context/game'
import { GamePage, HostGameFooter, QuestionView } from '../common'

import styles from './HostQuestionState.module.scss'

export interface HostQuestionStateProps {
  event: GameQuestionHostEvent
}

const HostQuestionState: FC<HostQuestionStateProps> = ({
  event: {
    game: { pin },
    question,
    countdown,
    submissions: { current: currentSubmission, total: totalSubmissions },
    pagination: { current: currentQuestion, total: totalQuestions },
  },
}) => {
  const [showConfirmSkipQuestionDialog, setShowConfirmSkipQuestionDialog] =
    useState<boolean>(false)
  const [isSkippingQuestion, setIsSkippingQuestion] = useState<boolean>(false)

  const { completeTask } = useGameContext()

  const handleConfirmSkipQuestion = () => {
    setShowConfirmSkipQuestionDialog(false)
    setIsSkippingQuestion(true)
    completeTask?.().finally(() => setIsSkippingQuestion(false))
  }

  return (
    <>
      <GamePage
        layout="fill"
        align="space-between"
        scrollable={false}
        header={
          <IconButtonArrowRight
            id={'skip-button'}
            type="button"
            variant="primary"
            intent="accent"
            size="small"
            value="Skip"
            loading={isSkippingQuestion}
            onClick={() => setShowConfirmSkipQuestionDialog(true)}
          />
        }
        footer={
          <HostGameFooter
            gamePIN={pin}
            currentQuestion={currentQuestion}
            totalQuestions={totalQuestions}
          />
        }>
        <QuestionView
          question={question}
          countdown={countdown}
          interactive={false}>
          {!!totalSubmissions && (
            <div className={styles.submissionCounter}>
              <Surface className={styles.iconInfo}>
                <FontAwesomeIcon icon={faUserGroup} />
                <span>
                  {currentSubmission} / {totalSubmissions}
                </span>
              </Surface>
            </div>
          )}
        </QuestionView>
        <ProgressBar countdown={countdown} />
      </GamePage>
      <ConfirmDialog
        title="Skip this question?"
        message="This will end the current question immediately for all players and move the game forward."
        open={showConfirmSkipQuestionDialog}
        confirmTitle="Skip Question"
        closeTitle="Cancel"
        onConfirm={handleConfirmSkipQuestion}
        onClose={() => setShowConfirmSkipQuestionDialog(false)}
      />
    </>
  )
}

export default HostQuestionState
