import { type QuestionPinDto, QuestionType } from '@klurigo/common'
import type { FC } from 'react'

import AnswerEditor from '../AnswerEditor'

import { type QuestionFormProps, QuestionTextField } from './shared'

export const ClassicPinQuestionForm: FC<QuestionFormProps<QuestionPinDto>> = ({
  question,
  questionValidation,
  validationRevealed,
  onChange,
}) => (
  <>
    <QuestionTextField
      question={question}
      validation={questionValidation}
      validationRevealed={validationRevealed}
      onChange={(value) => onChange('question', value)}
    />
    <AnswerEditor
      type={QuestionType.Pin}
      imageURL={question.imageURL}
      position={{ x: question.positionX, y: question.positionY }}
      tolerance={question.tolerance}
      validation={questionValidation}
      validationRevealed={validationRevealed}
      onImageUrlChange={(value) => onChange('imageURL', value)}
      onPositionChange={(position) => {
        onChange('positionX', position?.x)
        onChange('positionY', position?.y)
      }}
      onToleranceChange={(value) => onChange('tolerance', value)}
    />
  </>
)
