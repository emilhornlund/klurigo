import { faArrowRightFromBracket } from '@fortawesome/free-solid-svg-icons'
import {
  type CountdownEvent,
  type GameMode,
  type GameQuestionPlayerAnswerEvent,
  getQuestionPreviewDurationMs,
  QuestionType,
  type SubmitQuestionAnswerRequestDto,
} from '@klurigo/common'
import type { FC } from 'react'
import { useEffect, useMemo, useState } from 'react'

import { Button, ProgressBar, Typography } from '../../../../../../components'
import { useUserContext } from '../../../../../../context/user'
import { GamePage, PlayerGameFooter } from '../../../../../../states/common'
import { PlayerQuestionPreviewView } from '../../../../../../states/PlayerQuestionPreviewState/components'
import { PlayerQuestionView } from '../../../../../../states/PlayerQuestionState/components'
import type { QuizQuestionModel } from '../../../../utils/QuestionDataSource'

import { toPlayerQuestions } from './quiz-preview-question'

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

const ExitPreviewButton: FC<{ onExit: () => void }> = ({ onExit }) => (
  <Button
    id="preview-exit"
    type="button"
    variant="primary"
    surface="brand"
    intent="accent"
    size="small"
    value="Exit"
    icon={faArrowRightFromBracket}
    onClick={onExit}
  />
)

const QuizPreview: FC<QuizPreviewProps> = ({ mode, questions, onExit }) => {
  const { currentUser } = useUserContext()
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
  const question = playerQuestions[questionIndex]
  const [countdown, setCountdown] = useState(() =>
    createCountdownFromMilliseconds(
      getQuestionPreviewDurationMs(playerQuestions[0]?.question ?? ''),
    ),
  )

  useEffect(() => {
    if (complete || !question) return

    const remainingMs = Math.max(
      new Date(countdown.expiryTime).getTime() - Date.now(),
      0,
    )
    const timeout = window.setTimeout(() => {
      if (phase === 'question-preview') {
        setSubmittedAnswer(undefined)
        setPhase('question')
        setCountdown(
          createCountdownFromMilliseconds(
            getQuestionDurationMs(question.duration),
          ),
        )
        return
      }

      if (questionIndex === playerQuestions.length - 1) {
        setComplete(true)
        return
      }

      const nextQuestionIndex = questionIndex + 1
      const nextQuestion = playerQuestions[nextQuestionIndex]
      setQuestionIndex(nextQuestionIndex)
      setSubmittedAnswer(undefined)
      setPhase('question-preview')
      setCountdown(
        createCountdownFromMilliseconds(
          getQuestionPreviewDurationMs(nextQuestion?.question ?? ''),
        ),
      )
    }, remainingMs)

    return () => window.clearTimeout(timeout)
  }, [complete, countdown, phase, playerQuestions, question, questionIndex])

  const handleAnswer = (request: SubmitQuestionAnswerRequestDto) => {
    setSubmittedAnswer(toSubmittedAnswer(request))

    if (questionIndex === playerQuestions.length - 1) {
      setComplete(true)
      return
    }

    const nextQuestionIndex = questionIndex + 1
    const nextQuestion = playerQuestions[nextQuestionIndex]
    setQuestionIndex(nextQuestionIndex)
    setSubmittedAnswer(undefined)
    setPhase('question-preview')
    setCountdown(
      createCountdownFromMilliseconds(
        getQuestionPreviewDurationMs(nextQuestion?.question ?? ''),
      ),
    )
  }

  const footer = (
    <PlayerGameFooter
      currentQuestion={questionIndex + 1}
      totalQuestions={playerQuestions.length}
      nickname={currentUser?.defaultNickname || 'Player'}
    />
  )

  if (!question) {
    return (
      <GamePage
        layout="fill"
        align="space-between"
        footer={footer}
        header={<ExitPreviewButton onExit={onExit} />}>
        <Typography variant="body" color="inverse">
          Add a complete question to preview this quiz.
        </Typography>
      </GamePage>
    )
  }

  if (complete) {
    return (
      <GamePage
        layout="fill"
        align="space-between"
        footer={footer}
        header={<ExitPreviewButton onExit={onExit} />}>
        <div>
          <Typography variant="title" color="inverse">
            Preview complete
          </Typography>
          <Typography variant="body" color="inverse">
            You reached the end of this quiz without creating a game.
          </Typography>
        </div>
      </GamePage>
    )
  }

  return (
    <GamePage
      layout="fill"
      align="space-between"
      footer={footer}
      header={<ExitPreviewButton onExit={onExit} />}>
      {phase === 'question-preview' ? (
        <PlayerQuestionPreviewView
          mode={mode}
          questionType={question.type}
          question={question.question}
          questionPoints={
            questions[questionIndex] && 'points' in questions[questionIndex]
              ? questions[questionIndex].points
              : undefined
          }
        />
      ) : (
        <PlayerQuestionView
          question={question}
          submittedAnswer={submittedAnswer}
          countdown={countdown}
          onChange={handleAnswer}
        />
      )}
      <ProgressBar
        countdown={countdown}
        disableStyling={phase === 'question-preview'}
      />
    </GamePage>
  )
}

export default QuizPreview
