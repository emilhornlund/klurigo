import {
  faArrowLeft,
  faArrowRight,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import {
  type CountdownEvent,
  type GameMode,
  type GameQuestionPlayerAnswerEvent,
  getQuestionPreviewDurationMs,
  QuestionType,
  type SubmitQuestionAnswerRequestDto,
} from '@klurigo/common'
import type { FC, ReactNode } from 'react'
import { useMemo, useState } from 'react'

import {
  Button,
  Page,
  ProgressBar,
  Typography,
} from '../../../../../../components'
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

const createCountdownFromMilliseconds = (
  durationMs: number,
): CountdownEvent => {
  const initiated = new Date()
  const expiry = new Date(initiated.getTime() + Math.max(durationMs, 1))
  return {
    initiatedTime: initiated.toISOString(),
    expiryTime: expiry.toISOString(),
    serverTime: initiated.toISOString(),
  }
}

const getQuestionDurationMs = (durationSeconds?: number): number =>
  (durationSeconds ?? 1) * 1000

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
    createCountdownFromMilliseconds(
      getQuestionPreviewDurationMs(playerQuestions[0]?.question ?? ''),
    ),
  )

  const question = playerQuestions[questionIndex]

  const resetAnswer = () => setSubmittedAnswer(undefined)
  const resetCountdown = (durationMs: number) =>
    setCountdown(createCountdownFromMilliseconds(durationMs))

  const handleContinueToQuestion = () => {
    resetAnswer()
    resetCountdown(getQuestionDurationMs(question?.duration))
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
    resetCountdown(
      getQuestionPreviewDurationMs(
        playerQuestions[nextQuestionIndex]?.question ?? '',
      ),
    )
    setPhase('question-preview')
  }

  const handleBack = () => {
    if (phase === 'question') {
      resetAnswer()
      resetCountdown(getQuestionPreviewDurationMs(question?.question ?? ''))
      setPhase('question-preview')
      return
    }
    if (questionIndex > 0) {
      setQuestionIndex((current) => current - 1)
      resetAnswer()
      resetCountdown(
        getQuestionDurationMs(playerQuestions[questionIndex - 1]?.duration),
      )
      setPhase('question')
    }
  }

  const handleRestart = () => {
    setQuestionIndex(0)
    setPhase('question-preview')
    resetAnswer()
    resetCountdown(
      getQuestionPreviewDurationMs(playerQuestions[0]?.question ?? ''),
    )
    setComplete(false)
  }

  const renderControls = (continueLabel: string, continueDisabled = false) => (
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

  const page = (content: ReactNode, controls?: ReactNode) => (
    <Page
      layout="fullBleed"
      noPadding
      hideLogin
      disableContentFadeAnimation
      header={controls}>
      <div className={styles.previewContent} data-testid="quiz-preview-page">
        {content}
      </div>
    </Page>
  )

  if (complete) {
    return page(
      <div className={styles.complete}>
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
      </div>,
      <PreviewControls onExit={onExit} />,
    )
  }

  if (!question) {
    return page(
      <Typography variant="body" color="inverse">
        Add a complete question to preview this quiz.
      </Typography>,
      <PreviewControls onExit={onExit} />,
    )
  }

  const questionContent =
    phase === 'question-preview' ? (
      <div className={styles.questionPreview}>
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
      </div>
    ) : (
      <PlayerQuestionView
        key={`question-${questionIndex}`}
        question={question}
        submittedAnswer={submittedAnswer}
        countdown={countdown}
        onChange={handleAnswer}
      />
    )

  return page(
    <div className={styles.questionStage}>
      <div
        className={styles.questionView}
        data-testid={
          phase === 'question-preview'
            ? 'quiz-preview-question-preview'
            : 'quiz-preview-active-question'
        }>
        {questionContent}
      </div>
      <ProgressBar
        countdown={countdown}
        disableStyling={phase === 'question-preview'}
      />
    </div>,
    renderControls(
      phase === 'question-preview'
        ? 'Continue to question'
        : questionIndex === playerQuestions.length - 1
          ? 'Finish preview'
          : 'Next question',
      phase === 'question' && !submittedAnswer,
    ),
  )
}

export default QuizPreview
