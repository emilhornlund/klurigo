import {
  faArrowLeft,
  faArrowRight,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import {
  type CountdownEvent,
  type GameMode,
  type GameQuestionPlayerAnswerEvent,
  QuestionType,
  type SubmitQuestionAnswerRequestDto,
} from '@klurigo/common'
import type { FC, ReactNode } from 'react'
import { useMemo, useState } from 'react'

import {
  Button,
  Page,
  ProgressBar,
  Stack,
  Typography,
} from '../../../../../../components'
import { GamePage, PlayerGameFooter } from '../../../../../../states/common'
import { PlayerQuestionPreviewView } from '../../../../../../states/PlayerQuestionPreviewState/components'
import { PlayerQuestionView } from '../../../../../../states/PlayerQuestionState/components'
import type { QuizQuestionModel } from '../../../../utils/QuestionDataSource'

import { toPlayerQuestions } from './quiz-preview-question'
import styles from './QuizPreview.module.scss'

type PreviewPhase = 'question-preview' | 'question'

export interface QuizPreviewProps {
  mode: GameMode
  questions: QuizQuestionModel[]
  onExit: () => void
}

const nickname = 'Preview player'

const createCountdown = (duration: number): CountdownEvent => {
  const initiated = new Date()
  const expiry = new Date(initiated.getTime() + Math.max(duration, 1) * 1000)
  return {
    initiatedTime: initiated.toISOString(),
    expiryTime: expiry.toISOString(),
    serverTime: initiated.toISOString(),
  }
}

const toSubmittedAnswer = (
  request: SubmitQuestionAnswerRequestDto,
): GameQuestionPlayerAnswerEvent => {
  if (request.type === QuestionType.MultiChoice) {
    return { type: request.type, value: request.optionIndex }
  }
  if (request.type === QuestionType.Pin) {
    return {
      type: request.type,
      value: `${request.positionX},${request.positionY}`,
    }
  }
  if (request.type === QuestionType.Puzzle) {
    return { type: request.type, value: [...request.values] }
  }
  switch (request.type) {
    case QuestionType.Range:
      return { type: request.type, value: request.value }
    case QuestionType.TrueFalse:
      return { type: request.type, value: request.value }
    case QuestionType.TypeAnswer:
      return { type: request.type, value: request.value }
  }
}

interface PreviewControlsProps {
  onExit: () => void
  currentQuestion?: number
  totalQuestions?: number
  onBack?: () => void
  continueLabel?: string
  onContinue?: () => void
  continueDisabled?: boolean
}

const PreviewControls: FC<PreviewControlsProps> = ({
  onExit,
  currentQuestion,
  totalQuestions,
  onBack,
  continueLabel,
  onContinue,
  continueDisabled,
}) => (
  <div className={styles.previewChrome} data-testid="preview-controls">
    <Typography variant="body2" color="inverse" noOpacity bold>
      Preview
    </Typography>
    {currentQuestion !== undefined && totalQuestions !== undefined && (
      <Typography variant="body2" color="inverse" noOpacity>
        {currentQuestion} / {totalQuestions}
      </Typography>
    )}
    <div className={styles.previewControls}>
      {onBack && (
        <Button
          id="preview-back"
          type="button"
          variant="outline"
          surface="brand"
          size="small"
          value="Back"
          hideValue="mobile"
          aria-label="Back"
          icon={faArrowLeft}
          onClick={onBack}
        />
      )}
      {continueLabel && onContinue && (
        <Button
          id="preview-continue"
          type="button"
          variant="primary"
          surface="brand"
          intent="accent"
          size="small"
          value={continueLabel}
          hideValue="mobile"
          aria-label={continueLabel}
          icon={faArrowRight}
          iconPosition="trailing"
          disabled={continueDisabled}
          onClick={onContinue}
        />
      )}
      <Button
        id="preview-exit"
        type="button"
        variant="outline"
        surface="brand"
        size="small"
        value="Exit preview"
        hideValue="mobile"
        aria-label="Exit preview"
        icon={faXmark}
        onClick={onExit}
      />
    </div>
  </div>
)

const QuizPreview: FC<QuizPreviewProps> = ({ mode, questions, onExit }) => {
  const playerQuestions = useMemo(
    () => toPlayerQuestions(mode, questions),
    [mode, questions],
  )
  const [questionIndex, setQuestionIndex] = useState(0)
  const [phase, setPhase] = useState<PreviewPhase>('question-preview')
  const [submittedAnswer, setSubmittedAnswer] = useState<
    GameQuestionPlayerAnswerEvent | undefined
  >()
  const [complete, setComplete] = useState(false)
  const [countdown, setCountdown] = useState(() =>
    createCountdown(playerQuestions[0]?.duration ?? 1),
  )

  const question = playerQuestions[questionIndex]

  const resetAnswer = () => setSubmittedAnswer(undefined)
  const resetCountdown = (duration = question?.duration ?? 1) =>
    setCountdown(createCountdown(duration))

  const handleContinueToQuestion = () => {
    resetAnswer()
    resetCountdown()
    setPhase('question')
  }

  const handleAnswer = (request: SubmitQuestionAnswerRequestDto) => {
    setSubmittedAnswer(toSubmittedAnswer(request))
  }

  const handleContinueToNext = () => {
    if (!submittedAnswer) return
    if (questionIndex === playerQuestions.length - 1) {
      setComplete(true)
      return
    }
    const nextQuestionIndex = questionIndex + 1
    setQuestionIndex(nextQuestionIndex)
    resetAnswer()
    resetCountdown(playerQuestions[nextQuestionIndex]?.duration)
    setPhase('question-preview')
  }

  const handleBack = () => {
    if (phase === 'question') {
      resetAnswer()
      resetCountdown()
      setPhase('question-preview')
      return
    }
    if (questionIndex > 0) {
      setQuestionIndex((current) => current - 1)
      resetAnswer()
      resetCountdown(playerQuestions[questionIndex - 1]?.duration)
      setPhase('question')
    }
  }

  const handleRestart = () => {
    setQuestionIndex(0)
    setPhase('question-preview')
    resetAnswer()
    resetCountdown(playerQuestions[0]?.duration)
    setComplete(false)
  }

  const controls = (
    continueLabel: string,
    continueDisabled = false,
  ): ReactNode => (
    <PreviewControls
      onExit={onExit}
      currentQuestion={questionIndex + 1}
      totalQuestions={playerQuestions.length}
      onBack={
        questionIndex > 0 || phase === 'question' ? handleBack : undefined
      }
      continueLabel={continueLabel}
      continueDisabled={continueDisabled}
      onContinue={
        phase === 'question-preview'
          ? handleContinueToQuestion
          : handleContinueToNext
      }
    />
  )

  if (complete) {
    return (
      <Page
        layout="fill"
        hideLogin
        header={<PreviewControls onExit={onExit} />}>
        <Stack className={styles.complete}>
          <Typography variant="title" color="inverse">
            Preview complete
          </Typography>
          <Typography variant="body" color="inverse">
            You reached the end of this quiz without creating a game.
          </Typography>
          <div className={styles.completeActions}>
            <Button
              id="preview-return"
              type="button"
              variant="outline"
              surface="brand"
              value="Return to editor"
              onClick={onExit}
            />
            <Button
              id="preview-restart"
              type="button"
              variant="primary"
              surface="brand"
              intent="accent"
              value="Restart preview"
              onClick={handleRestart}
            />
          </div>
        </Stack>
      </Page>
    )
  }

  if (!question) {
    return (
      <Page
        layout="fill"
        hideLogin
        header={<PreviewControls onExit={onExit} />}>
        <Typography variant="body" color="inverse">
          Add a complete question to preview this quiz.
        </Typography>
      </Page>
    )
  }

  const pagination = {
    currentQuestion: questionIndex + 1,
    totalQuestions: playerQuestions.length,
  }

  if (phase === 'question-preview') {
    return (
      <GamePage
        layout="fill"
        align="space-between"
        header={controls('Continue to question')}
        footer={
          <PlayerGameFooter
            currentQuestion={pagination.currentQuestion}
            totalQuestions={pagination.totalQuestions}
            nickname={nickname}
            totalScore={0}
          />
        }>
        <PlayerQuestionPreviewView
          key={`preview-${questionIndex}`}
          mode={mode}
          questionType={question.type}
          question={question.question}
          questionPoints={
            questions[questionIndex] && 'points' in questions[questionIndex]
              ? questions[questionIndex].points
              : undefined
          }
        />

        <ProgressBar countdown={countdown} disableStyling={true} />
      </GamePage>
    )
  }

  return (
    <GamePage
      layout="fill"
      align="space-between"
      header={controls(
        questionIndex === playerQuestions.length - 1
          ? 'Finish preview'
          : 'Next question',
        !submittedAnswer,
      )}
      footer={
        <PlayerGameFooter
          currentQuestion={pagination.currentQuestion}
          totalQuestions={pagination.totalQuestions}
          nickname={nickname}
          totalScore={0}
        />
      }>
      <PlayerQuestionView
        key={`question-${questionIndex}`}
        question={question}
        submittedAnswer={submittedAnswer}
        countdown={countdown}
        onChange={handleAnswer}
      />

      <ProgressBar countdown={countdown} />
    </GamePage>
  )
}

export default QuizPreview
