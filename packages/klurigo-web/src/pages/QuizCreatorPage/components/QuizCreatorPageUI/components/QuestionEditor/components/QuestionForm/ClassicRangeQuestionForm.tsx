import { GameMode, type QuestionRangeDto, QuestionType } from '@klurigo/common'
import type { FC } from 'react'

import AnswerEditor from '../AnswerEditor'
import { EditorSection } from '../shared'

import { QuestionContentFields, type QuestionFormProps } from './shared'

export const ClassicRangeQuestionForm: FC<
  QuestionFormProps<QuestionRangeDto>
> = ({ question, questionValidation, validationRevealed, onChange }) => (
  <>
    <QuestionContentFields
      question={question}
      validation={questionValidation}
      validationRevealed={validationRevealed}
      onQuestionChange={(value) => onChange('question', value)}
      onMediaChange={(value) => onChange('media', value)}
    />
    <EditorSection>
      <AnswerEditor
        type={QuestionType.Range}
        mode={GameMode.Classic}
        question={question}
        validation={questionValidation}
        validationRevealed={validationRevealed}
        onMinChange={(value) => onChange('min', value)}
        onMaxChange={(value) => onChange('max', value)}
        onCorrectChange={(value) => onChange('correct', value)}
        onMarginChange={(value) => onChange('margin', value)}
      />
    </EditorSection>
  </>
)
