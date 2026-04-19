import { faChartSimple, faPhotoFilm } from '@fortawesome/free-solid-svg-icons'
import type {
  GameEventQuestionResultsPin,
  GameEventQuestionResultsPuzzle,
  GameResultHostEvent,
  QuestionCorrectAnswerDto,
} from '@klurigo/common'
import { QuestionType } from '@klurigo/common'
import type { FC } from 'react'
import { useState } from 'react'

import { Button, IconButtonArrowRight, Typography } from '../../components'
import { useGameContext } from '../../context/game'
import { GamePage, HostGameFooter, QuestionMedia } from '../common'
import NonInteractiveInfoBox from '../common/NonInteractiveInfoBox'

import {
  PinQuestionResults,
  PuzzleQuestionResults,
  QuestionResults,
} from './components'

export interface HostResultStateProps {
  event: GameResultHostEvent
}

const HostResultState: FC<HostResultStateProps> = ({
  event: {
    game: { pin: gamePIN },
    question: { type, question: text, media, info },
    pagination: { current: currentQuestion, total: totalQuestions },
    results,
  },
}) => {
  const [isInitiatingLeaderboardTask, setIsInitiatingLeaderboardTask] =
    useState<boolean>(false)
  const [isProcessingCorrectAnswer, setIsProcessingCorrectAnswer] =
    useState(false)

  const [showMedia, setShowMedia] = useState(false)

  const { completeTask, addCorrectAnswer, deleteCorrectAnswer } =
    useGameContext()

  const handleInitiatingLeaderboardTask = () => {
    setIsInitiatingLeaderboardTask(true)
    completeTask?.().finally(() => setIsInitiatingLeaderboardTask(false))
  }

  const handleAddCorrectAnswer = (answer: QuestionCorrectAnswerDto) => {
    setIsProcessingCorrectAnswer(true)
    addCorrectAnswer?.(answer).finally(() =>
      setIsProcessingCorrectAnswer(false),
    )
  }

  const handleDeleteCorrectAnswer = (answer: QuestionCorrectAnswerDto) => {
    setIsProcessingCorrectAnswer(true)
    deleteCorrectAnswer?.(answer).finally(() =>
      setIsProcessingCorrectAnswer(false),
    )
  }

  return (
    <GamePage
      height="full"
      header={
        <IconButtonArrowRight
          id={'next-button'}
          type="button"
          kind="call-to-action"
          size="small"
          value="Next"
          loading={isInitiatingLeaderboardTask}
          onClick={handleInitiatingLeaderboardTask}
        />
      }
      footer={
        <HostGameFooter
          gamePIN={gamePIN}
          currentQuestion={currentQuestion}
          totalQuestions={totalQuestions}
        />
      }>
      <Typography variant="title" align="center" color="inverse">
        {text}
      </Typography>
      {(!showMedia || type === QuestionType.Pin) && (
        <>
          {type === QuestionType.Pin && (
            <PinQuestionResults
              results={results as GameEventQuestionResultsPin}
            />
          )}
          {type === QuestionType.Puzzle && (
            <PuzzleQuestionResults
              results={results as GameEventQuestionResultsPuzzle}
            />
          )}
          {type !== QuestionType.Pin && type !== QuestionType.Puzzle && (
            <QuestionResults
              results={results}
              loading={isProcessingCorrectAnswer}
              onAddCorrectAnswer={handleAddCorrectAnswer}
              onDeleteCorrectAnswer={handleDeleteCorrectAnswer}
            />
          )}
        </>
      )}
      {showMedia && type !== QuestionType.Pin && (
        <QuestionMedia type={type} media={media} alt={text} />
      )}
      {media && type !== QuestionType.Pin && (
        <Button
          id="toggle-media-button"
          type="button"
          icon={showMedia ? faChartSimple : faPhotoFilm}
          onClick={() => setShowMedia(!showMedia)}>
          {showMedia ? 'Show results' : 'Show media'}
        </Button>
      )}
      {!showMedia && info && <NonInteractiveInfoBox info={info} />}
    </GamePage>
  )
}

export default HostResultState
