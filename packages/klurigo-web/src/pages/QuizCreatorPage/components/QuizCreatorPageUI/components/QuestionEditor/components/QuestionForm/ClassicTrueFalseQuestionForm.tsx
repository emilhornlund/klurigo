import { type QuestionTrueFalseDto, QuestionType } from '@klurigo/common'
import type { FC } from 'react'

import AnswerEditor from '../AnswerEditor'
import { EditorSection } from '../shared'

import { QuestionContentFields, type QuestionFormProps } from './shared'

export const ClassicTrueFalseQuestionForm: FC<
  QuestionFormProps<QuestionTrueFalseDto>
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
        type={QuestionType.TrueFalse}
        value={question.correct}
        validation={questionValidation}
        validationRevealed={validationRevealed}
        onChange={(newValue) => onChange('correct', newValue)}
      />
    </EditorSection>
  </>
)
