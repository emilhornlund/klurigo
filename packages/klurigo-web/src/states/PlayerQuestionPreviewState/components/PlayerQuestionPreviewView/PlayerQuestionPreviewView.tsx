import type { GameMode, QuestionType } from '@klurigo/common'
import type { FC } from 'react'

import QuestionTextPreview from '../../../common/QuestionTextPreview'
import QuestionTypePointsBar from '../../../common/QuestionTypePointsBar'

export interface PlayerQuestionPreviewViewProps {
  mode: GameMode
  questionType: QuestionType
  question: string
  questionPoints?: number
}

const PlayerQuestionPreviewView: FC<PlayerQuestionPreviewViewProps> = ({
  mode,
  questionType,
  question,
  questionPoints,
}) => (
  <>
    <QuestionTypePointsBar
      mode={mode}
      questionType={questionType}
      questionPoints={questionPoints}
    />

    <QuestionTextPreview text={question} />
  </>
)

export default PlayerQuestionPreviewView
