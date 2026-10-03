import { QuestionType, type QuestionTypeAnswerDto } from '@klurigo/common'
import type { FC } from 'react'

import AnswerEditor from '../AnswerEditor'
import { EditorSection } from '../shared'

import { QuestionContentFields, type QuestionFormProps } from './shared'

export const ClassicTypeAnswerQuestionForm: FC<
  QuestionFormProps<QuestionTypeAnswerDto>
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
        type={QuestionType.TypeAnswer}
        values={question.options}
        validation={questionValidation}
        validationRevealed={validationRevealed}
        onChange={(newValue) => onChange('options', newValue)}
      />
    </EditorSection>
  </>
)
