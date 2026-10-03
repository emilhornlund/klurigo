import {
  GameMode,
  QuestionType,
  type QuestionZeroToOneHundredRangeDto,
} from '@klurigo/common'
import type { FC } from 'react'

import AnswerEditor from '../AnswerEditor'
import { EditorSection } from '../shared'

import { QuestionContentFields, type QuestionFormProps } from './shared'

export const ZeroToOneHundredRangeQuestionForm: FC<
  QuestionFormProps<QuestionZeroToOneHundredRangeDto>
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
        mode={GameMode.ZeroToOneHundred}
        value={question.correct}
        min={0}
        max={100}
        layout="full"
        validation={questionValidation}
        validationRevealed={validationRevealed}
        onChange={(value) => onChange('correct', value)}
      />
    </EditorSection>
  </>
)
