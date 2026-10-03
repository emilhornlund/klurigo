import { type QuestionPuzzleDto, QuestionType } from '@klurigo/common'
import type { FC } from 'react'

import AnswerEditor from '../AnswerEditor'
import { EditorSection } from '../shared'

import { QuestionContentFields, type QuestionFormProps } from './shared'

export const ClassicPuzzleQuestionForm: FC<
  QuestionFormProps<QuestionPuzzleDto>
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
        type={QuestionType.Puzzle}
        value={question.values}
        validation={questionValidation}
        validationRevealed={validationRevealed}
        onChange={(newValue) => onChange('values', newValue)}
      />
    </EditorSection>
  </>
)
